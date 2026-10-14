'use client';

import { useRef } from 'react';
import { DESIGN } from '@/content/copy';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import BeatProgress from './design/BeatProgress';
import ExplodedLabels from './design/ExplodedLabels';
import PartsList from './design/PartsList';
import { buildDesignMotion } from './design/motion';
import s from './DesignStory.module.css';

/** Beats whose placards sit on graphite (the background turns at the crown → contacts boundary). */
const DARK_BEATS = new Set(['contacts', 'fit', 'layers']);

/**
 * 03 · Design story: the HTML layer. Pinned through five beats while the
 * stage (lead) moves the camera around the device. Copy sits in a narrow
 * placard column opposite the device: left on desktop, below it on mobile.
 */
export default function DesignStory() {
  const ref = useRef<HTMLElement>(null);
  useSceneMotion(ref, buildDesignMotion);

  return (
    <section ref={ref} id="design" data-scene="design" className="scene" aria-labelledby="design-title">
      <div className="scene__frame">
        <ExplodedLabels parts={DESIGN.parts} />
        <div className={`grid ${s.layout}`}>
          <div className={s.column} data-design-column>
            <header className={s.header} data-design-chrome>
              <h2 id="design-title" className={`t-eyebrow ${s.heading}`} data-design-heading>
                {DESIGN.eyebrow}
              </h2>
              <span className={s.rule} data-design-rule aria-hidden="true" />
              <BeatProgress count={DESIGN.beats.length} />
            </header>

            <div className={s.stack}>
              {DESIGN.beats.map((b) => (
                <article
                  key={b.id}
                  className={s.beat}
                  data-beat={b.id}
                  data-tone={DARK_BEATS.has(b.id) ? 'dark' : undefined}
                  aria-labelledby={`design-${b.id}`}
                >
                  <p className={s.meta} data-meta>
                    <span className={s.metaInner} data-meta-inner>
                      <span className={`t-index ${s.index}`}>{b.index}</span>
                      <span className={s.pill} aria-hidden="true" />
                      <span className="t-eyebrow">{b.label}</span>
                    </span>
                  </p>
                  <div className={s.cell}>
                    <div className={s.text} data-text>
                      <h3 id={`design-${b.id}`} className={s.headline} data-headline>
                        {b.headline}
                      </h3>
                      <p className={`t-body ${s.body}`} data-body>
                        {b.body}
                      </p>
                    </div>
                    {b.id === 'layers' && <PartsList parts={DESIGN.parts} labelledBy={`design-${b.id}`} />}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
