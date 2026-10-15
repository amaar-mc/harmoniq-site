# Harmoniq

A cinematic, scroll-driven product story for Harmoniq: a research-stage, EEG-guided headband
concept that blends music with personalized 40 Hz sound in a closed loop. One real-time 3D
device carries the whole page, from the first hairline to the closing line.

> Harmoniq is a research-stage concept. It is not a medical device, has not been evaluated by
> the FDA, and is not intended to diagnose, treat, cure, or prevent any disease. Product
> imagery shows a design render.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Routes:

- `/`: the site.
- `/lab`: the model lab (orbit viewer, part toggles, explode, glow, light line, head underlay,
  backdrops). URL params drive it headlessly: `/lab?ui=0&preset=side&explode=0.6&head=1&bg=graphite`.
- `/lab/bake`: runs the generator and serialises the model (used by `scripts/bake-model.mjs`).

Useful query flags on `/`: `?nowebgl` forces the stills fallback; `?webgl=force` forces the
live stage even on software WebGL (used by the screenshot scripts).

## How it is built

**One stage, many scenes.** A single fixed React Three Fiber canvas sits behind the page
(`components/experience`). Sections are tall `<section data-scene>` tracks with a sticky
100svh frame (`app/globals.css`), so pinning is native CSS.

**The director.** `components/experience/poses.ts` holds the choreography as keyframes anchored
to scene progress (desktop and mobile sets): camera orbit (azimuth, elevation, distance,
target, screen shift), device rotation and lift, explode, contact glow, light line, head
drawing, floor, studio mood and the giant word. `poseAt(scrollY)` is a pure function of
scroll; the stage damps toward it every frame. The page background (paper → graphite → paper
→ charcoal) comes from the same timeline.

**Rendering on demand.** The canvas runs with `frameloop="never"`: the director's GSAP ticker
renders only when the pose changes or the light line is breathing, and stops entirely while
the stage is off screen (app, research, founder).

**Scroll.** Lenis on the GSAP ticker; every pinned section builds a scrubbed ScrollTrigger
timeline (`lib/motion`), so scrolling back always restores the same frame. Section timelines
build one per task as they near the viewport.

**Text.** All copy lives in `content/copy.ts`; every factual line is annotated with the fact it
relies on.

## The model

The device is procedural (`lib/harmoniq`): `createHarmoniqModel(config)` builds the named parts
from the dimensions in `config.ts` (band sweeps, stadium lathes, bent arms, ear-rest sweeps),
with procedural textures and ray-cast vertex AO. The site loads a **bake** of that output:

```bash
npm run dev &
node scripts/bake-model.mjs   # writes public/model/harmoniq-{high,low}.bin
```

The bake stores geometry (quantised positions/UVs, int16 normals/tangents) and AO, so the site
only builds materials (~0.4 s instead of ~8–15 s). Re-run it after changing the generator or
config. Mobile and coarse pointers use the `low` bake (opaque glass).

## Fallbacks

- **No WebGL or software WebGL** (no GPU, blocklisted drivers): pre-rendered stills of each
  station crossfade as the page scrolls (`public/stills`, made by `scripts/shoot-stills.mjs`).
- **Slow GPUs:** sustained slow frames step the pixel ratio from 2 to 1.5 to 1, then drop the
  glass transmission pass.
- **Reduced motion:** no smooth scroll, no camera travel and no breathing. The stage cuts between
  stations with a short dip (never more than one every 0.6 s), and text crossfades.
- **No JavaScript:** the scenes reflow into a static, fully readable page (stacked placards and
  loop steps, the phones, the stills behind the opening screens).

## Scripts

All need the dev server (`npm run dev`); they use headless Chromium with SwiftShader WebGL.

| Script | What it does |
|---|---|
| `scripts/shoot-site.mjs` | Screenshots named scroll stations (`--size 390x844 --dpr 2` for mobile). |
| `scripts/shoot-stills.mjs` | Regenerates the no-WebGL stills. |
| `scripts/shoot-meta.mjs` | Regenerates the share image and Apple touch icon. |
| `scripts/bake-model.mjs` | Bakes the model into `public/model`. |
| `scripts/shoot-lab.mjs` | Screenshots `/lab` presets and states. |
| `scripts/frame-probe.mjs` | Tries camera framings at a station (`--poses '[{…}]'`). |
| `scripts/compare-sheet.py` | Board-versus-lab comparison sheets. |

Screenshots of every beat live in `screenshots/site/{desktop,mobile}`.

## Placeholders

- `CONTACT_URL` in `content/copy.ts` is `#follow` until the real destination exists.

## Deploy

Vercel: import the repo and deploy (framework auto-detected). See `DEPLOY.md` for domain setup.
