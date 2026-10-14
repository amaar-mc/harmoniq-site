import { APP, CLOSE, DESIGN_BEATS, LAYERS, LOOP, type Range } from './timeline';
import type { Pose } from './director';

/**
 * Camera and device choreography as keyframes anchored to scene progress.
 * `poseAt(scrollY)` is a pure function of scroll: every visual on the stage
 * can be reproduced from the scroll position alone, so scrolling back up (or
 * jumping) always lands on the same frame.
 *
 * Keys are cumulative: each key only lists what changes; untouched fields hold.
 * Between two keys every field eases with a sine in-out, so camera moves are
 * continuous spherical orbits (azimuth, elevation, distance) around a target.
 */

export type Anchor = readonly [scene: string, progress: number, viewportOffset?: number];

interface KeySpec {
  at: Anchor;
  pose: Partial<Pose>;
  /** Ease of the segment arriving at this key. */
  ease?: 'sine' | 'linear' | 'out' | 'in';
}

export interface Key {
  y: number;
  pose: Pose;
  ease: KeySpec['ease'];
}

const BASE: Pose = {
  az: 62,
  el: 19,
  dist: 4.6,
  tx: 0.08,
  ty: -0.02,
  tz: -0.12,
  fov: 23,
  sx: 0,
  sy: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  lift: 0,
  explode: 0,
  glow: 0,
  light: 1,
  breath: 1,
  head: 0,
  headAlpha: 0,
  floor: 1,
  stage: 1,
  mood: 0,
  sweep: 0,
  word: 0,
  hairline: 0,
};

const mid = (r: Range, f: number) => r[0] + (r[1] - r[0]) * f;
const k = (scene: string, p: number, pose: Partial<Pose>, ease?: KeySpec['ease'], vh = 0): KeySpec => ({
  at: [scene, p, vh],
  pose,
  ease,
});

/* -------------------------------------------------------------------------- */
/* Desktop                                                                    */
/* -------------------------------------------------------------------------- */

function desktopKeys(): KeySpec[] {
  const B = DESIGN_BEATS.desktop;
  const L = B.layers;
  const lay = (f: number) => mid(L, f);
  return [
    // 01 Hero: three-quarter view on the warm floor, device right of the headline.
    k('hero', 0, { az: 62, el: 19, dist: 5.7, tx: 0.08, ty: -0.03, tz: -0.12, fov: 23, sx: 0.31, sy: -0.02 }),
    k('hero', 1, { az: 55, el: 17, dist: 5.4, lift: 0.03, floor: 0.75 }),
    // 02 Reveal: lifts, turns to face the viewer, the camera pushes in.
    k('reveal', 0.08, { word: 0 }),
    k('reveal', 0.32, { az: 0, el: 8, dist: 4.6, tx: 0, ty: 0, tz: 0, sx: 0, sy: 0.1, lift: 0.14, floor: 0, word: 1 }),
    k('reveal', 0.86, { dist: 3.9, el: 6, sy: 0.12, word: 1 }, 'linear'),
    k('reveal', 1, { word: 0, dist: 3.8 }),
    // 03a Halo: low three-quarter, a highlight sweeps along the titanium.
    k('design', 0, { az: 46, el: 3, dist: 4.5, tx: 0.06, ty: 0.02, tz: -0.05, sx: 0.27, sy: 0.02, sweep: -55, breath: 0.4 }),
    k('design', mid(B.halo, 0.92), { az: 38, el: 5, dist: 4.3, sweep: 55 }, 'linear'),
    // 03b Crown: from above.
    k('design', mid(B.crown, 0.35), { az: 18, el: 70, dist: 5.0, tx: 0.03, ty: 0, tz: -0.06, sx: 0.27, sy: 0, sweep: 20, breath: 0 }),
    k('design', mid(B.crown, 0.9), { az: 10, el: 76, dist: 4.9 }),
    // Room turns to graphite between crown and contacts.
    k('design', 0.33, { mood: 0 }),
    k('design', 0.37, { mood: 1 }),
    // 03c Contacts: inside the band, contacts warm one by one.
    k('design', mid(B.contacts, 0.3), { az: 204, el: 18, dist: 2.05, tx: 0.02, ty: 0.15, tz: 0.5, fov: 30, sx: 0.25, sy: 0.3, sweep: 0, glow: 0 }),
    k('design', mid(B.contacts, 0.85), { az: 198, el: 17, dist: 1.85, sy: 0.32, glow: 5 }, 'linear'),
    k('design', mid(B.contacts, 1), { glow: 5 }),
    // 03d Fit: side profile, a construction-line head draws itself, then the camera orbits away.
    k('design', mid(B.fit, 0.22), { az: 90, el: 3, dist: 7.2, tx: 0, ty: -0.36, tz: -0.25, fov: 23, sx: 0.24, sy: 0, glow: 0, head: 0, headAlpha: 1 }),
    k('design', mid(B.fit, 0.6), { head: 1 }, 'linear'),
    k('design', mid(B.fit, 0.7), { az: 86 }),
    k('design', mid(B.fit, 1), { az: 52, el: 14, dist: 6.2, headAlpha: 0 }),
    // 03e Layers: exploded along clean axes, labels, reassembly.
    k('design', lay(0.06), { az: 44, el: 19, dist: 4.9, tx: 0.08, ty: 0.02, tz: -0.06, fov: 29, sx: 0.24, sy: 0, rx: -6, head: 0, explode: 0 }),
    k('design', lay(LAYERS.explode[1]), { explode: 1, az: 40, dist: 5.1 }),
    k('design', lay(LAYERS.reassemble[0]), { explode: 1, az: 34, el: 21 }, 'linear'),
    k('design', lay(LAYERS.reassemble[1]), { explode: 0, az: 30, el: 22, dist: 4.9 }),
    // 04 Loop: small, from above and behind; the loop is drawn around it.
    k('loop', 0, { az: 196, el: 60, dist: 10.6, tx: 0, ty: 0, tz: 0, fov: 23, sx: -0.2, sy: -0.08, rx: 0, light: 1, breath: 0 }),
    k('loop', mid(LOOP.nodes[0], 0.1), { glow: 0 }),
    k('loop', mid(LOOP.nodes[0], 0.75), { glow: 5 }, 'linear'),
    k('loop', LOOP.nodes[4][1], { az: 204, glow: 5 }, 'linear'),
    k('loop', LOOP.handoff[0], { stage: 1, light: 1 }),
    k('loop', mid(LOOP.handoff, 0.6), { stage: 0, light: 1.6, glow: 2 }),
    // 05–07: the stage rests (rendering pauses); jump to the close pose unseen.
    k('close', -0.02, { stage: 0, az: 34, el: 11, dist: 8.6, tx: 0, ty: 0, tz: 0, sx: 0, sy: 0.4, ry: 0, glow: 0, light: 1, breath: 1, mood: 1, floor: 0 }),
    // 08 Close: charcoal, the device turning, the light line breathing.
    k('close', 0.12, { stage: 1, ry: -14 }),
    k('close', CLOSE.hairline[0], { ry: -52, light: 1, breath: 1 }, 'linear'),
    k('close', CLOSE.hairline[1], { ry: -70, light: 1.5, breath: 0, hairline: 1 }),
  ];
}

/* -------------------------------------------------------------------------- */
/* Mobile (portrait framings, fewer beats)                                    */
/* -------------------------------------------------------------------------- */

function mobileKeys(): KeySpec[] {
  const B = DESIGN_BEATS.mobile;
  const L = B.layers;
  const lay = (f: number) => mid(L, f);
  return [
    k('hero', 0, { az: 60, el: 20, dist: 10.2, tx: 0.06, ty: -0.03, tz: -0.1, fov: 26, sx: 0, sy: 0.24 }),
    k('hero', 1, { az: 52, el: 17, dist: 9.9, lift: 0.03, floor: 0.75 }),
    k('reveal', 0.08, { word: 0 }),
    k('reveal', 0.32, { az: 0, el: 8, dist: 10.4, tx: 0, ty: 0, tz: 0, sy: 0.2, lift: 0.14, floor: 0, word: 1 }),
    k('reveal', 0.86, { dist: 9.4, el: 6, word: 1 }, 'linear'),
    k('reveal', 1, { word: 0, dist: 9.3 }),
    // Halo (the crown folds in here: the camera rises over the top at the end).
    k('design', 0, { az: 44, el: 4, dist: 9.4, tx: 0.04, ty: 0.02, tz: -0.05, sy: 0.28, sweep: -55, breath: 0.4 }),
    k('design', mid(B.halo, 0.45), { az: 34, el: 8, dist: 9.1, sweep: 40 }, 'linear'),
    k('design', mid(B.halo, 0.75), { az: 18, el: 62, dist: 9.8, sweep: 55, breath: 0 }),
    k('design', 0.23, { mood: 0 }),
    k('design', 0.27, { mood: 1 }),
    k('design', mid(B.contacts, 0.3), { az: 196, el: 16, dist: 3.0, tx: 0.02, ty: 0.15, tz: 0.5, fov: 32, sy: 0.36, sweep: 0, glow: 0 }),
    k('design', mid(B.contacts, 0.85), { az: 190, el: 15, dist: 2.7, glow: 5 }, 'linear'),
    k('design', mid(B.contacts, 1), { glow: 5 }),
    k('design', mid(B.fit, 0.22), { az: 90, el: 3, dist: 10.5, tx: 0, ty: -0.33, tz: -0.25, fov: 26, sy: 0.2, glow: 0, head: 0, headAlpha: 1 }),
    k('design', mid(B.fit, 0.6), { head: 1 }, 'linear'),
    k('design', mid(B.fit, 0.7), { az: 86 }),
    k('design', mid(B.fit, 1), { az: 52, el: 14, dist: 9.2, headAlpha: 0 }),
    k('design', lay(0.06), { az: 44, el: 20, dist: 11, tx: 0.06, ty: 0.02, tz: -0.06, fov: 30, sy: 0.3, rx: -6, head: 0, explode: 0 }),
    k('design', lay(LAYERS.explode[1]), { explode: 1, az: 40, dist: 11.6 }),
    k('design', lay(LAYERS.reassemble[0]), { explode: 1, az: 34, el: 21 }, 'linear'),
    k('design', lay(LAYERS.reassemble[1]), { explode: 0, az: 30, el: 22, dist: 10.6 }),
    k('loop', 0, { az: 196, el: 60, dist: 14, tx: 0, ty: 0, tz: 0, fov: 26, sx: 0, sy: 0.4, rx: 0, light: 1, breath: 0 }),
    k('loop', mid(LOOP.nodes[0], 0.1), { glow: 0 }),
    k('loop', mid(LOOP.nodes[0], 0.75), { glow: 5 }, 'linear'),
    k('loop', LOOP.nodes[4][1], { az: 204, glow: 5 }, 'linear'),
    k('loop', LOOP.handoff[0], { stage: 1, light: 1 }),
    k('loop', mid(LOOP.handoff, 0.6), { stage: 0, light: 1.6, glow: 2 }),
    k('close', -0.02, { stage: 0, az: 34, el: 11, dist: 11.5, tx: 0, ty: 0, tz: 0, sx: 0, sy: 0.44, ry: 0, glow: 0, light: 1, breath: 1, mood: 1, floor: 0, fov: 26 }),
    k('close', 0.12, { stage: 1, ry: -14 }),
    k('close', CLOSE.hairline[0], { ry: -52, light: 1, breath: 1 }, 'linear'),
    k('close', CLOSE.hairline[1], { ry: -70, light: 1.5, breath: 0, hairline: 1 }),
  ];
}

/* -------------------------------------------------------------------------- */
/* Page background                                                            */
/* -------------------------------------------------------------------------- */

const PAPER = '#F2F0EC';
const GRAPHITE = '#26262A';
const CHARCOAL = '#121213';

function bgKeys(mobile: boolean): [Anchor, string][] {
  const d0 = mobile ? 0.23 : 0.33;
  const d1 = mobile ? 0.27 : 0.37;
  return [
    [['hero', 0], PAPER],
    [['design', d0], PAPER],
    [['design', d1], GRAPHITE],
    [['app', APP.toPaper[0]], GRAPHITE],
    [['app', APP.toPaper[1]], PAPER],
    [['close', -0.02], PAPER],
    [['close', 0.1], CHARCOAL],
  ];
}

/* -------------------------------------------------------------------------- */
/* Resolution and sampling                                                    */
/* -------------------------------------------------------------------------- */

export interface Choreography {
  keys: Key[];
  bg: { y: number; rgb: [number, number, number] }[];
}

type Resolve = (a: Anchor) => number | null;

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function buildChoreography(mobile: boolean, resolve: Resolve): Choreography {
  const specs = mobile ? mobileKeys() : desktopKeys();
  const keys: Key[] = [];
  let pose: Pose = { ...BASE };
  let lastY = -Infinity;
  for (const s of specs) {
    pose = { ...pose, ...s.pose };
    const y = resolve(s.at);
    if (y === null) continue;
    // Keep keys monotonic even if two anchors resolve out of order.
    const yy = Math.max(y, lastY);
    lastY = yy;
    keys.push({ y: yy, pose, ease: s.ease ?? 'sine' });
  }
  const bg = bgKeys(mobile)
    .map(([a, c]) => ({ y: resolve(a), rgb: hexToRgb(c) }))
    .filter((b): b is { y: number; rgb: [number, number, number] } => b.y !== null)
    .sort((a, b) => a.y - b.y);
  return { keys, bg };
}

const easeFns = {
  sine: (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  linear: (t: number) => t,
  out: (t: number) => 1 - (1 - t) * (1 - t),
  in: (t: number) => t * t,
};

const FIELDS = Object.keys(BASE) as (keyof Pose)[];

/** Samples the choreography at scroll position y into `out`. */
export function poseAt(c: Choreography, y: number, out: Pose, snap = false): Pose {
  const keys = c.keys;
  if (!keys.length) return Object.assign(out, BASE);
  if (y <= keys[0].y) return Object.assign(out, keys[0].pose);
  const last = keys[keys.length - 1];
  if (y >= last.y) return Object.assign(out, last.pose);
  let lo = 0;
  let hi = keys.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (keys[m].y <= y) lo = m;
    else hi = m;
  }
  const a = keys[lo];
  const b = keys[hi];
  const span = b.y - a.y;
  let t = span > 0 ? (y - a.y) / span : 1;
  // Reduced motion: no camera travel. Hold a pose, then cut (the stage crossfades).
  if (snap) t = t < 0.5 ? 0 : 1;
  const e = easeFns[b.ease ?? 'sine'](t);
  for (const f of FIELDS) out[f] = a.pose[f] + (b.pose[f] - a.pose[f]) * e;
  return out;
}

/** Index of the key segment at y (used to detect cuts in reduced motion). */
export function segmentAt(c: Choreography, y: number): number {
  const keys = c.keys;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].y <= y) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  return b && b.y > a.y && y - a.y > (b.y - a.y) / 2 ? i + 1 : i;
}

export function bgAt(c: Choreography, y: number): string {
  const bg = c.bg;
  if (!bg.length) return PAPER;
  let rgb = bg[0].rgb;
  if (y >= bg[bg.length - 1].y) rgb = bg[bg.length - 1].rgb;
  else if (y > bg[0].y) {
    for (let i = 0; i < bg.length - 1; i++) {
      const a = bg[i];
      const b = bg[i + 1];
      if (y >= a.y && y <= b.y) {
        const t = b.y > a.y ? (y - a.y) / (b.y - a.y) : 1;
        // Linear, so sections that mirror the crossfade (app) can match it exactly.
        const e = t;
        rgb = [0, 1, 2].map((j) => Math.round(a.rgb[j] + (b.rgb[j] - a.rgb[j]) * e)) as [number, number, number];
        break;
      }
    }
  }
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function createPose(): Pose {
  return { ...BASE };
}
