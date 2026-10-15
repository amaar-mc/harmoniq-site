'use client';

import { useRef } from 'react';
import { SplitText, type gsap } from '@/lib/motion/gsap';
import { APP as RANGE } from '@/components/experience/timeline';
import { APP } from '@/content/copy';
import { sceneTimeline, splitLines } from '@/lib/motion/scene';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import HandoffLine, { createHandoff } from './app/HandoffLine';
import Phones from './app/Phones';
import styles from './AppSection.module.css';

/**
 * Mobile hold (scene progress): the row brings 01 into focus, then 03. The
 * reduced-motion branch crossfades over the same ranges instead of panning.
 */
const HOLD_TO_01: [number, number] = [0.58, 0.68];
const HOLD_TO_03: [number, number] = [0.76, 0.92];

/**
 * Masked lines rise in, one tween per line (a single staggered fromTo only
 * primes the first line's start state in a scrubbed timeline, so later lines
 * would show before their reveal).
 */
function revealLines(tl: gsap.core.Timeline, lines: Element[], pos: number, dur = 0.12, stagger = 0.018) {
  lines.forEach((line, i) => {
    tl.fromTo(
      line,
      { yPercent: 110, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: dur, ease: 'expo.out', immediateRender: true, lazy: false },
      pos + i * stagger,
    );
  });
}

/**
 * Paragraph lines for the same masked reveal, left readable: with SplitText's
 * default aria handling the text moves into an aria-label, which a <p> cannot
 * carry, so screen readers would get an empty paragraph.
 */
function splitParagraph(el: HTMLElement): SplitText {
  return SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line', aria: 'none' });
}

/**
 * 05 · App — "Interface concept".
 *
 * Scene progress (components/experience/timeline.ts → APP):
 * - phonesIn [0, 0.30]: the in-session phone rises first and settles at the
 *   centre; the side phones follow at their own rates (parallax).
 * - handoffLand [0.12, 0.30]: the loop's light line (held at the viewport
 *   centre since loop p 0.94) travels onto the waveform's baseline, then
 *   crossfades into the phone's own waveform, which begins to breathe.
 * - toPaper [0.30, 0.42]: the room turns from graphite to paper (director).
 * - text [0.36, 0.55]: headline and subline rise line by line. The
 *   "Interface concept" eyebrow arrives with the phones so they are always
 *   labelled as a concept.
 * - then a hold with a slow parallax drift until the scene un-pins.
 */
export default function AppSection() {
  const ref = useRef<HTMLElement>(null);

  useSceneMotion(ref, ({ mobile, reduce, root }) => {
    const q = (key: string) => root.querySelector<HTMLElement>(`[data-app="${key}"]`);
    const eyebrow = q('eyebrow');
    const title = q('title');
    const sub = q('sub');
    const mid = q('phone-mid');
    const left = q('phone-left');
    const right = q('phone-right');
    const wave = q('wave');
    const stage = q('stage');
    const contacts = Array.from(root.querySelectorAll<HTMLElement>('[data-app="contact"]'));
    if (!eyebrow || !title || !sub || !mid || !left || !right || !wave) return;

    const { tl, at } = sceneTimeline(root, 0, 1);
    const handoff = createHandoff(root, { reduce });
    // Re-measure the landing target after the phones have moved this frame.
    tl.eventCallback('onUpdate', handoff.update);

    // The room: graphite → paper, mirrored for shadows, rims and label tone.
    const [p0, p1] = RANGE.toPaper;
    tl.fromTo(root, { '--app-paper': 0 }, { '--app-paper': 1, duration: p1 - p0 }, at(p0));

    if (reduce) {
      // No movement: opacity crossfades only. The waveform is static and lit.
      const fade = (el: gsap.TweenTarget, p: number, dur: number) =>
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: dur, ease: 'power2.out' }, at(p));
      fade([mid, left, right], 0, 0.14);
      fade(eyebrow, 0, 0.1);
      fade(title, RANGE.text[0], 0.1);
      fade(sub, RANGE.text[0] + 0.05, 0.1);

      if (stage && window.matchMedia('(max-width: 767px)').matches) {
        // Hold (mobile): the same screens take the focus in turn (02 → 01 → 03), without
        // travel. Over each pan's range the row fades out, its offset and focus jump at the
        // midpoint (zero-length, so a pure function of scroll), and it fades back in.
        const step = () => mid.offsetLeft - left.offsetLeft;
        const swap = (
          [a, b]: [number, number],
          x: [() => number, () => number],
          focus: HTMLElement,
          blur: HTMLElement,
        ) => {
          const m = (a + b) / 2;
          const half = (b - a) / 2;
          const jump = { duration: 0, immediateRender: false };
          tl.fromTo(stage, { opacity: 1 }, { opacity: 0, duration: half, ease: 'power1.in', immediateRender: false }, at(a));
          tl.fromTo(stage, { x: x[0] }, { x: x[1], ...jump }, at(m));
          tl.fromTo(blur, { scale: 1 }, { scale: 0.88, ...jump }, at(m));
          tl.fromTo(focus, { scale: 0.88 }, { scale: 1, ...jump }, at(m));
          tl.fromTo(stage, { opacity: 0 }, { opacity: 1, duration: half, ease: 'power1.out', immediateRender: false }, at(m));
        };
        swap(HOLD_TO_01, [() => 0, () => step()], left, mid);
        swap(HOLD_TO_03, [() => step(), () => -step()], right, left);
      }
      return () => handoff.kill();
    }

    // Arrival: the session phone rises first and settles where the line lands.
    tl.fromTo(mid, { yPercent: 108 }, { yPercent: 0, duration: 0.22, ease: 'power3.out' }, at(0));
    if (mobile) {
      // On a phone the light lands on a single device; its neighbours rise as the room turns to paper.
      tl.fromTo(left, { yPercent: 120 }, { yPercent: 0, duration: 0.16, ease: 'power3.out' }, at(RANGE.toPaper[0]));
      tl.fromTo(right, { yPercent: 132 }, { yPercent: 0, duration: 0.16, ease: 'power3.out' }, at(RANGE.toPaper[0] + 0.03));
    } else {
      tl.fromTo(left, { yPercent: 122 }, { yPercent: 0, duration: 0.23, ease: 'power3.out' }, at(0.05));
      tl.fromTo(right, { yPercent: 138 }, { yPercent: 0, duration: 0.23, ease: 'power3.out' }, at(0.075));
    }

    // The five contacts settle in one by one, then the light lands.
    contacts.forEach((dot, i) => {
      tl.fromTo(dot, { opacity: 0.2 }, { opacity: 1, duration: 0.03, immediateRender: true, lazy: false }, at(0.16 + i * 0.012));
    });
    // The phone's own (flat) waveform takes over from the landed line.
    tl.fromTo(wave, { opacity: 0 }, { opacity: 1, duration: 0.035 }, at(RANGE.handoffLand[1] - 0.012));

    // Label first (with the phones), then the headline and subline.
    revealLines(tl, splitParagraph(eyebrow).lines, at(0.01), 0.09);
    revealLines(tl, splitLines(title).lines, at(RANGE.text[0]), 0.12, 0.03);
    revealLines(tl, splitParagraph(sub).lines, at(RANGE.text[0] + 0.045), 0.12, 0.015);

    if (mobile && stage) {
      // Hold (mobile): pan the row so each screen takes the focus in turn,
      // 02 (where the light landed) → 01 → 03, easing into a still moment each time.
      const step = () => mid.offsetLeft - left.offsetLeft;
      const io = { duration: HOLD_TO_01[1] - HOLD_TO_01[0], ease: 'power2.inOut' };
      const across = { duration: HOLD_TO_03[1] - HOLD_TO_03[0], ease: 'power2.inOut', immediateRender: false };
      tl.fromTo(stage, { x: 0 }, { x: () => step(), ...io }, at(HOLD_TO_01[0]));
      tl.fromTo(mid, { scale: 1 }, { scale: 0.88, ...io }, at(HOLD_TO_01[0]));
      tl.fromTo(left, { scale: 0.88 }, { scale: 1, ...io }, at(HOLD_TO_01[0]));
      tl.fromTo(stage, { x: () => step() }, { x: () => -step(), ...across }, at(HOLD_TO_03[0]));
      tl.fromTo(left, { scale: 1 }, { scale: 0.88, ...across }, at(HOLD_TO_03[0]));
      tl.fromTo(right, { scale: 0.88 }, { scale: 1, ...across, immediateRender: true }, at(HOLD_TO_03[0]));
      return () => handoff.kill();
    }

    // Hold (desktop): a slow drift of the devices (captions keep their baseline), each at its own depth.
    const d0 = RANGE.toPaper[1] + 0.02;
    const drift = 1 - d0;
    const device = (fig: HTMLElement) => fig.querySelector<HTMLElement>('[role="img"]') ?? fig;
    tl.fromTo(device(mid), { yPercent: 0 }, { yPercent: -3, duration: drift }, at(d0));
    tl.fromTo(device(left), { yPercent: 0 }, { yPercent: -1.3, duration: drift }, at(d0));
    tl.fromTo(device(right), { yPercent: 0 }, { yPercent: -2, duration: drift }, at(d0));

    return () => handoff.kill();
  });

  return (
    <section ref={ref} id="app" data-scene="app" className={`scene ${styles.scene}`} aria-labelledby="app-title">
      <HandoffLine />
      <div className={`scene__frame ${styles.frame}`}>
        <header className={`grid ${styles.head}`}>
          <div className={styles.titleBlock}>
            <p className={`t-eyebrow ${styles.eyebrow}`} data-app="eyebrow">
              {APP.eyebrow}
            </p>
            <h2 id="app-title" className={`t-title ${styles.title}`} data-app="title">
              {APP.headline}
            </h2>
          </div>
          <p className={`t-body ${styles.sub}`} data-app="sub">
            {APP.subline}
          </p>
        </header>
        <div className={styles.stageWrap}>
          <Phones />
        </div>
      </div>
    </section>
  );
}
