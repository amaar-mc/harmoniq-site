#!/usr/bin/env node
/**
 * Generates the no-WebGL fallback stills (public/stills/{desktop,mobile}-<station>.webp)
 * from the live stage: scrolls to each station, hides the HTML layer and
 * captures the canvas pose. Requires the dev server and python3 + Pillow.
 *
 *   node scripts/shoot-stills.mjs [--base http://localhost:3000]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const argOf = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined);
const base = argOf('--base') ?? 'http://localhost:3000';
// --only desktop-layers,mobile-hero regenerates just those stills.
const only = argOf('--only')?.split(',');
const out = resolve('public/stills');
const tmp = resolve('.stills-tmp');
mkdirSync(out, { recursive: true });
mkdirSync(tmp, { recursive: true });

const SETS = {
  desktop: {
    viewport: { width: 1600, height: 1000 },
    dpr: 1,
    stations: {
      hero: 'hero:0',
      reveal: 'reveal:0.6',
      halo: 'design:0.1',
      crown: 'design:0.28',
      contacts: 'design:0.5',
      fit: 'design:0.68',
      layers: 'design:0.88',
      loop: 'loop:0.2',
      close: 'close:0.5',
    },
  },
  mobile: {
    viewport: { width: 390, height: 844 },
    dpr: 2,
    stations: {
      hero: 'hero:0',
      reveal: 'reveal:0.6',
      halo: 'design:0.06',
      crown: 'design:0.2',
      contacts: 'design:0.42',
      fit: 'design:0.66',
      layers: 'design:0.88',
      loop: 'loop:0.2',
      close: 'close:0.5',
    },
  },
};

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const [set, cfg] of Object.entries(SETS)) {
  if (only && !only.some((o) => o.startsWith(`${set}-`))) continue;
  const mobile = set === 'mobile';
  const page = await browser.newPage({ viewport: cfg.viewport, deviceScaleFactor: cfg.dpr, isMobile: mobile, hasTouch: mobile });
  await page.goto(`${base}/?webgl=force`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__director?.warm && window.__director?.intro >= 1, null, { timeout: 180000 });
  await page.addStyleTag({ content: 'main, main *, header, header *, footer, footer *, .stage > :not(:first-child) { visibility: hidden !important; }' });
  for (const [name, spec] of Object.entries(cfg.stations)) {
    if (only && !only.includes(`${set}-${name}`)) continue;
    await page.evaluate((spec) => {
      const [scene, p] = spec.split(':');
      const el = document.querySelector(`[data-scene="${scene}"]`);
      const top = el.getBoundingClientRect().top + window.scrollY;
      const y = Math.round(top + Number(p) * Math.max(1, el.offsetHeight - window.innerHeight));
      window.__lenis.scrollTo(y, { immediate: true, force: true });
    }, spec);
    await page.waitForTimeout(300);
    // Snap the damped pose, then force a few fresh frames.
    await page.evaluate(async () => {
      const d = window.__director;
      d.snap = true;
      const f0 = d.frames;
      for (let i = 0; i < 300 && d.frames < f0 + 3; i++) {
        d.invalidate();
        await new Promise((r) => setTimeout(r, 100));
      }
    });
    const png = `${tmp}/${set}-${name}.png`;
    await page.screenshot({ path: png, timeout: 180000 });
    execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(`${out}/${set}-${name}.webp`)}, 'WEBP', quality=80, method=6)`]);
    console.log(`${set}-${name}.webp`);
  }
  await page.close();
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
