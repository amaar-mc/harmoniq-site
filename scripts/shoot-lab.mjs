#!/usr/bin/env node
/**
 * Screenshots /lab states with headless Chromium (SwiftShader WebGL).
 * One page load; each shot switches state through window.__lab.set().
 *
 *   node scripts/shoot-lab.mjs [--base http://localhost:3000] [--out screenshots/lab]
 *     [--shots "hero,side+head=1,hero+explode=1"] [--size 1440x900] [--dpr 1]
 *     [--query "quality=low"] [--suffix _v2]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const next = argv[i + 1];
    args[argv[i].slice(2)] = next && !next.startsWith('--') ? next : 'true';
  }
}
const base = args.base ?? 'http://localhost:3000';
const out = resolve(args.out ?? 'screenshots/lab');
const [w, h] = (args.size ?? '1440x900').split('x').map(Number);
const dpr = Number(args.dpr ?? 1);
const suffix = args.suffix ?? '';
const shots = (args.shots ?? 'hero,front,side,contacts,trueFront,top').split(',');

function parseShot(shot) {
  const [preset, q = ''] = shot.split('+');
  const st = { preset, explode: 0, glow: 0, light: 1, head: false, backdrop: 'paper', hide: [] };
  for (const kv of q.split('&').filter(Boolean)) {
    const [k, v] = kv.split('=');
    if (k === 'head') st.head = v === '1';
    else if (k === 'bg') st.backdrop = v;
    else if (k === 'hide') st.hide = v.split(';');
    else if (k === 'cam') {
      // cam=px;py;pz;tx;ty;tz;fov
      const n = v.split(';').map(Number);
      st.camera = { position: n.slice(0, 3), target: n.slice(3, 6), fov: n[6] ?? 30, pitch: n[7] ?? 0 };
    }
    else st[k] = Number(v);
  }
  return st;
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

const first = parseShot(shots[0]);
const query = ['ui=0', `preset=${first.preset}`, args.query].filter(Boolean).join('&');
const t0 = Date.now();
await page.goto(`${base}/lab?${query}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof window.__labKick === 'function', null, { timeout: 240000 });
// Demand-mode canvas: keep kicking frames until the lab reports ready.
await page.waitForFunction(
  () => {
    if (window.__labReady) return true;
    window.__labKick?.(4);
    return false;
  },
  null,
  { timeout: 240000, polling: 1500 },
);
console.log(`loaded in ${Date.now() - t0}ms`);

for (const shot of shots) {
  const st = parseShot(shot);
  const t1 = Date.now();
  const startFrame = await page.evaluate((s) => {
    window.__lab.set(s);
    return window.__labFrame ?? 0;
  }, st);
  await page.waitForTimeout(100);
  await page.evaluate(() => window.__labKick(10));
  await page.waitForFunction((f) => (window.__labFrame ?? 0) >= f + 8, startFrame, { timeout: 180000, polling: 500 });
  const name = `${shot.replace(/[+=&,;]/g, '_')}${suffix}.png`;
  await page.screenshot({ path: `${out}/${name}`, timeout: 180000 });
  const stats = await page.evaluate(() => window.__labStats);
  console.log(`${name}  ${Date.now() - t1}ms  ${JSON.stringify(stats)}`);
}
if (logs.length) console.log('--- console ---\n' + [...new Set(logs)].join('\n'));
await browser.close();
