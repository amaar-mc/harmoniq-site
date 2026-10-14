'use client';

import Lenis from 'lenis';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Quality } from '@/lib/harmoniq/materials';
import { fetchBakedModel } from '@/lib/harmoniq/modelSource';
import { gsap, ScrollTrigger } from '@/lib/motion/gsap';
import { getScene, scenePos } from '@/lib/motion/scene';
import { director } from './director';
import { bgAt, buildChoreography, createPose, poseAt, segmentAt, type Anchor } from './poses';
import Stills from './Stills';
import styles from './Experience.module.css';

// The 3D stage loads after the hero text has painted (never blocks first paint).
const StageCanvas = dynamic(() => import('./StageCanvas'), { ssr: false });

function hasWebGL(): boolean {
  if (new URLSearchParams(window.location.search).has('nowebgl')) return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

export default function Experience() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const outroRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'idle' | 'webgl' | 'stills'>('idle');
  const [quality, setQuality] = useState<Quality>('high');

  // Decide WebGL vs stills, then load the stage when the main thread is idle.
  useEffect(() => {
    if (!hasWebGL()) {
      director.intro = 1;
      // Capability detection needs the browser, so it can only run after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('stills');
      return;
    }
    const coarse = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
    const q: Quality = coarse ? 'low' : 'high';
    setQuality(q);
    // Start downloading the baked model while the stage's JS loads.
    fetchBakedModel(q);
    const go = () => setMode('webgl');
    const w = window as Window & typeof globalThis;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(go, { timeout: 900 });
      return () => w.cancelIdleCallback(id);
    }
    const id = w.setTimeout(go, 250);
    return () => w.clearTimeout(id);
  }, []);

  // The scroll director: Lenis on the GSAP ticker, poses from scroll, render on demand.
  useEffect(() => {
    const html = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mqMobile = window.matchMedia('(max-width: 767px)');
    director.reduced = reduce;

    const lenis = reduce
      ? null
      : new Lenis({
          duration: 1.15,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          anchors: true,
          autoRaf: false,
        });
    lenis?.on('scroll', ScrollTrigger.update);
    const lenisRaf = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);
    // Handles for the screenshot scripts (scripts/shoot-site.mjs).
    Object.assign(window, { __lenis: lenis, __director: director });

    const resolve = (a: Anchor) => {
      const el = getScene(a[0]);
      if (!el) return null;
      return scenePos(el, a[1]) + (a[2] ?? 0) * window.innerHeight;
    };
    let choreo = buildChoreography(mqMobile.matches, resolve);
    const rebuild = () => {
      choreo = buildChoreography(mqMobile.matches, resolve);
      director.invalidate();
    };
    ScrollTrigger.addEventListener('refresh', rebuild);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', rebuild);

    const target = createPose();
    director.target = target;
    let lastBg = '';
    let lastSeg = -1;
    let cut = 1;
    let lastTime = 0;

    // Adaptive quality: sustained slow frames step the pixel ratio down, then
    // drop the glass transmission pass. One way only, so it never oscillates.
    let rendering = false;
    let ema = 1 / 60;
    let slow = 0;
    let step = 0;
    const dprSteps = [Math.min(2, window.devicePixelRatio || 1), 1.5, 1].filter((v, i, a) => i === 0 || v < a[0]);
    const perf = (dt: number, consecutive: boolean) => {
      // Automated browsers (screenshots) render in software: never adapt there.
      if (!consecutive || dt <= 0 || dt > 0.25 || !director.ready || navigator.webdriver) return;
      ema += (dt - ema) * 0.08;
      slow = ema > 1 / 38 ? slow + dt : Math.max(0, slow - dt * 0.5);
      if (slow < 1.5) return;
      slow = 0;
      ema = 1 / 60;
      step++;
      if (step < dprSteps.length) director.setDpr?.(dprSteps[step]);
      else if (step === dprSteps.length) director.degradeGlass?.();
    };

    const tick = (time: number) => {
      const dt = Math.min(0.1, Math.max(0, time - lastTime));
      lastTime = time;
      const y = window.scrollY;
      director.time = time;
      poseAt(choreo, y, target, reduce);
      if (director.override) Object.assign(target, director.override);

      // Reduced motion: cut between stations through a short fade.
      if (reduce) {
        const seg = segmentAt(choreo, y);
        if (seg !== lastSeg) {
          if (lastSeg !== -1) cut = 0;
          lastSeg = seg;
          director.invalidate();
        }
        if (cut < 1) {
          cut = Math.min(1, cut + dt / 0.5);
          director.invalidate();
        }
      }

      const bg = bgAt(choreo, y);
      if (bg !== lastBg) {
        lastBg = bg;
        director.bg = bg;
        html.style.setProperty('--page-bg', bg);
        html.dataset.bgTone = luminance(bg) < 0.3 ? 'dark' : 'light';
        director.invalidate();
      }

      const C = director.current;
      if (C && !director.needsRender) {
        for (const f in target) {
          const key = f as keyof typeof target;
          if (Math.abs(target[key] - C[key]) > 2e-4) {
            director.needsRender = true;
            break;
          }
        }
      }
      const shown = Math.max(target.stage, C?.stage ?? 0) * director.intro;
      if (director.render && (shown > 0.001 || !director.warm)) {
        if (director.needsRender || !director.warm) {
          director.render(time);
          if (director.ready) director.warm = true;
          perf(dt, rendering);
          rendering = true;
        } else rendering = false;
      } else if (C) {
        // Hidden: jump straight to the pose so nothing travels on re-entry.
        Object.assign(C, target);
      }

      const cur = director.current ?? target;
      const canvas = canvasRef.current;
      if (canvas) {
        const o = cur.stage * director.intro * sine(cut);
        canvas.style.opacity = o.toFixed(3);
        canvas.style.visibility = o > 0.001 ? 'visible' : 'hidden';
      }

      // Giant word behind the device (reveal).
      const word = wordRef.current;
      if (word) {
        const w = cur.word * director.intro;
        word.style.opacity = w.toFixed(3);
        if (w > 0.001) {
          const c = director.screen.deviceCentre;
          const x = c ? c.x : window.innerWidth / 2;
          const yy = c ? c.y : window.innerHeight / 2;
          word.style.transform = `translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(1.06 - 0.06 * cur.word).toFixed(4)})`;
        }
      }

      // Close: the light line stretches back into a hairline.
      const outro = outroRef.current;
      if (outro) {
        const h = cur.hairline;
        const A = director.screen.lightLineA;
        const B = director.screen.lightLineB;
        if (h > 0.001 && A && B && director.ready) {
          const cx = (A.x + B.x) / 2;
          const cy = (A.y + B.y) / 2;
          const base = Math.hypot(B.x - A.x, B.y - A.y);
          const ang = Math.atan2(B.y - A.y, B.x - A.x);
          const e = sine(h);
          const len = base + (window.innerWidth * 1.15 - base) * e;
          const a = ang * (1 - e);
          outro.style.opacity = Math.min(1, h * 5).toFixed(3);
          outro.style.width = `${len.toFixed(1)}px`;
          outro.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) rotate(${a.toFixed(4)}rad) translateX(-50%)`;
          outro.style.boxShadow = `0 0 ${(10 * (1 - e) + 2).toFixed(1)}px rgba(234,242,255,${(0.55 * (1 - e) + 0.15).toFixed(2)})`;
        } else outro.style.opacity = '0';
      }
    };
    gsap.ticker.add(tick);

    const onResize = () => director.invalidate();
    window.addEventListener('resize', onResize);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.remove(lenisRaf);
      ScrollTrigger.removeEventListener('refresh', rebuild);
      window.removeEventListener('load', rebuild);
      window.removeEventListener('resize', onResize);
      lenis?.destroy();
    };
  }, []);

  // Intro (≤2.5 s once the device is ready; any scroll skips it).
  useEffect(() => {
    if (mode !== 'webgl') return;
    const line = introRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tl: gsap.core.Timeline | null = null;
    let raf = 0;
    const skip = () => tl?.progress(1);
    const events = ['wheel', 'touchmove', 'keydown'] as const;

    const start = () => {
      if (!line) return;
      const A = director.screen.lightLineA;
      const B = director.screen.lightLineB;
      const r = line.getBoundingClientRect();
      const breathOpacity = getComputedStyle(line).opacity;
      line.classList.add(styles.introGather);
      gsap.set(line, { opacity: breathOpacity, scaleX: 1 });
      tl = gsap.timeline({
        onComplete: () => {
          events.forEach((e) => window.removeEventListener(e, skip));
          line.style.visibility = 'hidden';
        },
      });
      if (reduce || window.scrollY > 40 || !A || !B) {
        tl.to(director, { intro: 1, duration: reduce ? 0.4 : 0.8, ease: 'power2.out' }, 0);
        tl.to(line, { opacity: 0, duration: 0.3 }, 0);
        return;
      }
      events.forEach((e) => window.addEventListener(e, skip, { passive: true }));
      const cx = (A.x + B.x) / 2;
      const cy = (A.y + B.y) / 2;
      const len = Math.max(8, Math.hypot(B.x - A.x, B.y - A.y));
      const ang = (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI;
      const dx = cx - (r.left + r.width / 2);
      const dy = cy - (r.top + r.height / 2);
      // From where the CSS breath left it, gather into the light line.
      tl.to(line, { opacity: 1, duration: 0.25, ease: 'sine.out' }, 0)
        .to(line, { x: dx, y: dy, scaleX: len / r.width, rotation: ang, duration: 1.05, ease: 'expo.inOut' }, 0.05)
        .to(line, { backgroundColor: '#EAF2FF', boxShadow: '0 0 10px 1px rgba(234,242,255,0.6)', duration: 0.5 }, 0.6)
        .to(director, { intro: 1, duration: 1.3, ease: 'power2.inOut' }, 0.45)
        .to(line, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 1.05);
    };

    // Wait for the model plus a first frame, and at least ~1 s of the breathing line.
    const wait = () => {
      const elapsed = performance.now() / 1000;
      if (director.ready && director.warm && director.screen.lightLineA && elapsed > 1.1) start();
      else raf = requestAnimationFrame(wait);
    };
    raf = requestAnimationFrame(wait);
    return () => {
      cancelAnimationFrame(raf);
      tl?.kill();
      events.forEach((e) => window.removeEventListener(e, skip));
    };
  }, [mode]);

  return (
    <div className="stage" aria-hidden="true">
      <div ref={canvasRef} className={styles.canvas}>
        {mode === 'webgl' && <StageCanvas quality={quality} />}
      </div>
      {mode === 'stills' && <Stills />}
      <p ref={wordRef} className={styles.word}>
        Harmoniq
      </p>
      {mode !== 'stills' && <div ref={introRef} className={styles.intro} />}
      <div ref={outroRef} className={styles.outro} />
    </div>
  );
}
