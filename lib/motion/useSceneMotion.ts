'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from './gsap';
import { MEDIA, requestRefresh, whenFontsReady, type MotionConditions } from './scene';

export interface SceneMotionContext extends MotionConditions {
  root: HTMLElement;
}

/**
 * Builds a section's scroll motion inside gsap.matchMedia (desktop / mobile /
 * reduced motion). Runs after fonts load (so SplitText measures real lines)
 * and rebuilds when the viewport width changes. Everything created in
 * `build` (tweens, ScrollTriggers, SplitText) is reverted automatically.
 */
export function useSceneMotion(
  ref: RefObject<HTMLElement | null>,
  build: (ctx: SceneMotionContext) => void | (() => void),
) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let mm: gsap.MatchMedia | null = null;
    let cancelled = false;
    let width = window.innerWidth;
    let timer = 0;

    const run = () => {
      mm?.revert();
      mm = gsap.matchMedia(root);
      mm.add(MEDIA, (ctx) => {
        const c = ctx.conditions as unknown as MotionConditions;
        return build({ desktop: !!c.desktop, mobile: !!c.mobile, reduce: !!c.reduce, root });
      });
      requestRefresh();
    };

    whenFontsReady().then(() => {
      if (!cancelled) run();
    });

    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (window.innerWidth === width) return;
        width = window.innerWidth;
        run();
      }, 220);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
      mm?.revert();
    };
    // `build` is intentionally captured once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}
