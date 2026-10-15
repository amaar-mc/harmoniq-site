'use client';

import { useRef } from 'react';
import { FOUNDER } from '@/content/copy';
import { gsap } from '@/lib/motion/gsap';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import { splitEditorial } from './editorial/reveal';
import styles from './Founder.module.css';

/** Section heading for assistive tech (makes no claim). */
const HEADING = FOUNDER.heading;

/**
 * 07 · Founder note. One quote, one name. The quote surfaces line by line as
 * it travels up the viewport: scrubbed, a pure function of scroll, so it
 * holds its breath and lets go again if the reader scrolls back.
 */
export default function Founder() {
  const ref = useRef<HTMLElement>(null);

  useSceneMotion(ref, ({ reduce, root }) => {
    const quote = root.querySelector<HTMLElement>('[data-quote]');
    const text = root.querySelector<HTMLElement>('[data-quote-text]');
    const mark = root.querySelector<HTMLElement>('[data-quote-mark]');
    const caption = root.querySelector<HTMLElement>('[data-caption]');
    const rule = root.querySelector<HTMLElement>('[data-caption-rule]');
    if (!quote || !text || !caption) return;

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: quote,
        start: 'top 88%',
        end: 'center 56%',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    if (reduce) {
      tl.fromTo([quote, caption], { opacity: 0 }, { opacity: 1, duration: 1 });
      return;
    }

    const { lines } = splitEditorial(text);
    const n = lines.length;
    // Each line takes ~40% of the travel; lines overlap like an exhale.
    const dur = 0.4;
    const step = n > 1 ? (1 - dur - 0.12) / (n - 1) : 0;
    lines.forEach((line, i) => {
      tl.fromTo(
        line,
        { yPercent: 72, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: dur, ease: 'power3.out' },
        i * step,
      );
    });
    if (mark) tl.fromTo(mark, { opacity: 0 }, { opacity: 1, duration: dur * 0.8, ease: 'power2.out' }, 0);
    tl.fromTo(caption, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.82);
    if (rule) tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power2.inOut' }, 0.86);
    tl.set({}, {}, 1.16);
  });

  return (
    <section ref={ref} id="founder" data-scene="founder" className={styles.section} aria-labelledby="founder-title">
      <h2 id="founder-title" className="sr-only">
        {HEADING}
      </h2>
      <div className="grid">
        <figure className={styles.figure}>
          <blockquote className={styles.quote} data-quote>
            <span className={styles.mark} data-quote-mark aria-hidden="true">
              “
            </span>
            <p className={styles.text} data-quote-text>
              {FOUNDER.quote}
              <span aria-hidden="true">”</span>
            </p>
          </blockquote>
          <figcaption className={styles.caption} data-caption>
            <span className={styles.captionMark} aria-hidden="true" />
            <span>
              <span className={styles.name}>{FOUNDER.name}</span>
              <span className={styles.role}>, {FOUNDER.role}</span>
            </span>
            <span className={styles.captionRule} data-caption-rule aria-hidden="true" />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
