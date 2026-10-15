/**
 * The light line's breathing (brief §7: 4–6 s). Shared so the app's session
 * waveform breathes in sync with the device. Slow and smooth: never a flash.
 */
export const BREATH_PERIOD = 5.2;

/** 0..1, smooth, at time t (seconds since page start, e.g. performance.now() / 1000). */
export function breathAt(t: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / BREATH_PERIOD);
}
