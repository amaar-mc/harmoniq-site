'use client';

import { gsap, ScrollTrigger, SplitText } from './gsap';

/**
 * Scroll-scene helpers. A scene is a `<section class="scene" data-scene="id">`
 * whose height is `--len` viewports, with a sticky 100svh `.scene__frame`.
 * Scene progress p = 0 when the scene's top reaches the viewport top (the
 * frame starts pinning) and p = 1 when its bottom reaches the viewport bottom
 * (the frame un-pins). Values outside 0..1 are allowed.
 *
 * Every scroll-linked visual is a pure function of scroll: build scrubbed
 * timelines here, never one-shot tweens inside pinned scenes.
 */

export const MEDIA = {
  desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 767px) and (prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
} as const;

export interface MotionConditions {
  desktop: boolean;
  mobile: boolean;
  reduce: boolean;
}

/** Absolute document top of an element (px). */
export function docTop(el: Element): number {
  return el.getBoundingClientRect().top + window.scrollY;
}

/** Pinned scroll distance of a scene (px). */
export function sceneRange(scene: HTMLElement): number {
  return Math.max(1, scene.offsetHeight - window.innerHeight);
}

/** Absolute scroll position at progress p of a scene. */
export function scenePos(scene: HTMLElement, p: number): number {
  return docTop(scene) + p * sceneRange(scene);
}

/** Current progress of a scene (unclamped). */
export function sceneProgress(scene: HTMLElement, scrollY = window.scrollY): number {
  return (scrollY - docTop(scene)) / sceneRange(scene);
}

export function getScene(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-scene="${id}"]`);
}

/**
 * A scrubbed timeline whose time axis IS scene progress: a tween placed at
 * position 0.3 plays when the scene is 30% through. The timeline spans
 * [from, to] of the scene; positions are absolute progress values.
 */
export function sceneTimeline(scene: HTMLElement, from = 0, to = 1) {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: scene,
      start: () => scenePos(scene, from),
      end: () => scenePos(scene, to),
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  // Pad so the timeline's duration is exactly (to - from).
  tl.set({}, {}, to - from);
  /** Converts scene progress to a timeline position. */
  const at = (p: number) => Math.max(0, p - from);
  return { tl, at };
}

/**
 * Splits an element into masked lines (`.line-mask > .line`). Headings get
 * SplitText's aria-label treatment; other elements (a `<p>` cannot carry an
 * aria-label) keep their split text readable as is.
 */
export function splitLines(el: Element): SplitText {
  const heading = /^H[1-6]$/.test(el.tagName);
  return SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', aria: heading ? 'auto' : 'none' });
}

export interface RevealOptions {
  /** Scene progress where the reveal starts. */
  at: number;
  /** Duration in scene progress (default 0.12). */
  dur?: number;
  /** Stagger between lines in scene progress (default 0.018). */
  stagger?: number;
}

/**
 * Lines rise into their masks (expo-out), scrubbed. One tween per line: a
 * staggered fromTo in a scrubbed timeline only pre-renders its first target,
 * so later lines would show before their turn.
 */
export function linesIn(tl: gsap.core.Timeline, lines: Element[], pos: number, dur = 0.12, stagger = 0.018) {
  lines.forEach((line, i) => {
    tl.fromTo(
      line,
      { yPercent: 110, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: dur, ease: 'expo.out', immediateRender: true },
      pos + i * stagger,
    );
  });
}

/** Lines leave upward, scrubbed. */
export function linesOut(tl: gsap.core.Timeline, lines: Element[], pos: number, dur = 0.08, stagger = 0.01) {
  lines.forEach((line, i) => {
    tl.fromTo(
      line,
      { yPercent: 0, opacity: 1 },
      { yPercent: -110, opacity: 0, duration: dur, ease: 'power2.in', immediateRender: false },
      pos + i * stagger,
    );
  });
}

/** Simple fade (used for reduced motion and small UI). */
export function fadeIn(tl: gsap.core.Timeline, targets: gsap.TweenTarget, pos: number, dur = 0.08, y = 0) {
  tl.fromTo(targets, { opacity: 0, y }, { opacity: 1, y: 0, duration: dur, ease: 'power2.out' }, pos);
}

export function fadeOut(tl: gsap.core.Timeline, targets: gsap.TweenTarget, pos: number, dur = 0.06, y = 0) {
  tl.to(targets, { opacity: 0, y, duration: dur, ease: 'power2.in' }, pos);
}

let refreshQueued = 0;
/** Debounced ScrollTrigger.refresh (many sections build at once). */
export function requestRefresh() {
  if (refreshQueued) cancelAnimationFrame(refreshQueued);
  refreshQueued = requestAnimationFrame(() => {
    refreshQueued = 0;
    ScrollTrigger.refresh();
  });
}

let fontsReady: Promise<unknown> | null = null;
export function whenFontsReady(): Promise<unknown> {
  if (!fontsReady) fontsReady = typeof document !== 'undefined' && document.fonts ? document.fonts.ready : Promise.resolve();
  return fontsReady;
}
