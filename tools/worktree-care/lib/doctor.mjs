// Do worktrees share their downloads? On one volume with copy-on-write a second install costs
// almost nothing; across volumes every worktree pays in full.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run } from './run.mjs';

const device = (p) => {
  let d = p;
  while (d !== path.dirname(d) && !fs.existsSync(d)) d = path.dirname(d);
  return fs.statSync(d).dev;
};

export function doctor(out, env = process.env, cwd = process.cwd()) {
  let bad = 0;
  const here = device(cwd);
  const row = (ok, text) => {
    if (!ok) bad++;
    out(`${ok ? '✓' : '✗'} ${text}`);
  };
  const ask = (cmd, ...args) => {
    const r = run(cmd, args, { cwd, timeout: 20000 });
    return r.code === 0 ? r.out.trim() : null;
  };
  const pnpm = ask('pnpm', 'store', 'path');
  if (pnpm) row(device(pnpm) === here, `pnpm-opslag ${pnpm}${device(pnpm) === here ? ' op hetzelfde volume' : ' op een ander volume: elke werkboom kopieert'}`);
  const method = pnpm && ask('pnpm', 'config', 'get', 'package-import-method');
  if (method) row(method !== 'copy', `pnpm package-import-method ${method}`);
  const uv = ask('uv', 'cache', 'dir');
  if (uv) row(device(uv) === here, `uv-cache ${uv}${device(uv) === here ? ' op hetzelfde volume' : ' op een ander volume: elke werkboom kopieert'}`);
  row(env.UV_LINK_MODE !== 'copy', `UV_LINK_MODE ${env.UV_LINK_MODE || 'standaard'}`);
  const pw = env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
  row(pw !== '0' && path.isAbsolute(pw), `Playwright-browsers ${pw === '0' ? 'in elke node_modules (PLAYWRIGHT_BROWSERS_PATH=0)' : `gedeeld in ${pw}`}`);
  return bad ? 1 : 0;
}
