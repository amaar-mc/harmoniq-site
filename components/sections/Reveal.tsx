'use client';

import { useRef } from 'react';
import { REVEAL } from '@/content/copy';
import { fadeIn, fadeOut, linesIn, linesOut, sceneTimeline, splitLines } from '@/lib/motion/scene';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import styles from './Reveal.module.css';

/** 02 Reveal: the device lifts and turns to face us; the line arrives beneath it. */
export default function Reveal() {
  const ref = useRef<HTMLElement>(null);

  useSceneMotion(ref, ({ root, reduce }) => {
    const { tl } = sceneTimeline(root, 0, 1);
    const title = root.querySelector('h2')!;
    const body = root.querySelector('p')!;
    if (reduce) {
      fadeIn(tl, [title, body], 0.38, 0.08);
      fadeOut(tl, [title, body], 0.88, 0.08);
      return;
    }
    const t = splitLines(title);
    const b = splitLines(body);
    linesIn(tl, t.lines, 0.36, 0.16, 0.03);
    linesIn(tl, b.lines, 0.45, 0.14, 0.02);
    linesOut(tl, [...t.lines, ...b.lines], 0.87, 0.1, 0.008);
  });

  return (
    <section ref={ref} id="reveal" data-scene="reveal" className="scene" aria-labelledby="reveal-title">
      <div className={`scene__frame ${styles.frame}`}>
        <h2 id="reveal-title" className={`t-title ${styles.title}`}>
          {REVEAL.headline}
        </h2>
        <p className={`t-body ${styles.body}`}>{REVEAL.body}</p>
      </div>
    </section>
  );
}
