// Veel agents tegelijk: slots, prepare, stats en format-on-edit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireSlot, normalizeConfig, prepareNeed, pruneReceipts } from '../poort.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POORT = path.join(ROOT, 'poort.mjs');
const FORMAT = path.join(ROOT, 'integrations', 'format-on-edit.mjs');

function sh(cmd, cwd, env = {}) {
  const r = spawnSync('sh', ['-c', cmd], { cwd, encoding: 'utf8', env: { ...process.env, ...env, CI: '', GITHUB_ACTIONS: '' } });
  return { ...r, stdout: r.stdout + r.stderr };
}

// Repo met een eigen config (zonder init: geen hooks nodig voor `run`).
function repo(cfg) {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-ag-')), 'repo');
  fs.mkdirSync(dir);
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  fs.writeFileSync(path.join(dir, 'poort.config.json'), JSON.stringify(cfg));
  fs.writeFileSync(path.join(dir, 'README.md'), 'hi\n');
  sh('git add -A && git commit -q -m init', dir);
  return dir;
}

const count = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length : 0);

// ---------- slots ----------

test('slots: tickets in volgorde, wachten, en een ticket van een dood proces telt niet', async () => {
  const store = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-slot-'));
  const a = await acquireSlot(store, 1);
  let waited = null;
  const pending = acquireSlot(store, 1, { pollMs: 20, onWait: (w) => (waited = w) });
  setTimeout(() => a.release(), 150);
  const b = await pending;
  assert.deepEqual(waited, { holders: 1, max: 1, ahead: 0 }, 'tweede wacht: slot bezet, niemand vóór hem in de rij');
  assert.ok(b.waitMs >= 100, `wachttijd ${b.waitMs}ms`);
  b.release();
  // een houder van een gestopt proces blokkeert anders het enige slot
  fs.writeFileSync(path.join(store, 'slots', `h-${String(Date.now()).padStart(15, '0')}-999999-dood`), '');
  const c = await acquireSlot(store, 1, { pollMs: 20 });
  c.release();
  assert.deepEqual(fs.readdirSync(path.join(store, 'slots')), []);
});

test('slots: twee worktrees met slots=1 draaien een zware check nooit tegelijk', async () => {
  const dir = repo({
    slots: 1,
    // repo en worktree zijn buren in dezelfde tijdelijke map: ../spoor.txt is voor beide hetzelfde bestand
    checks: [{ id: 'zwaar', tier: 'push', when: '\\.py$', heavy: true, run: 'echo start >> ../spoor.txt; sleep 0.6; echo eind >> ../spoor.txt' }],
  });
  const wt = path.join(path.dirname(dir), 'wt');
  sh(`git worktree add -q ${wt}`, dir);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  fs.writeFileSync(path.join(wt, 'b.py'), 'y = 1\n');
  const run = (cwd) =>
    new Promise((resolve) => {
      let outp = '';
      const p = spawn('node', [POORT, 'run', 'push', '--only'], { cwd, env: { ...process.env, CI: '', GITHUB_ACTIONS: '' } });
      p.stdout.on('data', (d) => (outp += d));
      p.stderr.on('data', (d) => (outp += d));
      p.on('close', (code) => resolve({ code, outp }));
    });
  const [r1, r2] = await Promise.all([run(dir), run(wt)]);
  assert.equal(r1.code, 0, r1.outp);
  assert.equal(r2.code, 0, r2.outp);
  const spoor = fs.readFileSync(path.join(path.dirname(dir), 'spoor.txt'), 'utf8').trim().split('\n');
  assert.deepEqual(spoor, ['start', 'eind', 'start', 'eind'], 'nooit twee starts achter elkaar');
  assert.match(r1.outp + r2.outp, /zwaar wacht op een slot \([01]\/1 bezet/);
  assert.match(r1.outp + r2.outp, /✓ zwaar +[\d.]+s \(wachtte [\d.]+s op een slot\)/);
});

// ---------- afsluiten: niets laten draaien, niets kwijtraken ----------

const groupAlive = (pid) => {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
};
const waitFor = async (pred, ms = 5000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (pred()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
};

test('SIGTERM tijdens de commit-hook: check gestopt, niet-gestagede wijziging terug', async () => {
  const dir = repo({ checks: [{ id: 'traag', tier: 'commit', when: '\\.py$', run: 'echo $$ > ../check.pid; sleep 30' }] });
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  sh('git add a.py', dir);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\ny = 2\n'); // niet gestaged
  const pidFile = path.join(path.dirname(dir), 'check.pid');
  const p = spawn('node', [POORT, 'hook', 'pre-commit'], { cwd: dir, env: { ...process.env, CI: '', GITHUB_ACTIONS: '' } });
  assert.ok(await waitFor(() => fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8').trim()), 'check gestart');
  assert.equal(fs.readFileSync(path.join(dir, 'a.py'), 'utf8'), 'x = 1\n', 'tijdens de hook staat alleen de gestagede versie');
  const checkPid = Number(fs.readFileSync(pidFile, 'utf8'));
  p.kill('SIGTERM');
  const code = await new Promise((r) => p.on('close', (c, s) => r(c ?? s)));
  assert.equal(code, 143);
  assert.equal(groupAlive(checkPid), false, 'de check draait niet door');
  assert.equal(fs.readFileSync(path.join(dir, 'a.py'), 'utf8'), 'x = 1\ny = 2\n', 'werk is terug');
  assert.deepEqual(fs.readdirSync(path.join(dir, '.git', 'poort')).filter((f) => f.endsWith('.patch')), []);
});

test('fixer botst met niet-gestaged werk: eigen werk terug, fixes apart, ook als de fixer zelf stagede', () => {
  for (const add of [false, true]) {
    const run = `printf 'fix\\n' >> a.py${add ? ' && git add a.py' : ''}; exit 1`;
    const dir = repo({ checks: [{ id: 'fixer', tier: 'commit', when: '\\.py$', run }] });
    fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
    sh('git add a.py', dir);
    fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\nmijn = 2\n'); // niet gestaged
    const r = sh(`node ${POORT} hook pre-commit`, dir);
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /Je werk staat terug; de wijzigingen van de hook staan in .*\.fixes\.patch/, `git add: ${add}`);
    assert.equal(fs.readFileSync(path.join(dir, 'a.py'), 'utf8'), 'x = 1\nmijn = 2\n', `eigen werk terug (git add: ${add})`);
    assert.equal(sh('git show :a.py', dir).stdout, 'x = 1\n', `index zoals vóór de hook (git add: ${add})`);
    const pdir = path.join(dir, '.git', 'poort');
    const fixes = fs.readdirSync(pdir).filter((f) => f.endsWith('.fixes.patch'));
    assert.equal(fixes.length, 1);
    assert.match(fs.readFileSync(path.join(pdir, fixes[0]), 'utf8'), /^\+fix$/m, 'de fix van de hook is bewaard');
    assert.deepEqual(fs.readdirSync(pdir).filter((f) => /^unstaged-\d+\.patch$/.test(f)), [], 'geen achtergebleven werk');
  }
});

test('doctor en commit-hook melden werk van een hard gestopte hook tot het terug is', () => {
  const dir = repo({ checks: [{ id: 'unit', tier: 'commit', when: '\\.py$', run: 'true' }] });
  fs.mkdirSync(path.join(dir, '.git', 'poort'), { recursive: true });
  const patch = path.join(dir, '.git', 'poort', 'unstaged-999999.patch'); // pid bestaat niet meer
  fs.writeFileSync(patch, 'diff --git a/x b/x\n');
  let r = sh(`node ${POORT} doctor`, dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /✗ niet teruggezet werk van een afgebroken hook: git apply .*unstaged-999999\.patch/);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  sh('git add a.py', dir);
  r = sh(`node ${POORT} hook pre-commit`, dir);
  assert.equal(r.status, 0, 'blokkeert de commit niet');
  assert.match(r.stdout, /niet teruggezet werk van een afgebroken hook staat in .*unstaged-999999\.patch/);
});

test('timeout stopt de hele groep; achtergrondproces na afloop ook opgeruimd', async () => {
  const dir = repo({
    checks: [
      { id: 'hangt', tier: 'push', when: '\\.py$', timeout: 1, run: 'echo $$ > ../hang.pid; sleep 30' },
      { id: 'laat-iets-achter', tier: 'push', when: '\\.py$', timeout: 60, run: 'sleep 30 & echo $! > ../bg.pid' },
    ],
  });
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  const started = Date.now();
  const r = sh(`node ${POORT} run push --only`, dir);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /✗ hangt +timeout na 1s/);
  assert.match(r.stdout, /✓ laat-iets-achter/);
  assert.ok(Date.now() - started < 10000, 'wacht niet op het achtergrondproces');
  const pid = (f) => Number(fs.readFileSync(path.join(path.dirname(dir), f), 'utf8'));
  assert.equal(groupAlive(pid('hang.pid')), false);
  assert.ok(await waitFor(() => { try { process.kill(pid('bg.pid'), 0); return false; } catch { return true; } }), 'achtergrondproces gestopt');
});

test('logs per worktree; receipts gedeeld', () => {
  const dir = repo({ checks: [{ id: 'unit', tier: 'push', when: '\\.py$', run: 'echo "poort:warn let op"' }] });
  const wt = path.join(path.dirname(dir), 'wt');
  sh(`git worktree add -q ${wt}`, dir);
  fs.writeFileSync(path.join(wt, 'a.py'), 'x = 1\n');
  const r = sh(`node ${POORT} run push --only`, wt);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /! let op/, 'waarschuwing uit deze run');
  assert.ok(fs.existsSync(path.join(dir, '.git', 'worktrees', 'wt', 'poort', 'logs', 'unit.log')));
  assert.equal(fs.existsSync(path.join(dir, '.git', 'poort', 'logs', 'unit.log')), false, 'niet in de log van de hoofdclone');
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  assert.match(sh(`node ${POORT} run push --only`, dir).stdout, /✓ unit +cached\n {4}! let op/, 'zelfde inhoud in de hoofdclone: cached, met de waarschuwing');
});

test('receipts: ouder dan 30 dagen weg, hoogstens één keer per dag opgeruimd', () => {
  const store = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-rc-'));
  const dir = path.join(store, 'receipts', 'unit');
  fs.mkdirSync(dir, { recursive: true });
  const old = path.join(dir, 'oud.json');
  fs.writeFileSync(old, '{}');
  fs.writeFileSync(path.join(dir, 'nieuw.json'), '{}');
  const day = 86400000;
  fs.utimesSync(old, new Date(Date.now() - 40 * day), new Date(Date.now() - 40 * day));
  assert.equal(pruneReceipts(store), 1);
  assert.deepEqual(fs.readdirSync(dir), ['nieuw.json']);
  fs.writeFileSync(old, '{}');
  fs.utimesSync(old, new Date(Date.now() - 40 * day), new Date(Date.now() - 40 * day));
  assert.equal(pruneReceipts(store), 0, 'vandaag al opgeruimd');
  assert.equal(pruneReceipts(store, Date.now() + 2 * day), 1, 'een dag later weer');
});

// ---------- prepare ----------

test('prepare: draait als creates ontbreekt of de lockfile wijzigt, anders niet; rood blokkeert', () => {
  const dir = repo({
    prepare: [{ id: 'deps', when: ['lock.txt'], creates: 'deps', run: 'mkdir -p deps && echo x >> ../prep.txt' }],
    checks: [{ id: 'unit', tier: 'push', when: '\\.py$', run: 'test -d deps' }],
  });
  fs.writeFileSync(path.join(dir, 'lock.txt'), 'v1\n');
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  const prep = path.join(path.dirname(dir), 'prep.txt');
  let r = sh(`node ${POORT} run push`, dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /poort prepare\n {2}✓ deps +[\d.]+s · deps ontbreekt/);
  assert.equal(count(prep), 1);
  r = sh(`node ${POORT} run push`, dir);
  assert.doesNotMatch(r.stdout, /poort prepare/, 'niets veranderd: stil');
  assert.equal(count(prep), 1);
  fs.writeFileSync(path.join(dir, 'lock.txt'), 'v2\n');
  r = sh(`node ${POORT} run push`, dir);
  assert.match(r.stdout, /✓ deps .* lock\.txt gewijzigd/);
  assert.equal(count(prep), 2);
  assert.equal(sh(`node ${POORT} run push`, dir, { POORT_NO_PREPARE: '1' }).status, 0);

  const bad = repo({ prepare: [{ id: 'kapot', creates: 'nooit', run: 'echo installatie mislukt; exit 3' }], checks: [{ id: 'unit', tier: 'push', run: 'true' }] });
  fs.writeFileSync(path.join(bad, 'a.py'), 'x = 1\n');
  r = sh(`node ${POORT} run push`, bad);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /✗ kapot +exit 3 · nooit ontbreekt/);
  assert.match(r.stdout, /│ installatie mislukt/);
  assert.doesNotMatch(r.stdout, /✓ unit/, 'checks draaien niet op een kapotte omgeving');
});

test('prepare: bestaande installatie zonder stempel geldt als up-to-date; if slaat over', () => {
  const top = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-prep-'));
  fs.writeFileSync(path.join(top, 'lock.json'), '1');
  const p = { id: 'npm', run: 'npm ci', when: ['lock.json'], creates: 'node_modules' };
  assert.equal(prepareNeed(top, top, p).why, 'node_modules ontbreekt');
  fs.mkdirSync(path.join(top, 'node_modules'));
  assert.equal(prepareNeed(top, top, p).need, false, 'overgenomen, geen onnodige npm ci');
  fs.writeFileSync(path.join(top, 'lock.json'), '2');
  assert.equal(prepareNeed(top, top, p).why, 'lock.json gewijzigd');

  const dir = repo({ prepare: [{ id: 'npm', creates: 'node_modules', if: 'test -f package-lock.json', run: 'exit 9' }], checks: [{ id: 'unit', tier: 'push', run: 'true' }] });
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  const r = sh(`node ${POORT} run push`, dir);
  assert.equal(r.status, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /prepare/);
});

// ---------- stats ----------

test('stats: per check gedraaid, cached en totaal, zwaarste eerst', () => {
  const dir = repo({
    checks: [
      { id: 'snel', tier: 'push', when: '\\.py$', run: 'true' },
      { id: 'traag', tier: 'push', when: '\\.py$', run: 'sleep 0.3' },
    ],
  });
  assert.match(sh(`node ${POORT} stats`, dir).stdout, /nog geen metingen/);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  sh(`node ${POORT} run push`, dir);
  sh(`node ${POORT} run push`, dir);
  const r = sh(`node ${POORT} stats --days 1`, dir);
  assert.equal(r.status, 0, r.stdout);
  const rows = r.stdout.split('\n').filter((l) => /^ {2}(snel|traag) /.test(l));
  assert.deepEqual(rows.map((l) => l.trim().split(/\s+/).slice(0, 3)), [
    ['traag', '1', '1'],
    ['snel', '1', '1'],
  ]);
});

// ---------- format-on-edit ----------

function formatRepo() {
  const dir = repo({ format: [{ when: '\\.txt$', run: 'sh fmt.sh {file}' }], checks: [{ id: 'x', tier: 'push', run: 'true' }] });
  fs.writeFileSync(path.join(dir, 'fmt.sh'), 'tr a-z A-Z < "$1" > "$1.tmp" && mv "$1.tmp" "$1"\n');
  fs.mkdirSync(path.join(dir, 'sub'));
  fs.writeFileSync(path.join(dir, 'sub', 'a.txt'), 'hallo\n');
  fs.writeFileSync(path.join(dir, 'b.md'), 'blijft\n');
  return dir;
}
const hook = (input, cwd) => spawnSync('node', [FORMAT], { cwd, input: JSON.stringify(input), encoding: 'utf8' });

test('format-on-edit: Claude Code en Cursor formatteren alleen wat een regel raakt; fout = exit 0', () => {
  const dir = formatRepo();
  let r = hook({ tool_input: { file_path: path.join(dir, 'sub', 'a.txt') }, cwd: dir }, dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(dir, 'sub', 'a.txt'), 'utf8'), 'HALLO\n');
  r = hook({ file_path: path.join(dir, 'b.md') }, dir);
  assert.equal(r.status, 0);
  assert.equal(fs.readFileSync(path.join(dir, 'b.md'), 'utf8'), 'blijft\n', 'geen regel: ongemoeid');
  fs.writeFileSync(path.join(dir, 'fmt.sh'), 'echo stuk >&2; exit 4\n');
  r = hook({ file_path: path.join(dir, 'sub', 'a.txt') }, dir);
  assert.equal(r.status, 0, 'een kapotte formatter blokkeert de agent nooit');
  assert.match(r.stderr, /poort format: sub\/a\.txt niet geformatteerd \(stuk\)/);
  assert.equal(hook({}, dir).status, 0);
});

test('init: koppelt format-on-edit alleen met "format" in de config, naast de PR-poort', () => {
  const dir = formatRepo();
  let r = sh(`node ${POORT} init --no-hooks`, dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /✓ format-on-edit in \.claude\/settings\.json \(Claude Code\)/);
  const claude = JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8'));
  assert.equal(claude.hooks.PostToolUse[0].matcher, 'Write|Edit|MultiEdit');
  assert.match(claude.hooks.PostToolUse[0].hooks[0].command, /format-on-edit\.mjs/);
  assert.match(JSON.stringify(claude.hooks.PreToolUse), /pr-gate\.mjs/);
  const cursor = JSON.parse(fs.readFileSync(path.join(dir, '.cursor', 'hooks.json'), 'utf8'));
  assert.match(cursor.hooks.afterFileEdit[0].command, /format-on-edit\.mjs/);
  r = sh(`node ${POORT} init --no-hooks`, dir);
  assert.match(r.stdout, /· format-on-edit staat al in \.claude\/settings\.json/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'settings.json'), 'utf8')).hooks.PostToolUse.length, 1);

  const plain = repo({ checks: [{ id: 'x', tier: 'push', run: 'true' }] });
  r = sh(`node ${POORT} init --no-hooks`, plain);
  assert.doesNotMatch(r.stdout, /format-on-edit/);
});

// ---------- doctor ----------

test('doctor: een check die hier niet hoort meldt geen ontbrekende tool; een die wel hoort wel', () => {
  const needs = { needs: 'command -v bestaat-niet-xyz', needsHint: 'installeer xyz' };
  const dir = repo({ checks: [{ id: 'web', tier: 'push', run: 'true', if: 'test -f tsconfig.json', ...needs }] });
  sh(`node ${POORT} init`, dir);
  let r = sh(`node ${POORT} doctor`, dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /! web: n\.v\.t\. hier \(test -f tsconfig\.json\)/);
  assert.doesNotMatch(r.stdout, /✗ web/);
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
  r = sh(`node ${POORT} doctor`, dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /✗ web: tool ontbreekt: installeer xyz/);
});

// ---------- config ----------

test('config: prepare en format worden gecontroleerd', () => {
  assert.throws(
    () =>
      normalizeConfig({
        slots: 0,
        prepare: [{ id: 'p', run: 'x' }],
        format: [{ when: '\\.py$', run: 'ruff format' }],
        checks: [],
      }),
    (e) => /prepare\[0\] \(p\): geef when/.test(e.message) && /format\[0\]: run mist \{file\}/.test(e.message) && /slots/.test(e.message),
  );
});
