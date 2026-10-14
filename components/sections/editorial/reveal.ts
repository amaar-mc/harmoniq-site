'use client';

import { gsap, SplitText } from '@/lib/motion/gsap';

/**
 * Editorial reveal helpers (Research, Founder, Close).
 *
 * Lines are split with `aria: 'none'` and span tags, so the real text stays in
 * the DOM, readable by assistive tech and valid inside <p>/<blockquote>
 * (an aria-label on a paragraph is ignored by most screen readers).
 */

/** Expo-out, brief §7. */
export const EXPO = 'expo.out';
/** Line stagger for one-shot reveals (s), brief §7. */
export const LINE_STAGGER = 0.06;

export function splitEditorial(el: Element): SplitText {
  return SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'line',
    tag: 'span',
    aria: 'none',
  });
}

interface OnceOptions {
  start?: string;
  delay?: number;
}

/**
 * One-shot masked line rise (non-pinned sections only). Once the lines have
 * landed the split is reverted, so the text is plain, crisp and reflows freely.
 */
export function linesOnce(el: HTMLElement, { start = 'top 90%', delay = 0 }: OnceOptions = {}) {
  const split = splitEditorial(el);
  gsap.fromTo(
    split.lines,
    { yPercent: 108 },
    {
      yPercent: 0,
      duration: 1.25,
      ease: EXPO,
      stagger: LINE_STAGGER,
      delay,
      scrollTrigger: { trigger: el, start, once: true },
      onComplete: () => split.revert(),
    },
  );
  return split;
}

/**
 * Scrubbed masked line rise inside a scene timeline. One fromTo per line
 * (a staggered fromTo inside a timeline only pre-renders its first target,
 * which leaves later lines visible before the reveal starts).
 */
export function linesInScrub(tl: gsap.core.Timeline, lines: Element[], pos: number, dur: number, stagger: number) {
  lines.forEach((line, i) => {
    tl.fromTo(line, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur, ease: EXPO }, pos + i * stagger);
  });
}

/** One-shot soft rise for small elements (lists, asides, captions). */
export function riseOnce(targets: HTMLElement | HTMLElement[], trigger: HTMLElement, { start = 'top 90%', delay = 0 }: OnceOptions = {}) {
  gsap.fromTo(
    targets,
    { opacity: 0, y: 14 },
    {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: EXPO,
      stagger: LINE_STAGGER,
      delay,
      clearProps: 'transform',
      scrollTrigger: { trigger, start, once: true },
    },
  );
}

/** Reduced motion: opacity only, once. */
export function fadeOnce(targets: HTMLElement | HTMLElement[], trigger: HTMLElement, { start = 'top 90%', delay = 0 }: OnceOptions = {}) {
  gsap.fromTo(
    targets,
    { opacity: 0 },
    {
      opacity: 1,
      duration: 0.9,
      ease: 'power1.out',
      delay,
      scrollTrigger: { trigger, start, once: true },
    },
  );
}
