import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_LIMITS, countE2ERuns, decideE2E, e2eLimits, fileKind, readMachine } from '../checks/_e2e.mjs';
import { e2eAdvice } from '../checks/pr-body.mjs';
import { e2eNotes } from '../integrations/pr-gate.mjs';

const shellSync = (c, opts) => spawnSync(c, { shell: true, ...opts });
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POORT = path.join(ROOT, 'poort.mjs');
const GATE = path.join(ROOT, 'integrations', 'pr-gate.mjs');

const CALM = { load: 0, free: 1, runs: 0 };
const BUSY = { ...CALM, load: E2E_LIMITS.busyLoad };
const FULL = { ...CALM, load: E2E_LIMITS.fullLoad };
const ui = (lines, path = 'web/src/Page.vue') => ({ path, lines });
const LARGE = [ui(E2E_LIMITS.largeUiLines)];
const SMALL = [ui(1)];
const mode = (files, machine = CALM, extra = {}) => decideE2E({ files, machine, ...extra }).mode;

// ---------- de tabel ----------

test('beslissing: PR-grootte tegen drukte', () => {
  const none = [ui(5000, 'backend/app/main.py')];
  const table = [
    [none, 'skip', 'skip', 'skip'],
    [SMALL, 'advisory', 'skip', 'skip'],
    [LARGE, 'run', 'advisory', 'skip'],
  ];
  for (const [files, calm, busy, full] of table) {
    assert.deepEqual([mode(files, CALM), mode(files, BUSY), mode(files, FULL)], [calm, busy, full], files[0].path);
  }
});

test('beslissing: de reden noemt de wijziging en de meting', () => {
  assert.deepEqual(decideE2E({ files: [ui(260), ui(10, 'web/src/components/ui/Button.vue')], machine: { load: 2, free: 0.05, runs: 2 } }), {
    mode: 'skip',
    reason: 'grote UI-wijziging (2 UI-bestanden, 270 regels, 1 gedeeld), machine vol (2 e2e-runs bezig, load 2.00 per core, 5% geheugen vrij)',
  });
  assert.equal(decideE2E({ files: SMALL, machine: CALM }).reason, 'kleine UI-wijziging (1 UI-bestand, 1 regels), machine rustig');
  assert.equal(decideE2E({ files: [], machine: CALM }).reason, 'geen UI geraakt');
  assert.equal(decideE2E({ files: [ui(900, 'docs/plan.md')], machine: CALM }).reason, 'alleen docs');
});

// ---------- de randen van elke drempel ----------

test('rand largeUiLines: precies erop is groot, een regel minder is klein', () => {
  assert.equal(mode([ui(199)]), 'advisory');
  assert.equal(mode([ui(200)]), 'run');
  assert.equal(mode([ui(150), ui(50, 'web/src/Other.vue')]), 'run', 'opgeteld over de bestanden');
  assert.equal(mode([ui(199), ui(9000, 'web/.e2e/cache/a.json'), ui(9000, 'web/src/a.test.ts')]), 'advisory', 'opnames en unit-tests zijn geen UI');
});

test('rand largeUiFiles', () => {
  const files = (n) => Array.from({ length: n }, (_, i) => ui(1, `web/src/pages/P${i}.vue`));
  assert.equal(mode(files(7)), 'advisory');
  assert.equal(mode(files(8)), 'run');
});

test('rand largeSharedLines: telt alleen regels op een gedeeld oppervlak', () => {
  const shared = 'web/src/components/ui/Button.vue';
  assert.equal(mode([ui(49, shared)]), 'advisory');
  assert.equal(mode([ui(50, shared)]), 'run');
  assert.equal(mode([ui(49, shared), ui(100)]), 'advisory', 'gewone UI-regels tellen niet mee in deze drempel');
  assert.equal(mode([ui(0)], CALM, { limits: { ...E2E_LIMITS, largeSharedLines: 0 } }), 'advisory', 'drempel 0 zonder gedeeld bestand maakt niets groot');
});

test('rand busyLoad en fullLoad', () => {
  const at = (load) => mode(LARGE, { ...CALM, load });
  assert.equal(at(0.79), 'run');
  assert.equal(at(0.8), 'advisory');
  assert.equal(at(1.59), 'advisory');
  assert.equal(at(1.6), 'skip');
});

test('rand busyFree en fullFree: pas onder de drempel', () => {
  const at = (free) => mode(LARGE, { ...CALM, free });
  assert.equal(at(0.25), 'run');
  assert.equal(at(0.249), 'advisory');
  assert.equal(at(0.1), 'advisory');
  assert.equal(at(0.099), 'skip');
});

test('rand maxRuns', () => {
  assert.equal(mode(LARGE, { ...CALM, runs: 0 }), 'run');
  assert.equal(mode(LARGE, { ...CALM, runs: 1 }), 'skip');
  assert.equal(mode(LARGE, { ...CALM, runs: 1 }, { limits: { ...E2E_LIMITS, maxRuns: 2 } }), 'run');
});

test('een meting die ontbreekt, telt niet mee', () => {
  assert.equal(mode(LARGE, { load: null, free: null, runs: null }), 'run');
  assert.equal(mode(LARGE, {}), 'run');
});

// ---------- drempels uit de env, soort bestand, meten ----------

test('e2eLimits: elke drempel heeft een env; leeg, negatief of onzin is de standaard', () => {
  assert.deepEqual(e2eLimits({}), E2E_LIMITS);
  const names = { largeUiLines: 'LARGE_UI_LINES', largeUiFiles: 'LARGE_UI_FILES', largeSharedLines: 'LARGE_SHARED_LINES', busyLoad: 'BUSY_LOAD', fullLoad: 'FULL_LOAD', busyFree: 'BUSY_FREE', fullFree: 'FULL_FREE', maxRuns: 'MAX_RUNS' };
  assert.deepEqual(Object.keys(names), Object.keys(E2E_LIMITS));
  for (const [key, name] of Object.entries(names)) {
    assert.equal(e2eLimits({ [`POORT_E2E_${name}`]: '0.5' })[key], 0.5, name);
    assert.equal(e2eLimits({ [`POORT_E2E_${name}`]: '0' })[key], 0, name);
    for (const bad of ['', ' ', 'x', '-1', 'Infinity']) assert.equal(e2eLimits({ [`POORT_E2E_${name}`]: bad })[key], E2E_LIMITS[key], `${name}=${bad}`);
  }
});

test('fileKind: docs, backend, UI en gedeelde oppervlakken', () => {
  const kinds = {
    docs: ['README.md', 'docs/app.html', 'doc/a.ts', 'web/src/help.mdx'],
    other: ['backend/app/main.py', 'backend/src/index.ts', 'apps/server/x.ts', 'api/route.ts', 'web/.e2e/cache/a.json', 'web/src/a.test.ts', 'web/src/b.spec.tsx', 'web/env.d.ts', 'package.json', 'poort.config.json', 'web/data/nl.json'],
    ui: ['web/src/pages/Home.vue', 'src/App.css', 'web/src/api/client.ts', 'web/tests/login.e2e.ts', 'web/src/pages/docs/Viewer.vue', 'web/src/locales/nl.json', 'web/public/logo.svg', 'backend/templates/page.html', 'server/pages/index.vue'],
    shared: ['web/src/components/ui/Button.vue', 'web/src/components/primitives/Field.tsx', 'web/src/composables/useX.ts', 'web/src/router/index.ts', 'web/src/App.vue', 'web/src/main.ts', 'web/index.html', 'web/e2e.config.ts', 'web/src/tokens.css'],
  };
  for (const [kind, files] of Object.entries(kinds)) for (const f of files) assert.equal(fileKind(f), kind, f);
  assert.equal(fileKind('web/src/api/client.ts', [/^web\/src\/api\//]), 'shared', 'pr.sections van de repo');
  assert.equal(fileKind('web/src/components/Docs/a.ts'), 'ui', 'docs/ telt alleen in de root');
  assert.equal(fileKind('backend/core/x.ts', [/^backend\/core\//]), 'other', 'een gedeelde backend is geen UI');
});

test('countE2ERuns: de runner, niet de shell, npx, MCP of een commando dat het woord noemt', () => {
  const ps = [
    'node /w/web/node_modules/.bin/e2e run --strict-cache',
    '/opt/homebrew/bin/node --no-warnings /w/node_modules/e2e/dist/cli/bin.js run',
    'node /w/node_modules/.bin/e2e mcp --config e2e.config.ts',
    'npm exec e2e run --strict-cache',
    'sh -c npx --no-install e2e run --strict-cache',
    "/bin/zsh -c grep 'node_modules/.bin/e2e run' log",
    'node /w/node_modules/.bin/e2e runner',
    '',
  ].join('\n');
  assert.equal(countE2ERuns(ps), 2);
});

test('readMachine: meet iets bruikbaars, en de env vervangt de meting', () => {
  const real = readMachine({});
  assert.ok(real.load === null || real.load >= 0, String(real.load));
  if (real.free !== null) assert.ok(real.free > 0 && real.free <= 1, String(real.free));
  if (real.runs !== null) assert.ok(Number.isInteger(real.runs));
  const given = readMachine({ POORT_FREE_MEM: '0.5', POORT_E2E_RUNS: '0' });
  assert.deepEqual([given.free, given.runs], [0.5, 0]);
});

// ---------- run, verify en pr-body ----------

const ENV = { ...process.env, CI: '', GITHUB_ACTIONS: '', POORT_LOAD: '0.01', POORT_FREE_MEM: '1', POORT_E2E_RUNS: '0', POORT_SKIP: '', POORT_STATE: fs.mkdtempSync(path.join(os.tmpdir(), 'poort-e2e-state-')) };
const FULL_ENV = { POORT_E2E_RUNS: '1' };
const BUSY_ENV = { POORT_FREE_MEM: '0.2' };

// Een repo op een feature-branch: web/src/Page.vue heeft `lines` nieuwe regels, rood.txt maakt e2e rood.
function repo({ lines = 1, red = false, file = 'web/src/Page.vue', check = {}, extra = [] } = {}) {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-e2e-')), 'repo');
  fs.mkdirSync(path.join(dir, 'web', 'src'), { recursive: true });
  const git = (c) => assert.equal(shellSync(c, { cwd: dir, encoding: 'utf8' }).status, 0, c);
  git('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false');
  const e2e = { id: 'e2e-replay', tier: 'push', type: 'e2e', when: '^web/', run: 'echo gedraaid >> ../DRAAIDE; if test -f web/rood.txt; then echo kapot; exit 1; fi', ...check };
  fs.writeFileSync(path.join(dir, 'poort.config.json'), JSON.stringify({ checks: [e2e, ...extra] }));
  fs.writeFileSync(path.join(dir, 'web', 'src', 'Page.vue'), '<template/>\n');
  git('git add -A && git commit -q -m init && git update-ref refs/remotes/origin/main HEAD && git checkout -q -b feat/x');
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), '<template/>\n' + 'x\n'.repeat(lines));
  if (red) fs.writeFileSync(path.join(dir, 'web', 'rood.txt'), '');
  git('git add -A && git commit -q -m werk');
  const poort = (args, env = {}) => {
    const r = spawnSync(process.execPath, [POORT, ...args], { cwd: dir, encoding: 'utf8', env: { ...ENV, ...env } });
    return { code: r.status, text: r.stdout + r.stderr };
  };
  const runs = () => (fs.existsSync(path.join(dir, '..', 'DRAAIDE')) ? fs.readFileSync(path.join(dir, '..', 'DRAAIDE'), 'utf8').trim().split('\n').length : 0);
  return { dir, poort, git, runs };
}

test('run en verify: grote UI-wijziging op een rustige machine draait en blokkeert', () => {
  const t = repo({ lines: 300, red: true });
  const r = t.poort(['run', 'push']);
  assert.equal(r.code, 1, r.text);
  assert.match(r.text, /✗ e2e-replay\s+exit 1/);
  assert.match(r.text, /· e2e run · grote UI-wijziging \(1 UI-bestand, 300 regels\), machine rustig/);
  const v = t.poort(['verify']);
  assert.equal(v.code, 1, v.text);
  assert.match(v.text, /✗ e2e-replay\s+rood bij de laatste run/);
  const ok = repo({ lines: 300 });
  assert.equal(ok.poort(['run', 'push']).code, 0);
  assert.match(ok.poort(['verify']).text, /✓ e2e-replay {2}e2e run · grote UI-wijziging/);
});

test('run en verify: kleine UI-wijziging is adviserend; rood blokkeert push noch PR', () => {
  const t = repo({ lines: 3, red: true });
  const r = t.poort(['run', 'push']);
  assert.equal(r.code, 0, r.text);
  assert.match(r.text, /! e2e-replay\s+adviserend, blokkeert niet: exit 1/);
  assert.match(r.text, /· e2e advisory · kleine UI-wijziging/);
  const v = t.poort(['verify']);
  assert.equal(v.code, 0, v.text);
  assert.match(v.text, /↷ e2e-replay {2}e2e advisory · kleine UI-wijziging .*; rood bij de laatste run/);
});

test('run en verify: volle machine slaat over, zonder te draaien, en verify onthoudt waarom', () => {
  const t = repo({ lines: 300, red: true });
  assert.equal(t.poort(['verify']).code, 1, 'zonder run is er nog geen beslissing');
  const r = t.poort(['run', 'push'], FULL_ENV);
  assert.equal(r.code, 0, r.text);
  assert.match(r.text, /↷ e2e-replay\s+overgeslagen: e2e skip · grote UI-wijziging .*, machine vol \(1 e2e-run bezig\)/);
  assert.equal(t.runs(), 0);
  const v = t.poort(['verify']);
  assert.equal(v.code, 0, `de machine is nu rustig, de beslissing blijft: ${v.text}`);
  assert.match(v.text, /↷ e2e-replay {2}e2e skip · /);
  t.git('echo y >> web/src/Page.vue && git commit -qam meer');
  assert.equal(t.poort(['verify']).code, 1, 'andere inhoud: opnieuw beslissen');
});

test('rood in een blokkerende run wordt op een drukke machine niet alsnog groen', () => {
  const t = repo({ lines: 300, red: true });
  assert.equal(t.poort(['run', 'push']).code, 1);
  const full = t.poort(['run', 'push'], FULL_ENV);
  assert.equal(full.code, 0, full.text);
  assert.match(full.text, /deze inhoud was eerder rood, de PR-poort vraagt een groene run/);
  assert.equal(t.poort(['verify']).code, 1);
  assert.equal(t.poort(['run', 'push'], BUSY_ENV).code, 0);
  assert.equal(t.poort(['verify']).code, 1, 'ook na een adviserende rode run');
  t.git('git rm -q web/rood.txt && git commit -qm fix');
  assert.equal(t.poort(['run', 'push']).code, 0);
  assert.equal(t.poort(['verify']).code, 0);
});

test('ook rood uit --all (zonder beslissing) blijft staan, met en zonder eerdere beslissing', () => {
  const t = repo({ lines: 300, red: true });
  assert.equal(t.poort(['run', 'push'], FULL_ENV).code, 0);
  assert.equal(t.poort(['verify']).code, 0);
  assert.equal(t.poort(['run', 'push', '--all']).code, 1);
  assert.equal(t.poort(['verify']).code, 1, 'de oude skip geldt niet meer');
  assert.equal(t.poort(['run', 'push'], FULL_ENV).code, 0);
  assert.equal(t.poort(['verify']).code, 1, 'een nieuwe skip ook niet');
});

test('rood uit een adviserende run houdt een latere blokkerende run niet tegen; die telt wel', () => {
  const t = repo({ lines: 300, red: true });
  assert.equal(t.poort(['run', 'push'], BUSY_ENV).code, 0);
  assert.equal(t.poort(['verify']).code, 0);
  assert.equal(t.poort(['run', 'push']).code, 1);
  assert.equal(t.poort(['verify']).code, 1);
});

test('{files}-check: dezelfde regels, per bestand', () => {
  const run = 'echo {files} > /dev/null; echo gedraaid >> ../DRAAIDE; ! test -f web/rood.txt';
  const t = repo({ lines: 300, red: true, check: { run } });
  assert.equal(t.poort(['run', 'push'], BUSY_ENV).code, 0);
  assert.equal(t.poort(['verify']).code, 0);
  assert.equal(t.poort(['run', 'push']).code, 1);
  assert.equal(t.poort(['run', 'push'], BUSY_ENV).code, 0);
  assert.equal(t.poort(['verify']).code, 1);
  const s = repo({ lines: 300, red: true, check: { run } });
  assert.equal(s.poort(['run', 'push'], FULL_ENV).code, 0);
  assert.equal(s.poort(['verify']).code, 0);
});

test('een nieuw bestand dat niet te lezen is, laat de push niet vallen', { skip: process.platform === 'win32' && 'symlinks' }, () => {
  const t = repo({ lines: 3 });
  fs.symlinkSync('lus.vue', path.join(t.dir, 'web/src/lus.vue'));
  fs.symlinkSync('weg', path.join(t.dir, 'web/src/weg.vue'));
  const r = t.poort(['run', 'push']);
  assert.equal(r.code, 0, r.text);
  assert.match(r.text, /e2e advisory · kleine UI-wijziging \(3 UI-bestanden, 3 regels\)/);
});

test('de omvang is die van de hele branch, niet van de laatste push', () => {
  const t = repo({ lines: 300 });
  t.git('echo klein >> web/src/Page.vue && git commit -qam klein');
  const head = shellSync('git rev-parse HEAD', { cwd: t.dir, encoding: 'utf8' }).stdout.trim();
  const prev = shellSync('git rev-parse HEAD~1', { cwd: t.dir, encoding: 'utf8' }).stdout.trim();
  const r = spawnSync(process.execPath, [POORT, 'hook', 'pre-push'], { cwd: t.dir, encoding: 'utf8', env: ENV, input: `refs/heads/feat/x ${head} refs/heads/feat/x ${prev}\n` });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /e2e run · grote UI-wijziging \(1 UI-bestand, 301 regels\)/);
});

test('commit-hook: telt wat gestaged is mee, niet wat los in de werkboom staat', () => {
  const t = repo({ lines: 1, check: { tier: 'commit' } });
  fs.writeFileSync(path.join(t.dir, 'web/src/Page.vue'), '<template/>\n' + 'x\n'.repeat(20));
  t.git('git add -A');
  fs.writeFileSync(path.join(t.dir, 'web/src/Los.vue'), 'x\n'.repeat(400));
  const r = t.poort(['hook', 'pre-commit']);
  assert.match(r.text, /e2e advisory · kleine UI-wijziging \(1 UI-bestand, 20 regels\)/);
});

test('een nieuw, niet gecommit UI-bestand telt mee in run push', () => {
  const t = repo({ lines: 1 });
  fs.writeFileSync(path.join(t.dir, 'web/src/Nieuw.vue'), 'x\n'.repeat(250));
  assert.match(t.poort(['run', 'push']).text, /e2e run · grote UI-wijziging \(2 UI-bestanden, 251 regels\)/);
});

test('geen UI geraakt: skip, ook op een rustige machine', () => {
  const t = repo({ lines: 900, file: 'web/notes.md' });
  const r = t.poort(['run', 'push']);
  assert.match(r.text, /↷ e2e-replay\s+overgeslagen: e2e skip · alleen docs/);
  assert.equal(t.poort(['verify']).code, 0);
});

test('CI en --all: de config beslist, niet de drukte', () => {
  const ci = repo({ lines: 1, red: true });
  assert.equal(ci.poort(['run', 'push'], { CI: '1', ...FULL_ENV }).code, 1);
  const all = repo({ lines: 1, red: true });
  const r = all.poort(['run', 'push', '--all'], FULL_ENV);
  assert.equal(r.code, 1, r.text);
  assert.doesNotMatch(r.text, /e2e (run|advisory|skip) ·/);
});

test('de drempels uit de env gelden in een run', () => {
  const t = repo({ lines: 5 });
  assert.match(t.poort(['run', 'push'], { POORT_E2E_LARGE_UI_LINES: '5' }).text, /e2e run · grote UI-wijziging/);
});

test('cached groen: geen nieuwe beslissing, ook op een volle machine', () => {
  const t = repo({ lines: 300 });
  assert.equal(t.poort(['run', 'push']).code, 0);
  const r = t.poort(['run', 'push'], FULL_ENV);
  assert.match(r.text, /✓ e2e-replay\s+cached/);
  assert.doesNotMatch(r.text, /e2e skip/);
  assert.equal(t.poort(['verify']).code, 0);
});

test('een check die hier niet hoort (if), krijgt geen beslissing', () => {
  const t = repo({ lines: 300, check: { if: 'test -f bestaat-niet', ifHint: 'geen e2e.config' } });
  assert.match(t.poort(['run', 'push'], FULL_ENV).text, /↷ e2e-replay\s+overgeslagen: voorwaarde niet voldaan: geen e2e.config/);
  assert.match(t.poort(['verify']).text, /↷ e2e-replay {2}n\.v\.t\. hier/);
});

test('ontbrekende tool: adviserend waarschuwt, blokkerend is rood', () => {
  const check = { needs: 'false', needsHint: 'npm i -D e2e' };
  const small = repo({ lines: 3, check });
  const r = small.poort(['run', 'push']);
  assert.equal(r.code, 0, r.text);
  assert.match(r.text, /! e2e-replay\s+adviserend, blokkeert niet: exit 127/);
  assert.match(small.poort(['verify']).text, /e2e advisory · .*; tool ontbreekt: npm i -D e2e/);
  const large = repo({ lines: 300, check });
  assert.equal(large.poort(['run', 'push']).code, 1);
  assert.equal(large.poort(['verify']).code, 1);
});

test('typecheck, unit en smoke blijven verplicht op een volle machine', () => {
  const extra = ['typecheck', 'unit', 'smoke'].map((id) => ({ id, tier: 'push', when: '^web/', run: 'exit 1' }));
  const t = repo({ lines: 300, extra });
  const r = t.poort(['run', 'push'], FULL_ENV);
  assert.equal(r.code, 1, r.text);
  for (const { id } of extra) assert.match(r.text, new RegExp(`✗ ${id}`));
  assert.match(r.text, /↷ e2e-replay\s+overgeslagen: e2e skip/);
  assert.equal(t.poort(['verify']).code, 1);
});

test('een check van een ander type krijgt geen beslissing', () => {
  const t = repo({ lines: 300, red: true, check: { type: undefined } });
  const r = t.poort(['run', 'push'], FULL_ENV);
  assert.equal(r.code, 1, r.text);
  assert.doesNotMatch(r.text, /e2e (run|advisory|skip) ·/);
});

// ---------- pr-body ----------

test('pr-body: een overslag of adviserend rood dat niet in de tekst staat, krijgt een kant-en-klare regel', () => {
  const skip = 'e2e-replay: e2e skip · geen UI geraakt';
  const red = 'e2e-replay: e2e advisory · kleine UI-wijziging; rood bij de laatste run van deze inhoud';
  assert.deepEqual(e2eAdvice('## Summary', ''), []);
  assert.deepEqual(e2eAdvice('## Summary', skip), [`${skip}. Zet in de PR: UNVERIFIED: e2e overgeslagen: geen UI geraakt`]);
  assert.deepEqual(e2eAdvice('UNVERIFIED: e2e overgeslagen: geen UI geraakt', skip), [skip]);
  assert.deepEqual(e2eAdvice('## Summary', red), [`${red}. Zet in de PR: UNVERIFIED: e2e rood: <de rode tests>`]);
  assert.deepEqual(e2eAdvice('UNVERIFIED: e2e rood: tests/login.e2e.ts', red), [red]);
  assert.deepEqual(e2eAdvice('', 'a: e2e run · groot\nb: e2e advisory · klein'), ['a: e2e run · groot', 'b: e2e advisory · klein']);
});

test('e2eNotes: haalt de beslissingen uit de regels van verify', () => {
  const verify = ['poort verify · abc', '  ✓ unit', '  ✓ e2e-a  e2e run · groot', '  ↷ e2e-b  e2e skip · druk', '  ↷ e2e-c  n.v.t. hier (voorwaarde)', '  ✗ e2e-d  rood bij de laatste run van deze inhoud'].join('\n');
  assert.equal(e2eNotes(verify), 'e2e-a: e2e run · groot\ne2e-b: e2e skip · druk');
});

test('PR-poort: adviserend rood laat de PR door en vraagt om de rode tests', () => {
  const t = repo({ lines: 1 });
  assert.equal(shellSync(`node ${POORT} init --no-hooks`, { cwd: t.dir, encoding: 'utf8', env: ENV }).status, 0);
  t.git('git add -A && git commit -qm poort && git update-ref refs/remotes/origin/main HEAD && echo y >> web/src/Page.vue && touch web/rood.txt && git add -A && git commit -qm ui');
  assert.equal(t.poort(['run', 'push']).code, 0);
  const r = spawnSync(process.execPath, [GATE], { cwd: t.dir, encoding: 'utf8', env: ENV, input: JSON.stringify({ tool_input: { command: "gh pr create --base main --head main --body '## Summary'" }, cwd: t.dir }) });
  assert.equal(r.status, 0, r.stderr);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /e2e advisory · .*; rood bij .*Zet in de PR: UNVERIFIED: e2e rood/);
});

test('PR-poort: een overgeslagen e2e laat de PR door en geeft de agent de regel mee', () => {
  const t = repo({ lines: 300 });
  assert.equal(shellSync(`node ${POORT} init --no-hooks`, { cwd: t.dir, encoding: 'utf8', env: ENV }).status, 0);
  t.git('git add -A && git commit -qm poort && git update-ref refs/remotes/origin/main HEAD && echo y >> web/src/Page.vue && git commit -qam ui');
  assert.equal(t.poort(['run', 'push'], FULL_ENV).code, 0);
  const gate = (body) => spawnSync(process.execPath, [GATE], { cwd: t.dir, encoding: 'utf8', env: ENV, input: JSON.stringify({ tool_input: { command: `gh pr create --base main --head main --body '${body}'` }, cwd: t.dir }) });
  const r = gate('## Summary');
  assert.equal(r.status, 0, r.stderr);
  const hook = JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(hook.hookEventName, 'PreToolUse');
  assert.match(hook.additionalContext, /^e2e-replay: e2e skip · kleine UI-wijziging .*Zet in de PR: UNVERIFIED: e2e overgeslagen: /);
});
