#!/usr/bin/env node
/**
 * Screenshots the site at named scroll stations with headless Chromium
 * (SwiftShader WebGL). Usage:
 *
 *   node scripts/shoot-site.mjs [--size 1440x900] [--out screenshots/site/desktop]
 *        [--shots "hero=hero:0,reveal=reveal:0.6"] [--query nowebgl] [--settle 1]
 *
 * A shot is name=scene:progress[:vhOffset] (scene progress as in lib/motion/scene.ts),
 * or name=y:pixels, or name=sel:#css-selector (scrolls the element's top to the top).
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const next = argv[i + 1];
    args[argv[i].slice(2)] = next && !next.startsWith('--') ? (i++, next) : 'true';
  }
}
const base = args.base ?? 'http://localhost:3000';
const out = resolve(args.out ?? 'screenshots/site');
const [w, h] = (args.size ?? '1440x900').split('x').map(Number);
const mobile = w < 768;
const DEFAULT = [
  'hero=hero:0',
  'reveal=reveal:0.6',
  'halo=design:0.1',
  'crown=design:0.28',
  'contacts=design:0.5',
  'fit=design:0.66',
  'layers=design:0.9',
  'loop=loop:0.2',
  'loop-deliver=loop:0.65',
  'app=app:0.6',
  'research=sel:#research',
  'founder=sel:#founder',
  'close=close:0.45',
  'close-end=close:0.98',
].join(',');
const shots = (args.shots ?? DEFAULT).split(',').map((s) => {
  const [name, spec] = s.split('=');
  return { name, spec };
});

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({
  viewport: { width: w, height: h },
  deviceScaleFactor: Number(args.dpr ?? 1),
  isMobile: mobile,
  hasTouch: mobile,
  reducedMotion: args.reduced ? 'reduce' : 'no-preference',
});
const logs = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

const t0 = Date.now();
await page.goto(`${base}/?${args.query ?? 'webgl=force'}`, { waitUntil: 'load' });
if (!args.query?.includes('nowebgl')) {
  await page.waitForFunction(() => window.__director?.warm && window.__director?.intro >= 1, null, { timeout: 120000 });
}
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);

for (const { name, spec } of shots) {
  const y = await page.evaluate((spec) => {
    const [kind, a, b] = spec.split(':');
    let y = 0;
    if (kind === 'y') y = Number(a);
    else if (kind === 'sel') y = document.querySelector(a).getBoundingClientRect().top + window.scrollY;
    else {
      const el = document.querySelector(`[data-scene="${kind}"]`);
      const top = el.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, el.offsetHeight - window.innerHeight);
      y = top + Number(a) * range + Number(b ?? 0) * window.innerHeight;
    }
    y = Math.round(y);
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
    return y;
  }, spec);
  // Let ScrollTrigger and the director catch up, then snap the damped pose.
  await page.waitForTimeout(250);
  // Snap the damped pose, then force a few fresh frames (unless the stage is hidden).
  await page.evaluate(async () => {
    const d = window.__director;
    if (!d) return;
    d.snap = true;
    const f0 = d.frames;
    for (let i = 0; i < 300 && d.frames < f0 + 3 && d.target.stage > 0.001; i++) {
      d.invalidate();
      await new Promise((r) => setTimeout(r, 100));
    }
  });
  await page.waitForTimeout(Number(args.settle ?? 0.3) * 1000);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`${name} @ ${y}`);
}
if (logs.length) console.log('console:\n' + [...new Set(logs)].join('\n'));
await browser.close();
