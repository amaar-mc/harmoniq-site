'use client';

import { useRef } from 'react';
import { director } from '@/components/experience/director';
import { ScrollTrigger } from '@/lib/motion/gsap';
import { sceneTimeline } from '@/lib/motion/scene';
import { useSceneMotion } from '@/lib/motion/useSceneMotion';
import type { Part } from './PartsList';
import { currentLayout, designPlan } from './plan';
import s from './ExplodedLabels.module.css';

/**
 * Exploded-view callouts (desktop). Each part gets a dot on its projected
 * anchor, a 1px leader running away from the device centre with a short
 * horizontal tail, and an HTML label. Positions are read from
 * `director.screen` after every rendered frame and written straight to the
 * DOM (no React state per frame). Visibility is scrubbed by scroll.
 * Decorative: the same parts are listed for assistive tech in the placard.
 */

interface Item {
  ax: number;
  ay: number;
  side: 1 | -1;
  ex: number;
  ey: number;
  y: number;
  /** Tail + gap + label width: the run beyond the elbow that other leaders must not cut. */
  run: number;
  h: number;
  on: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function segmentsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Does segment a→b pass through the rectangle (sampled; segments here are short)? */
function segmentHitsRect(ax: number, ay: number, bx: number, by: number, l: number, r: number, t: number, b: number) {
  for (let s = 0; s <= 16; s++) {
    const x = ax + ((bx - ax) * s) / 16;
    const y = ay + ((by - ay) * s) / 16;
    if (x > l && x < r && y > t && y < b) return true;
  }
  return false;
}

/** Do two callouts (anchor → elbow → tail → label) intersect or nearly touch? */
function leadersCross(p: Item, q: Item) {
  if (segmentsCross(p.ax, p.ay, p.ex, p.y, q.ax, q.ay, q.ex, q.y)) return true;
  // Each callout's tail + label as a band: the other's radial segment must stay clear of it.
  const band = (o: Item) => {
    const end = o.ex + o.side * o.run;
    return [Math.min(o.ex, end) - 2, Math.max(o.ex, end) + 2, o.y - o.h / 2 - 4, o.y + o.h / 2 + 4] as const;
  };
  return segmentHitsRect(q.ax, q.ay, q.ex, q.y, ...band(p)) || segmentHitsRect(p.ax, p.ay, p.ex, p.y, ...band(q));
}
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export default function ExplodedLabels({ parts }: { parts: readonly Part[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useSceneMotion(ref, ({ reduce, root }) => {
    if (currentLayout() === 'mobile') return;
    const scene = root.closest<HTMLElement>('[data-scene]');
    const frame = root.parentElement;
    if (!scene || !frame) return;

    const plan = designPlan('desktop');
    const leaders = Array.from(root.querySelectorAll<SVGPathElement>('[data-leader]'));
    const dots = Array.from(root.querySelectorAll<SVGCircleElement>('[data-dot]'));
    const labels = Array.from(root.querySelectorAll<HTMLElement>('[data-label]'));
    const column = scene.querySelector<HTMLElement>('[data-design-column]');
    const n = parts.length;

    const header = column?.querySelector<HTMLElement>('header') ?? null;
    const layersText = column?.querySelector<HTMLElement>('[data-beat="layers"] [data-text]') ?? null;

    let widths: number[] = [];
    let heights: number[] = [];
    /** The layers placard (frame px): labels never cross it. Below/above it they may use the column. */
    const keep = { l: 0, r: 0, t: 0, b: 0 };
    let navH = 64;
    const measure = () => {
      widths = labels.map((l) => l.offsetWidth);
      heights = labels.map((l) => l.offsetHeight);
      const f = frame.getBoundingClientRect();
      if (column) {
        const c = column.getBoundingClientRect();
        keep.l = c.left - f.left;
        keep.r = c.right - f.left;
        keep.t = (header ?? column).getBoundingClientRect().top - f.top;
        keep.b = (layersText ?? column).getBoundingClientRect().bottom - f.top;
      }
      navH = parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 64;
    };
    measure();

    const items: Item[] = parts.map(() => ({ ax: 0, ay: 0, side: 1, ex: 0, ey: 0, y: 0, run: 0, h: 0, on: false }));
    const state = { draw: reduce ? 1 : 0, alpha: 0 };
    let shown = false;

    const hide = () => {
      if (!shown) return;
      root.style.visibility = 'hidden';
      shown = false;
    };

    const render = () => {
      const c = director.screen.deviceCentre;
      if (state.alpha <= 0.001 || !director.ready || !c) return hide();
      if (!shown) {
        root.style.visibility = 'visible';
        shown = true;
      }
      root.style.opacity = state.alpha.toFixed(3);

      const W = window.innerWidth;
      const H = window.innerHeight;
      const R = clamp(W * 0.03, 28, 60); // radial run
      const TAIL = clamp(W * 0.012, 12, 22); // horizontal tail
      const GAP = 9; // tail end → text
      const top = navH + 20;
      const bottom = H - 28;
      const maxRight = W - 24;
      const padY = 18;

      // 1 · Natural placement: run outward from the centre, pick a side, keep inside bounds.
      for (let i = 0; i < n; i++) {
        const it = items[i];
        const a = director.screen[parts[i].anchor];
        if (!a || !a.visible) {
          it.on = false;
          continue;
        }
        it.on = true;
        it.ax = a.x;
        it.ay = a.y;
        let dx = a.x - c.x;
        let dy = a.y - c.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) {
          dx = 1;
          dy = 0;
        } else {
          dx /= len;
          dy /= len;
        }
        const w = widths[i];
        const h = heights[i];
        const ey0 = a.y + dy * R;
        const beside = (y: number) => y + h / 2 > keep.t - padY && y - h / 2 < keep.b + padY;
        /** Elbow x for a label on `side` at height y, or null if it cannot fit there. */
        const elbowX = (side: 1 | -1, y: number, run = Math.abs(dx) * R): number | null => {
          let ex = a.x + side * run;
          if (side < 0) {
            // Beside the placard, left labels stop short of the column; above or below it they may use it.
            const minLeft = beside(y) ? keep.r + 28 : Math.max(16, keep.l);
            if (ex - TAIL - GAP - w < minLeft) {
              ex = minLeft + w + GAP + TAIL;
              if (ex > a.x) return null;
            }
          } else if (ex + TAIL + GAP + w > maxRight) {
            ex = maxRight - w - GAP - TAIL;
            if (ex < a.x) return null;
          }
          return ex;
        };
        const prefer: 1 | -1 = dx >= 0 ? 1 : -1;
        let side = prefer;
        let ey = ey0;
        let ex = elbowX(side, ey);
        if (ex === null && prefer < 0 && beside(ey0)) {
          // Escape vertically: clear of the placard, still on the outward side.
          const y = ey0 > (keep.t + keep.b) / 2 ? keep.b + padY + h / 2 + 2 : keep.t - padY - h / 2 - 2;
          if (Math.abs(y - a.y) < H * 0.24) {
            ey = y;
            ex = elbowX(side, ey);
          }
        }
        if (ex === null) {
          // No room on the outward side: turn back inward, but step clear of the part vertically first.
          side = (-prefer) as 1 | -1;
          const vy = dy >= 0 ? 1 : -1;
          ey = a.y + vy * (Math.max(Math.abs(dy), 0.8) * R + h * 0.5);
          ex = elbowX(side, ey, R * 0.25);
        }
        if (ex === null) {
          side = prefer;
          ex = a.x + side * Math.abs(dx) * R;
        }
        it.side = side;
        it.ex = ex;
        it.ey = ey;
        it.run = TAIL + GAP + w;
        it.h = h;
      }

      // 2 · Per side, stack labels vertically with a minimum spacing.
      for (const side of [-1, 1] as const) {
        const col = items.map((it, i) => ({ it, i })).filter((o) => o.it.on && o.it.side === side);
        col.sort((p, q) => p.it.ey - q.it.ey);
        for (let k = 0; k < col.length; k++) {
          const { it, i } = col[k];
          it.y = clamp(it.ey, top, bottom);
          if (k > 0) {
            const prev = col[k - 1];
            const min = (heights[prev.i] + heights[i]) * 0.5 + 10;
            it.y = Math.max(it.y, prev.it.y + min);
          }
        }
        for (let k = col.length - 1; k >= 0; k--) {
          const { it, i } = col[k];
          if (k === col.length - 1) it.y = Math.min(it.y, bottom);
          else {
            const next = col[k + 1];
            const min = (heights[next.i] + heights[i]) * 0.5 + 10;
            it.y = Math.min(it.y, next.it.y - min);
          }
        }
        // Stacking may have nudged a column-side label beside the placard: move it clear (above or below).
        for (let k = 0; side < 0 && k < col.length; k++) {
          const { it, i } = col[k];
          const h = heights[i];
          const left = it.ex - TAIL - GAP - widths[i];
          if (left >= keep.r + 28) continue;
          if (it.y + h / 2 <= keep.t - padY || it.y - h / 2 >= keep.b + padY) continue;
          it.y = it.ey > (keep.t + keep.b) / 2 ? keep.b + padY + h / 2 : keep.t - padY - h / 2;
          for (let j = k + 1; j < col.length; j++) {
            const prev = col[j - 1];
            const min = (heights[prev.i] + heights[col[j].i]) * 0.5 + 10;
            col[j].it.y = Math.max(col[j].it.y, prev.it.y + min);
          }
        }
        // Neighbouring labels share an elbow line, so a stack reads as one column.
        for (let k = 0; k < col.length; ) {
          let j = k;
          while (j + 1 < col.length && col[j + 1].it.y - col[j].it.y <= 64 && Math.abs(col[j + 1].it.ex - col[j].it.ex) <= 48) j++;
          if (j > k) {
            let ex = col[k].it.ex;
            for (let m = k; m <= j; m++) ex = side > 0 ? Math.max(ex, col[m].it.ex) : Math.min(ex, col[m].it.ex);
            for (let m = k; m <= j; m++) col[m].it.ex = ex;
          }
          k = j + 1;
        }
        // Leaders never cross: where two would, both elbows move out to the outer one.
        for (let pass = 0; pass < 2; pass++) {
          for (let k = 0; k < col.length; k++) {
            for (let j = k + 1; j < col.length; j++) {
              const p = col[k].it;
              const q = col[j].it;
              if (!leadersCross(p, q)) continue;
              const ex = side > 0 ? Math.max(p.ex, q.ex) : Math.min(p.ex, q.ex);
              p.ex = ex;
              q.ex = ex;
            }
          }
        }
      }

      // 3 · Write: partial leader (drawn from the dot outward), dot, label.
      const stagger = 0.07;
      const span = 1 - stagger * (n - 1);
      for (let i = 0; i < n; i++) {
        const it = items[i];
        const path = leaders[i];
        const dot = dots[i];
        const label = labels[i];
        if (!it.on) {
          path.setAttribute('d', '');
          dot.style.opacity = '0';
          label.style.opacity = '0';
          continue;
        }
        const t = clamp((state.draw - i * stagger) / span, 0, 1);
        const y = Math.round(it.y) + 0.5;
        const tx = it.ex + it.side * TAIL;
        const l1 = Math.hypot(it.ex - it.ax, y - it.ay);
        const l2 = TAIL;
        const reach = easeOut(t) * (l1 + l2);
        let d = `M${it.ax.toFixed(1)} ${it.ay.toFixed(1)}`;
        if (reach <= l1) {
          const k = l1 > 0 ? reach / l1 : 1;
          d += `L${(it.ax + (it.ex - it.ax) * k).toFixed(1)} ${(it.ay + (y - it.ay) * k).toFixed(1)}`;
        } else {
          d += `L${it.ex.toFixed(1)} ${y}L${(it.ex + it.side * (reach - l1)).toFixed(1)} ${y}`;
        }
        path.setAttribute('d', t > 0 ? d : '');
        dot.setAttribute('cx', it.ax.toFixed(1));
        dot.setAttribute('cy', it.ay.toFixed(1));
        dot.style.opacity = clamp(t / 0.15, 0, 1).toFixed(3);
        const lx = it.side > 0 ? tx + GAP : tx - GAP - widths[i];
        const ly = it.y - heights[i] * 0.5;
        const la = clamp((t - 0.55) / 0.45, 0, 1);
        label.style.opacity = la.toFixed(3);
        label.style.transform = `translate3d(${(lx + (1 - la) * it.side * -6).toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
        label.dataset.side = it.side > 0 ? 'right' : 'left';
      }
    };

    const { tl, at } = sceneTimeline(scene, plan.labels.in[0], plan.labels.out[1]);
    const [i0, i1] = plan.labels.in;
    const [o0, o1] = plan.labels.out;
    if (reduce) {
      tl.fromTo(state, { alpha: 0 }, { alpha: 1, duration: i1 - i0 }, at(i0));
    } else {
      tl.fromTo(state, { alpha: 0 }, { alpha: 1, duration: (i1 - i0) * 0.3 }, at(i0));
      tl.fromTo(state, { draw: 0 }, { draw: 1, duration: i1 - i0 }, at(i0));
    }
    tl.fromTo(state, { alpha: 1 }, { alpha: 0, duration: o1 - o0, immediateRender: false }, at(o0));
    tl.eventCallback('onUpdate', render);

    const off = director.onFrame(render);
    const onRefresh = () => {
      measure();
      render();
    };
    ScrollTrigger.addEventListener('refresh', onRefresh);
    root.style.visibility = 'hidden';

    return () => {
      off();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      root.style.visibility = '';
      root.style.opacity = '';
    };
  });

  return (
    <div ref={ref} className={s.overlay} data-tone="dark" aria-hidden="true">
      <svg className={s.svg} width="100%" height="100%">
        {parts.map((p) => (
          <g key={p.anchor}>
            <path className={s.leader} data-leader d="" />
            <circle className={s.dot} data-dot r="2.5" cx="-10" cy="-10" />
          </g>
        ))}
      </svg>
      {parts.map((p, i) => (
        <span key={p.anchor} className={s.label} data-label>
          <span className={s.index}>{String(i + 1).padStart(2, '0')}</span>
          {p.label}
        </span>
      ))}
    </div>
  );
}
