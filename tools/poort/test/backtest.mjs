#!/usr/bin/env node
// Backtest: draai de adviserende checks tegen historische PR's en kijk of ze
// melden waar de reviewer het vond (positief) en stil blijven waar niets was
// (controle). Read-only voor de werkboom: haalt alleen PR-objecten op.
//
// Gebruik (in de repo-clone):
//   node /pad/poort/test/backtest.mjs --repo owner/name --shared '<regex>' \
//        --pos ripple=737,701 --pos siblings=709,738 --neg 740,745
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k) => argv.flatMap((a, i) => (a === k ? [argv[i + 1]] : []));
const repo = opt('--repo')[0];
const shared = opt('--shared')[0];
const pos = opt('--pos').map((p) => {
  const [check, list] = p.split('=');
  return { check, prs: list.split(',').map(Number) };
});
const neg = (opt('--neg')[0] || '').split(',').filter(Boolean).map(Number);

const run = (cmd, args, env = {}) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env } });
const git = (...a) => run('git', a).stdout.trim();

function prRange(n) {
  const meta = JSON.parse(run('gh', ['pr', 'view', String(n), '--repo', repo, '--json', 'baseRefOid,headRefOid,baseRefName']).stdout || '{}');
  if (!meta.headRefOid) return null;
  run('git', ['fetch', '-q', 'origin', `pull/${n}/head`]);
  if (!git('cat-file', '-t', meta.baseRefOid)) run('git', ['fetch', '-q', 'origin', meta.baseRefName]);
  const base = git('merge-base', meta.headRefOid, meta.baseRefOid);
  if (!base) return null;
  return { base, head: meta.headRefOid, files: git('diff', '--name-only', base, meta.headRefOid).split('\n').filter(Boolean) };
}

const CHECKS = {
  ripple: (files) => ['ripple.mjs', ...(shared ? ['--shared', shared] : []), ...files],
};

const cache = new Map();
function warnsFor(n, check) {
  if (!cache.has(n)) cache.set(n, prRange(n));
  const r = cache.get(n);
  if (!r) return null;
  const [script, ...args] = CHECKS[check](r.files);
  const out = run('node', [path.join(here, '..', 'checks', script), ...args], { POORT_BASE: r.base, POORT_HEAD: r.head, POORT_TIER: 'push' });
  return out.stdout.split('\n').filter((l) => l.startsWith('poort:warn ')).map((l) => l.slice(11));
}

const rows = [];
for (const { check, prs } of pos) {
  for (const n of prs) {
    const w = warnsFor(n, check);
    rows.push({ kind: 'positief', check, pr: n, hit: w === null ? 'n.v.t.' : w.length ? 'ja' : 'nee', first: w?.[0] || '' });
  }
}
for (const check of Object.keys(CHECKS)) {
  for (const n of neg) {
    const w = warnsFor(n, check);
    rows.push({ kind: 'controle', check, pr: n, hit: w === null ? 'n.v.t.' : w.length ? 'ja' : 'nee', first: w?.[0] || '' });
  }
}
for (const r of rows) console.log(`${r.kind.padEnd(8)} ${r.check.padEnd(12)} #${r.pr}  melding: ${r.hit.padEnd(6)} ${r.first.slice(0, 150)}`);
const summary = (kind) => {
  const sel = rows.filter((r) => r.kind === kind && r.hit !== 'n.v.t.');
  return `${sel.filter((r) => r.hit === 'ja').length}/${sel.length}`;
};
console.log(`\npositief gemeld: ${summary('positief')}   controle gemeld (ruis): ${summary('controle')}`);
