'use client';

import type Lenis from 'lenis';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { LOOP as RANGES } from '@/components/experience/timeline';
import { LOOP } from '@/content/copy';
import { getScene, scenePos, sceneProgress } from '@/lib/motion/scene';
import s from '../Loop.module.css';
import { keepUnits } from './text';

/**
 * "Hear 40 Hz": a five-second demonstration through Web Audio. A soft,
 * low major-seventh chord whose loudness is modulated at 40 Hz. Plays only
 * on press; never autoplays. The AudioContext is created on the first press
 * and closed when the section leaves the viewport or the component unmounts.
 *
 * The control shows only while 04 Deliver runs, but stays in the tab order:
 * focusing it from elsewhere scrolls the loop to Deliver, where it is shown.
 */

const DURATION = 5;
const FADE_IN = 0.4;
const FADE_OUT = 0.8;
/** Master gain cap (brief: capped volume). */
const MASTER = 0.11;
/** Amplitude-modulation depth m: gain = (1 + m·sin 2π·40t) / (1 + m), so 0.25 → 1. */
const DEPTH = 0.6;
const RATE = 40;
/** Cmaj7, open and low: C3 G3 B3 E4. */
const CHORD = [130.81, 196.0, 246.94, 329.63];
/** Piano-ish partials: [multiple of f, waveform, level]. */
const PARTIALS: Array<[number, OscillatorType, number]> = [
  [1, 'sine', 1],
  [2, 'sine', 0.2],
  [3, 'sine', 0.05],
  [1, 'triangle', 0.16],
];
const STOPPED = LOOP.demo.stopped;

interface Playback {
  ctx: AudioContext;
  master: GainNode;
  sources: AudioScheduledSourceNode[];
  timer: number;
}

type AudioCtor = typeof AudioContext;

/** Where the panel and button are fully shown (loop scene progress), and where focus lands. */
const [D0, D1] = RANGES.nodes[3];
const SHOWN: [number, number] = [D0 + 0.02, D1 - 0.02];
const LAND = D0 + 0.35 * (D1 - D0);

/** Keyboard users reaching the button outside Deliver: bring Deliver into view. */
function revealDeliver() {
  const scene = getScene('loop');
  if (!scene) return;
  const p = sceneProgress(scene);
  if (p >= SHOWN[0] && p <= SHOWN[1]) return;
  const y = Math.round(scenePos(scene, LAND));
  const lenis = (window as Window & { __lenis?: Lenis | null }).__lenis;
  if (lenis) lenis.scrollTo(y, { immediate: true });
  else window.scrollTo({ top: y, behavior: 'instant' });
}

export default function HearDemo() {
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState('');
  const ctxRef = useRef<AudioContext | null>(null);
  const playRef = useRef<Playback | null>(null);
  /** A start is in flight (awaiting the audio context): further presses are ignored. */
  const startingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const noteId = `loop-demo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  /** Fade out whatever is playing (or do nothing). */
  const stop = useCallback((fade = 0.5) => {
    const pb = playRef.current;
    if (!pb) return;
    playRef.current = null;
    window.clearTimeout(pb.timer);
    const t = pb.ctx.currentTime;
    const g = pb.master.gain;
    g.cancelScheduledValues(t);
    // Never ramp from above the cap (before the envelope starts the gain is 0).
    g.setValueAtTime(Math.min(Math.max(g.value, 0), MASTER), t);
    g.linearRampToValueAtTime(0, t + fade);
    for (const src of pb.sources) {
      try {
        src.stop(t + fade + 0.05);
      } catch {
        /* already stopped */
      }
    }
    window.setTimeout(() => pb.master.disconnect(), (fade + 0.2) * 1000);
    setPlaying(false);
    setStatus(STOPPED);
  }, []);

  const closeContext = useCallback(() => {
    stop(0.12);
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx) window.setTimeout(() => ctx.close().catch(() => {}), 300);
  }, [stop]);

  const start = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      await play();
    } finally {
      startingRef.current = false;
    }

    async function play() {
      let ctx = ctxRef.current;
      if (!ctx) {
        const w = window as Window & { webkitAudioContext?: AudioCtor };
        const Ctor: AudioCtor | undefined = window.AudioContext ?? w.webkitAudioContext;
        if (!Ctor) return;
        ctx = new Ctor();
        ctxRef.current = ctx;
      }
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          return;
        }
      }

      const t0 = ctx.currentTime + 0.03;
      const end = t0 + DURATION;

      const master = ctx.createGain();
      // Silent until the envelope begins (the AudioParam default would be 1).
      master.gain.value = 0;
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.setValueAtTime(0, t0);
      master.gain.linearRampToValueAtTime(MASTER, t0 + FADE_IN);
      master.gain.setValueAtTime(MASTER, end - FADE_OUT);
      master.gain.linearRampToValueAtTime(0, end);
      master.connect(ctx.destination);

      // 40 Hz amplitude modulation of the whole chord.
      const am = ctx.createGain();
      am.gain.value = 1 / (1 + DEPTH);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = RATE;
      const lfoAmount = ctx.createGain();
      lfoAmount.gain.value = DEPTH / (1 + DEPTH);
      lfo.connect(lfoAmount).connect(am.gain);

      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 1800;
      tone.Q.value = 0.4;
      tone.connect(am).connect(master);

      const sources: AudioScheduledSourceNode[] = [lfo];
      CHORD.forEach((freq, i) => {
        const at = t0 + i * 0.045; // a soft roll, low to high
        const voice = ctx.createGain();
        voice.gain.setValueAtTime(0, at);
        voice.gain.linearRampToValueAtTime(0.24, at + 0.02);
        voice.gain.setTargetAtTime(0.12, at + 0.02, 1.6); // slow, piano-like decay
        voice.connect(tone);
        for (const [mult, type, level] of PARTIALS) {
          const osc = ctx.createOscillator();
          osc.type = type;
          osc.frequency.value = freq * mult;
          if (type === 'triangle') osc.detune.value = 4;
          const g = ctx.createGain();
          g.gain.value = level;
          osc.connect(g).connect(voice);
          osc.start(at);
          osc.stop(end + 0.05);
          sources.push(osc);
        }
      });
      lfo.start(t0);
      lfo.stop(end + 0.05);

      const pb: Playback = {
        ctx,
        master,
        sources,
        timer: window.setTimeout(
          () => {
            if (playRef.current !== pb) return;
            playRef.current = null;
            master.disconnect();
            if (ctxRef.current === ctx) ctx.suspend().catch(() => {});
            setPlaying(false);
            setStatus(STOPPED);
          },
          (DURATION + 0.15) * 1000,
        ),
      };
      playRef.current = pb;
      setPlaying(true);
      setStatus(LOOP.demo.playing);
    }
  }, []);

  // Leaving the Deliver step hides the control, so the sound stops with it.
  useEffect(() => {
    if (!playing) return;
    const scene = getScene('loop');
    if (!scene) return;
    const onScroll = () => {
      const p = sceneProgress(scene);
      if (p < D0 - 0.005 || p > D1 + 0.005) stop(0.5);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [playing, stop]);

  const toggle = useCallback(() => {
    if (startingRef.current) return;
    if (playRef.current) stop(0.5);
    else void start();
  }, [start, stop]);

  // Stop and release audio when the section scrolls out of view, the tab hides, or on unmount.
  useEffect(() => {
    const el = rootRef.current;
    const section = el?.closest('section') ?? el;
    if (!section) return;
    // A 1px inset root: a section merely touching the viewport edge counts as gone.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) closeContext();
      },
      { rootMargin: '-1px 0px' },
    );
    io.observe(section);
    const onHide = () => {
      if (document.hidden) stop(0.12);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onHide);
      closeContext();
    };
  }, [closeContext, stop]);

  return (
    <div ref={rootRef} className={s.demo} data-l="demo" onFocus={revealDeliver}>
      <button
        type="button"
        className={`loop-btn loop-btn--ghost ${s.demoBtn}`}
        aria-pressed={playing}
        aria-describedby={noteId}
        data-playing={playing ? '' : undefined}
        onClick={toggle}
      >
        <span className={s.demoMeter} aria-hidden="true">
          <span className={s.demoFill} />
        </span>
        {/* A constant name; aria-pressed and the live region carry the state. */}
        <span className={s.demoText} aria-hidden="true">
          {playing ? LOOP.demo.playing : LOOP.demo.button}
        </span>
        <span className="sr-only">{LOOP.demo.button}</span>
      </button>
      <div className={s.demoCopy}>
        <p className={`t-eyebrow ${s.demoLabel}`}>{LOOP.demo.label}</p>
        <p className={s.demoNote} id={noteId}>
          {keepUnits(LOOP.demo.note)}
        </p>
      </div>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
