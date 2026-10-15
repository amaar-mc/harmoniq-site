import type { Quality } from './materials';

/**
 * Fetches the baked model early (started as soon as the page decides to use
 * WebGL, in parallel with the stage's JavaScript).
 */
const cache = new Map<Quality, Promise<ArrayBuffer | null>>();

export function fetchBakedModel(quality: Quality): Promise<ArrayBuffer | null> {
  let p = cache.get(quality);
  if (!p) {
    p = fetch(`/model/harmoniq-${quality}.bin`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    cache.set(quality, p);
  }
  return p;
}
