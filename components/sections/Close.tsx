'use client';

import { useRef } from 'react';
import { CLOSE as CLOSE_RANGES } from '@/components/experience/timeline';
import { CLOSE, CONTACT_URL } from '@/content/copy';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import { fadeIn, scenePos, sceneProgress, sceneTimeline } from '@/lib/motion/scene';
import { linesInScrub, splitEditorial } from './editorial/reveal';
import styles from './Close.module.css';

/**
 * 08 · Close (text layer). Pinned, on charcoal painted by the stage.
 * The device turns in the upper centre and its light line later stretches into
 * a hairline at that height, so the copy lives in the lower part of the frame.
 * Every reveal is scrubbed over CLOSE.text: a pure function of scroll.
 */
export default function Close() {
  const ref = useRef<HTMLElement>(null);

  useSceneMotion(ref, ({ reduce, root }) => {
    const [from, to] = CLOSE_RANGES.text;
    const { tl, at } = sceneTimeline(root, from, to);
    const title = root.querySelector<HTMLElement>('[data-close-title]');
    const subline = root.querySelector<HTMLElement>('[data-close-subline]');
    const mission = root.querySelector<HTMLElement>('[data-close-mission]');
    const cta = root.querySelector<HTMLElement>('[data-close-cta]');
    if (!title || !subline || !mission || !cta) return;

    const span = to - from; // 0.30
    if (reduce) {
      fadeIn(tl, title, at(from), span * 0.45);
      fadeIn(tl, [subline, mission], at(from + span * 0.3), span * 0.4);
      fadeIn(tl, cta, at(from + span * 0.55), span * 0.4);
      return;
    }

    linesInScrub(tl, splitEditorial(title).lines, at(from), span * 0.5, span * 0.09);
    linesInScrub(tl, splitEditorial(subline).lines, at(from + span * 0.32), span * 0.42, span * 0.06);
    fadeIn(tl, mission, at(from + span * 0.55), span * 0.35, 10);
    fadeIn(tl, cta, at(from + span * 0.66), span * 0.34, 14);
  });

  /** Keyboard users reaching the CTA before it has appeared: bring it into view. */
  const onFocus = () => {
    const scene = ref.current;
    if (!scene) return;
    const end = CLOSE_RANGES.text[1];
    if (sceneProgress(scene) < end) window.scrollTo({ top: scenePos(scene, end + 0.02) });
  };

  return (
    <section
      ref={ref}
      id="close"
      data-scene="close"
      data-tone="dark"
      className={`scene ${styles.section}`}
      aria-labelledby="close-title"
    >
      <div className={`scene__frame ${styles.frame}`}>
        <div className={styles.copy}>
          <h2 id="close-title" className={styles.title} data-close-title>
            {CLOSE.headline}
          </h2>
          <p className={styles.subline} data-close-subline>
            {CLOSE.subline}
          </p>
          <p className={styles.mission} data-close-mission>
            {CLOSE.mission}
          </p>
          <div id="follow" className={styles.cta} data-close-cta onFocus={onFocus}>
            <a className="loop-btn" href={CONTACT_URL}>
              {CLOSE.cta}
              <span className="loop-btn__dot" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
