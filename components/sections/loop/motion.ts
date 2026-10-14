'use client';

import { HANDOFF_LINE, LOOP as R, type Range } from '@/components/experience/timeline';
import { gsap } from '@/lib/motion/gsap';
import { linesIn, sceneTimeline, splitLines } from '@/lib/motion/scene';
import type { SceneMotionContext } from '@/lib/motion/useSceneMotion';
import { NODE_COUNT, SLIDERS, WAVE, stadiumD } from './geometry';

/**
 * Scroll choreography for 04 Closed loop. One scrubbed timeline whose time
 * axis is scene progress, so every state is a pure function of scroll.
 *
 *  0.00–0.10  headline lines rise; the stadium draws itself around the device
 *  0.10–0.12  the light appears at Sense
 *  nodes[i]   light rests at station i (first DWELL of the range), then glides
 *             to station i+1, arriving exactly at the start of nodes[i+1];
 *             the lit trail follows it; Adapt brings it back to Sense (p 0.84)
 *  0.86–0.94  everything else fades; the light leaves the path, travels to the
 *             viewport centre and stretches into HANDOFF_LINE; hidden at 0.94
 */

const mid = (r: Range, t: number) => r[0] + (r[1] - r[0]) * t;

/** Fraction of each node range during which the light rests at its station. */
export const DWELL = 0.32;

/**
 * Sense: contact i warms over [w0 + i·step, w0 + (i+1)·step], step = (w1 − w0) / 5.
 * Matches the stage's contact glow (poses.ts: glow 0 → 5, linear, over the same range).
 */
export const SENSE_WARM: Range = [mid(R.nodes[0], 0.1), mid(R.nodes[0], 0.75)];

/** The stadium draw-on (intro). */
const DRAW: Range = [0.004, 0.104];

/** Panel crossfade half-width (scene progress). */
const X = 0.012;

const CHAMPAGNE = '#CDB89A';
const STONE_DARK = '#A9A59E';

/** Inverse of power1.inOut, so stations appear exactly as the drawing passes them. */
const invQuadInOut = (y: number) => (y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2));

export function buildLoopMotion({ root, mobile, reduce }: SceneMotionContext) {
  const one = <T extends Element = HTMLElement>(k: string) => root.querySelector<T>(`[data-l="${k}"]`);
  const all = <T extends Element = HTMLElement>(k: string) =>
    Array.from(root.querySelectorAll<T>(`[data-l="${k}"]`));

  const frame = one('frame');
  const diagram = one('diagram');
  const light = one('light');
  const line = one('line');
  if (!frame || !diagram || !light || !line) return;

  const head = one('head')!;
  const eyebrow = one('eyebrow')!;
  const title = one('title')!;
  const column = one('column')!;
  const intro = one('intro')!;
  const panels = all('panel');
  const base = one<SVGPathElement>('base')!;
  const trail = one<SVGPathElement>('trail')!;
  const dots = all('dot');
  const lits = all('lit');
  const rings = all('ring');
  const labels = all('label');
  const idxs = all('idx');
  const demo = one('demo');

  const isMobile = mobile || (reduce && window.matchMedia('(max-width: 767px)').matches);
  const N = R.nodes;
  const [h0, h1] = R.handoff;

  // Geometry (px). The frame is sticky, so offsets inside it are stable.
  const fr = frame.getBoundingClientRect();
  const dr = diagram.getBoundingClientRect();
  const W = dr.width;
  const H = dr.height;
  const sense = { x: dr.left - fr.left, y: dr.top - fr.top + H / 2 };
  const centre = { x: fr.width / 2, y: fr.height / 2 };
  const lineW = isMobile ? 0.64 * window.innerWidth : Math.min(0.36 * window.innerWidth, 520);

  const { tl } = sceneTimeline(root, 0, 1);

  /* ------------------------------------------------------------------ */
  /* Reduced motion: nothing travels; states crossfade per range.        */
  /* ------------------------------------------------------------------ */
  if (reduce) {
    gsap.set(light, { autoAlpha: 0 });
    gsap.set(trail, { opacity: 0 });
    gsap.set([...lits, ...rings], { opacity: 0 });
    gsap.set(labels, { opacity: 0.42 });
    gsap.set(panels, { opacity: 0 });
    if (demo) gsap.set(demo, { autoAlpha: 0 });
    gsap.set(line, {
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      rotation: 0,
      width: lineW,
      height: HANDOFF_LINE.height,
      borderRadius: 1,
      autoRound: false,
      autoAlpha: 0,
    });

    tl.to(intro, { opacity: 0, duration: X }, N[0][0] - X);
    if (isMobile) tl.to(head, { opacity: 0, duration: X }, N[0][0] - X);
    N.forEach(([a, b], i) => {
      tl.to([lits[i], rings[i]], { opacity: 1, duration: X }, a - X / 2);
      tl.to(labels[i], { opacity: 1, duration: X }, a - X / 2);
      tl.to(panels[i], { opacity: 1, duration: X }, a);
      if (i < N.length - 1) {
        tl.to(rings[i], { opacity: 0, duration: X }, b - X / 2);
        tl.to(labels[i], { opacity: 0.74, duration: X }, b - X / 2);
        tl.to(panels[i], { opacity: 0, duration: X }, b - X);
      }
    });
    if (demo) {
      tl.to(demo, { autoAlpha: 1, duration: X }, N[3][0]);
      tl.to(demo, { autoAlpha: 0, duration: X }, N[3][1] - X);
    }
    tl.to(trail, { opacity: 1, duration: X }, N[4][0]);
    tl.to([head, column, diagram], { opacity: 0, duration: 0.03 }, h0);
    tl.to(line, { autoAlpha: 1, duration: 0.03 }, h0 + 0.025);
    tl.set(line, { autoAlpha: 0 }, h1);
    return;
  }

  /* ------------------------------------------------------------------ */
  /* Motion (desktop / mobile)                                           */
  /* ------------------------------------------------------------------ */
  const lightPath = stadiumD(W, H);
  const pillW = light.offsetWidth;
  const pillH = light.offsetHeight;

  gsap.set(base, { drawSVG: '0% 0%' });
  gsap.set(trail, { drawSVG: '0% 0%' });
  gsap.set(dots, { scale: 0, opacity: 0 });
  gsap.set(lits, { opacity: 0, scale: 0.3 });
  gsap.set(rings, { opacity: 0, scale: 0.4 });
  gsap.set(labels, { opacity: 0 });
  gsap.set(panels, { opacity: 0, y: 14 });
  gsap.set(eyebrow, { opacity: 0, y: 10 });
  gsap.set(light, { xPercent: -50, yPercent: -50, x: 0, y: H / 2, rotation: -90, scale: 0.4, autoAlpha: 0 });
  gsap.set(line, {
    xPercent: -50,
    yPercent: -50,
    x: sense.x - centre.x,
    y: sense.y - centre.y,
    rotation: -90,
    width: pillW,
    height: pillH,
    borderRadius: pillH / 2,
    autoAlpha: 0,
  });
  if (demo) gsap.set(demo, { autoAlpha: 0 });

  // Intro: headline, the stadium drawing itself, stations appearing as it passes.
  tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0);
  // A staggered fromTo only pre-renders its first target inside a paused timeline,
  // so every line gets its hidden state up front.
  const titleLines = splitLines(title).lines;
  const introLines = splitLines(intro).lines;
  gsap.set([...titleLines, ...introLines], { yPercent: 110, opacity: 0 });
  linesIn(tl, titleLines, 0.006, 0.075, 0.02);
  linesIn(tl, introLines, 0.03, 0.07, 0.012);

  tl.to(base, { drawSVG: '0% 100%', duration: DRAW[1] - DRAW[0], ease: 'power1.inOut' }, DRAW[0]);
  for (let k = 0; k < NODE_COUNT; k++) {
    const t = DRAW[0] + (DRAW[1] - DRAW[0]) * invQuadInOut(k / NODE_COUNT);
    tl.to(dots[k], { scale: 1, opacity: 1, duration: 0.012, ease: 'back.out(2.2)' }, t);
    tl.to(labels[k], { opacity: 0.42, duration: 0.018 }, t + 0.004);
  }
  tl.to(light, { autoAlpha: 1, scale: 1, duration: 0.018, ease: 'power2.out' }, 0.1);

  tl.to(intro, { opacity: 0, y: -10, duration: X, ease: 'power2.in' }, N[0][0] - X);
  if (isMobile) tl.to(head, { opacity: 0, y: -10, duration: X, ease: 'power2.in' }, N[0][0] - X);

  // Stations: light → node lit (stays lit) → active emphasis while its range runs.
  N.forEach(([a, b], i) => {
    const on = a - 0.004;
    tl.to(lits[i], { opacity: 1, scale: 1, duration: 0.012, ease: 'power2.out' }, on);
    tl.to(rings[i], { opacity: 1, scale: 1, duration: 0.016, ease: 'power2.out' }, on);
    tl.to(labels[i], { opacity: 1, duration: 0.012 }, on);
    tl.to(idxs[i], { color: CHAMPAGNE, duration: 0.012 }, on);
    tl.to(panels[i], { opacity: 1, y: 0, duration: 0.016, ease: 'power2.out' }, a);

    if (i < N.length - 1) {
      tl.to(rings[i], { opacity: 0, scale: 1.3, duration: 0.012, ease: 'power1.in' }, b - 0.004);
      tl.to(labels[i], { opacity: 0.74, duration: 0.012 }, b - 0.004);
      tl.to(idxs[i], { color: STONE_DARK, duration: 0.012 }, b - 0.004);
      tl.to(panels[i], { opacity: 0, y: -10, duration: X, ease: 'power2.in' }, b - X);
    }

    // The light rests, then glides to the next station (Adapt: back to Sense).
    const go = a + DWELL * (b - a);
    const seg = { duration: b - go, ease: 'sine.inOut' };
    tl.to(
      light,
      { motionPath: { path: lightPath, autoRotate: true, start: i / NODE_COUNT, end: (i + 1) / NODE_COUNT }, ...seg },
      go,
    );
    tl.to(trail, { drawSVG: `0% ${((i + 1) / NODE_COUNT) * 100}%`, ...seg }, go);
  });

  // 01 Sense: contacts warm one after another (in step with the stage's contact glow).
  const warms = all('warm');
  const step = (SENSE_WARM[1] - SENSE_WARM[0]) / warms.length;
  gsap.set(warms, { opacity: 0 });
  warms.forEach((w, c) => tl.to(w, { opacity: 1, duration: step }, SENSE_WARM[0] + c * step));

  // 02 Interpret: history draws up to "now", then the forecast runs past it.
  {
    const [a, b] = N[1];
    const w = b - a;
    const hist = one<SVGPathElement>('eegHist');
    const clip = one<SVGRectElement>('eegClip');
    const now = one<SVGGElement>('eegNow');
    const tagNow = one('eegTagNow');
    const tagFore = one('eegTagForecast');
    if (hist && clip && now && tagNow && tagFore) {
      const full = Number(clip.getAttribute('width'));
      gsap.set(hist, { drawSVG: '0% 0%' });
      gsap.set(clip, { attr: { width: 0 } });
      gsap.set([now, tagNow, tagFore], { opacity: 0 });
      tl.to(hist, { drawSVG: '0% 100%', duration: 0.4 * w, ease: 'power1.inOut' }, a + 0.04 * w);
      tl.to([now, tagNow], { opacity: 1, duration: 0.08 * w }, a + 0.4 * w);
      tl.to(clip, { attr: { width: full }, duration: 0.36 * w, ease: 'power1.inOut' }, a + 0.48 * w);
      tl.to(tagFore, { opacity: 1, duration: 0.1 * w }, a + 0.62 * w);
    }
  }

  // 03 Personalize: the three settings glide to new values.
  {
    const [a, b] = N[2];
    const w = b - a;
    all('slider').forEach((el, k) => {
      gsap.set(el, { '--v': SLIDERS[k].from });
      tl.to(el, { '--v': SLIDERS[k].to, duration: 0.4 * w, ease: 'sine.inOut' }, a + (0.12 + 0.1 * k) * w);
    });
  }

  // 04 Deliver: the 40 Hz line slides calmly with scroll; the demo is reachable only here.
  {
    const [a, b] = N[3];
    const wave = one('wave');
    const fig = one('deliverFig');
    if (fig) {
      // The slow ambient ripples run only while this station is on screen.
      tl.set(fig, { attr: { 'data-on': 'true' } }, a - X);
      tl.set(fig, { attr: { 'data-on': 'false' } }, b);
    }
    if (wave) {
      tl.fromTo(wave, { x: 0 }, { x: -WAVE.lambda * WAVE.extra, duration: b - a + 0.024, ease: 'none' }, a - 0.012);
    }
    if (demo) {
      tl.to(demo, { autoAlpha: 1, duration: X }, a + 0.004);
      tl.to(demo, { autoAlpha: 0, duration: X * 0.8 }, b - X);
    }
  }

  // 05 Adapt: the return path closes in step with the light coming home.
  {
    const [a, b] = N[4];
    const ret = one<SVGPathElement>('ret');
    const home = one('chipHome');
    if (ret && home) {
      const go = a + DWELL * (b - a);
      gsap.set(ret, { drawSVG: '0% 0%' });
      gsap.set(home, { opacity: 0 });
      tl.to(ret, { drawSVG: '0% 100%', duration: b - go, ease: 'sine.inOut' }, go);
      tl.to(home, { opacity: 1, duration: 0.01 }, b - 0.006);
    }
  }

  // Hand-off: the room clears; the light leaves the path and becomes the line.
  tl.to([head, column, diagram], { opacity: 0, duration: 0.032, ease: 'power2.in' }, h0);
  tl.set(light, { autoAlpha: 0 }, h0);
  tl.set(line, { autoAlpha: 1 }, h0);

  const sx = sense.x - centre.x;
  const sy = sense.y - centre.y;
  const lift = isMobile ? Math.min(48, Math.abs(sx) * 0.3) : Math.min(140, Math.abs(sx) * 0.42);
  const lead = Math.abs(sx) * (isMobile ? 0.5 : 0.46);
  tl.to(
    line,
    {
      motionPath: {
        path: [
          { x: sx, y: sy },
          { x: sx, y: sy - lift },
          { x: -lead, y: 0 },
          { x: 0, y: 0 },
        ],
        type: 'cubic',
        autoRotate: true,
      },
      duration: 0.046,
      ease: 'power1.inOut',
    },
    h0,
  );
  tl.to(
    line,
    {
      width: lineW,
      height: HANDOFF_LINE.height,
      borderRadius: 1,
      autoRound: false, // land on exactly min(36vw, 520px) / 64vw, like the App's overlay
      duration: h1 - (h0 + 0.038),
      ease: 'power2.inOut',
    },
    h0 + 0.038,
  );
  // From here the App section's fixed overlay line is drawn in exactly this place.
  tl.set(line, { autoAlpha: 0 }, h1);
}
