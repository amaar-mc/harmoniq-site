'use client';

import { useEffect, useState } from 'react';
import { HARMONIQ_CONFIG } from '@/lib/harmoniq/config';
import { createHarmoniqModel, type HarmoniqModel } from '@/lib/harmoniq/createHarmoniqModel';
import type { Quality } from '@/lib/harmoniq/materials';

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
      built = createHarmoniqModel(HARMONIQ_CONFIG, { quality, fontFamily: family });
      setModel(built);
    });
    return () => {
      cancelled = true;
      built?.dispose();
    };
  }, [quality]);
  return model;
}
