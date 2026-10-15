/** Keep a number and its unit together ("40 Hz" never breaks across lines). */
export const keepUnits = (text: string) => text.replace(/(\d) Hz/g, '$1 Hz');

/**
 * A body made of short sentences reads best one sentence per line
 * ("Every response informs the next." / "The loop closes."). Longer bodies stay whole.
 */
export function sentenceLines(text: string, max = 36): string[] {
  const parts = text.match(/[^.!?]+[.!?]+/g)?.map((p) => p.trim()) ?? [text];
  return parts.length > 1 && parts.every((p) => p.length <= max) ? parts : [text];
}
