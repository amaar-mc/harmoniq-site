'use client';

import { gsap, type SplitText } from '@/lib/motion/gsap';
import { sceneTimeline, splitLines } from '@/lib/motion/scene';
import type { SceneMotionContext } from '@/lib/motion/useSceneMotion';
import { currentLayout, designPlan, type Layout } from './plan';

/**
 * Scroll choreography for the design story's HTML layer. Everything is on one
 * scrubbed timeline whose time axis is scene progress, so scrolling back
 * restores every state exactly.
 */

interface Tone {
  '--fg': string;
  '--fg-2': string;
  '--hair': string;
}

/** Fallbacks mirror app/globals.css; the live values are read from the cascade. */
const PAPER: Tone = { '--fg': '#161617', '--fg-2': '#6b6761', '--hair': 'rgba(139, 135, 129, 0.55)' };
const DARK: Tone = { '--fg': '#f2f0ec', '--fg-2': '#a9a59e', '--hair': 'rgba(189, 185, 178, 0.28)' };

function readTone(el: Element | null, fallback: Tone): Tone {
  if (!el) return fallback;
  const cs = getComputedStyle(el);
  const get = (k: keyof Tone) => cs.getPropertyValue(k).trim() || fallback[k];
  return { '--fg': get('--fg'), '--fg-2': get('--fg-2'), '--hair': get('--hair') };
}

/** Reveal: masked lines rise (expo-out), staggered so the last one lands at the window's end. */
function rise(tl: gsap.core.Timeline, groups: Element[][], start: number, end: number) {
  const lines = groups.flat();
  if (!lines.length) return;
  const D = end - start;
  const dur = D * 0.62;
  const groupGap = D * 0.05;
  const gaps = groups.filter((g) => g.length).length - 1;
  const stagger = Math.min(D * 0.09, (D - dur - groupGap * gaps) / Math.max(1, lines.length - 1));
  let pos = start;
  for (const g of groups) {
    for (const line of g) {
      tl.fromTo(line, { yPercent: 112, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur, ease: 'expo.out' }, pos);
      pos += stagger;
    }
    if (g.length) pos += groupGap;
  }
}

/** Exit: lines leave upward (power2.in), top line first. */
function leave(tl: gsap.core.Timeline, lines: Element[], start: number, end: number) {
  if (!lines.length) return;
  const D = end - start;
  const dur = D * 0.7;
  const stagger = lines.length > 1 ? (D - dur) / (lines.length - 1) : 0;
  tl.fromTo(
    lines,
    { yPercent: 0, opacity: 1 },
    { yPercent: -112, opacity: 0, duration: dur, stagger, ease: 'power2.in', immediateRender: false },
    start,
  );
}

function fade(tl: gsap.core.Timeline, targets: gsap.TweenTarget, from: number, to: number, start: number, end: number) {
  tl.fromTo(targets, { opacity: from }, { opacity: to, duration: end - start, ease: 'power1.inOut', immediateRender: from === 0 }, start);
}

export function buildDesignMotion({ reduce, root }: SceneMotionContext) {
  const layout: Layout = currentLayout();
  const plan = designPlan(layout);
  const { tl, at } = sceneTimeline(root, 0, 1);
  const splits: SplitText[] = [];
  const split = (el: Element | null) => {
    if (!el) return [] as Element[];
    const st = splitLines(el);
    splits.push(st);
    return st.lines;
  };

  const chrome = Array.from(root.querySelectorAll<HTMLElement>('[data-design-chrome]'));
  const heading = root.querySelector<HTMLElement>('[data-design-heading]');
  const rule = root.querySelector<HTMLElement>('[data-design-rule]');
  const rail = root.querySelector<HTMLElement>('[data-design-rail]');
  const ticks = Array.from(root.querySelectorAll<HTMLElement>('[data-tick]'));
  const fills = Array.from(root.querySelectorAll<HTMLElement>('[data-tick-fill]'));
  const first = plan.beats[0];
  const last = plan.beats[plan.beats.length - 1];

  // --- Tone of the persistent chrome follows the background (paper → graphite). ---
  const paper = readTone(root, PAPER);
  const dark = readTone(root.querySelector('[data-tone="dark"]'), DARK);
  tl.fromTo(chrome, { ...paper }, { ...dark, duration: plan.tone[1] - plan.tone[0], ease: 'power3.inOut' }, at(plan.tone[0]));

  // --- Header: the section's eyebrow and its hairline. ---
  if (reduce) {
    fade(tl, chrome, 0, 1, at(first.in[0]), at(first.in[1]));
    tl.fromTo(chrome, { opacity: 1 }, { opacity: 0, duration: last.out[1] - last.out[0], immediateRender: false }, at(last.out[0]));
  } else {
    gsap.set(chrome, { opacity: 1 });
    // The chrome steps out while the room crosses the mid-greys, so it never sits at ~1:1.
    const span = plan.tone[1] - plan.tone[0];
    tl.to(chrome, { opacity: 0, duration: span * 0.35, ease: 'power1.in' }, at(plan.tone[0]));
    tl.fromTo(chrome, { opacity: 0 }, { opacity: 1, duration: span * 0.35, ease: 'power1.out', immediateRender: false }, at(plan.tone[1] - span * 0.35));
    const hLines = split(heading);
    rise(tl, [hLines], at(first.in[0]), at(first.in[0] + (first.in[1] - first.in[0]) * 0.7));
    if (rule) {
      tl.fromTo(rule, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: first.in[1] - first.in[0], ease: 'expo.out' }, at(first.in[0]));
      tl.fromTo(
        rule,
        { scaleX: 1, transformOrigin: '100% 50%' },
        { scaleX: 0, duration: (last.out[1] - last.out[0]) * 0.8, ease: 'power2.in', immediateRender: false },
        at(last.out[0]),
      );
    }
    leave(tl, hLines, at(last.out[0]), at(last.out[0] + (last.out[1] - last.out[0]) * 0.6));
  }

  // --- Progress rail: the active tick grows and fills with the beat. ---
  if (rail) {
    const axis = layout === 'desktop' ? 'height' : 'width';
    const scale = layout === 'desktop' ? 'scaleY' : 'scaleX';
    const big = layout === 'desktop' ? 28 : 22;
    const small = layout === 'desktop' ? 6 : 8;
    const g = 0.012;
    plan.beats.forEach((b, i) => {
      const tick = ticks[i];
      const fill = fills[i];
      if (!tick || !fill) return;
      if (reduce) {
        // No growth: the active tick simply brightens; completed ticks stay softly lit.
        tl.fromTo(fill, { [scale]: 1, opacity: 0 }, { opacity: 1, duration: g }, at(Math.max(0, b.range[0] - g / 2)));
        if (i < plan.beats.length - 1) tl.to(fill, { opacity: 0.35, duration: g }, at(b.range[1] - g / 2));
        return;
      }
      if (i === 0) gsap.set(tick, { [axis]: big });
      else tl.fromTo(tick, { [axis]: small }, { [axis]: big, duration: g * 2, ease: 'power2.inOut' }, at(b.range[0] - g));
      if (i < plan.beats.length - 1) {
        tl.fromTo(tick, { [axis]: big }, { [axis]: small, duration: g * 2, ease: 'power2.inOut', immediateRender: false }, at(b.range[1] - g));
      }
      tl.fromTo(fill, { [scale]: 0 }, { [scale]: 1, duration: b.range[1] - b.range[0], ease: 'none' }, at(b.range[0]));
      // Completed ticks settle to a quieter fill so the active one leads.
      if (i < plan.beats.length - 1) {
        tl.fromTo(fill, { opacity: 1 }, { opacity: 0.45, duration: g * 2, immediateRender: false }, at(b.range[1] - g));
      }
    });
    if (!reduce) {
      fade(tl, rail, 0, 1, at(first.in[0]), at(first.in[1]));
      tl.fromTo(rail, { opacity: 1 }, { opacity: 0, duration: last.out[1] - last.out[0], immediateRender: false }, at(last.out[0]));
    } else {
      gsap.set(rail, { opacity: 1 });
    }
  }

  // --- Placards. ---
  for (const b of plan.beats) {
    const el = root.querySelector<HTMLElement>(`[data-beat="${b.id}"]`);
    if (!el) continue;
    const meta = el.querySelector<HTMLElement>('[data-meta-inner]');
    const headline = el.querySelector<HTMLElement>('[data-headline]');
    const body = el.querySelector<HTMLElement>('[data-body]');
    const text = el.querySelector<HTMLElement>('[data-text]');
    const listWrap = layout === 'mobile' ? el.querySelector<HTMLElement>('[data-parts-list]') : null;

    if (reduce) {
      // Crossfades only.
      fade(tl, el, 0, 1, at(b.in[0]), at(b.in[1]));
      tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: b.out[1] - b.out[0], immediateRender: false }, at(b.out[0]));
      if (listWrap && text) {
        tl.fromTo(text, { opacity: 1 }, { opacity: 0, duration: plan.list.textOut[1] - plan.list.textOut[0], immediateRender: false }, at(plan.list.textOut[0]));
        fade(tl, listWrap, 0, 1, at(plan.list.in[0]), at(plan.list.in[1]));
      }
      continue;
    }

    gsap.set(el, { opacity: 1 });
    const metaLines = meta ? [meta] : [];
    const hLines = split(headline);
    const bLines = split(body);
    rise(tl, [metaLines, hLines, bLines], at(b.in[0]), at(b.in[1]));

    if (listWrap) {
      // Mobile layers: headline + body leave, the parts list rises in their place.
      const rows = Array.from(listWrap.querySelectorAll<HTMLElement>('[data-part-inner]'));
      const rules = Array.from(listWrap.querySelectorAll<HTMLElement>('[data-part-rule]'));
      leave(tl, [...hLines, ...bLines], at(plan.list.textOut[0]), at(plan.list.textOut[1]));
      const [l0, l1] = plan.list.in;
      const st = (l1 - l0) * 0.06;
      const dur = (l1 - l0) * 0.55;
      // One tween per element (a staggered fromTo only renders its first target's start state up front).
      rules.forEach((r, k) => {
        tl.fromTo(r, { scaleX: 0 }, { scaleX: 1, duration: dur, ease: 'expo.out' }, at(l0 + k * st));
      });
      rows.forEach((r, k) => {
        tl.fromTo(r, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur, ease: 'expo.out' }, at(l0 + (l1 - l0) * 0.04 + k * st));
      });
      const [o0, o1] = plan.list.out;
      leave(tl, [...metaLines, ...rows], at(o0), at(o1));
      tl.fromTo(rules, { opacity: 1 }, { opacity: 0, duration: (o1 - o0) * 0.8, immediateRender: false }, at(o0));
    } else {
      leave(tl, [...metaLines, ...hLines, ...bLines], at(b.out[0]), at(b.out[1]));
    }
  }

  return () => {
    // SplitText registers with the matchMedia context; revert explicitly as well for safety.
    for (const st of splits) st.revert();
  };
}
