#!/usr/bin/env node
/**
 * shoot.js — reliable headless render/screenshot with Playwright. A real
 * headless Chromium render of a URL or local file to PNG, either full page
 * or a single element (selector) for a sharp zoom.
 *
 * Usage:  node shoot.js <url|file> <out.png> [selector] [width]
 *   node shoot.js file:///C:/x/page.html out.png              (full page, 1280 wide)
 *   node shoot.js https://site out.png "#hero" 1440           (only #hero)
 */
'use strict';
const path = require('path');

// Resolve playwright robustly, even when the script runs outside the home cwd.
let chromium;
try { ({ chromium } = require('playwright')); }
catch (_) { ({ chromium } = require(path.join(process.env.HOME || process.env.USERPROFILE, 'node_modules', 'playwright'))); }

const url = process.argv[2];
const out = process.argv[3];
const selector = process.argv[4] || null;
const width = parseInt(process.argv[5] || '1280', 10);
if (!url || !out) { console.error('usage: node shoot.js <url|file> <out.png> [selector] [width]'); process.exit(2); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (_) {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  }
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (_) {}
  await page.waitForTimeout(300); // let layout settle after fonts
  if (selector) {
    const el = page.locator(selector).first();
    try {
      await el.waitFor({ state: 'visible', timeout: 5000 });
    } catch (_) {
      await browser.close();
      console.error(`shoot failed: selector "${selector}" not visible/found on ${url}`);
      process.exit(3);
    }
    await el.screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: true });
  }
  await browser.close();
  console.log('OK ' + out);
})().catch(e => { console.error('shoot failed: ' + (e.message || e)); process.exit(1); });
