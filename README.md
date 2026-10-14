# Harmoniq

A cinematic, scroll-driven product site for Harmoniq: a research-stage, EEG-guided headband
concept that explores personalized 40 Hz auditory stimulation. Next.js (App Router) with React
Three Fiber. The device is a procedural real-time model.

> Harmoniq is a research-stage concept. It is not a medical device, has not been evaluated by
> the FDA, and is not intended to diagnose, treat, cure, or prevent any disease. Product
> imagery shows a design render.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

- `/lab` is the model lab: an orbit viewer with part toggles, an explode slider, camera presets
  matching the concept board, a head underlay and backdrops. URL params drive it headlessly:
  `/lab?ui=0&preset=side&explode=0.6&head=1&bg=graphite&quality=low`.

## Model

- `lib/harmoniq/config.ts`: every dimension (mm).
- `lib/harmoniq/createHarmoniqModel.ts`: `createHarmoniqModel(config)` returns a `THREE.Group`
  with the named parts `shell`, `liner`, `crown`, `contact_0…4`, `gasket_0…4`, `lightLine`,
  `wordmark`, `module_L/R`, `arm_L/R` and `earRest_L/R`, plus explode, contact-glow and
  light-line controls.
- `lib/harmoniq/geometry/*`: band path, sweeps, stadium and rounded-rect lathes, bends.
- `lib/harmoniq/materials.ts`, `textures.ts`, `bakeAO.ts`: materials, procedural textures and
  baked AO.
- `components/three/Studio.tsx`: the studio environment, lights and contact shadows.

See `DESIGN_NOTES.md` for the design rationale and trade-offs.

## Screenshots

```bash
npm run dev &
node scripts/shoot-lab.mjs --shots "hero,side,front,contacts,side+head=1,explode+explode=1"
python3 scripts/compare-sheet.py   # board vs lab sheets in screenshots/checkpoint
```

This uses headless Chromium with SwiftShader WebGL.

## Deploy

Vercel: import the repo and deploy (framework auto-detected). See `DEPLOY.md` for domain setup.
