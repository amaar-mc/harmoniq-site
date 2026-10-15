'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LOOP } from '@/content/copy';
import s from '../Loop.module.css';
import { STATION_SIDES, VB, stadiumD, stationsFor } from './geometry';

/**
 * The instrument: a stadium loop drawn around the device (which the stage
 * renders behind it), five stations, and the traveling light. Decorative:
 * the ordered list of steps carries the meaning for assistive tech.
 *
 * The loop's size comes from CSS (--loop-w / --loop-h on the section), so the
 * drawing is re-derived from the box's measured aspect: any stadium works.
 */
export default function LoopDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState<number>(VB.w);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const next = Math.round((VB.h * r.width * 100) / r.height) / 100;
      setW((prev) => (Math.abs(prev - next) < 0.05 ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const d = useMemo(() => stadiumD(w, VB.h), [w]);
  const stations = useMemo(() => stationsFor(w, VB.h), [w]);

  return (
    <div ref={ref} className={s.diagram} data-l="diagram" aria-hidden="true">
      <svg className={s.loopSvg} viewBox={`0 0 ${w} ${VB.h}`} data-l="svg" focusable="false">
        <path d={d} className={s.base} data-l="base" vectorEffect="non-scaling-stroke" />
        <path d={d} className={s.trail} data-l="trail" vectorEffect="non-scaling-stroke" />
      </svg>

      {stations.map((st, i) => {
        const node = LOOP.nodes[i];
        return (
          <div
            key={node.id}
            className={s.node}
            style={{ left: `${st.left}%`, top: `${st.top}%` }}
            data-side-d={STATION_SIDES[i][0]}
            data-side-m={STATION_SIDES[i][1]}
            data-l="node"
          >
            <span className={s.ring} data-l="ring" />
            <span className={s.dot} data-l="dot">
              <span className={s.dotLit} data-l="lit" />
            </span>
            <span className={s.label} data-l="label">
              <span className={s.labelIdx} data-l="idx">
                {node.index}
              </span>
              <span className={s.labelTitle} data-l="ltitle">
                {node.title}
              </span>
            </span>
          </div>
        );
      })}

      <div className={s.light} data-l="light" />
    </div>
  );
}
