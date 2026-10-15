import * as THREE from 'three';
import type { HarmoniqConfig } from '../config';

const UP = new THREE.Vector3(0, 1, 0);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/**
 * The halo's plan curve: a superellipse through the inner surface, from the
 * wearer's right temple (s < 0) across the forehead (s = 0) to the left
 * temple (s > 0), continued by a short straight tail running back (−Z) into
 * each temple module.
 *
 * Every halo part is placed with band coordinates (s, p, q):
 *   s  arc length along the inner reference curve (mm, 0 = front centre)
 *   p  outward distance from the inner reference surface (mm)
 *   q  height above the band's bottom edge (mm)
 * Frames are built from world-up, never Frenet, so profiles do not twist.
 */
export class Band {
  readonly a: number;
  readonly b: number;
  /** Arc length from front centre to the temple point. */
  readonly sTemple: number;
  /** Arc length from front centre to the end of the tail. */
  readonly sEnd: number;
  private readonly xs: Float64Array;
  private readonly zs: Float64Array;
  private readonly ss: Float64Array;

  constructor(private readonly cfg: HarmoniqConfig) {
    const { innerSpan, innerDepth, exponent, tail } = cfg.halo;
    this.a = innerSpan / 2;
    this.b = innerDepth;
    const n = exponent;
    const N = 6000;
    const xs: number[] = [];
    const zs: number[] = [];
    const ss: number[] = [];
    let s = 0;
    let px = 0;
    let pz = this.b;
    for (let i = 0; i <= N; i++) {
      // φ from π/2 (front) to 0 (left temple); dense enough that linear
      // interpolation of the arc-length table is exact to well under 0.01 mm.
      const t = i / N;
      const phi = (Math.PI / 2) * (1 - t);
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      const x = this.a * Math.pow(Math.max(c, 0), 2 / n);
      const z = this.b * Math.pow(Math.max(sn, 0), 2 / n);
      if (i > 0) s += Math.hypot(x - px, z - pz);
      xs.push(x);
      zs.push(z);
      ss.push(s);
      px = x;
      pz = z;
    }
    this.sTemple = s;
    // Straight tail back into the module.
    const TAIL_N = 40;
    for (let i = 1; i <= TAIL_N; i++) {
      const d = (tail * i) / TAIL_N;
      xs.push(this.a);
      zs.push(-d);
      ss.push(this.sTemple + d);
    }
    this.sEnd = this.sTemple + tail;
    this.xs = Float64Array.from(xs);
    this.zs = Float64Array.from(zs);
    this.ss = Float64Array.from(ss);
  }

  /** Point on the inner reference curve at y = 0. */
  point(s: number, out = new THREE.Vector3()): THREE.Vector3 {
    const sign = s < 0 ? -1 : 1;
    const sa = Math.min(Math.abs(s), this.sEnd);
    const ss = this.ss;
    let lo = 0;
    let hi = ss.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ss[mid] < sa) lo = mid;
      else hi = mid;
    }
    const t = (sa - ss[lo]) / Math.max(1e-9, ss[hi] - ss[lo]);
    const x = lerp(this.xs[lo], this.xs[hi], t);
    const z = lerp(this.zs[lo], this.zs[hi], t);
    // Beyond the tail end, extrapolate straight back.
    const over = Math.abs(s) - this.sEnd;
    return out.set(sign * x, 0, over > 0 ? z - over : z);
  }

  /** Unit tangent in the direction of increasing s. */
  tangent(s: number, out = new THREE.Vector3()): THREE.Vector3 {
    const h = 0.05;
    const a = this.point(s - h, new THREE.Vector3());
    const b = this.point(s + h, new THREE.Vector3());
    return out.subVectors(b, a).normalize();
  }

  /** Outward horizontal normal (away from the head). */
  normal(s: number, out = new THREE.Vector3()): THREE.Vector3 {
    const t = this.tangent(s, new THREE.Vector3());
    return out.crossVectors(t, UP).normalize();
  }

  /** Arc length (s ≥ 0 side) where the reference curve reaches depth z. */
  sAtZ(z: number): number {
    let lo = 0;
    let hi = this.sEnd + 40;
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      if (this.point(mid).z > z) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /** 1 at the front centre → 0 at the temples. */
  centreWeight(s: number): number {
    const t = Math.min(Math.abs(s) / this.sTemple, 1);
    return 0.5 + 0.5 * Math.cos(Math.PI * t);
  }

  height(s: number) {
    const { heightCenter, heightTemple } = this.cfg.halo;
    return lerp(heightTemple, heightCenter, this.centreWeight(s));
  }

  crownRise(s: number) {
    const { crownRiseCenter, crownRiseTemple } = this.cfg.shell;
    return lerp(crownRiseTemple, crownRiseCenter, this.centreWeight(s));
  }

  /** Height of the visible titanium face (top crisp edge). */
  titaniumHeight(s: number) {
    return this.height(s) - this.crownRise(s);
  }

  linerVisible(s: number) {
    const { visibleCenter, visibleTemple } = this.cfg.liner;
    return lerp(visibleTemple, visibleCenter, this.centreWeight(s));
  }

  /** Height where the cushion roll meets the liner. */
  cushionBottom(s: number) {
    return this.cfg.shell.lipHeight + this.cfg.partingGap + this.linerVisible(s);
  }

  rake(s: number) {
    const { rakeCenter, rakeTemple } = this.cfg.halo;
    return lerp(rakeTemple, rakeCenter, this.centreWeight(s));
  }

  /** Outer titanium face offset at height q (includes the barrel bow). */
  outerP(s: number, q: number) {
    const ht = this.titaniumHeight(s);
    return this.cfg.halo.thickness + this.cfg.halo.bow * Math.sin(Math.PI * clamp01(q / ht));
  }

  /** Band coordinates → world (mm). Rake pivots about the inner bottom edge. */
  toWorld(s: number, p: number, q: number, out = new THREE.Vector3()): THREE.Vector3 {
    const r = this.rake(s);
    const cr = Math.cos(r);
    const sr = Math.sin(r);
    const pp = p * cr - q * sr;
    const qq = p * sr + q * cr;
    const c = this.point(s, new THREE.Vector3());
    const n = this.normal(s, new THREE.Vector3());
    return out.copy(c).addScaledVector(n, pp).addScaledVector(UP, qq);
  }

  /**
   * Arc-length along the offset surface at distance `p` between front centre
   * and `s`. Used to place decals and pads with true surface lengths.
   */
  offsetArc(p: number, s0: number, s1: number, steps = 64): number {
    let len = 0;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const prev = this.point(s0, new THREE.Vector3()).addScaledVector(this.normal(s0, a), p);
    for (let i = 1; i <= steps; i++) {
      const s = lerp(s0, s1, i / steps);
      const cur = this.point(s, new THREE.Vector3()).addScaledVector(this.normal(s, b), p);
      len += cur.distanceTo(prev);
      prev.copy(cur);
    }
    return Math.sign(s1 - s0) * len;
  }

  /** Inverse of offsetArc: find s such that the offset arc from s0 equals `len`. */
  sForOffsetArc(p: number, s0: number, len: number): number {
    // Newton-free bracket search; the offset ratio is smooth and close to 1.
    let guess = s0 + len;
    for (let k = 0; k < 4; k++) {
      const got = this.offsetArc(p, s0, guess, 24);
      const ratio = Math.abs(got) > 1e-6 ? (guess - s0) / got : 1;
      guess = s0 + len * ratio;
    }
    return guess;
  }
}
