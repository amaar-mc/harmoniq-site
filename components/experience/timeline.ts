/**
 * Shared choreography map. The stage (camera, device, background) and the
 * HTML sections both read these ranges so text and 3D stay in step.
 * All values are scene progress (see lib/motion/scene.ts).
 */

/** Scene track lengths (--len, in viewports) live in app/globals.css. */

export type Range = readonly [number, number];

/** Design story beats (03). On mobile the crown beat folds into the halo beat. */
export const DESIGN_BEATS: {
  desktop: Record<'halo' | 'crown' | 'contacts' | 'fit' | 'layers', Range>;
  mobile: Record<'halo' | 'contacts' | 'fit' | 'layers', Range>;
} = {
  desktop: {
    halo: [0, 0.19],
    crown: [0.19, 0.35],
    contacts: [0.35, 0.55],
    fit: [0.55, 0.75],
    layers: [0.75, 1],
  },
  mobile: {
    halo: [0, 0.25],
    contacts: [0.25, 0.5],
    fit: [0.5, 0.74],
    layers: [0.74, 1],
  },
};

/**
 * The room darkens (paper → graphite) during the camera's turn from the crown
 * to the inside view, so the change reads as part of the move.
 */
export const DESIGN_TONE: { desktop: Range; mobile: Range } = {
  desktop: [0.334, 0.4],
  mobile: [0.23, 0.31],
};

/** Fraction of the contacts beat at which the camera has arrived inside the band (copy waits for it). */
export const CONTACTS_ARRIVE = 0.3;

/** Within the layers beat: explode, hold (labels shown), reassemble. */
export const LAYERS = {
  explode: [0.0, 0.35] as Range, // fraction of the layers beat
  labels: [0.3, 0.75] as Range,
  reassemble: [0.78, 1] as Range,
};

/** Closed loop (04). Node i is active over NODE_RANGES[i]. */
export const LOOP = {
  intro: [0, 0.12] as Range,
  nodes: [
    [0.12, 0.27],
    [0.27, 0.42],
    [0.42, 0.57],
    [0.57, 0.72],
    [0.72, 0.84],
  ] as Range[],
  /** The traveling light returns to the centre and stretches into the hand-off line. */
  handoff: [0.86, 0.94] as Range,
};

/** App (05): the hand-off line lands in the in-session phone's waveform, then the room turns to paper. */
export const APP = {
  phonesIn: [0, 0.3] as Range,
  handoffLand: [0.12, 0.3] as Range,
  toPaper: [0.3, 0.42] as Range,
  text: [0.36, 0.55] as Range,
};

/** Close (08). */
export const CLOSE = {
  text: [0.12, 0.42] as Range,
  /** The light line stretches back into a hairline. */
  hairline: [0.7, 1] as Range,
};

/**
 * The hand-off line (loop → app), identical wherever it is drawn:
 * centred in the viewport, 2px tall, signal white with a soft glow.
 */
export const HANDOFF_LINE = {
  widthDesktop: 'min(36vw, 520px)',
  widthMobile: '64vw',
  height: 2,
  color: '#F4F6F8',
  glow: '0 0 10px 1px rgba(234,242,255,0.55), 0 0 32px 4px rgba(234,242,255,0.16)',
};
