/**
 * Geometry for 04 Closed loop: the stadium path, node stations, and the
 * deterministic traces drawn in the node visuals. Pure functions only, so the
 * same markup renders on the server and the client.
 */

/** The loop's default box in SVG user units (height is always 100; width follows the CSS aspect). */
export const VB = { w: 182, h: 100 } as const;

/** Five stations, evenly spaced by arc length, starting at the left apex (Sense), clockwise. */
export const NODE_COUNT = 5;

const f = (n: number) => +n.toFixed(3);

/**
 * Stadium path starting at the left apex and running clockwise on screen
 * (up over the top, down the right, back along the bottom). Arcs are split
 * into quarters so no arc spans a full diameter.
 */
export function stadiumD(w: number, h: number): string {
  const r = h / 2;
  const x0 = r;
  const x1 = w - r;
  return [
    `M0 ${f(r)}`,
    `A${f(r)} ${f(r)} 0 0 1 ${f(x0)} 0`,
    `L${f(x1)} 0`,
    `A${f(r)} ${f(r)} 0 0 1 ${f(w)} ${f(r)}`,
    `A${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(h)}`,
    `L${f(x0)} ${f(h)}`,
    `A${f(r)} ${f(r)} 0 0 1 0 ${f(r)}`,
  ].join(' ');
}

export interface PathPoint {
  x: number;
  y: number;
  /** Direction of travel, degrees (0 = right, 90 = down). */
  angle: number;
}

/** Point at arc-length fraction t (0..1) of `stadiumD(w, h)`. */
export function stadiumPoint(t: number, w: number, h: number): PathPoint {
  const r = h / 2;
  const l = w - h;
  const q = (Math.PI * r) / 2;
  const total = 2 * l + 4 * q;
  let s = (((t % 1) + 1) % 1) * total;
  const deg = (rad: number) => (rad * 180) / Math.PI;

  if (s <= q) {
    const a = s / r;
    return { x: r - r * Math.cos(a), y: r - r * Math.sin(a), angle: deg(Math.atan2(-Math.cos(a), Math.sin(a))) };
  }
  s -= q;
  if (s <= l) return { x: r + s, y: 0, angle: 0 };
  s -= l;
  if (s <= 2 * q) {
    const b = s / r;
    return { x: r + l + r * Math.sin(b), y: r - r * Math.cos(b), angle: deg(b) };
  }
  s -= 2 * q;
  if (s <= l) return { x: r + l - s, y: h, angle: 180 };
  s -= l;
  const c = s / r;
  return { x: r - r * Math.sin(c), y: r + r * Math.cos(c), angle: 180 + deg(c) };
}

export type LabelSide = 'up' | 'down' | 'left' | 'right';

/**
 * Label side per station, [desktop, mobile]. Labels sit outside the loop; on
 * mobile the left-apex label tucks inside (the margin is too narrow). The
 * stations are symmetric about the horizontal axis for any aspect, so this holds.
 */
export const STATION_SIDES: Array<[LabelSide, LabelSide]> = [
  ['left', 'right'],
  ['up', 'up'],
  ['up', 'up'],
  ['down', 'down'],
  ['down', 'down'],
];

/** Station positions in % of a w × h loop box. */
export function stationsFor(w: number, h: number) {
  return Array.from({ length: NODE_COUNT }, (_, k) => {
    const p = stadiumPoint(k / NODE_COUNT, w, h);
    return { left: f((p.x / w) * 100), top: f((p.y / h) * 100) };
  });
}

/* -------------------------------------------------------------------------- */
/* Traces                                                                     */
/* -------------------------------------------------------------------------- */

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TAU = Math.PI * 2;

/** Interpret visual: EEG-like history up to "now", then a smoother dashed forecast. viewBox 400 × 120. */
export const EEG = { w: 400, h: 120, now: 252, mid: 64 } as const;

function eegSignal() {
  const rand = lcg(20160407);
  let n = 0;
  const env = (t: number) => 0.62 + 0.38 * Math.sin((TAU * t) / 150 + 0.7);
  const alpha = (t: number) => 0.6 * env(t) * Math.sin((TAU * t) / 21 + 0.3);
  const theta = (t: number) => 0.3 * Math.sin((TAU * t) / 67 + 1.9);
  const beta = (t: number) => 0.13 * Math.sin((TAU * t) / 7.4 + 0.5) * (0.5 + 0.5 * Math.sin((TAU * t) / 90));
  const transient = (t: number) => -0.72 * Math.exp(-(((t - 118) / 7) ** 2)) + 0.34 * Math.exp(-(((t - 133) / 9) ** 2));
  const hist: Array<[number, number]> = [];
  for (let t = 0; t <= EEG.now; t += 2) {
    n = 0.55 * n + 0.45 * (rand() - 0.5) * 2;
    const v = alpha(t) + theta(t) + beta(t) + transient(t) + 0.2 * n;
    hist.push([t, v]);
  }
  const last = hist[hist.length - 1][1];
  const smooth = (t: number) => {
    const u = Math.min(1, (t - EEG.now) / (EEG.w - EEG.now));
    const decay = 1 - 0.42 * u * u * (3 - 2 * u);
    return alpha(t) * decay + theta(t) * (1 - 0.25 * u);
  };
  const offset = last - smooth(EEG.now);
  const fut: Array<[number, number]> = [];
  for (let t = EEG.now; t <= EEG.w; t += 2) {
    fut.push([t, smooth(t) + offset * Math.exp(-(t - EEG.now) / 10)]);
  }
  return { hist, fut, last };
}

function toD(points: Array<[number, number]>, scale: number, mid: number) {
  return points.map(([x, v], i) => `${i ? 'L' : 'M'}${f(x)} ${f(mid - v * scale)}`).join('');
}

const signal = eegSignal();
export const EEG_HISTORY_D = toD(signal.hist, 25, EEG.mid);
export const EEG_FORECAST_D = toD(signal.fut, 25, EEG.mid);
export const EEG_NOW_Y = f(EEG.mid - signal.last * 25);

/** Deliver visual: a steady sine, longer than its window so it can slide by whole wavelengths. viewBox 400 × 64. */
export const WAVE = { w: 400, h: 64, amp: 12, lambda: 34, extra: 3 } as const;

export const WAVE_D = (() => {
  const pts: Array<[number, number]> = [];
  const end = WAVE.w + WAVE.lambda * WAVE.extra;
  for (let x = 0; x <= end; x += 1.7) pts.push([x, Math.sin((TAU * x) / WAVE.lambda)]);
  return toD(pts, WAVE.amp, WAVE.h / 2);
})();

/** Sense visual: five contacts on a gentle arc, centre largest (as on the device). */
export const CONTACTS = [-2, -1, 0, 1, 2].map((k) => {
  const deg = k * 9;
  const rad = (deg * Math.PI) / 180;
  const R = 520;
  const sizes = [
    [34, 15],
    [44, 18],
    [56, 22],
  ];
  const [w, h] = sizes[2 - Math.abs(k)];
  return {
    /** % of a 400-wide box. */
    left: f(((200 + R * Math.sin(rad)) / 400) * 100),
    /** px from the top of the 100px box. */
    top: f(30 + R * (1 - Math.cos(rad))),
    rotate: deg,
    w,
    h,
  };
});

/** The arc the contacts sit on (the liner), viewBox 400 × 100. */
export const CONTACT_ARC_D = (() => {
  const R = 520;
  const pts: Array<[number, number]> = [];
  for (let deg = -21; deg <= 21.01; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    pts.push([200 + R * Math.sin(rad), -(30 + R * (1 - Math.cos(rad)))]);
  }
  return toD(pts, 1, 0);
})();

/** Personalize visual: knob positions (0..1), before → after. */
export const SLIDERS = [
  { from: 0.3, to: 0.64 },
  { from: 0.68, to: 0.4 },
  { from: 0.42, to: 0.76 },
] as const;
