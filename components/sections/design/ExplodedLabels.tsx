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
 * anchor, a 1px leader and an HTML label. Labels are set on the graphite,
 * never on the device: they stand in two columns either side of the device's
 * screen rect (`director.screen.boundsMin` / `boundsMax`, inflated by KEEP),
 * each column reading in part order, top to bottom. A label that cannot stand
 * in its column (the copy placard, the viewport edge, or a leader that would
 * cross another) moves to a row above or below the device on a vertical
 * leader. Only the 1px leaders cross the metal.
 *
 * Positions are read from `director.screen` after every rendered frame and
 * written straight to the DOM (no React state per frame). Visibility is
 * scrubbed by scroll. Decorative: the same parts are listed for assistive
 * tech in the placard.
 */

type Slot = 'left' | 'right' | 'above' | 'below';

interface Item {
  i: number;
  on: boolean;
  ax: number;
  ay: number;
  w: number;
  h: number;
  slot: Slot;
  /** Elbow: where the leader turns into the horizontal tail. Also the label's centre line. */
  ex: number;
  y: number;
  /** Direction of the tail and label from the elbow. */
  side: 1 | -1;
}

interface Box {
  l: number;
  r: number;
  t: number;
  b: number;
}

/** Clearance between the device's screen rect and any label (px). */
const KEEP = 14;
/** Vertical space between stacked labels (px). */
const SPACING = 10;
/** Tail end → text (px). */
const GAP = 9;
/** Shortest horizontal run from an anchor to its column's elbow (px). */
const MIN_RUN = 10;
/** A leader must pass at least this far from another part's dot (px). */
const DOT_CLEAR = 9;
/** Steepening of a leader that grazes a neighbour's dot, per step and at most (px of label height). */
const SPREAD_STEP = 6;
const MAX_SPREAD = 60;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const overlaps = (p: Box, q: Box, m = 0) => p.l < q.r + m && p.r > q.l - m && p.t < q.b + m && p.b > q.t - m;

function segmentsCross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Does segment a→b pass through the rectangle (Liang–Barsky)? */
function segmentHitsRect(ax: number, ay: number, bx: number, by: number, r: Box) {
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, ax - r.l],
    [dx, r.r - ax],
    [-dy, ay - r.t],
    [dy, r.b - ay],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

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

    const items: Item[] = parts.map((_, i) => ({ i, on: false, ax: 0, ay: 0, w: 0, h: 0, slot: 'left', ex: 0, y: 0, side: 1 }));
    const escaped = new Map<number, 'above' | 'below'>();
    /** Shift of a column label's target height, steepening a leader that grazes a neighbour's dot. */
    const bias = new Map<number, number>();
    const state = { draw: reduce ? 1 : 0, alpha: 0 };
    let shown = false;

    const hide = () => {
      if (!shown) return;
      root.style.visibility = 'hidden';
      shown = false;
    };

    const render = () => {
      const scr = director.screen;
      if (state.alpha <= 0.001 || !director.ready || !scr.deviceCentre) return hide();
      if (!shown) {
        root.style.visibility = 'visible';
        shown = true;
      }
      root.style.opacity = state.alpha.toFixed(3);

      const W = window.innerWidth;
      const H = window.innerHeight;
      const TAIL = clamp(W * 0.012, 12, 22);
      const top = navH + 20;
      const bottom = H - 28;
      const maxRight = W - 24;
      const padY = 18;

      // 1 · Anchors.
      const on = items.filter((it) => {
        const a = scr[parts[it.i].anchor];
        it.on = !!a && a.visible;
        if (a) {
          it.ax = a.x;
          it.ay = a.y;
        }
        it.w = widths[it.i];
        it.h = heights[it.i];
        return it.on;
      });

      // 2 · Device keep-out: the rendered device's screen rect, inflated.
      const lo = scr.boundsMin;
      const hi = scr.boundsMax;
      const dev: Box = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
      if (lo?.visible && hi?.visible) {
        dev.l = lo.x;
        dev.t = lo.y;
        dev.r = hi.x;
        dev.b = hi.y;
      } else {
        for (const it of on) {
          dev.l = Math.min(dev.l, it.ax);
          dev.r = Math.max(dev.r, it.ax);
          dev.t = Math.min(dev.t, it.ay);
          dev.b = Math.max(dev.b, it.ay);
        }
      }
      if (!(dev.l <= dev.r)) {
        const c = scr.deviceCentre;
        dev.l = dev.r = c.x;
        dev.t = dev.b = c.y;
      }
      const B: Box = { l: dev.l - KEEP, r: dev.r + KEEP, t: dev.t - KEEP, b: dev.b + KEEP };
      const cx = (B.l + B.r) / 2;
      const placard: Box = { l: keep.l, r: keep.r + 28, t: keep.t - padY, b: keep.b + padY };

      const labelBox = (it: Item, side = it.side, y = it.y): Box => {
        const l = side > 0 ? it.ex + TAIL + GAP : it.ex - TAIL - GAP - it.w;
        return { l, r: l + it.w, t: y - it.h / 2, b: y + it.h / 2 };
      };
      /** The tail plus label: the band other leaders must not cut. */
      const band = (it: Item): Box => {
        const b = labelBox(it);
        return { l: Math.min(b.l, it.ex) - 2, r: Math.max(b.r, it.ex) + 2, t: b.t - 4, b: b.b + 4 };
      };
      const isRow = (it: Item) => it.slot === 'above' || it.slot === 'below';
      /** Leader start: row leaders drop vertically from the anchor's x. */
      const startX = (it: Item) => (isRow(it) ? it.ex : it.ax);

      /** Stack a column (sorted by part) as close to its anchors' heights as spacing allows. */
      const stack = (col: Item[]) => {
        // Isotonic fit with minimum spacing (pool adjacent violators on height minus offset).
        const off: number[] = [];
        let o = 0;
        col.forEach((it, k) => {
          if (k) o += (col[k - 1].h + it.h) / 2 + SPACING;
          off.push(o);
        });
        const blocks: { sum: number; n: number }[] = [];
        col.forEach((it, k) => {
          blocks.push({ sum: it.ay + (bias.get(it.i) ?? 0) - off[k], n: 1 });
          while (blocks.length > 1) {
            const a = blocks[blocks.length - 2];
            const b = blocks[blocks.length - 1];
            if (a.sum / a.n <= b.sum / b.n) break;
            a.sum += b.sum;
            a.n += b.n;
            blocks.pop();
          }
        });
        let k = 0;
        for (const b of blocks) for (let m = 0; m < b.n; m++, k++) col[k].y = b.sum / b.n + off[k];
        const first = col[0];
        const last = col[col.length - 1];
        const down = top + first.h / 2 - first.y;
        if (down > 0) for (const it of col) it.y += down;
        const up = last.y - (bottom - last.h / 2);
        if (up > 0) for (const it of col) it.y -= up;
      };

      const placeColumn = (side: 1 | -1) => {
        const col = on.filter((it) => it.slot === (side < 0 ? 'left' : 'right')).sort((p, q) => p.i - q.i);
        if (!col.length) return;
        // One shared elbow line: the text edge sits on the keep-out, unless an anchor is closer than MIN_RUN.
        let X = side < 0 ? B.l + GAP + TAIL : B.r - GAP - TAIL;
        for (const it of col) X = side < 0 ? Math.min(X, it.ax - MIN_RUN) : Math.max(X, it.ax + MIN_RUN);
        for (const it of col) {
          it.ex = X;
          it.side = side;
        }
        stack(col);
      };

      const placeRow = (slot: 'above' | 'below', columnBoxes: Box[]) => {
        const row = on.filter((it) => it.slot === slot).sort((p, q) => p.i - q.i);
        if (!row.length) return;
        const down = slot === 'below';
        // Part order top to bottom; the row grows away from the device.
        const order = down ? row : [...row].reverse();
        let edge = down ? B.b : B.t;
        for (const it of order) {
          it.ex = Math.round(it.ax) + 0.5;
          let y = edge + (down ? 1 : -1) * (it.h / 2);
          // Each label clears the leaders that drop past it (to labels further out) and the placard.
          const passing = row.filter((o) => (down ? o.i > it.i : o.i < it.i)).map((o) => o.ax);
          const outward: 1 | -1 = it.ax < cx ? -1 : 1;
          const fits = (side: 1 | -1) => {
            const b = labelBox(it, side, y);
            return b.l >= 16 && b.r <= maxRight && !overlaps(b, placard) && !passing.some((x) => x > b.l - 6 && x < b.r + 6);
          };
          it.side = fits(outward) || !fits((-outward) as 1 | -1) ? outward : ((-outward) as 1 | -1);
          // Step further out past any column label in the way.
          for (let guard = 0; guard < columnBoxes.length; guard++) {
            const hit = columnBoxes.find((b) => overlaps(labelBox(it, it.side, y), b, 4));
            if (!hit) break;
            y = down ? hit.b + 4 + SPACING / 2 + it.h / 2 : hit.t - 4 - SPACING / 2 - it.h / 2;
          }
          it.y = y;
          edge = y + (down ? 1 : -1) * (it.h / 2 + SPACING);
        }
      };

      const place = () => {
        for (const it of on) it.slot = escaped.get(it.i) ?? (it.ax < cx ? 'left' : 'right');
        placeColumn(-1);
        placeColumn(1);
        const columnBoxes = on.filter((it) => !isRow(it)).map((it) => labelBox(it));
        placeRow('below', columnBoxes);
        placeRow('above', columnBoxes);
      };

      /**
       * How two callouts interfere: 'cross' = their leaders cross, or one cuts
       * the other's tail or label; otherwise the callout whose leader grazes
       * the other's dot, or null when clean.
       */
      const clash = (p: Item, q: Item): 'cross' | Item | null => {
        const px = startX(p);
        const qx = startX(q);
        if (segmentsCross(px, p.ay, p.ex, p.y, qx, q.ay, q.ex, q.y)) return 'cross';
        if (segmentHitsRect(qx, q.ay, q.ex, q.y, band(p)) || segmentHitsRect(px, p.ay, p.ex, p.y, band(q))) return 'cross';
        if (overlaps(labelBox(p), labelBox(q), 4)) return 'cross';
        if (distToSegment(q.ax, q.ay, px, p.ay, p.ex, p.y) < DOT_CLEAR) return p;
        if (distToSegment(p.ax, p.ay, qx, q.ay, q.ex, q.y) < DOT_CLEAR) return q;
        return null;
      };

      /** The next fix: open up a column (spread) or send a callout to a row (escape). */
      const nextFix = (): { spread?: Item; dir?: number; escape?: Item } | null => {
        for (const it of on) {
          if (isRow(it)) continue;
          const b = labelBox(it);
          if (overlaps(b, B)) return { escape: it };
          // Beside the placard left labels stop short of it; above or below it they may use the column.
          if (b.r > maxRight || b.l < Math.max(16, keep.l) || overlaps(b, placard)) return { escape: it };
        }
        for (let a = 0; a < on.length; a++) {
          for (let b = a + 1; b < on.length; b++) {
            const p = on[a];
            const q = on[b];
            if (isRow(p) && isRow(q)) continue;
            const k = clash(p, q);
            if (!k) continue;
            if (isRow(p)) return { escape: q };
            if (isRow(q)) return { escape: p };
            // Same column, a leader only grazing a neighbour's dot: steepen it, away from that neighbour.
            if (k !== 'cross' && p.slot === q.slot && Math.abs(bias.get(k.i) ?? 0) < MAX_SPREAD) {
              const other = k === p ? q : p;
              return { spread: k, dir: k.i < other.i ? -1 : 1 };
            }
            // The one nearer the top or bottom of the device has the shorter way out.
            const edge = (it: Item) => Math.min(it.ay - B.t, B.b - it.ay);
            return { escape: edge(p) <= edge(q) ? p : q };
          }
        }
        return null;
      };

      const escapeTo = (it: Item): 'above' | 'below' => {
        const rowHeight = (slot: 'above' | 'below') =>
          on.reduce((sum, o) => sum + (escaped.get(o.i) === slot ? o.h + SPACING : 0), it.h + SPACING);
        const below = B.b - it.ay <= it.ay - B.t;
        const roomBelow = bottom - B.b >= rowHeight('below');
        const roomAbove = B.t - top >= rowHeight('above');
        if (below) return roomBelow || !roomAbove ? 'below' : 'above';
        return roomAbove || !roomBelow ? 'above' : 'below';
      };

      // 3 · Columns first; whatever cannot stand cleanly in its column moves to a row.
      escaped.clear();
      bias.clear();
      place();
      for (let pass = 0; pass < n * 12; pass++) {
        const fix = nextFix();
        if (!fix) break;
        if (fix.spread) bias.set(fix.spread.i, (bias.get(fix.spread.i) ?? 0) + (fix.dir ?? 1) * SPREAD_STEP);
        if (fix.escape) escaped.set(fix.escape.i, escapeTo(fix.escape));
        place();
      }

      // 4 · Write: partial leader (drawn from the dot outward), dot, label.
      const stagger = 0.07;
      const span = 1 - stagger * (n - 1);
      for (const it of items) {
        const i = it.i;
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
        const sx = startX(it);
        const l1 = Math.hypot(it.ex - sx, y - it.ay);
        const l2 = TAIL;
        const reach = easeOut(t) * (l1 + l2);
        let d = `M${sx.toFixed(1)} ${it.ay.toFixed(1)}`;
        if (reach <= l1) {
          const k = l1 > 0 ? reach / l1 : 1;
          d += `L${(sx + (it.ex - sx) * k).toFixed(1)} ${(it.ay + (y - it.ay) * k).toFixed(1)}`;
        } else {
          d += `L${it.ex.toFixed(1)} ${y}L${(it.ex + it.side * (reach - l1)).toFixed(1)} ${y}`;
        }
        path.setAttribute('d', t > 0 ? d : '');
        dot.setAttribute('cx', it.ax.toFixed(1));
        dot.setAttribute('cy', it.ay.toFixed(1));
        dot.style.opacity = clamp(t / 0.15, 0, 1).toFixed(3);
        const box = labelBox(it);
        const la = clamp((t - 0.55) / 0.45, 0, 1);
        label.style.opacity = la.toFixed(3);
        label.style.transform = `translate3d(${(box.l + (1 - la) * it.side * -6).toFixed(1)}px, ${box.t.toFixed(1)}px, 0)`;
        label.dataset.side = it.side > 0 ? 'right' : 'left';
        label.dataset.slot = it.slot;
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
