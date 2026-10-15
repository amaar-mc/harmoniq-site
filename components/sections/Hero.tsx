'use client';

import { useRef } from 'react';
import { HERO } from '@/content/copy';
import { sceneTimeline } from '@/lib/motion/scene';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import styles from './Hero.module.css';

/** "Memory keeps time." split into two display lines of masked words. */
const LINES = [['Memory'], ['keeps', 'time.']];

export default function Hero() {
  const ref = useRef<HTMLElement>(null);

  // Leaving the hero is scrubbed by scroll (the entrance above is CSS, on load).
  useSceneMotion(ref, ({ root, reduce }) => {
    const { tl } = sceneTimeline(root, 0, 1);
    const lines = root.querySelectorAll(`.${styles.lineWrap}`);
    const meta = root.querySelectorAll(`.${styles.meta}, .${styles.cue}`);
    if (reduce) {
      tl.to([...lines, ...meta], { opacity: 0, duration: 0.3 }, 0.55);
      return;
    }
    tl.to(lines, { yPercent: -38, opacity: 0, duration: 0.55, stagger: 0.08, ease: 'power2.in' }, 0.22);
    tl.to(meta, { y: -40, opacity: 0, duration: 0.45, ease: 'power2.in' }, 0.12);
  });

  let i = 0;
  return (
    <section ref={ref} id="top" data-scene="hero" className={`scene ${styles.root}`} aria-labelledby="hero-title">
      <div className={`scene__frame ${styles.frame}`}>
        <div className={styles.copy}>
          <h1 id="hero-title" className={`t-display ${styles.title}`} aria-label={HERO.headline}>
            {LINES.map((words, li) => (
              <span key={li} className={styles.lineWrap} aria-hidden="true">
                {words.map((w, wi) => (
                  <span key={wi}>
                    <span className={styles.mask}>
                      <span className={styles.word} style={{ '--i': i++ } as React.CSSProperties}>
                        {w}
                      </span>
                    </span>
                    {wi < words.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <div className={styles.meta}>
            <p className={`t-lede ${styles.sub}`}>{HERO.subline}</p>
            <span className={`chip ${styles.chip}`}>
              <span className="chip__pill" aria-hidden="true" />
              {HERO.status}
            </span>
          </div>
          <div className={styles.cue} aria-hidden="true">
            <span className={styles.cueTrack}>
              <span className={styles.cueDot} />
            </span>
            <span className={`t-eyebrow ${styles.cueLabel}`}>{HERO.scroll}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
