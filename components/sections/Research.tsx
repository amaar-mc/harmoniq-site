'use client';

import { useRef } from 'react';
import { RESEARCH } from '@/content/copy';
import { gsap, ScrollTrigger } from '@/lib/motion/gsap';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import { EXPO, fadeOnce, linesOnce, riseOnce } from './editorial/reveal';
import styles from './Research.module.css';

/** Interface label for the recognition lists (makes no claim). */
const RECOGNITION_LABEL = RESEARCH.recognitionLabel;

/**
 * 06 · From research to product. Editorial, not pinned, on paper.
 * Desktop: the headline holds in a sticky left column while four chapters
 * scroll past on the right, each opened by a hairline and a tabular index.
 */
export default function Research() {
  const ref = useRef<HTMLElement>(null);

  useSceneMotion(ref, ({ reduce, root }) => {
    const q = <T extends Element = HTMLElement>(sel: string, scope: Element = root) =>
      Array.from(scope.querySelectorAll<T & HTMLElement>(sel));

    // Chapter progress (stadium pills in the sticky column). Toggles both ways.
    const pills = q('[data-pill]');
    const setActive = (i: number) => pills.forEach((p, j) => p.toggleAttribute('data-on', j === i));
    setActive(0);
    q('[data-chapter]').forEach((chapter, i) => {
      ScrollTrigger.create({
        trigger: chapter,
        start: 'top 52%',
        end: 'bottom 52%',
        onEnter: () => setActive(i),
        onEnterBack: () => setActive(i),
      });
    });

    if (reduce) {
      q('[data-reveal]').forEach((el) => fadeOnce(el, el));
      return;
    }

    // Intro: eyebrow, then the headline line by line.
    const intro = q('[data-intro]')[0];
    if (intro) {
      const [eyebrow] = q('[data-intro-eyebrow]');
      const [title] = q('[data-intro-title]');
      const [progress] = q('[data-intro-progress]');
      if (eyebrow) riseOnce(eyebrow, intro, { start: 'top 82%' });
      if (title) linesOnce(title, { start: 'top 86%', delay: 0.08 });
      if (progress) riseOnce(progress, intro, { start: 'top 82%', delay: 0.5 });
    }

    // Chapters: the hairline draws, the index settles, the text rises.
    q('[data-chapter]').forEach((chapter) => {
      const [rule] = q('[data-rule]', chapter);
      const [index] = q('[data-index]', chapter);
      if (rule) {
        gsap.fromTo(
          rule,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.6, ease: EXPO, scrollTrigger: { trigger: chapter, start: 'top 88%', once: true } },
        );
      }
      if (index) riseOnce(index, chapter, { start: 'top 88%', delay: 0.15 });
      q('[data-lines]', chapter).forEach((el, i) => linesOnce(el, { start: 'top 90%', delay: i === 0 ? 0.1 : 0.18 }));
      q('[data-rise]', chapter).forEach((el) => riseOnce(el, el, { start: 'top 92%', delay: 0.1 }));
      q('[data-list]', chapter).forEach((list) => riseOnce(q('li', list), list, { start: 'top 92%', delay: 0.1 }));
    });
  });

  return (
    <section
      ref={ref}
      id="research"
      data-scene="research"
      className={styles.section}
      aria-labelledby="research-title"
    >
      <div className={`grid ${styles.layout}`}>
        <header className={styles.intro} data-intro data-reveal>
          <p className={`t-eyebrow ${styles.eyebrow}`} data-intro-eyebrow>
            {RESEARCH.eyebrow}
          </p>
          <h2 id="research-title" className={styles.title} data-intro-title>
            {RESEARCH.headline}
          </h2>
          <div className={styles.progress} data-intro-progress aria-hidden="true">
            {RESEARCH.chapters.map((c) => (
              <span key={c.index} className={styles.pill} data-pill />
            ))}
          </div>
        </header>

        <ol className={styles.chapters}>
          {RESEARCH.chapters.map((chapter) => {
            const recognition = 'recognition' in chapter ? chapter.recognition : null;
            const aside = 'aside' in chapter ? chapter.aside : null;
            const titleId = `research-chapter-${chapter.index}`;
            return (
              <li key={chapter.index} className={styles.chapter} data-chapter data-reveal>
                <span className={styles.rule} data-rule aria-hidden="true" />
                <article className={styles.article} aria-labelledby={titleId}>
                  <p className={styles.index} data-index aria-hidden="true">
                    {chapter.index}
                  </p>
                  <div className={styles.body}>
                    <h3 id={titleId} className={styles.chapterTitle} data-lines>
                      {chapter.title}
                    </h3>
                    <p className={styles.text} data-lines>
                      {chapter.body}
                    </p>
                    {aside ? (
                      <p className={styles.aside} data-rise>
                        <span className={styles.asideMark} aria-hidden="true" />
                        <span>{aside}</span>
                      </p>
                    ) : null}
                    {recognition ? (
                      <div className={styles.recognition}>
                        <p className={styles.recLabel} id={`${titleId}-rec`} aria-hidden="true" data-rise>
                          {RECOGNITION_LABEL}
                        </p>
                        <ul className={styles.recList} aria-labelledby={`${titleId}-rec`} data-list>
                          {recognition.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
