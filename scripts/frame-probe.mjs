#!/usr/bin/env node
/**
 * Framing experiments: scrolls to a station, then applies pose overrides
 * (director.override) and screenshots each. Usage:
 *   node scripts/frame-probe.mjs --at design:0.5 --size 1440x900 --out DIR --poses '[{"name":"a","az":180}]'
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const [w, h] = arg('size', '1440x900').split('x').map(Number);
const out = arg('out', 'screenshots/probe');
const [scene, p] = arg('at', 'design:0.5').split(':');
const poses = JSON.parse(arg('poses', '[]'));
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
await page.goto('http://localhost:3000/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__director?.warm && window.__director?.intro >= 1, null, { timeout: 120000 });
await page.evaluate(([scene, p]) => {
  const el = document.querySelector(`[data-scene="${scene}"]`);
  const top = el.getBoundingClientRect().top + scrollY;
  window.__lenis.scrollTo(Math.round(top + Number(p) * (el.offsetHeight - innerHeight)), { immediate: true, force: true });
}, [scene, p]);
await page.waitForTimeout(400);
for (const pose of poses) {
  const { name, ...o } = pose;
  await page.evaluate(async (o) => {
    const d = window.__director;
    d.override = o;
    d.snap = true;
    d.invalidate();
    const f0 = d.frames;
    for (let i = 0; i < 100 && d.frames < f0 + 3; i++) await new Promise((r) => setTimeout(r, 100));
  }, o);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name);
}
await b.close();
