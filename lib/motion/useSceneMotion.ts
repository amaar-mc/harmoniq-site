'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from './gsap';
import { MEDIA, requestRefresh, whenFontsReady, type MotionConditions } from './scene';

export interface SceneMotionContext extends MotionConditions {
  root: HTMLElement;
}

/*
 * Builds run one per task (never one long task for the whole page), and a
 * section is only built once it comes within a couple of screens of the
 * viewport: splitting lines and creating ScrollTriggers forces layout, and
 * doing all of it at load blocked the main thread on phones.
 */
const queue: (() => void)[] = [];
let draining = false;
function enqueue(job: () => void) {
  queue.push(job);
  if (draining) return;
  draining = true;
  const next = () => {
    const job = queue.shift();
    if (!job) {
      draining = false;
      return;
    }
    job();
    setTimeout(next, 0);
  };
  setTimeout(next, 0);
}

/** How far ahead (in viewports) a section is prepared before it scrolls in. */
const AHEAD = '200% 0px 200% 0px';

/**
 * Builds a section's scroll motion inside gsap.matchMedia (desktop / mobile /
 * reduced motion). Runs after fonts load (so SplitText measures real lines),
 * when the section nears the viewport, and rebuilds when the viewport width
 * changes. Everything created in `build` (tweens, ScrollTriggers, SplitText)
 * is reverted automatically.
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
    let built = false;
    let width = window.innerWidth;
    let timer = 0;

    // Until its motion is built, a section far below the fold stays
    // transparent (still in the accessibility tree), so a sudden jump never
    // shows its unstaged state.
    const r = root.getBoundingClientRect();
    const near = r.top < window.innerHeight * 3 && r.bottom > -window.innerHeight * 2;
    if (!near) root.style.opacity = '0';

    const run = () => {
      if (cancelled) return;
      mm?.revert();
      mm = gsap.matchMedia(root);
      mm.add(MEDIA, (ctx) => {
        const c = ctx.conditions as unknown as MotionConditions;
        return build({ desktop: !!c.desktop, mobile: !!c.mobile, reduce: !!c.reduce, root });
      });
      built = true;
      root.style.opacity = '';
      requestRefresh();
    };

    let io: IntersectionObserver | null = null;
    whenFontsReady().then(() => {
      if (cancelled) return;
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io?.disconnect();
          io = null;
          enqueue(run);
        },
        { rootMargin: AHEAD },
      );
      io.observe(root);
    });

    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (window.innerWidth === width) return;
        width = window.innerWidth;
        if (built) enqueue(run);
      }, 220);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      io?.disconnect();
      window.removeEventListener('resize', onResize);
      mm?.revert();
      root.style.opacity = '';
    };
    // `build` is intentionally captured once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}
