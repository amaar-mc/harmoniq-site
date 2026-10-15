#!/usr/bin/env node
/**
 * Bakes the procedural model (geometry + ray-cast AO) into public/model/*.bin
 * by running the generator in headless Chromium at /lab/bake. Re-run after
 * changing lib/harmoniq/config.ts or the generator. Requires the dev server.
 *
 *   node scripts/bake-model.mjs [--base http://localhost:3000]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const base = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'http://localhost:3000';
const out = resolve('public/model');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
await page.goto(`${base}/lab/bake`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__bake?.high && window.__bake?.low, null, { timeout: 300000 });
const bake = await page.evaluate(() => window.__bake);
for (const [q, b64] of Object.entries(bake)) {
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(`${out}/harmoniq-${q}.bin`, buf);
  console.log(`public/model/harmoniq-${q}.bin  ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log((await page.textContent('pre')) ?? '');
await browser.close();
