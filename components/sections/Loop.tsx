'use client';

import { useRef } from 'react';
import { LOOP } from '@/content/copy';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import HearDemo from './loop/HearDemo';
import LoopDiagram from './loop/LoopDiagram';
import { buildLoopMotion } from './loop/motion';
import { VISUALS } from './loop/NodeVisuals';
import { keepUnits, sentenceLines } from './loop/text';
import s from './Loop.module.css';

/**
 * 04 · How it works: the closed loop. Pinned on graphite. The device (drawn
 * by the stage behind this section) sits small inside a stadium loop; a light
 * travels the five stations as the visitor scrolls, then leaves the loop and
 * becomes the hand-off line that the App section picks up.
 */
export default function Loop() {
  const ref = useRef<HTMLElement>(null);
  useSceneMotion(ref, buildLoopMotion);

  const total = String(LOOP.nodes.length).padStart(2, '0');

  return (
    <section
      ref={ref}
      id="loop"
      data-scene="loop"
      data-tone="dark"
      className={`scene ${s.section}`}
      aria-labelledby="loop-title"
    >
      <div className={`scene__frame ${s.frame}`} data-l="frame">
        <LoopDiagram />

        <header className={s.head} data-l="head">
          <p className={`t-eyebrow ${s.eyebrow}`} data-l="eyebrow">
            {LOOP.eyebrow}
          </p>
          <h2 id="loop-title" className={`t-title ${s.title}`} data-l="title">
            {LOOP.headline}
          </h2>
        </header>

        <div className={s.column} data-l="column">
          <div className={s.stack}>
            <p className={`t-lede ${s.intro}`} data-l="intro">
              {LOOP.intro}
            </p>
            <ol className={s.panels}>
              {LOOP.nodes.map((node, i) => {
                const Visual = VISUALS[i];
                return (
                  <li key={node.id} className={s.panel} data-l="panel">
                    <p className={`t-index ${s.panelIndex}`}>
                      <span className={s.panelNum}>{node.index}</span>
                      <span aria-hidden="true">/</span>
                      <span>{total}</span>
                    </p>
                    <h3 className={s.panelTitle}>{node.title}</h3>
                    <p className={`t-body ${s.panelBody}`}>
                      {sentenceLines(keepUnits(node.body)).map((line, k, lines) => (
                        <span key={k} className={lines.length > 1 ? s.sentence : undefined}>
                          {line}
                          {k < lines.length - 1 ? ' ' : null}
                        </span>
                      ))}
                    </p>
                    <Visual />
                    {node.id === 'deliver' && <HearDemo />}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className={s.line} data-l="line" aria-hidden="true" />
      </div>
    </section>
  );
}
