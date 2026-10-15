#!/usr/bin/env node
/**
 * Generates the share image (app/opengraph-image.png, 1200×630, from the hero
 * pose) and the Apple touch icon (app/apple-icon.png, from app/icon.svg).
 * Requires the dev server.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const base = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'http://localhost:3000';
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

// Share image: the hero, as a visitor first sees it (minus the scroll cue).
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${base}/?webgl=force`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__director?.warm && window.__director?.intro >= 1, null, { timeout: 180000 });
await page.addStyleTag({ content: '[class*="cue"] { visibility: hidden !important; }' });
await page.waitForTimeout(2500);
await page.screenshot({ path: resolve('app/opengraph-image.png') });
console.log('app/opengraph-image.png');

// Apple touch icon from the SVG favicon.
const svg = readFileSync(resolve('app/icon.svg'), 'utf8');
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(`<html><body style="margin:0;background:#161617">${svg.replace('<svg ', '<svg width="180" height="180" ')}</body></html>`);
await icon.screenshot({ path: resolve('app/apple-icon.png') });
console.log('app/apple-icon.png');
await browser.close();
