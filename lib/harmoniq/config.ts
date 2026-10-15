/**
 * Harmoniq device — single source of truth for every modelling dimension.
 *
 * Units are millimetres. The generator builds in mm and the root group is
 * scaled by `worldScale` (1 world unit = 100 mm).
 *
 * Axes (wearer's frame): +Y up, +Z forward (out of the forehead),
 * +X = wearer's LEFT. The light line and wordmark live on the +X side,
 * which is the side the board's hero and side-profile views show.
 *
 * These numbers are a modelling guide for a typical adult head.
 * They are not product specifications and never appear in copy.
 */
export const HARMONIQ_CONFIG = {
  worldScale: 0.01,

  halo: {
    /** Inner surface, temple to temple. */
    innerSpan: 140,
    /** Inner surface, front to the temple line. */
    innerDepth: 62,
    /** Superellipse exponent of the plan curve (2 = ellipse). */
    exponent: 2.0,
    /** Straight run past the temple line, hidden inside the module. */
    tail: 9,
    /** Overall height incl. crown, at centre and at the temples. */
    heightCenter: 34,
    heightTemple: 28,
    /** Outer titanium face → inner liner face. */
    thickness: 13,
    /** Forehead rake: the band leans its top toward the head (radians). */
    rakeCenter: 0.13,
    rakeTemple: 0,
    /** Outer face barrel (mm of outward bow at mid-height). */
    bow: 0.55,
    segments: 96,
  },

  shell: {
    /** Visible titanium height = overall height − crown rise. */
    crownRiseCenter: 9.5,
    crownRiseTemple: 7.5,
    topEdgeRadius: 0.55,
    bottomOuterRadius: 3.2,
    bottomInnerRadius: 1.4,
    /** Lip that wraps under the band and holds the liner. */
    lipHeight: 3.4,
    lipFace: 0.55,
    /** Titanium ledge left visible between crisp edge and crown. */
    ledge: 1.1,
  },

  liner: {
    face: 1.0,
    back: 4.6,
    /** Visible liner height between lip and cushion roll. */
    visibleCenter: 16.5,
    visibleTemple: 13,
  },

  crown: {
    /** Inward overhang of the cushion past the liner face. */
    overhang: 2.6,
    /** Soft outward bulge of the crown above the titanium edge. */
    outerBulge: 0.6,
    rollRadius: 2.6,
  },

  /** Recess between materials (parting lines). */
  partingGap: 0.4,

  contacts: {
    /** [length along band, height] per pad, wearer's right → left. */
    sizes: [
      [15, 8.5],
      [19, 10],
      [23, 11],
      [19, 10],
      [15, 8.5],
    ] as [number, number][],
    /** Arc-length positions of each pad centre from the front centre (mm). */
    positions: [-59, -31.5, 0, 31.5, 59],
    standoff: 3.0,
    gasketRim: 1.6,
    gasketHeight: 1.5,
    gasketClearance: 0.3,
    padEdgeRadius: 1.1,
    padDome: 0.06,
  },

  lightLine: {
    s: 30,
    length: 19,
    height: 0.95,
    bezel: 0.2,
    /** Height on the titanium face as a fraction of the visible face. */
    heightRatio: 0.56,
  },

  wordmark: {
    text: 'Harmoniq',
    s: 58,
    /** Cap height in mm. */
    capHeight: 4.0,
    heightRatio: 0.52,
  },

  module: {
    length: 30,
    height: 12.5,
    thickness: 14,
    /** How far the glass stands proud of the titanium face. */
    proud: 0.25,
    /** Corner radius in side elevation. */
    cornerRadius: 3.6,
    /** Edge round where faces meet. */
    edgeRadius: 2.0,
    dome: 0.3,
    /** Centre position relative to the temple point (z back is negative). */
    z: -3,
    /** Gap between the crown top and the glass top. */
    topClearance: 0,
  },

  /** Where the titanium's top edge sweeps down under the glass into the arm. */
  junction: {
    /** Dip runs between these depths (mm in z; the temple point is z = 0). */
    dipStartZ: 30,
    dipEndZ: 10,
    /** Crown, liner and halo shell end this far inside the module front. */
    haloEndInset: 3,
  },

  arm: {
    length: 62,
    drop: 22,
    /** Front height follows the dipped titanium under the module. */
    heightRear: 10,
    thickness: 3.5,
    edgeRadius: 1.0,
    slotLength: 30,
    slotHeight: 4,
    /** Slot centre as a fraction of arm length. */
    slotCenter: 0.55,
    /** Where the arm starts behind the temple point (inside the module). */
    z0: -2,
    /** Plan-view outward bow so the arm clears the head. */
    flare: 2.5,
  },

  earRest: {
    sleeve: 9,
    run: 10,
    drop: 38,
    tuck: 6,
    diameterStart: 7.5,
    diameterEnd: 5.8,
    sleeveHeight: 10,
    sleeveThickness: 4.4,
  },
} as const;

export type HarmoniqConfig = typeof HARMONIQ_CONFIG;

export const PART_NAMES = [
  'shell',
  'liner',
  'crown',
  'contact_0',
  'contact_1',
  'contact_2',
  'contact_3',
  'contact_4',
  'gasket_0',
  'gasket_1',
  'gasket_2',
  'gasket_3',
  'gasket_4',
  'lightLine',
  'wordmark',
  'module_L',
  'module_R',
  'arm_L',
  'arm_R',
  'earRest_L',
  'earRest_R',
] as const;

export type PartName = (typeof PART_NAMES)[number];
