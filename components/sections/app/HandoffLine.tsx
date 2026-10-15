'use client';

import type { CSSProperties } from 'react';
import { APP as RANGE, HANDOFF_LINE, LOOP } from '@/components/experience/timeline';
import { ScrollTrigger } from '@/lib/motion/gsap';
import { getScene, scenePos, sceneProgress } from '@/lib/motion/scene';
import styles from './HandoffLine.module.css';
import { waveState } from './waveState';

/**
 * The hand-off line: the loop's travelling light, stretched into a line at the
 * centre of the viewport, becomes the live waveform on the in-session phone.
 * Rendered inside the app section, `position: fixed` (z above the sections,
 * below the nav). Its state is a pure function of scroll; see createHandoff.
 */
export default function HandoffLine() {
  const vars = {
    '--handoff-w-desktop': HANDOFF_LINE.widthDesktop,
    '--handoff-w-mobile': HANDOFF_LINE.widthMobile,
  } as CSSProperties;
  return (
    <>
      <span className={styles.ruler} style={{ ...vars, height: HANDOFF_LINE.height }} data-handoff-ruler="" aria-hidden="true" />
      <span
        className={styles.line}
        style={{
          ...vars,
          height: HANDOFF_LINE.height,
          background: HANDOFF_LINE.color,
          boxShadow: HANDOFF_LINE.glow,
          borderRadius: 1,
        }}
        data-handoff-line=""
        aria-hidden="true"
      />
    </>
  );
}

/** Loop progress at which the loop's own line hides and this one takes over. */
const LOOP_TAKEOVER = LOOP.handoff[1];
/** App progress: the landed line crossfades into the phone's (still flat) waveform. */
const LINE_FADE: readonly [number, number] = [RANGE.handoffLand[1], RANGE.handoffLand[1] + 0.045];
/** App progress: the waveform's amplitude grows from flat to breathing. */
const WAVE_GROW: readonly [number, number] = [0.32, 0.44];
/** Reduced motion: the line simply fades while the phones fade in. */
const REDUCED_FADE: readonly [number, number] = [0.0, 0.12];
/** The landed line matches the waveform's stroke. */
const LANDED_HEIGHT = 1.5;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sineInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const span = (p: number, [a, b]: readonly [number, number]) => clamp01((p - a) / (b - a));

/**
 * Drives the hand-off line from scroll. `update` is idempotent and reads only
 * scroll position and live layout (the waveform baseline's rect), so it can be
 * called from any scroll callback; call it again after the phones' timeline
 * renders so the landing tracks the phone in the same frame.
 */
export function createHandoff(root: HTMLElement, { reduce }: { reduce: boolean }) {
  const line = root.querySelector<HTMLElement>('[data-handoff-line]');
  const ruler = root.querySelector<HTMLElement>('[data-handoff-ruler]');
  const target = root.querySelector<HTMLElement>('[data-handoff-target]');
  // Looked up on use, so a loop scene that mounts or re-mounts later is still followed.
  const loopScene = () => getScene('loop');
  let shown = false;

  const hide = () => {
    if (!line || !shown) return;
    shown = false;
    line.style.visibility = 'hidden';
    line.style.opacity = '0';
  };

  const update = () => {
    const pApp = sceneProgress(root);
    // Without a loop scene, the take-over happens as the app scene enters (loop p 1 ≈ app p -1).
    const loop = loopScene();
    const pLoop = loop ? sceneProgress(loop) : pApp + 1;

    waveState.amp = reduce ? 1 : sineInOut(span(pApp, WAVE_GROW));

    if (!line || !ruler || !target) return;
    const end = reduce ? REDUCED_FADE[1] : LINE_FADE[1];
    if (pLoop < LOOP_TAKEOVER || pApp >= end) {
      hide();
      return;
    }

    const rest = ruler.getBoundingClientRect();
    let x = rest.left;
    let w = rest.width;
    let y = rest.top + rest.height / 2;
    let h: number = HANDOFF_LINE.height;
    let o = 1;

    if (reduce) {
      o = 1 - span(pApp, REDUCED_FADE);
    } else {
      const t = span(pApp, RANGE.handoffLand);
      if (t > 0) {
        const e = sineInOut(t);
        const land = target.getBoundingClientRect();
        x = lerp(x, land.left, e);
        w = lerp(w, land.width, e);
        y = lerp(y, land.top + land.height / 2, e);
        h = lerp(h, LANDED_HEIGHT, e);
      }
      o = 1 - span(pApp, LINE_FADE);
    }

    line.style.transform = `translate3d(${x.toFixed(2)}px, ${(y - h / 2).toFixed(2)}px, 0)`;
    line.style.width = `${w.toFixed(2)}px`;
    line.style.height = `${h.toFixed(2)}px`;
    line.style.opacity = o.toFixed(3);
    if (!shown) {
      shown = true;
      line.style.visibility = 'visible';
    }
  };

  const st = ScrollTrigger.create({
    trigger: root,
    start: () => {
      const loop = loopScene();
      return loop ? scenePos(loop, LOOP.handoff[0]) : scenePos(root, -1.2);
    },
    end: () => scenePos(root, WAVE_GROW[1] + 0.04),
    invalidateOnRefresh: true,
    onUpdate: update,
    onToggle: update,
    onRefresh: update,
  });
  update();

  return {
    update,
    kill() {
      st.kill();
      if (line) {
        line.style.removeProperty('transform');
        line.style.removeProperty('opacity');
        line.style.removeProperty('visibility');
        line.style.width = '';
        line.style.height = `${HANDOFF_LINE.height}px`;
      }
      shown = false;
    },
  };
}
