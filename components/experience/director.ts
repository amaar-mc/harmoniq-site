'use client';

/**
 * The director: one mutable store shared by the scroll timeline (writer) and
 * the WebGL stage (reader). Scroll writes `target`; the stage damps `current`
 * toward it every rendered frame, renders, then projects anchors to screen
 * space and notifies `onFrame` listeners (HTML overlays positioned in the
 * same frame as the render, so labels never lag the model).
 */

export interface Pose {
  /** Camera orbit around the target: azimuth (deg, 0 = facing the device's front / outer face, +90 = wearer's left side), elevation (deg), distance (world units, 1 = 100 mm). */
  az: number;
  el: number;
  dist: number;
  /** Camera target (world). */
  tx: number;
  ty: number;
  tz: number;
  fov: number;
  /** Screen shift of the image in NDC (-1..1 = half a viewport): +sx moves the device right, +sy up. */
  sx: number;
  sy: number;
  /** Device rotation (deg) and lift (world units). */
  rx: number;
  ry: number;
  rz: number;
  lift: number;
  /** 0..1 exploded view. */
  explode: number;
  /** Contacts warming one by one: contact i glows by clamp(glow - i, 0, 1). 0..5. */
  glow: number;
  /** Light-line intensity (1 = normal). */
  light: number;
  /** Breathing amount on the light line (0 = steady). */
  breath: number;
  /** Construction-line head: draw progress 0..1 and opacity 0..1. */
  head: number;
  headAlpha: number;
  /** Floor contact-shadow opacity 0..1. */
  floor: number;
  /** Stage (canvas) opacity 0..1. Rendering pauses at 0. */
  stage: number;
  /** Studio mood: 0 = light studio, 1 = dark studio. */
  mood: number;
  /** Environment rotation (deg) for highlight sweeps. */
  sweep: number;
  /** Giant "Harmoniq" word behind the device (reveal), 0..1. */
  word: number;
  /** Close: the light line stretches into a full-width hairline, 0..1. */
  hairline: number;
}

export interface ScreenPoint {
  /** Viewport CSS px. */
  x: number;
  y: number;
  /** In front of the camera and inside the viewport (with margin). */
  visible: boolean;
}

type FrameListener = () => void;

export const director = {
  target: null as Pose | null,
  current: null as Pose | null,
  /** Page background (hex), scroll-driven. */
  bg: '#F2F0EC',
  /** Projected anchors, keyed by model anchor name (exploded offsets included). Also `deviceCentre`. */
  screen: {} as Record<string, ScreenPoint>,
  /** Model is built, shaders compiled, on stage. */
  ready: false,
  /** At least one frame has been rendered with the model. */
  warm: false,
  /** Rendered frame counter. */
  frames: 0,
  /** Skip damping on the next frame (jumps, screenshots). */
  snap: false,
  /** Debug: fields forced on top of the scroll pose (framing experiments). */
  override: null as Partial<Pose> | null,
  /** Seconds since start, for time-based ambience (breathing). */
  time: 0,
  /** Set by the stage: renders one frame at time t (seconds). */
  render: null as ((t: number) => void) | null,
  /** Set by the stage: performance fallbacks (device pixel ratio, opaque glass). */
  setDpr: null as ((dpr: number) => void) | null,
  degradeGlass: null as (() => void) | null,
  /** The stage asks for another frame (damping not settled, breathing). */
  needsRender: true,
  /** Intro (time-based, ≤2.5 s, skipped by scrolling): 0 = hidden, 1 = done. Multiplies stage opacity. */
  intro: 0,
  /** Reduced motion: poses cut between stations instead of travelling. */
  reduced: false,
  /** Force a render on the next tick (resize, model ready). */
  invalidate() {
    this.needsRender = true;
  },
  listeners: new Set<FrameListener>(),
  /** Called after each rendered frame (after projection). Returns an unsubscribe. */
  onFrame(cb: FrameListener) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  },
  emitFrame() {
    for (const cb of this.listeners) cb();
  },
};

export type Director = typeof director;
