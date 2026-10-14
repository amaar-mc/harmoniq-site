import { DESIGN_BEATS, LAYERS, type Range } from '@/components/experience/timeline';

/**
 * Text choreography for 03 Design story, derived from the shared ranges in
 * components/experience/timeline.ts. All values are scene progress.
 *
 * Each placard reveals just after its beat starts and leaves just before it
 * ends, so two placards are never on screen together. The last paper-toned
 * placard (crown) is gone before the background starts turning to graphite,
 * and the first graphite placard (contacts) enters once it has turned.
 *
 * Mobile keeps all five placards: the crown has no camera beat of its own
 * there, so its placard takes the second part of the halo beat.
 */

export type BeatId = 'halo' | 'crown' | 'contacts' | 'fit' | 'layers';
export type Layout = 'desktop' | 'mobile';

export interface BeatPlan {
  id: BeatId;
  /** Span the progress tick represents. */
  range: Range;
  /** Reveal window (lines rise). */
  in: Range;
  /** Exit window (lines leave upward). */
  out: Range;
}

export interface DesignPlan {
  layout: Layout;
  beats: BeatPlan[];
  /** Background crossfade paper → graphite (the lead's director owns the actual colour). */
  tone: Range;
  /** Desktop: exploded labels visible (absolute progress). */
  labels: { in: Range; out: Range };
  /** Mobile: inside the layers placard, headline + body give way to the parts list. */
  list: { textOut: Range; in: Range; out: Range };
}

/** Half-width of the background crossfade around the crown → contacts boundary. */
const TONE_HALF = 0.02;
/** Keep paper text clear of the crossfade by this much. */
const TONE_GUARD = 0.004;
/** Mobile: the halo beat hands over to the crown placard at this fraction of its range. */
const MOBILE_CROWN_SPLIT = 0.48;

const TIMING: Record<Layout, { delay: number; inDur: number; outDur: number; outGap: number }> = {
  desktop: { delay: 0.012, inDur: 0.05, outDur: 0.03, outGap: 0.01 },
  mobile: { delay: 0.008, inDur: 0.038, outDur: 0.022, outGap: 0.008 },
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const rg = (a: number, b: number): Range => [r3(a), r3(b)];

function spans(layout: Layout): Record<BeatId, Range> {
  if (layout === 'desktop') return { ...DESIGN_BEATS.desktop };
  const m = DESIGN_BEATS.mobile;
  const split = m.halo[0] + (m.halo[1] - m.halo[0]) * MOBILE_CROWN_SPLIT;
  return {
    halo: [m.halo[0], split],
    crown: [split, m.halo[1]],
    contacts: m.contacts,
    fit: m.fit,
    layers: m.layers,
  };
}

const ORDER: BeatId[] = ['halo', 'crown', 'contacts', 'fit', 'layers'];

export function designPlan(layout: Layout): DesignPlan {
  const t = TIMING[layout];
  const s = spans(layout);
  const boundary = s.contacts[0];
  const tone: Range = rg(boundary - TONE_HALF, boundary + TONE_HALF);

  const beats = ORDER.map((id): BeatPlan => {
    const [a, b] = s[id];
    let inStart = a + t.delay;
    let outEnd = b - t.outGap;
    if (id === 'crown') outEnd = Math.min(outEnd, tone[0] - TONE_GUARD);
    if (id === 'contacts') inStart = Math.max(inStart, tone[1] - TONE_GUARD);
    return { id, range: [a, b], in: rg(inStart, inStart + t.inDur), out: rg(outEnd - t.outDur, outEnd) };
  });

  const layers = s.layers;
  const len = layers[1] - layers[0];
  const lab0 = layers[0] + LAYERS.labels[0] * len;
  const lab1 = layers[0] + LAYERS.labels[1] * len;
  const layersPlan = beats[beats.length - 1];

  return {
    layout,
    beats,
    tone,
    labels: { in: rg(lab0, lab0 + 0.035), out: rg(lab1 - 0.022, lab1) },
    // Mobile list: give the body ~5% of the scene to be read, then swap to the list.
    list: {
      textOut: rg(layersPlan.in[1] + 0.05, layersPlan.in[1] + 0.05 + t.outDur),
      in: rg(layersPlan.in[1] + 0.064, layersPlan.in[1] + 0.064 + t.inDur),
      out: layersPlan.out,
    },
  };
}

/** Matches lib/motion/scene.ts MEDIA breakpoints. */
export const MOBILE_QUERY = '(max-width: 767px)';

export function currentLayout(): Layout {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches ? 'mobile' : 'desktop';
}
