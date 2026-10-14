/**
 * Shared, mutable state between the app scene's scroll motion (writer) and the
 * in-session waveform's animation loop (reader). `amp` is a pure function of
 * scroll: 0 while the hand-off line is landing (the waveform is a flat line),
 * easing to 1 once the light has become the live waveform.
 */
export const waveState = {
  amp: 0,
};
