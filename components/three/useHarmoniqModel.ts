'use client';

import { useEffect, useState } from 'react';
import { HARMONIQ_CONFIG } from '@/lib/harmoniq/config';
import { loadBakedModel } from '@/lib/harmoniq/bake';
import { createHarmoniqModel, type HarmoniqModel } from '@/lib/harmoniq/createHarmoniqModel';
import type { Quality } from '@/lib/harmoniq/materials';
import { fetchBakedModel } from '@/lib/harmoniq/modelSource';

/** Resolves the CSS family behind next/font's `--font-inter` variable. */
export function resolveInterFamily(): string {
  if (typeof document === 'undefined') return 'Inter, sans-serif';
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim();
  return v || 'Inter, "Helvetica Neue", Arial, sans-serif';
}

/**
 * Builds the procedural device on the client once the wordmark font is ready.
 * Rebuilds when quality changes; disposes GPU resources on unmount.
 */
export function useHarmoniqModel(quality: Quality = 'high') {
  const [model, setModel] = useState<HarmoniqModel | null>(null);
  useEffect(() => {
    let cancelled = false;
    let built: HarmoniqModel | null = null;
    const family = resolveInterFamily();
    const ready = document.fonts?.load ? document.fonts.load(`400 220px ${family}`).catch(() => []) : Promise.resolve([]);
    ready.then(() => {
      if (cancelled) return;
      const t0 = performance.now();
      built = createHarmoniqModel(HARMONIQ_CONFIG, { quality, fontFamily: family });
      (window as unknown as { __buildMs?: number }).__buildMs = performance.now() - t0;
      setModel(built);
    });
    return () => {
      cancelled = true;
      built?.dispose();
    };
  }, [quality]);
  return model;
}

/**
 * The site's model: the baked geometry + AO from public/model (see
 * scripts/bake-model.mjs), falling back to the live generator if the bake is
 * missing. Only materials and textures are built at runtime.
 */
export function useBakedHarmoniqModel(quality: Quality = 'high') {
  const [model, setModel] = useState<HarmoniqModel | null>(null);
  useEffect(() => {
    let cancelled = false;
    let built: HarmoniqModel | null = null;
    const family = resolveInterFamily();
    const font = document.fonts?.load ? document.fonts.load(`300 220px ${family}`).catch(() => []) : Promise.resolve([]);
    Promise.all([fetchBakedModel(quality), font]).then(([buf]) => {
      if (cancelled) return;
      const t0 = performance.now();
      try {
        built = buf ? loadBakedModel(buf, { fontFamily: family }) : null;
      } catch (e) {
        console.warn('Harmoniq: baked model failed to load, generating instead.', e);
      }
      built ??= createHarmoniqModel(HARMONIQ_CONFIG, { quality, fontFamily: family });
      (window as unknown as { __buildMs?: number }).__buildMs = performance.now() - t0;
      setModel(built);
    });
    return () => {
      cancelled = true;
      built?.dispose();
    };
  }, [quality]);
  return model;
}
