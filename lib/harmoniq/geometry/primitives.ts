import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V2 = [number, number];

/* ------------------------------------------------------------------ */
/* Rounded polygon loops (profiles)                                     */
/* ------------------------------------------------------------------ */

export interface Corner {
  p: number;
  q: number;
  /** Fillet radius (0 = sharp). */
  r?: number;
  /** Arc segments for the fillet. */
  segs?: number;
}

/**
 * Closed polygon with filleted corners and fixed per-edge subdivision, so the
 * point count never changes as dimensions vary along a sweep.
 * `edgeDivs[i]` subdivides the straight run leaving corner i.
 */
export function roundedLoop(corners: Corner[], edgeDivs: number[]): V2[] {
  const n = corners.length;
  type Arc = { start: V2; end: V2; pts: V2[] };
  const arcs: Arc[] = [];
  for (let i = 0; i < n; i++) {
    const c = corners[i];
    const prev = corners[(i - 1 + n) % n];
    const next = corners[(i + 1) % n];
    const dinx = c.p - prev.p;
    const diny = c.q - prev.q;
    const dl = Math.hypot(dinx, diny);
    const doutx = next.p - c.p;
    const douty = next.q - c.q;
    const ol = Math.hypot(doutx, douty);
    const ix = dinx / dl;
    const iy = diny / dl;
    const ox = doutx / ol;
    const oy = douty / ol;
    const r = c.r ?? 0;
    const segs = c.segs ?? Math.max(2, Math.round(r * 3));
    if (r <= 1e-4) {
      // Keep the point count stable when a fillet animates down to zero.
      const n0 = c.segs !== undefined ? c.segs + 1 : 1;
      arcs.push({ start: [c.p, c.q], end: [c.p, c.q], pts: Array.from({ length: n0 }, () => [c.p, c.q] as V2) });
      continue;
    }
    const cross = ix * oy - iy * ox;
    const dot = ix * ox + iy * oy;
    const theta = Math.atan2(Math.abs(cross), dot); // turning angle
    const t = Math.min(r * Math.tan(theta / 2), dl * 0.49, ol * 0.49);
    const rr = t / Math.tan(theta / 2);
    const start: V2 = [c.p - ix * t, c.q - iy * t];
    const end: V2 = [c.p + ox * t, c.q + oy * t];
    // Left normal for left turns (convex in a CCW loop), right normal otherwise.
    const side = cross >= 0 ? 1 : -1;
    const cx = start[0] + -iy * rr * side;
    const cy = start[1] + ix * rr * side;
    const a0 = Math.atan2(start[1] - cy, start[0] - cx);
    let a1 = Math.atan2(end[1] - cy, end[0] - cx);
    if (side > 0) {
      while (a1 < a0) a1 += Math.PI * 2;
    } else {
      while (a1 > a0) a1 -= Math.PI * 2;
    }
    const pts: V2[] = [];
    for (let k = 0; k <= segs; k++) {
      const a = a0 + ((a1 - a0) * k) / segs;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    arcs.push({ start, end, pts });
  }
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const arc = arcs[i];
    out.push(...arc.pts);
    const nextArc = arcs[(i + 1) % n];
    const divs = edgeDivs[i] ?? 1;
    for (let k = 1; k < divs; k++) {
      const t = k / divs;
      out.push([
        arc.end[0] + (nextArc.start[0] - arc.end[0]) * t,
        arc.end[1] + (nextArc.start[1] - arc.end[1]) * t,
      ]);
    }
  }
  return out;
}

export function polygonArea(pts: V2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/* ------------------------------------------------------------------ */
/* Stadium ("the loop") parametrisation                                */
/* ------------------------------------------------------------------ */

export interface StadiumParam {
  /** Centre of curvature along the long axis. */
  cx: number[];
  /** Outward unit normal. */
  nx: number[];
  ny: number[];
}

/**
 * A stadium ring parametrised so that offsetting by any radius keeps point
 * correspondence: point(R) = (cx + nx·R, ny·R). With R = 0 the ring collapses
 * onto the straight centre segment, which lets solids close cleanly.
 */
export function stadiumParam(halfStraight: number, nArc: number, nStraight: number): StadiumParam {
  const cx: number[] = [];
  const nx: number[] = [];
  const ny: number[] = [];
  const a = halfStraight;
  // Right arc, bottom → top.
  for (let k = 0; k <= nArc; k++) {
    const th = -Math.PI / 2 + (Math.PI * k) / nArc;
    cx.push(a);
    nx.push(Math.cos(th));
    ny.push(Math.sin(th));
  }
  // Top straight, right → left.
  for (let k = 1; k < nStraight; k++) {
    cx.push(a - (2 * a * k) / nStraight);
    nx.push(0);
    ny.push(1);
  }
  // Left arc, top → bottom.
  for (let k = 0; k <= nArc; k++) {
    const th = Math.PI / 2 + (Math.PI * k) / nArc;
    cx.push(-a);
    nx.push(Math.cos(th));
    ny.push(Math.sin(th));
  }
  // Bottom straight, left → right.
  for (let k = 1; k < nStraight; k++) {
    cx.push(-a + (2 * a * k) / nStraight);
    nx.push(0);
    ny.push(-1);
  }
  return { cx, nx, ny };
}

/** 2D stadium outline (length × height), centred on the origin. */
export function stadiumOutline(length: number, height: number, nArc = 16, nStraight = 8): V2[] {
  const r = height / 2;
  const a = Math.max(0, length / 2 - r);
  const sp = stadiumParam(a, nArc, nStraight);
  return sp.cx.map((cx, i) => [cx + sp.nx[i] * r, sp.ny[i] * r] as V2);
}

/**
 * Solid of revolution around a stadium: each profile point [d, z] becomes a
 * stadium ring of radius (r + d) at height z. Profile runs from one pole to
 * the other (e.g. top centre → edge → bottom centre). Repeat a point to make a
 * hard crease. Local frame: x = long axis, y = short axis, z = height.
 */
export function stadiumLathe(
  halfStraight: number,
  radius: number,
  profile: V2[],
  nArc = 14,
  nStraight = 8,
): THREE.BufferGeometry {
  const sp = stadiumParam(halfStraight, nArc, nStraight);
  const M = sp.cx.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  let perim = 0;
  const vAcc: number[] = [0];
  for (let i = 1; i < profile.length; i++) {
    perim += Math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]);
    vAcc.push(perim);
  }
  for (let i = 0; i < profile.length; i++) {
    const [d, z] = profile[i];
    const R = Math.max(0, radius + d);
    for (let j = 0; j < M; j++) {
      const x = sp.cx[j] + sp.nx[j] * R;
      const y = sp.ny[j] * R;
      positions.push(x, y, z);
      uvs.push(x / 10, y / 10 + vAcc[i] / 10);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const j1 = (j + 1) % M;
      const a = i * M + j;
      const b = i * M + j1;
      const c = (i + 1) * M + j;
      const d = (i + 1) * M + j1;
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

/**
 * Like stadiumLathe but around a rounded rectangle (half sizes hx ≥ hy,
 * corner radius rc). Inward offsets keep corners round until the radius is
 * used up, then square them off, finally collapsing onto the centre segment.
 */
export function roundedRectLathe(
  hx: number,
  hy: number,
  rc: number,
  profile: V2[],
  nArc = 6,
  nSx = 10,
  nSy = 4,
): THREE.BufferGeometry {
  type P = { sx: number; sy: number; nx: number; ny: number; tx: number; ty: number };
  // tx/ty: position along a straight edge in [-1, 1] (0 for corner points).
  const pts: P[] = [];
  const corner = (sx: number, sy: number, a0: number) => {
    for (let k = 0; k <= nArc; k++) {
      const th = a0 + ((Math.PI / 2) * k) / nArc;
      pts.push({ sx, sy, nx: Math.cos(th), ny: Math.sin(th), tx: 0, ty: 0 });
    }
  };
  const edge = (n: number, nx: number, ny: number, from: number, to: number, alongX: boolean, sx: number, sy: number) => {
    for (let k = 1; k < n; k++) {
      const t = from + ((to - from) * k) / n;
      pts.push({ sx, sy, nx, ny, tx: alongX ? t : 0, ty: alongX ? 0 : t });
    }
  };
  corner(1, 1, 0);
  edge(nSx, 0, 1, 1, -1, true, 0, 1);
  corner(-1, 1, Math.PI / 2);
  edge(nSy, -1, 0, 1, -1, false, -1, 0);
  corner(-1, -1, Math.PI);
  edge(nSx, 0, -1, -1, 1, true, 0, -1);
  corner(1, -1, (3 * Math.PI) / 2);
  edge(nSy, 1, 0, -1, 1, false, 1, 0);
  const M = pts.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  let vAcc = 0;
  for (let i = 0; i < profile.length; i++) {
    const [d, z] = profile[i];
    if (i > 0) vAcc += Math.hypot(d - profile[i - 1][0], z - profile[i - 1][1]);
    const r = Math.max(0, rc + d);
    const cx = Math.max(0, Math.min(hx - rc, hx + d));
    const cy = Math.max(0, Math.min(hy - rc, hy + d));
    for (const q of pts) {
      let x: number;
      let y: number;
      if (q.tx !== 0 || q.ty !== 0 || (q.sx === 0) !== (q.sy === 0)) {
        // Straight edge point.
        const ex = q.sx !== 0 ? q.sx * (cx + r) : q.tx * cx;
        const ey = q.sy !== 0 ? q.sy * (cy + r) : q.ty * cy;
        x = ex;
        y = ey;
      } else {
        x = q.sx * cx + q.nx * r;
        y = q.sy * cy + q.ny * r;
      }
      positions.push(x, y, z);
      uvs.push(x / 10, y / 10 + vAcc / 10);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const j1 = (j + 1) % M;
      const a = i * M + j;
      const b = i * M + j1;
      const c = (i + 1) * M + j;
      const d = (i + 1) * M + j1;
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

/* ------------------------------------------------------------------ */
/* Generic ring sweep                                                   */
/* ------------------------------------------------------------------ */

/**
 * Builds a tube-like surface from rings of world-space points (all rings the
 * same length, closed loops). Adds a UV seam column and optional flat caps.
 */
export function ringSweep(
  rings: THREE.Vector3[][],
  opts: { caps?: boolean; uvU?: number[]; uvV?: number[][]; capStart?: boolean; capEnd?: boolean } = {},
): THREE.BufferGeometry {
  const M = rings[0].length;
  const R = rings.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < R; i++) {
    const ring = rings[i];
    let vAcc = 0;
    for (let j = 0; j <= M; j++) {
      const p = ring[j % M];
      if (j > 0) vAcc += p.distanceTo(ring[(j - 1) % M]);
      positions.push(p.x, p.y, p.z);
      const u = opts.uvU ? opts.uvU[i] : i;
      const v = opts.uvV ? opts.uvV[i][j] : vAcc / 10;
      uvs.push(u, v);
    }
  }
  const W = M + 1;
  const index: number[] = [];
  for (let i = 0; i < R - 1; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * W + j;
      const b = i * W + j + 1;
      const c = (i + 1) * W + j;
      const d = (i + 1) * W + j + 1;
      index.push(a, b, c, b, d, c);
    }
  }
  // Orientation: faces must point away from each ring's centroid.
  {
    const mid = Math.floor((R - 1) / 2);
    const cen = centroidOf(rings[mid]);
    let score = 0;
    const A = new THREE.Vector3();
    const B = new THREE.Vector3();
    const C = new THREE.Vector3();
    for (let j = 0; j < M; j++) {
      A.copy(rings[mid][j]);
      B.copy(rings[mid][(j + 1) % M]);
      C.copy(rings[mid + 1][j]);
      const n = new THREE.Vector3().subVectors(B, A).cross(new THREE.Vector3().subVectors(C, A));
      score += n.dot(new THREE.Vector3().subVectors(A, cen));
    }
    if (score < 0) {
      for (let i = 0; i < index.length; i += 3) {
        const t = index[i + 1];
        index[i + 1] = index[i + 2];
        index[i + 2] = t;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  // Weld the seam column's normals.
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  const tmp = new THREE.Vector3();
  for (let i = 0; i < R; i++) {
    const a = i * W;
    const b = i * W + M;
    tmp.set(nrm.getX(a) + nrm.getX(b), nrm.getY(a) + nrm.getY(b), nrm.getZ(a) + nrm.getZ(b)).normalize();
    nrm.setXYZ(a, tmp.x, tmp.y, tmp.z);
    nrm.setXYZ(b, tmp.x, tmp.y, tmp.z);
  }
  const doStart = opts.capStart ?? opts.caps ?? false;
  const doEnd = opts.capEnd ?? opts.caps ?? false;
  if (!doStart && !doEnd) return g;
  const parts: THREE.BufferGeometry[] = [g];
  if (doStart) {
    const dir = centroidOf(rings[0]).sub(centroidOf(rings[1])).normalize();
    parts.push(planarCap(rings[0], dir));
  }
  if (doEnd) {
    const dir = centroidOf(rings[R - 1]).sub(centroidOf(rings[R - 2])).normalize();
    parts.push(planarCap(rings[R - 1], dir));
  }
  return mergeIndexed(parts);
}

export function centroidOf(ring: THREE.Vector3[]): THREE.Vector3 {
  const c = new THREE.Vector3();
  ring.forEach((p) => c.add(p));
  return c.multiplyScalar(1 / ring.length);
}

/** Flat cap over a (roughly planar) ring, triangulated in its best-fit plane. */
export function planarCap(ring: THREE.Vector3[], facing: THREE.Vector3): THREE.BufferGeometry {
  const centroid = new THREE.Vector3();
  ring.forEach((p) => centroid.add(p));
  centroid.multiplyScalar(1 / ring.length);
  // Newell normal.
  const n = new THREE.Vector3();
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    n.x += (a.y - b.y) * (a.z + b.z);
    n.y += (a.z - b.z) * (a.x + b.x);
    n.z += (a.x - b.x) * (a.y + b.y);
  }
  n.normalize();
  const u = new THREE.Vector3().subVectors(ring[0], centroid).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const contour = ring.map((p) => {
    const d = new THREE.Vector3().subVectors(p, centroid);
    return new THREE.Vector2(d.dot(u), d.dot(v));
  });
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const nn = facing.clone().normalize();
  ring.forEach((p, i) => {
    positions.push(p.x, p.y, p.z);
    normals.push(nn.x, nn.y, nn.z);
    uvs.push(contour[i].x / 10, contour[i].y / 10);
  });
  const index: number[] = [];
  for (const [a, b, c] of tris) index.push(a, b, c);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  // Orient the cap to face along its normal.
  orientFaces(g, nn);
  return g;
}

/** Make every triangle face roughly along `dir`. */
function orientFaces(g: THREE.BufferGeometry, dir: THREE.Vector3) {
  const pos = g.getAttribute('position');
  const idx = g.getIndex()!;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(pos, idx.getX(i));
    b.fromBufferAttribute(pos, idx.getX(i + 1));
    c.fromBufferAttribute(pos, idx.getX(i + 2));
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (n.dot(dir) < 0) {
      const t = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, t);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                     */
/* ------------------------------------------------------------------ */

/** Merge indexed geometries that share position/normal/uv attributes. */
export function mergeIndexed(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  let offset = 0;
  for (const g of parts) {
    const pos = g.getAttribute('position');
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const nrm = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    const idx = g.getIndex();
    if (idx) for (let i = 0; i < idx.count; i++) index.push(idx.getX(i) + offset);
    else for (let i = 0; i < pos.count; i++) index.push(i + offset);
    offset += pos.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(index);
  return out;
}

export function signedVolume(g: THREE.BufferGeometry): number {
  const pos = g.getAttribute('position');
  const idx = g.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let v = 0;
  const count = idx ? idx.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const ia = idx ? idx.getX(i) : i;
    const ib = idx ? idx.getX(i + 1) : i + 1;
    const ic = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, ia);
    b.fromBufferAttribute(pos, ib);
    c.fromBufferAttribute(pos, ic);
    v += a.dot(b.clone().cross(c)) / 6;
  }
  return v;
}

export function flipWinding(g: THREE.BufferGeometry) {
  const idx = g.getIndex();
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const t = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, t);
    }
    idx.needsUpdate = true;
  } else {
    const attrs = Object.values(g.attributes) as THREE.BufferAttribute[];
    for (const attr of attrs) {
      const s = attr.itemSize;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < attr.count; i += 3) {
        for (let k = 0; k < s; k++) {
          const t = arr[(i + 1) * s + k];
          arr[(i + 1) * s + k] = arr[(i + 2) * s + k];
          arr[(i + 2) * s + k] = t;
        }
      }
      attr.needsUpdate = true;
    }
  }
}

/** Closed solids: make faces point outward, then recompute smooth normals. */
export function finalizeSolid(g: THREE.BufferGeometry, recomputeNormals = true): THREE.BufferGeometry {
  if (signedVolume(g) < 0) flipWinding(g);
  if (recomputeNormals) g.computeVertexNormals();
  return g;
}

/** Map every vertex position through `fn`; normals are recomputed by caller. */
export function mapPositions(g: THREE.BufferGeometry, fn: (v: THREE.Vector3) => THREE.Vector3) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const w = fn(v);
    pos.setXYZ(i, w.x, w.y, w.z);
  }
  pos.needsUpdate = true;
}

/** Mirror across the YZ plane (wearer's left ↔ right), preserving outward faces. */
export function mirrorX(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = src.clone();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setX(i, -pos.getX(i));
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (nrm) for (let i = 0; i < nrm.count; i++) nrm.setX(i, -nrm.getX(i));
  const tan = g.getAttribute('tangent') as THREE.BufferAttribute | undefined;
  if (tan) for (let i = 0; i < tan.count; i++) tan.setXYZW(i, -tan.getX(i), tan.getY(i), tan.getZ(i), -tan.getW(i));
  flipWinding(g);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/* ------------------------------------------------------------------ */
/* Extrude with soft bevels and well-behaved normals                    */
/* ------------------------------------------------------------------ */

/**
 * ExtrudeGeometry with soft bevels whose normals are computed per group: the
 * flat faces stay exactly flat, the bevels and walls are welded and smoothed.
 * Avoids the faceting/streaking you get from merging caps with bevels.
 * Returned geometry is centred on z = 0 (thickness along Z).
 */
export function softExtrude(
  shape: THREE.Shape,
  thickness: number,
  bevel: number,
  bevelSegments = 5,
): THREE.BufferGeometry {
  const depth = Math.max(0.01, thickness - 2 * bevel);
  const raw = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments,
    curveSegments: 1,
    steps: 1,
  });
  raw.translate(0, 0, -depth / 2);
  const pos = raw.getAttribute('position');
  const groups = raw.groups;
  const capTris: number[] = [];
  const sideTris: number[] = [];
  for (const gr of groups) {
    const target = gr.materialIndex === 0 ? capTris : sideTris;
    for (let i = gr.start; i < gr.start + gr.count; i += 3) target.push(i);
  }
  const out = new THREE.BufferGeometry();
  const P: number[] = [];
  const N: number[] = [];
  const U: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  // Caps: exact ±Z.
  for (const i of capTris) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const nz = Math.sign(new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).z) || 1;
    for (const v of [a, b, c]) {
      P.push(v.x, v.y, v.z);
      N.push(0, 0, nz);
      U.push(v.x / 10, v.y / 10);
    }
  }
  // Sides: weld + smooth.
  const sp: number[] = [];
  for (const i of sideTris) {
    for (let k = 0; k < 3; k++) {
      a.fromBufferAttribute(pos, i + k);
      sp.push(a.x, a.y, a.z);
    }
  }
  const sideGeo = new THREE.BufferGeometry();
  sideGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const welded = mergeVertices(sideGeo, 1e-4);
  welded.computeVertexNormals();
  const wIdx = welded.getIndex()!;
  const wN = welded.getAttribute('normal');
  for (let k = 0; k < sp.length / 3; k++) {
    const wi = wIdx.getX(k);
    P.push(sp[k * 3], sp[k * 3 + 1], sp[k * 3 + 2]);
    N.push(wN.getX(wi), wN.getY(wi), wN.getZ(wi));
    U.push(sp[k * 3] / 10, (sp[k * 3 + 1] + sp[k * 3 + 2]) / 10);
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  raw.dispose();
  sideGeo.dispose();
  welded.dispose();
  return out;
}

/* ------------------------------------------------------------------ */
/* Spines                                                               */
/* ------------------------------------------------------------------ */

export interface SpineFrame {
  p: THREE.Vector3;
  t: THREE.Vector3;
  n: THREE.Vector3;
  b: THREE.Vector3;
}

/**
 * Samples a curve by arc length and builds rotation-minimising frames
 * (double reflection), seeded with an initial normal.
 */
export function rmfFrames(
  curve: THREE.Curve<THREE.Vector3>,
  countOrUs: number | number[],
  n0: THREE.Vector3,
): SpineFrame[] {
  const us =
    typeof countOrUs === 'number'
      ? Array.from({ length: countOrUs + 1 }, (_, i) => i / countOrUs)
      : countOrUs;
  const frames: SpineFrame[] = us.map((u) => ({
    p: curve.getPointAt(Math.min(1, Math.max(0, u))),
    t: curve.getTangentAt(Math.min(1, Math.max(0, u))).normalize(),
    n: new THREE.Vector3(),
    b: new THREE.Vector3(),
  }));
  frames[0].n.copy(n0).addScaledVector(frames[0].t, -n0.dot(frames[0].t)).normalize();
  frames[0].b.crossVectors(frames[0].t, frames[0].n).normalize();
  for (let i = 0; i < frames.length - 1; i++) {
    const f0 = frames[i];
    const f1 = frames[i + 1];
    const v1 = new THREE.Vector3().subVectors(f1.p, f0.p);
    const c1 = v1.dot(v1);
    if (c1 < 1e-12) {
      f1.n.copy(f0.n);
      f1.b.copy(f0.b);
      continue;
    }
    const rL = f0.n.clone().addScaledVector(v1, (-2 / c1) * v1.dot(f0.n));
    const tL = f0.t.clone().addScaledVector(v1, (-2 / c1) * v1.dot(f0.t));
    const v2 = new THREE.Vector3().subVectors(f1.t, tL);
    const c2 = v2.dot(v2);
    f1.n.copy(rL);
    if (c2 > 1e-12) f1.n.addScaledVector(v2, (-2 / c2) * v2.dot(rL));
    f1.n.normalize();
    f1.b.crossVectors(f1.t, f1.n).normalize();
  }
  return frames;
}

/** Arc-length lookup over a polyline of points. */
export class Polyline {
  readonly len: number[];
  constructor(readonly pts: THREE.Vector3[]) {
    this.len = [0];
    for (let i = 1; i < pts.length; i++) this.len.push(this.len[i - 1] + pts[i].distanceTo(pts[i - 1]));
  }
  get total() {
    return this.len[this.len.length - 1];
  }
  locate(s: number): { i: number; t: number } {
    const L = this.len;
    const x = Math.min(Math.max(s, 0), this.total);
    let lo = 0;
    let hi = L.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (L[m] < x) lo = m;
      else hi = m;
    }
    return { i: lo, t: (x - L[lo]) / Math.max(1e-9, L[hi] - L[lo]) };
  }
}

/**
 * Smooth per-vertex tangents so anisotropic metal and normal maps don't fall
 * back to per-triangle screen-space derivatives (which facet on long or bent
 * triangles). Degenerate results get a stable fallback perpendicular to N.
 */
export function ensureTangents(g: THREE.BufferGeometry) {
  if (!g.getIndex() || !g.getAttribute('uv') || !g.getAttribute('normal')) return;
  g.computeTangents();
  const tan = g.getAttribute('tangent') as THREE.BufferAttribute;
  const nrm = g.getAttribute('normal');
  const t = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < tan.count; i++) {
    t.set(tan.getX(i), tan.getY(i), tan.getZ(i));
    if (!(t.lengthSq() > 1e-10) || !Number.isFinite(t.x)) {
      n.fromBufferAttribute(nrm, i);
      t.set(Math.abs(n.y) < 0.9 ? 0 : 1, Math.abs(n.y) < 0.9 ? 1 : 0, 0).cross(n).normalize();
      tan.setXYZW(i, t.x, t.y, t.z, 1);
    }
  }
  tan.needsUpdate = true;
}

/**
 * Smooth normals by welding coincident positions (ignores UV seams and the
 * duplicated pole rings of lathes), then copying the result back. Removes
 * the faint creases that per-vertex normals show on degenerate rings.
 * Hard creases made by repeating a profile point are lost, so only use this
 * on surfaces that should be smooth everywhere, or where creases are 90°+
 * and handled by flat caps.
 */
export function weldNormals(g: THREE.BufferGeometry, tolerance = 1e-4) {
  const pos = g.getAttribute('position');
  const idx = g.getIndex();
  const key = (i: number) =>
    `${Math.round(pos.getX(i) / tolerance)},${Math.round(pos.getY(i) / tolerance)},${Math.round(pos.getZ(i) / tolerance)}`;
  const acc = new Map<string, THREE.Vector3>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const count = idx ? idx.count : pos.count;
  for (let t = 0; t < count; t += 3) {
    const ia = idx ? idx.getX(t) : t;
    const ib = idx ? idx.getX(t + 1) : t + 1;
    const ic = idx ? idx.getX(t + 2) : t + 2;
    a.fromBufferAttribute(pos, ia);
    b.fromBufferAttribute(pos, ib);
    c.fromBufferAttribute(pos, ic);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    for (const i of [ia, ib, ic]) {
      const k = key(i);
      const v = acc.get(k);
      if (v) v.add(n);
      else acc.set(k, n.clone());
    }
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = (acc.get(key(i)) ?? new THREE.Vector3(0, 1, 0)).clone().normalize();
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
}
