'use client';

import { useEffect, useRef } from 'react';
import { breathAt } from '@/lib/motion/breath';
import styles from './Phone.module.css';
import { waveState } from './waveState';

/** viewBox units. The baseline (y = H / 2) is where the hand-off line lands. */
const W = 200;
const H = 64;
const N = 120;
const MAX_AMP = 21;

/**
 * A calm line waveform whose amplitude breathes with the device's light line
 * (breathAt, ~5 s). Three slow sines drifting at different speeds, tapered to
 * the baseline at both ends so the flat hand-off line becomes it seamlessly.
 * Animates only while on screen; static under reduced motion. Never flashes.
 */
export default function SessionWave() {
  const svg = useRef<SVGSVGElement>(null);
  const core = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = svg.current;
    const path = core.current;
    if (!el || !path) return;
    const dot = el.closest('[data-session]')?.querySelector<HTMLElement>('[data-breath]') ?? null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let flat = false;
    const draw = (t: number, amp: number, breath: number) => {
      if (dot) dot.style.opacity = (0.4 + 0.6 * breath).toFixed(3);
      // While the hand-off line is landing the waveform is a still, flat line: draw it once.
      if (amp <= 0 && flat) return;
      flat = amp <= 0;
      const a = amp * (0.42 + 0.58 * breath) * MAX_AMP;
      let d = '';
      for (let i = 0; i <= N; i++) {
        const x = i / N;
        const env = Math.pow(Math.sin(Math.PI * x), 1.5);
        const s =
          0.6 * Math.sin(2 * Math.PI * 1.55 * x - 0.52 * t) +
          0.28 * Math.sin(2 * Math.PI * 2.9 * x + 0.71 * t + 1.3) +
          0.12 * Math.sin(2 * Math.PI * 5.2 * x - 0.93 * t + 0.4);
        const y = H / 2 - a * env * s;
        d += `${i ? 'L' : 'M'}${(x * W).toFixed(2)} ${y.toFixed(2)}`;
      }
      path.setAttribute('d', d);
    };

    if (reduce) {
      draw(2.4, 1, 0.6);
      return;
    }

    let raf = 0;
    let running = false;
    const tick = () => {
      const t = performance.now() / 1000;
      draw(t, waveState.amp, breathAt(t));
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(el);
    draw(0, waveState.amp, 0.5);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.wave}>
      <svg
        ref={svg}
        className={styles.waveSvg}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        data-app="wave"
        aria-hidden="true"
        focusable="false"
      >
        <path ref={core} d={`M0 ${H / 2}L${W} ${H / 2}`} />
      </svg>
      {/* The hand-off line lands exactly on this baseline (measured live). */}
      <span className={styles.baseline} data-handoff-target="" />
    </div>
  );
}
