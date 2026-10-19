#!/usr/bin/env node
// Render a README the way GitHub does and screenshot it, light and dark, desktop and phone.
//
// Usage: node render_readme.mjs <README.md> <out-dir> [owner/repo]
//
// Converts the markdown with GitHub's own renderer (api.github.com/markdown), styles it with
// github-markdown-css, and saves screenshots plus a report of broken images and pages that
// scroll sideways. Read the PNGs afterwards: the report proves loading, not looks.
// Needs Playwright with Chromium (project or ~/node_modules). GITHUB_TOKEN is optional.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const [readmeArg, outArg, repo = ''] = process.argv.slice(2);
if (!readmeArg || !outArg) {
  console.error('gebruik: node render_readme.mjs <README.md> <out-map> [eigenaar/repo]');
  process.exit(2);
}
const readme = path.resolve(readmeArg);
const out = path.resolve(outArg);
fs.mkdirSync(out, { recursive: true });

function loadPlaywright() {
  for (const base of [process.cwd(), os.homedir()]) {
    try { return createRequire(path.join(base, 'noop.js'))('playwright'); } catch { /* volgende plek */ }
  }
  console.error('Playwright ontbreekt: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}

const headers = { 'Content-Type': 'application/json', Accept: 'text/html' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const res = await fetch('https://api.github.com/markdown', {
  method: 'POST',
  headers,
  body: JSON.stringify({ text: fs.readFileSync(readme, 'utf8'), mode: 'gfm', context: repo || undefined }),
});
if (!res.ok) {
  console.error(`GitHub-renderer gaf ${res.status}: ${(await res.text()).slice(0, 200)}`);
  process.exit(1);
}
// Relative image paths resolve against the README's folder, like on GitHub.
const base = `file://${path.dirname(readme)}/`;
const body = (await res.text()).replace(/(src|href)="(?![a-z]+:|#|\/)([^"]+)"/g, (_, a, p) => `${a}="${base}${p}"`);

const { chromium } = loadPlaywright();
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const report = [];
for (const scheme of ['light', 'dark']) {
  const css = `https://cdn.jsdelivr.net/npm/github-markdown-css@5.8.1/github-markdown-${scheme}.css`;
  const bg = scheme === 'dark' ? '#0d1117' : '#ffffff';
  const file = path.join(out, `readme-${scheme}.html`);
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="${css}"><style>body{margin:0;background:${bg}}
.markdown-body{box-sizing:border-box;max-width:980px;margin:0 auto;padding:32px 16px}</style></head>
<body><article class="markdown-body">${body}</article></body></html>`);
  for (const width of [1012, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1300 }, colorScheme: scheme });
    await page.goto(`file://${file}`, { waitUntil: 'networkidle' });
    const facts = await page.evaluate(() => ({
      broken: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
      height: document.documentElement.scrollHeight,
    }));
    const slices = Math.min(3, Math.ceil(facts.height / 1300));
    for (let i = 0; i < slices; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * 1300);
      await page.screenshot({ path: path.join(out, `readme-${scheme}-${width}-${i + 1}.png`) });
    }
    report.push(`${scheme} ${width}px: ${facts.broken.length ? `kapotte afbeeldingen: ${facts.broken.join(', ')}` : 'alle afbeeldingen laden'}` +
      `${facts.sideways ? '; pagina scrolt zijwaarts' : ''}; ${slices} screenshot(s)`);
    await page.close();
  }
}
await browser.close();
console.log(report.join('\n'));
console.log(`screenshots in ${out}`);
