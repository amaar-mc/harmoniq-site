import * as THREE from 'three';
import { HARMONIQ_CONFIG, PART_NAMES, type HarmoniqConfig, type PartName } from './config';
import { Band, clamp01, lerp, smoothstep } from './geometry/band';
import {
  Polyline,
  ensureTangents,
  finalizeSolid,
  mapPositions,
  mirrorX,
  polygonArea,
  ringSweep,
  rmfFrames,
  roundedLoop,
  roundedRectLathe,
  softExtrude,
  stadiumLathe,
  weldNormals,
  stadiumParam,
  type Corner,
  type V2,
} from './geometry/primitives';
import { createMaterials, type HarmoniqMaterials, type Quality } from './materials';
import { createWordmarkTexture } from './textures';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeVertexAO, patchAO } from './bakeAO';

const UP = new THREE.Vector3(0, 1, 0);

export interface HarmoniqModelOptions {
  quality?: Quality;
  /** Bake per-vertex ambient occlusion (≈0.5–1.5 s on desktop). */
  ao?: boolean;
  /** CSS font-family for the etched wordmark (must already be loaded). */
  fontFamily?: string;
}

export interface HarmoniqModel {
  /** Root group in world units (1 = 100 mm), origin at the device's centre. */
  group: THREE.Group;
  parts: Record<PartName, THREE.Object3D>;
  materials: HarmoniqMaterials;
  band: Band;
  config: HarmoniqConfig;
  /** Named points (device space, mm) for labels and choreography. */
  anchors: Record<string, THREE.Vector3>;
  /** Lowest point when resting level (mm, device space). */
  restY: number;
  setExplode(t: number): void;
  setContactGlow(index: number, value: number): void;
  setLightLine(value: number): void;
  stats(): { triangles: number; meshes: number };
  dispose(): void;
}

/* ------------------------------------------------------------------ */
/* Temple junction: titanium dips under the glass and becomes the arm    */
/* ------------------------------------------------------------------ */

interface Junction {
  /** Glass module vertical extent (mm above band bottom). */
  top: number;
  bottom: number;
  yCentre: number;
  /** Arm height where it leaves the halo (titanium under the glass). */
  armH: number;
  sDip0: number;
  sDip1: number;
  /** Crown and liner end here, inside the glass. */
  sHaloEnd: number;
}

function junctionOf(cfg: HarmoniqConfig, band: Band): Junction {
  const m = cfg.module;
  const top = band.height(band.sTemple) + m.topClearance;
  const bottom = top - m.height;
  const frontZ = m.z + m.length / 2;
  return {
    top,
    bottom,
    yCentre: (top + bottom) / 2,
    // Glass sits on the titanium with one parting gap.
    armH: bottom - cfg.partingGap,
    sDip0: band.sAtZ(cfg.junction.dipStartZ),
    sDip1: band.sAtZ(cfg.junction.dipEndZ),
    sHaloEnd: band.sAtZ(frontZ - cfg.junction.haloEndInset),
  };
}

/** Titanium face height after the dip toward the arm. */
function effTitanium(band: Band, j: Junction, s: number) {
  const d = smoothstep(j.sDip0, j.sDip1, Math.abs(s));
  return lerp(band.titaniumHeight(s), j.armH, d);
}

/* ------------------------------------------------------------------ */
/* Halo cross-sections (band coordinates p, q)                          */
/* ------------------------------------------------------------------ */

function shellProfile(cfg: HarmoniqConfig, band: Band, j: Junction, s: number): V2[] {
  const { thickness: T, bow } = cfg.halo;
  const sh = cfg.shell;
  const ht = effTitanium(band, j, s);
  // Once the liner and crown have ended inside the glass, the shell slims to
  // the arm's section so the titanium reads as one sweep from brow to ear
  // (the arm continues inside the tail).
  // Outer surface (radii, bow) eases over the whole dip so the visible face
  // never bands; the hidden inner structure slims only once the liner ends.
  const mOut = smoothstep(j.sDip0, j.sDip1 + 4, Math.abs(s));
  const m = smoothstep(j.sHaloEnd - 2, j.sHaloEnd + 6, Math.abs(s));
  // Tail section = the arm's section + 0.05 mm all round, so the arm (which
  // starts inside the tail) continues it with an invisible step.
  const tailT = cfg.arm.thickness + 0.04;
  const tailR = cfg.arm.edgeRadius + 0.02;
  const tailInner = T - tailT;
  const lipFace = lerp(sh.lipFace, tailInner, m);
  const back = lerp(cfg.liner.back, tailInner + 0.02, m);
  const lipH = lerp(sh.lipHeight, 1.2, m);
  const corners: Corner[] = [
    { p: lipFace, q: 0, r: lerp(sh.bottomInnerRadius, tailR, m), segs: 5 },
    { p: T, q: 0, r: lerp(sh.bottomOuterRadius, tailR, mOut), segs: 13 },
    { p: T, q: ht, r: lerp(sh.topEdgeRadius, tailR, mOut), segs: 7 },
    { p: back, q: ht, r: lerp(0, tailR, m), segs: 4 },
    { p: back, q: lipH, r: 0 },
    { p: lipFace, q: lipH, r: lerp(0.55, 0.01, m), segs: 4 },
  ];
  const pts = roundedLoop(corners, [5, 14, 3, 3, 2, 2]);
  const bowNow = bow * (1 - mOut);
  return pts.map(([p, q]) => {
    const w = smoothstep(T - sh.bottomOuterRadius, T, p);
    return [p + bowNow * Math.sin(Math.PI * clamp01(q / ht)) * w, q] as V2;
  });
}

function linerProfile(cfg: HarmoniqConfig, band: Band, j: Junction, s: number): V2[] {
  const { face, back } = cfg.liner;
  const q0 = cfg.shell.lipHeight + cfg.partingGap;
  // Ends in a rounded tongue rather than a block cap.
  const e = smoothstep(j.sHaloEnd - 8, j.sHaloEnd, Math.abs(s));
  const top = lerp(Math.max(q0 + 2, effTitanium(band, j, s) - 0.6), q0 + 2.2, e);
  const corners: Corner[] = [
    { p: face, q: q0, r: 1.1, segs: 4 },
    { p: back - 0.05, q: q0, r: 0 },
    { p: back - 0.05, q: top, r: 0 },
    { p: face, q: top, r: 0 },
  ];
  return roundedLoop(corners, [2, 2, 2, 9]);
}

const CROWN_POINTS = 44;

function crownProfile(cfg: HarmoniqConfig, band: Band, j: Junction, s: number): V2[] {
  const T = cfg.halo.thickness;
  // Outer skirt follows the dipped titanium; the forehead side keeps the
  // undipped section so the roll never folds back on itself.
  const ht = effTitanium(band, j, s);
  const ht0 = band.titaniumHeight(s);
  const H = band.height(s);
  const rise = H - ht;
  const qcb = Math.min(band.cushionBottom(s), ht - 1.6);
  const face = cfg.liner.face;
  const back = cfg.liner.back;
  const pOut = T - cfg.shell.ledge - cfg.partingGap;
  const pIn = face - cfg.crown.overhang;
  const bulge = cfg.crown.outerBulge;
  const qInnerTop = Math.min(H - 2.4, Math.max(ht0 - 1.0, qcb + 3.6));
  const ctrl: V2[] = [
    [pOut, ht + 0.12],
    [pOut + bulge, ht + rise * 0.42],
    [pOut - 1.5, H - 0.55],
    [(pOut + pIn) / 2 + 0.9, H],
    [pIn + 2.1, H - 1.05],
    [pIn, qInnerTop],
    [pIn + 0.3, qcb + 3.0],
    [pIn + 1.35, qcb + 0.55],
    [face + 0.35, qcb + 0.12],
    [face + 1.3, qcb + 1.2],
    [back - 0.4, Math.max(qcb + 1.8, ht - 1.2)],
    [pOut - 2.0, ht - 0.35],
  ];
  const curve = new THREE.CatmullRomCurve3(
    ctrl.map(([p, q]) => new THREE.Vector3(p, q, 0)),
    true,
    'centripetal',
  );
  // Fixed-parameter sampling keeps ring-to-ring correspondence stable.
  const pts = Array.from({ length: CROWN_POINTS }, (_, k) => curve.getPoint(k / CROWN_POINTS));
  // Sewn end inside the glass: a gentle uniform scale about the base centre.
  const end = smoothstep(j.sHaloEnd - 3, j.sHaloEnd, Math.abs(s));
  const k = 1 - 0.1 * end;
  const cx = (pOut + pIn) / 2;
  const cy = ht;
  return pts.map((v) => [cx + (v.x - cx) * k, cy + (v.y - cy) * k] as V2);
}

function bandSweep(
  band: Band,
  profileAt: (s: number) => V2[],
  segments: number,
  sMax: number,
  /** Optional V from the profile point (mm); default is perimeter length. */
  vOf?: (p: number, q: number) => number,
): THREE.BufferGeometry {
  const rings: THREE.Vector3[][] = [];
  const uvU: number[] = [];
  const uvV: number[][] = [];
  const s0 = -sMax;
  const s1 = sMax;
  for (let i = 0; i <= segments; i++) {
    const s = lerp(s0, s1, i / segments);
    let prof = profileAt(s);
    if (polygonArea(prof) < 0) prof = prof.slice().reverse();
    rings.push(prof.map(([p, q]) => band.toWorld(s, p, q)));
    uvU.push(s / 10);
    if (vOf) uvV.push([...prof, prof[0]].map(([p, q]) => vOf(p, q) / 10));
  }
  const g = ringSweep(rings, { caps: true, uvU, uvV: vOf ? uvV : undefined });
  ensureTangents(g);
  return g;
}

/* ------------------------------------------------------------------ */
/* Pads, gaskets and the light line (stadium lathes wrapped on a face)   */
/* ------------------------------------------------------------------ */

function padProfile(r: number, standoff: number, edge: number, dome: number): V2[] {
  const zr = standoff - dome;
  const out: V2[] = [];
  const DOME = 8;
  for (let k = 0; k <= DOME; k++) {
    const t = k / DOME;
    out.push([-r + (r - edge) * t, zr + dome * Math.pow(1 - t * t, 2)]);
  }
  const EDGE = 7;
  for (let k = 1; k <= EDGE; k++) {
    const th = (Math.PI / 2) * (1 - k / EDGE);
    out.push([-edge + edge * Math.cos(th), zr - edge + edge * Math.sin(th)]);
  }
  out.push([0, 0.0]);
  out.push([0, 0.0]);
  out.push([-r * 0.5, 0]);
  out.push([-r, 0]);
  return out;
}

function gasketProfile(dIn: number, rim: number, h: number): V2[] {
  const dOut = dIn + rim;
  const ri = 0.5;
  const ro = 0.7;
  const out: V2[] = [[dIn, 0], [dIn, 0], [dIn, h - ri]];
  for (let k = 1; k <= 4; k++) {
    const th = Math.PI - (Math.PI / 2) * (k / 4);
    out.push([dIn + ri + ri * Math.cos(th), h - ri + ri * Math.sin(th)]);
  }
  out.push([dOut - ro, h]);
  for (let k = 1; k <= 5; k++) {
    const th = Math.PI / 2 - (Math.PI / 2) * (k / 5);
    out.push([dOut - ro + ro * Math.cos(th), h - ro + ro * Math.sin(th)]);
  }
  out.push([dOut, 0]);
  out.push([dOut, 0]);
  out.push([dIn, 0]);
  return out;
}

/** Converts a surface length at offset p into reference arc length s. */
function surfaceToS(band: Band, s0: number, x: number, p: number) {
  const k = (sAt: number) => 0.4 / Math.max(1e-6, Math.abs(band.offsetArc(p, sAt - 0.2, sAt + 0.2, 2)));
  const first = s0 + x * k(s0);
  return s0 + x * k((s0 + first) / 2);
}

/** Wrap local (x along band, y up, z away from the face) onto the liner face. */
function wrapInner(g: THREE.BufferGeometry, band: Band, cfg: HarmoniqConfig, sC: number, qC: number) {
  const face = cfg.liner.face;
  mapPositions(g, (v) => {
    const s = surfaceToS(band, sC, v.x, face);
    return band.toWorld(s, face - v.z, qC + v.y, new THREE.Vector3());
  });
  finalizeSolid(g);
}

/** Wrap local (x along band, y up, z out of the surface) onto the titanium face. */
function wrapOuter(
  g: THREE.BufferGeometry,
  band: Band,
  sC: number,
  qC: number,
  solid: boolean,
) {
  const pEff = band.outerP(sC, qC) - qC * Math.sin(band.rake(sC));
  mapPositions(g, (v) => {
    const s = surfaceToS(band, sC, v.x, pEff);
    const q = qC + v.y;
    return band.toWorld(s, band.outerP(s, q) + v.z, q, new THREE.Vector3());
  });
  if (solid) finalizeSolid(g);
  else g.computeVertexNormals();
}

/* ------------------------------------------------------------------ */
/* Temple modules, arms and ear rests (built for +X, mirrored for −X)    */
/* ------------------------------------------------------------------ */

function moduleGeometry(cfg: HarmoniqConfig, band: Band, j: Junction) {
  const m = cfg.module;
  const hx = m.length / 2;
  const hy = (j.top - j.bottom) / 2;
  const rc = Math.min(m.cornerRadius, hy - 0.01);
  const e = m.edgeRadius;
  const T = m.thickness;
  const solidProfile = (R0: number, T0: number, e0: number, dome: number): V2[] => {
    const out: V2[] = [];
    const IN = 6;
    for (let k = 0; k <= IN; k++) {
      const t = k / IN;
      out.push([-R0 + (R0 - e0) * t, T0 + dome * Math.pow(1 - t * t, 2)]);
    }
    const E = 7;
    for (let k = 1; k <= E; k++) {
      const th = (Math.PI / 2) * (1 - k / E);
      out.push([-e0 + e0 * Math.cos(th), T0 - e0 + e0 * Math.sin(th)]);
    }
    for (let k = 1; k <= E; k++) {
      const th = -(Math.PI / 2) * (k / E);
      out.push([-e0 + e0 * Math.cos(th), e0 + e0 * Math.sin(th)]);
    }
    for (let k = 1; k <= IN; k++) {
      const t = k / IN;
      out.push([-e0 - (R0 - e0) * t, -dome * 0.4 * Math.pow(t, 2)]);
    }
    return out;
  };
  const glass = roundedRectLathe(hx, hy, rc, solidProfile(hy, T, e, m.dome), 7, 12, 4);
  // A thin dark card on the inboard side: the outer glass reads as deep smoke.
  const inset = 1.6;
  const cardHy = hy * 0.5;
  const card = roundedRectLathe(hx - inset, cardHy, Math.min(cardHy - 0.01, Math.max(0.5, rc - inset)), solidProfile(cardHy, 2.2, 0.6, 0), 5, 10, 3);
  card.translate(0, 0, 1.1);
  // Local: x → back (−Z), y → up, z → outward (+X).
  const pIn = cfg.halo.thickness + m.proud - m.thickness;
  const x0 = band.a + pIn;
  const place = (g: THREE.BufferGeometry) => {
    mapPositions(g, (v) => new THREE.Vector3(x0 + v.z, j.yCentre + v.y, m.z - v.x));
    finalizeSolid(g);
  };
  place(glass);
  place(card);
  return { glass, core: card };
}

interface ArmBend {
  heightFront: number;
  /** Spine arc length per unit of local x. */
  scale: number;
  point(x: number, y: number, z: number): THREE.Vector3;
  frame(x: number): { t: THREE.Vector3; u: THREE.Vector3; s: THREE.Vector3 };
  yMid(x: number): number;
  length: number;
}

function armSpine(cfg: HarmoniqConfig, band: Band, j: Junction): ArmBend {
  const A = cfg.arm;
  const tempHt = j.armH;
  const rakeShift = (tempHt / 2) * Math.sin(band.rake(band.sTemple));
  const xArm = band.a + cfg.halo.thickness - (A.thickness + 0.04) / 2 - rakeShift;
  const p0 = new THREE.Vector3(xArm, tempHt / 2, A.z0);
  const horiz = Math.sqrt(A.length * A.length - A.drop * A.drop) * 0.97;
  const p3 = p0.clone().add(new THREE.Vector3(A.flare * 0.4, -A.drop, -horiz));
  // Leaves the shell tail dead straight (coaxial until it has fully exited
  // the tail), then flares and drops.
  const lead = Math.max(0, cfg.halo.tail + 3 + A.z0);
  const pL = p0.clone().add(new THREE.Vector3(0, 0, -lead));
  const p1 = pL.clone().add(new THREE.Vector3(0, 0, -(A.length - lead) * 0.36));
  const p2 = p3.clone().add(new THREE.Vector3(A.flare * 0.2, A.drop * 0.42, A.length * 0.3));
  const curve = new THREE.CubicBezierCurve3(pL, p1, p2, p3);
  const LEAD_N = 12;
  const pts = [
    ...Array.from({ length: LEAD_N }, (_, k) => new THREE.Vector3().lerpVectors(p0, pL, k / LEAD_N)),
    ...curve.getSpacedPoints(200),
  ];
  const poly = new Polyline(pts);
  const scale = poly.total / A.length;
  const frameAt = (x: number) => {
    const { i, t } = poly.locate(x * scale);
    const j = Math.min(i + 1, pts.length - 1);
    const p = new THREE.Vector3().lerpVectors(pts[i], pts[j], t);
    const i0 = Math.max(0, i - 1);
    const j1 = Math.min(pts.length - 1, j + 1);
    const tan = new THREE.Vector3().subVectors(pts[j1], pts[i0]).normalize();
    const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
    const up = new THREE.Vector3().crossVectors(side, tan).normalize();
    return { p, t: tan, u: up, s: side };
  };
  const hF = tempHt - 0.04;
  const hR = A.heightRear;
  const xe = A.length - hR / 2;
  const ease = (x: number) => smoothstep(0, 1, x / xe);
  return {
    heightFront: hF,
    scale,
    length: A.length,
    yMid: (x: number) => 0.2 * (hF - hR) * ease(Math.min(x, xe)),
    point(x, y, z) {
      const f = frameAt(x);
      return f.p.clone().addScaledVector(f.u, y).addScaledVector(f.s, z);
    },
    frame(x) {
      const f = frameAt(x);
      return { t: f.t, u: f.u, s: f.s };
    },
  };
}

/**
 * UV mapping that continues the shell's: u = band arc length / 10, v = profile
 * perimeter / 10 (outer face measured from the shell profile at the tail end),
 * so the brushed streaks run unbroken from the halo into the arm.
 */
interface ArmUV {
  u0: number;
  scale: number;
  vOuter: (q: number) => number;
}

function armUVMapping(cfg: HarmoniqConfig, band: Band, j: Junction, spine: ArmBend): ArmUV {
  const prof = shellProfile(cfg, band, j, band.sEnd);
  const T = cfg.halo.thickness;
  let acc = 0;
  const outer: [number, number][] = [];
  for (let i = 0; i < prof.length; i++) {
    if (i > 0) acc += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]);
    if (prof[i][0] > T - 0.02) outer.push([prof[i][1], acc]);
  }
  outer.sort((a, b) => a[0] - b[0]);
  const vOuter = (q: number) => {
    if (outer.length < 2) return q;
    if (q <= outer[0][0]) return outer[0][1] - (outer[0][0] - q);
    for (let k = 1; k < outer.length; k++) {
      if (q <= outer[k][0]) {
        const t = (q - outer[k - 1][0]) / Math.max(1e-6, outer[k][0] - outer[k - 1][0]);
        return lerp(outer[k - 1][1], outer[k][1], t);
      }
    }
    const last = outer[outer.length - 1];
    return last[1] + (q - last[0]);
  };
  return { u0: band.sTemple - cfg.arm.z0, scale: spine.scale, vOuter };
}

function armGeometry(cfg: HarmoniqConfig, spine: ArmBend, uvMap: ArmUV) {
  const A = cfg.arm;
  const hF = spine.heightFront;
  const hR = A.heightRear;
  const D = hF - hR;
  const xe = A.length - hR / 2;
  const ease = (x: number) => smoothstep(0, 1, x / xe);
  const yTop = (x: number) => hF / 2 - 0.3 * D * ease(x);
  const yBot = (x: number) => -hF / 2 + 0.7 * D * ease(x);
  const shape = new THREE.Shape();
  const N = 30;
  shape.moveTo(0, yBot(0));
  for (let k = 1; k <= N; k++) {
    const x = (xe * k) / N;
    shape.lineTo(x, yBot(x));
  }
  const yc = (yTop(xe) + yBot(xe)) / 2;
  const rr = (yTop(xe) - yBot(xe)) / 2;
  const ARC = 16;
  for (let k = 1; k < ARC; k++) {
    const th = -Math.PI / 2 + (Math.PI * k) / ARC;
    shape.lineTo(xe + Math.cos(th) * rr, yc + Math.sin(th) * rr);
  }
  for (let k = N; k >= 0; k--) {
    const x = (xe * k) / N;
    shape.lineTo(x, yTop(x));
  }
  shape.closePath();
  // Slot: a stadium along the arm's mid-line.
  const xs = A.slotCenter * A.length;
  const xa = xs - A.slotLength / 2 + A.slotHeight / 2;
  const xb = xs + A.slotLength / 2 - A.slotHeight / 2;
  const pa = new THREE.Vector2(xa, (yTop(xa) + yBot(xa)) / 2);
  const pb = new THREE.Vector2(xb, (yTop(xb) + yBot(xb)) / 2);
  const dir = new THREE.Vector2().subVectors(pb, pa).normalize();
  const nrm = new THREE.Vector2(-dir.y, dir.x);
  const ang = Math.atan2(dir.y, dir.x);
  const rs = A.slotHeight / 2;
  const hole = new THREE.Path();
  const SA = 12;
  const STR = 10;
  hole.moveTo(pa.x - nrm.x * rs, pa.y - nrm.y * rs);
  for (let k = 1; k <= STR; k++) {
    const t = k / STR;
    hole.lineTo(lerp(pa.x, pb.x, t) - nrm.x * rs, lerp(pa.y, pb.y, t) - nrm.y * rs);
  }
  for (let k = 1; k < SA; k++) {
    const th = ang - Math.PI / 2 + (Math.PI * k) / SA;
    hole.lineTo(pb.x + Math.cos(th) * rs, pb.y + Math.sin(th) * rs);
  }
  for (let k = 0; k <= STR; k++) {
    const t = 1 - k / STR;
    hole.lineTo(lerp(pa.x, pb.x, t) + nrm.x * rs, lerp(pa.y, pb.y, t) + nrm.y * rs);
  }
  for (let k = 1; k < SA; k++) {
    const th = ang + Math.PI / 2 + (Math.PI * k) / SA;
    hole.lineTo(pa.x + Math.cos(th) * rs, pa.y + Math.sin(th) * rs);
  }
  hole.closePath();
  shape.holes.push(hole);

  const g = softExtrude(shape, A.thickness, A.edgeRadius, 6);
  // Bend along the spine: x → along, y → up, z → outward. Rotate normals too.
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  const tangents = new Float32Array(pos.count * 4);
  const uvAttr = g.getAttribute('uv') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    {
      const u = (uvMap.u0 + v.x * uvMap.scale) / 10;
      const q = v.y + hF / 2;
      const vv = n.z > 0.5 ? q / 10 : (q + cfg.arm.thickness) / 10;
      uvAttr.setXY(i, u, vv);
    }
    const f = spine.frame(v.x);
    const w = spine.point(v.x, v.y, v.z);
    const nw = new THREE.Vector3()
      .addScaledVector(f.t, n.x)
      .addScaledVector(f.u, n.y)
      .addScaledVector(f.s, n.z)
      .normalize();
    pos.setXYZ(i, w.x, w.y, w.z);
    nor.setXYZ(i, nw.x, nw.y, nw.z);
    // Brush direction runs along the arm; handedness follows the face side.
    const tw = f.t.clone().addScaledVector(nw, -f.t.dot(nw)).normalize();
    tangents.set([tw.x, tw.y, tw.z, n.z < 0 ? -1 : 1], i * 4);
  }
  g.setAttribute('tangent', new THREE.BufferAttribute(tangents, 4));
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  uvAttr.needsUpdate = true;
  return { geometry: g, yMidRear: (yTop(xe) + yBot(xe)) / 2 };
}

function earRestGeometry(cfg: HarmoniqConfig, spine: ArmBend, yMidRear: number) {
  const E = cfg.earRest;
  const A = cfg.arm;
  const xS = A.length - E.sleeve;
  const yS = lerp(spine.yMid(xS), yMidRear, 0.5);
  const q = spine.point(xS, yS, 0);
  const f = spine.frame(xS);
  const back = new THREE.Vector3(f.t.x, 0, f.t.z).normalize();
  const side = f.s;
  const e2 = q.clone().addScaledVector(f.t, E.sleeve + 4);
  // One long bend (≈18 mm radius) instead of a knee.
  const pts = [
    q.clone(),
    q.clone().addScaledVector(f.t, 4),
    e2.clone(),
    e2.clone().addScaledVector(back, 9).addScaledVector(UP, -4).addScaledVector(side, -E.tuck * 0.15),
    e2.clone().addScaledVector(back, 11).addScaledVector(UP, -14).addScaledVector(side, -E.tuck * 0.4),
    e2.clone().addScaledVector(back, 8).addScaledVector(UP, -26).addScaledVector(side, -E.tuck * 0.7),
    e2.clone().addScaledVector(back, 3).addScaledVector(UP, -(E.drop - 2)).addScaledVector(side, -E.tuck),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const total = curve.getLength();
  const rTip = E.diameterEnd / 2;
  // σ samples: uniform body + angular tip so the rounded end stays smooth.
  const sig: number[] = [];
  const BODY = 40;
  for (let k = 0; k <= BODY; k++) sig.push(((total - rTip) * k) / BODY);
  const TIP = 9;
  for (let k = 1; k <= TIP; k++) sig.push(total - rTip + rTip * Math.sin((Math.PI / 2) * (k / TIP)));
  const frames = rmfFrames(
    curve,
    sig.map((s) => s / total),
    f.u,
  );
  const sp = stadiumParam(1, 6, 4);
  const M = sp.cx.length;
  const sleeveEnd = E.sleeve + 1.5;
  const aSleeve = (E.sleeveHeight - E.sleeveThickness) / 2;
  const rSleeve = E.sleeveThickness / 2;
  const rings: THREE.Vector3[][] = [];
  sig.forEach((s, i) => {
    const fr = frames[i];
    let a: number;
    let r: number;
    if (s <= sleeveEnd) {
      a = aSleeve;
      const lip = smoothstep(0, 6, s);
      r = lerp(A.thickness / 2 + 0.3, rSleeve, lip);
    } else {
      const tr = smoothstep(sleeveEnd, sleeveEnd + 16, s);
      a = lerp(aSleeve, 0, tr);
      const body = clamp01((s - sleeveEnd) / (total - rTip - sleeveEnd));
      const rBody = lerp(E.diameterStart / 2, rTip, body);
      r = lerp(rSleeve, rBody, tr);
      if (s > total - rTip) {
        const u = (s - (total - rTip)) / rTip;
        const k = Math.sqrt(Math.max(0, 1 - u * u));
        r = rTip * k;
        a *= k;
      }
    }
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < M; j++) {
      const lx = sp.cx[j] * a + sp.nx[j] * r;
      const ly = sp.ny[j] * r;
      ring.push(fr.p.clone().addScaledVector(fr.n, lx).addScaledVector(fr.b, ly));
    }
    rings.push(ring);
  });
  const g = ringSweep(rings, {
    capStart: true,
    capEnd: false,
    uvU: sig.map((s) => s / 10),
  });
  ensureTangents(g);
  return { geometry: g, tip: frames[frames.length - 1].p.clone() };
}

/* ------------------------------------------------------------------ */
/* Assembly                                                             */
/* ------------------------------------------------------------------ */

export function createHarmoniqModel(
  config: HarmoniqConfig = HARMONIQ_CONFIG,
  options: HarmoniqModelOptions = {},
): HarmoniqModel {
  const cfg = config;
  const quality = options.quality ?? 'high';
  const band = new Band(cfg);
  const mats = createMaterials(quality);
  const segs = quality === 'high' ? cfg.halo.segments : Math.round(cfg.halo.segments * 0.7);

  const device = new THREE.Group();
  device.name = 'device';
  const parts = {} as Record<PartName, THREE.Object3D>;
  const explodeDir: Partial<Record<PartName, THREE.Vector3>> = {};
  const add = (name: PartName, obj: THREE.Object3D, explode?: THREE.Vector3) => {
    obj.name = name;
    obj.userData.part = name;
    parts[name] = obj;
    device.add(obj);
    if (explode) explodeDir[name] = explode;
  };
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, name?: string) => {
    const me = new THREE.Mesh(g, m);
    if (name) me.name = name;
    me.castShadow = true;
    me.receiveShadow = true;
    return me;
  };

  // Halo.
  const j = junctionOf(cfg, band);
  // Shell V is anchored to the outer face (V = height there), so the brushed
  // streaks stay level through the temple dip and line up with the arm.
  const T = cfg.halo.thickness;
  const shellGeo = bandSweep(band, (s) => shellProfile(cfg, band, j, s), segs, band.sEnd, (p, q) => q + (T - p));
  const haloSegs = Math.round((segs * j.sHaloEnd) / band.sEnd);
  const linerGeo = bandSweep(band, (s) => linerProfile(cfg, band, j, s), haloSegs, j.sHaloEnd);
  const crownGeo = bandSweep(band, (s) => crownProfile(cfg, band, j, s), haloSegs, j.sHaloEnd);
  add('shell', mesh(shellGeo, mats.titanium));
  // Exploded view: clean axes — crown up, contacts in, modules out, arms back.
  add('liner', mesh(linerGeo, mats.liner));
  add('crown', mesh(crownGeo, mats.textile), new THREE.Vector3(0, 30, 0));

  // Contacts and gaskets.
  const C = cfg.contacts;
  const contactCentres: THREE.Vector3[] = [];
  const haloParts: THREE.BufferGeometry[] = [];
  C.sizes.forEach(([len, h], i) => {
    const sC = C.positions[i];
    const r = h / 2;
    const a = Math.max(0, len / 2 - r);
    const qC = (cfg.shell.lipHeight + cfg.partingGap + band.cushionBottom(sC)) / 2;
    const pad = stadiumLathe(a, r, padProfile(r, C.standoff, C.padEdgeRadius, C.padDome), 14, 5);
    wrapInner(pad, band, cfg, sC, qC);
    const gas = stadiumLathe(a, r, gasketProfile(C.gasketClearance, C.gasketRim, C.gasketHeight), 13, 5);
    wrapInner(gas, band, cfg, sC, qC);
    weldNormals(pad);
    ensureTangents(pad);
    ensureTangents(gas);
    const inward = band.normal(sC).negate();
    // Halo plane on the liner around this pad (merged below).
    {
      const margin = 9;
      const hw = len / 2 + margin;
      const hh = h / 2 + margin;
      const halo = new THREE.PlaneGeometry(hw * 2, hh * 2, 12, 6);
      halo.translate(0, 0, 0.25);
      const lp = halo.getAttribute('position');
      const n = lp.count;
      const aLocal = new Float32Array(n * 2);
      const aHalf = new Float32Array(n * 2);
      const aIndex = new Float32Array(n);
      const aDir = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) {
        aLocal[k * 2] = lp.getX(k);
        aLocal[k * 2 + 1] = lp.getY(k);
        aHalf[k * 2] = len / 2;
        aHalf[k * 2 + 1] = h / 2;
        aIndex[k] = i;
        aDir[k * 3] = inward.x * 11;
        aDir[k * 3 + 1] = inward.y * 11;
        aDir[k * 3 + 2] = inward.z * 11;
      }
      // Wrap onto the liner face (z = distance toward the head).
      mapPositions(halo, (v) => {
        const sS = surfaceToS(band, sC, v.x, cfg.liner.face);
        return band.toWorld(sS, cfg.liner.face - v.z, qC + v.y, new THREE.Vector3());
      });
      halo.setAttribute('aLocal', new THREE.BufferAttribute(aLocal, 2));
      halo.setAttribute('aHalf', new THREE.BufferAttribute(aHalf, 2));
      halo.setAttribute('aIndex', new THREE.BufferAttribute(aIndex, 1));
      halo.setAttribute('aDir', new THREE.BufferAttribute(aDir, 3));
      halo.deleteAttribute('normal');
      halo.deleteAttribute('uv');
      haloParts.push(halo);
    }
    add(`contact_${i}` as PartName, mesh(pad, mats.contacts[i]), inward.clone().multiplyScalar(11));
    add(`gasket_${i}` as PartName, mesh(gas, mats.gasket), inward.clone().multiplyScalar(4));
    contactCentres.push(band.toWorld(sC, cfg.liner.face - C.standoff, qC));
  });

  {
    const merged = mergeGeometries(haloParts, false);
    haloParts.forEach((g) => g.dispose());
    const haloMesh = new THREE.Mesh(merged, mats.contactGlow);
    haloMesh.name = 'contactGlow';
    haloMesh.userData.noAO = true;
    haloMesh.renderOrder = 9;
    haloMesh.frustumCulled = false;
    device.add(haloMesh);
  }

  // Light line: recessed bezel, emissive slit, soft glow.
  const L = cfg.lightLine;
  const qL = L.heightRatio * effTitanium(band, j, L.s);
  const lightGroup = new THREE.Group();
  {
    const rB = L.height / 2 + L.bezel;
    const aB = L.length / 2 + L.bezel - rB;
    const bezel = stadiumLathe(aB, rB, [
      [-rB, 0.025],
      [-0.25, 0.025],
      [0, 0.0],
      [0, 0.0],
      [0, -0.45],
      [-rB, -0.45],
    ]);
    wrapOuter(bezel, band, L.s, qL, true);
    const rL = L.height / 2;
    const aL = L.length / 2 - rL;
    const slit = stadiumLathe(aL, rL, [
      [-rL, 0.06],
      [-0.2, 0.06],
      [0, 0.0],
      [0, -0.3],
      [-rL, -0.3],
    ]);
    wrapOuter(slit, band, L.s, qL, true);
    const glowGeo = new THREE.PlaneGeometry(52, 22, 26, 10);
    glowGeo.translate(0, 0, 0.14);
    wrapOuter(glowGeo, band, L.s, qL, false);
    mats.glow.uniforms.uHalf.value.set(L.length / 2, L.height / 2);
    mats.glow.uniforms.uSize.value.set(52, 22);
    const glowMesh = mesh(glowGeo, mats.glow, 'lightGlow');
    glowMesh.renderOrder = 10;
    glowMesh.castShadow = false;
    const bezelMesh = mesh(bezel, mats.bezel, 'lightBezel');
    const slitMesh = mesh(slit, mats.light, 'lightSlit');
    for (const o of [glowMesh, bezelMesh, slitMesh]) o.userData.noAO = true;
    lightGroup.add(bezelMesh, slitMesh, glowMesh);
  }
  add('lightLine', lightGroup);

  // Etched wordmark.
  const W = cfg.wordmark;
  const qW = W.heightRatio * effTitanium(band, j, W.s);
  {
    const family = options.fontFamily ?? 'Inter, "Helvetica Neue", Arial, sans-serif';
    const wm = createWordmarkTexture(W.text, family, 400);
    const mmPerPx = W.capHeight / wm.pxPerCap;
    const w = wm.widthPx * mmPerPx;
    const h = wm.heightPx * mmPerPx;
    const capCentrePx = wm.baselineFrac * wm.heightPx - wm.pxPerCap / 2;
    const yCapLocal = (wm.heightPx / 2 - capCentrePx) * mmPerPx;
    const g = new THREE.PlaneGeometry(w, h, 56, 6);
    g.translate(0, -yCapLocal, 0.03);
    wrapOuter(g, band, W.s, qW, false);
    mats.etch.alphaMap = wm.texture;
    mats.etch.needsUpdate = true;
    const wmMesh = mesh(g, mats.etch);
    wmMesh.userData.noAO = true;
    add('wordmark', wmMesh);
  }

  // Temple modules.
  const mod = moduleGeometry(cfg, band, j);
  const modL = new THREE.Group();
  modL.add(mesh(mod.glass, mats.glass, 'glass'), mesh(mod.core, mats.glassCore, 'core'));
  const modR = new THREE.Group();
  modR.add(mesh(mirrorX(mod.glass), mats.glass, 'glass'), mesh(mirrorX(mod.core), mats.glassCore, 'core'));
  for (const g of [modL, modR]) g.traverse((o) => (o.userData.noAO = true));
  add('module_L', modL, new THREE.Vector3(24, 6, 0));
  add('module_R', modR, new THREE.Vector3(-24, 6, 0));

  // Arms and ear rests.
  const spine = armSpine(cfg, band, j);
  const arm = armGeometry(cfg, spine, armUVMapping(cfg, band, j, spine));
  const armL = mesh(arm.geometry, mats.titanium);
  const armRGeo = mirrorX(arm.geometry);
  {
    // The right shell's u runs negative; mirror the arm's u to match.
    const uv = armRGeo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, -uv.getX(i));
    const tan = armRGeo.getAttribute('tangent') as THREE.BufferAttribute;
    for (let i = 0; i < tan.count; i++) tan.setXYZW(i, -tan.getX(i), -tan.getY(i), -tan.getZ(i), -tan.getW(i));
  }
  const armR = mesh(armRGeo, mats.titanium);
  // Long earcut triangles on the blade faces can't carry per-vertex AO.
  armL.userData.aoConstant = 1;
  armR.userData.aoConstant = 1;
  add('arm_L', armL, new THREE.Vector3(3, 0, -28));
  add('arm_R', armR, new THREE.Vector3(-3, 0, -28));
  const ear = earRestGeometry(cfg, spine, arm.yMidRear);
  add('earRest_L', mesh(ear.geometry, mats.earRest), new THREE.Vector3(5, -10, -44));
  add('earRest_R', mesh(mirrorX(ear.geometry), mats.earRest), new THREE.Vector3(-5, -10, -44));

  // Centre the device on its bounding box.
  const box = new THREE.Box3();
  device.updateMatrixWorld(true);
  device.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.name !== 'lightGlow' && m.name !== 'contactGlow') {
      m.geometry.computeBoundingBox();
      box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
    }
  });
  const centre = box.getCenter(new THREE.Vector3());
  const content = new THREE.Group();
  content.name = 'content';
  content.position.copy(centre).negate();
  content.add(device);
  const root = new THREE.Group();
  root.name = 'harmoniq';
  root.scale.setScalar(cfg.worldScale);
  root.add(content);

  // Ambient occlusion, faded out while exploded.
  const aoUniform = { value: 1 };
  if (options.ao !== false) {
    bakeVertexAO(device, { rays: quality === 'high' ? 28 : 16, maxDist: 9, strength: 1.05 });
    for (const m of [mats.titanium, mats.textile, mats.liner, mats.earRest, ...mats.contacts]) {
      patchAO(m, aoUniform);
    }
  }

  const toDevice = (v: THREE.Vector3) => v.clone().sub(centre);
  const frontOuter = band.toWorld(0, cfg.halo.thickness, band.titaniumHeight(0) * 0.5);
  const anchors: Record<string, THREE.Vector3> = {
    crownTop: toDevice(band.toWorld(0, 5, band.height(0))),
    shellFront: toDevice(frontOuter),
    titaniumSide: toDevice(band.toWorld(48, cfg.halo.thickness, band.titaniumHeight(48) * 0.5)),
    lightLine: toDevice(band.toWorld(L.s, band.outerP(L.s, qL), qL)),
    wordmark: toDevice(band.toWorld(W.s, band.outerP(W.s, qW), qW)),
    contactCentre: toDevice(contactCentres[2]),
    contactLeft: toDevice(contactCentres[3]),
    liner: toDevice(band.toWorld(-44, cfg.liner.face, cfg.shell.lipHeight + 2)),
    moduleL: toDevice(new THREE.Vector3(band.a + cfg.halo.thickness + cfg.module.proud, j.yCentre, cfg.module.z)),
    armL: toDevice(spine.point(cfg.arm.length * 0.5, 0, cfg.arm.thickness / 2)),
    earRestL: toDevice(ear.tip),
  };
  contactCentres.forEach((c, i) => (anchors[`contact_${i}`] = toDevice(c)));
  const restY = box.min.y - centre.y;

  const setExplode = (t: number) => {
    const k = clamp01(t);
    const e = k * k * (3 - 2 * k);
    aoUniform.value = 1 - smoothstep(0, 0.35, k);
    mats.contactGlow.uniforms.uExplode.value = e;
    for (const name of PART_NAMES) {
      const dir = explodeDir[name];
      const obj = parts[name];
      if (!obj) continue;
      if (dir) obj.position.copy(dir).multiplyScalar(e);
    }
  };
  const setContactGlow = (i: number, v: number) => {
    const m = mats.contacts[i];
    const k = Math.max(0, v);
    if (m) m.emissiveIntensity = k * 0.2;
    const arr = mats.contactGlow.uniforms.uGlow.value as number[];
    if (i >= 0 && i < arr.length) arr[i] = k;
  };
  const signal = new THREE.Color('#EAF2FF');
  const setLightLine = (v: number) => {
    const k = Math.max(0, v);
    mats.light.color.copy(signal).multiplyScalar(0.25 + 1.05 * k);
    mats.glow.uniforms.uIntensity.value = k;
  };
  setLightLine(1);

  return {
    group: root,
    parts,
    materials: mats,
    band,
    config: cfg,
    anchors,
    restY,
    setExplode,
    setContactGlow,
    setLightLine,
    stats() {
      let triangles = 0;
      let meshes = 0;
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          meshes++;
          const idx = m.geometry.getIndex();
          triangles += (idx ? idx.count : m.geometry.getAttribute('position').count) / 3;
        }
      });
      return { triangles, meshes };
    },
    dispose() {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      mats.dispose();
    },
  };
}
