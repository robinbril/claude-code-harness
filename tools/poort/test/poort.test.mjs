import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeConfig, plan, ownsDir, checkKey, portOf, detectStack, fillWeb, VERSION, loadConfig, worktreeSlug, e2eEnv, e2eProviders, e2eProviderStatus, hostHasWorktree, expandWorktree, slugTwin, sameUrl } from '../poort.mjs';
import { setPolicySourcesForTests } from '../integrations/e2e-claude-seat.mjs';

const POORT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'poort.mjs');

// ---------- unit ----------

test('plan: alleen checks waarvan when een gewijzigd bestand raakt', () => {
  const cfg = normalizeConfig({
    checks: [
      { id: 'py', tier: 'commit', when: '\\.py$', run: 'true' },
      { id: 'ui', tier: 'commit', when: '^web/', run: 'true' },
      { id: 'later', tier: 'push', when: '.', run: 'true' },
    ],
  });
  const p = plan(cfg, { tier: 'commit', changed: ['docs/a.md', 'api/x.py'] });
  assert.deepEqual(
    p.map((x) => [x.check.id, x.action]),
    [
      ['py', 'run'],
      ['ui', 'idle'],
    ],
  );
  assert.deepEqual(p[0].hits, ['api/x.py']);
  const all = plan(cfg, { tier: 'commit', changed: [], all: true });
  assert.ok(all.every((x) => x.action === 'run'));
  const sk = plan(cfg, { tier: 'commit', changed: ['a.py'], skip: ['py'] });
  assert.equal(sk[0].action, 'skip');
});

test('plan: "all": false slaat een check over bij --all, niet bij een gewone run', () => {
  const cfg = normalizeConfig({ checks: [{ id: 'fixer', tier: 'commit', when: '.', run: 'true', all: false }] });
  assert.equal(plan(cfg, { tier: 'commit', changed: [], all: true })[0].action, 'skip');
  assert.equal(plan(cfg, { tier: 'commit', changed: ['a.txt'] })[0].action, 'run');
});

test('config: fouten worden allemaal tegelijk gemeld', () => {
  assert.throws(
    () => normalizeConfig({ checks: [{ id: 'a', tier: 'nope' }, { id: 'a', tier: 'commit', run: 'x', when: '(' }] }),
    (e) => e.code === 'CONFIG' && /tier/.test(e.message) && /dubbele id/.test(e.message) && /regex/.test(e.message),
  );
});

test('checkKey: hangt af van inhoud van geraakte bestanden en het commando', () => {
  const [c] = normalizeConfig({ checks: [{ id: 'py', tier: 'commit', when: '\\.py$', run: 'ruff' }] }).checks;
  const a = new Map([['x.py', 'aaa'], ['README.md', 'r1']]);
  const b = new Map([['x.py', 'aaa'], ['README.md', 'r2']]);
  const d = new Map([['x.py', 'bbb'], ['README.md', 'r1']]);
  assert.equal(checkKey(c, a), checkKey(c, b), 'niet-geraakt bestand verandert de sleutel niet');
  assert.notEqual(checkKey(c, a), checkKey(c, d));
  const [c2] = normalizeConfig({ checks: [{ id: 'py', tier: 'commit', when: '\\.py$', run: 'ruff --fix' }] }).checks;
  assert.notEqual(checkKey(c, a), checkKey(c2, a));
});

test('ownsDir: eigen worktree ja, buurworktree en geneste worktree nee', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-own-'));
  const top = path.join(root, 'repo');
  const nested = path.join(top, '.claude', 'worktrees', 'x');
  const sibling = path.join(root, 'repo-wt2');
  for (const d of [path.join(top, 'frontend'), nested, sibling]) fs.mkdirSync(d, { recursive: true });
  assert.equal(ownsDir(top, top, [top, nested, sibling]), true);
  assert.equal(ownsDir(top, path.join(top, 'frontend'), [top, nested, sibling]), true);
  assert.equal(ownsDir(top, sibling, [top, nested, sibling]), false);
  assert.equal(ownsDir(top, nested, [top, nested, sibling]), false);
});

test('portOf', () => {
  assert.equal(portOf('http://localhost:5180/x'), 5180);
  assert.equal(portOf('https://a.test'), 443);
});

// ---------- integratie: echte git-repo met echte hooks ----------

function sh(cmd, cwd, env = {}) {
  const r = spawnSync('sh', ['-c', cmd], { cwd, encoding: 'utf8', env: { ...process.env, ...env, CI: '', GITHUB_ACTIONS: '' } });
  // git stuurt hook-output naar stderr; voor de asserts tellen beide.
  return { ...r, stdout: r.stdout + r.stderr };
}

function fixture() {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-it-')), 'repo');
  fs.mkdirSync(dir);
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  fs.writeFileSync(
    path.join(dir, 'profile.json'),
    JSON.stringify({
      checks: [
        // faalt als een .py-bestand 'BOOM' bevat; telt uitvoeringen in een teller
        { id: 'nobomb', tier: 'commit', when: '\\.py$', files: true, run: 'echo x >> ../runs.txt; ! grep -l BOOM {files}' },
        { id: 'unit', tier: 'push', when: '\\.py$', run: 'echo y >> ../runs-push.txt; true' },
      ],
    }),
  );
  fs.writeFileSync(path.join(dir, 'README.md'), 'hi\n');
  sh('git add -A && git commit -q -m init', dir);
  const r = sh(`node ${POORT} init profile.json`, dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return dir;
}

const runs = (dir, f = 'runs.txt') => (fs.existsSync(path.join(dir, '..', f)) ? fs.readFileSync(path.join(dir, '..', f), 'utf8').split('\n').filter(Boolean).length : 0);

test('integratie: docs-only commit draait geen code-checks', () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'README.md'), 'nieuw\n');
  const r = sh('git add README.md && git commit -q -m docs', dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /niets te doen/);
  assert.equal(runs(dir), 0);
});

test('integratie: falende check blokkeert commit, met staart en logpad', () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'a.py'), 'BOOM = 1\n');
  const r = sh('git add a.py && git commit -q -m bad', dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /✗ nobomb/);
  assert.match(r.stdout, /│ a\.py/);
  assert.match(r.stdout, /log: +\.git\/poort\/logs\/nobomb\.log/);
  assert.ok(fs.existsSync(path.join(dir, '.git/poort/logs/nobomb.log')));
  assert.equal(sh('git log --oneline', dir).stdout.split('\n').filter(Boolean).length, 1, 'de foute commit mag niet bestaan');
});

test('integratie: groen, daarna cached; verify volgt de inhoud', () => {
  const dir = fixture();
  sh('git add -A && git commit -q -m poort --no-verify', dir);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  let r = sh(`node ${POORT} run push`, dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(runs(dir), 1);
  assert.equal(runs(dir, 'runs-push.txt'), 1);
  r = sh(`node ${POORT} run push`, dir);
  assert.match(r.stdout, /✓ nobomb +cached/);
  assert.match(r.stdout, /✓ unit +cached/);
  assert.equal(runs(dir), 1, 'tweede run voert niets opnieuw uit');
  r = sh('git add a.py && git commit -q -m a', dir);
  assert.equal(r.status, 0, r.stdout);
  assert.equal(runs(dir), 1, 'de commit-hook herkent dezelfde inhoud: cached');
  assert.equal(sh(`node ${POORT} verify`, dir).status, 0);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 2\n');
  sh('git commit -qam a2 --no-verify', dir);
  r = sh(`node ${POORT} verify`, dir);
  assert.equal(r.status, 1, 'na een nieuwe commit geen bewijs meer');
  assert.match(r.stdout, /✗ nobomb +geen groene receipt/);
});

test('verify: bewijs hoort bij de commit, niet bij een niet-gecommitte fix', () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'a.py'), 'BOOM = 1\n');
  sh('git add -A && git commit -q -m kapot --no-verify', dir);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n'); // de fix, niet gecommit
  assert.equal(sh(`node ${POORT} run push`, dir).status, 0);
  const r = sh(`node ${POORT} verify`, dir);
  assert.equal(r.status, 1, 'HEAD bevat nog BOOM: de PR-poort mag niet open\n' + r.stdout);
  assert.match(r.stdout, /niet-gecommitte wijzigingen tellen niet mee/);
});

test('integratie: commit-hook test de gestagede versie, niet de working tree', () => {
  const dir = fixture();
  sh('git add -A && git commit -q -m poort --no-verify', dir);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  sh('git add a.py', dir);
  fs.writeFileSync(path.join(dir, 'a.py'), 'BOOM = 1\n'); // niet gestaged
  const r = sh('git commit -q -m ok', dir);
  assert.equal(r.status, 0, 'gestagede versie is schoon: commit gaat door\n' + r.stdout + r.stderr);
  assert.equal(fs.readFileSync(path.join(dir, 'a.py'), 'utf8'), 'BOOM = 1\n', 'niet-gestagede wijziging is teruggezet');
});

test('integratie: POORT_SKIP slaat over en zegt dat', () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, 'a.py'), 'BOOM\n');
  const r = sh('git add a.py && git commit -q -m skip', dir, { POORT_SKIP: 'nobomb' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /↷ nobomb +overgeslagen: POORT_SKIP/);
});

test('integratie: bestaande hook wordt bewaard, init is idempotent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-hk-'));
  sh('git init -q -b main', dir);
  fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), '#!/bin/sh\necho oud\n', { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'p.json'), JSON.stringify({ checks: [] }));
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  assert.equal(fs.readFileSync(path.join(dir, '.git/hooks/pre-commit.pre-poort'), 'utf8'), '#!/bin/sh\necho oud\n');
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.equal(agents.match(/poort:start/g).length, 1);
});

test('init: registreert de e2e-MCP vastgepind op de eigen e2e-versie, zonder bestaande servers te slopen', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-mcp-'));
  sh('git init -q -b main', dir);
  fs.writeFileSync(path.join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { andere: { command: 'x' } } }));
  fs.mkdirSync(path.join(dir, 'web/node_modules/e2e'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'web/e2e.config.ts'), 'export default {}\n');
  fs.writeFileSync(path.join(dir, 'web/node_modules/e2e/package.json'), JSON.stringify({ name: 'e2e', version: '0.18.0' }));
  fs.writeFileSync(
    path.join(dir, 'p.json'),
    JSON.stringify({ checks: [{ id: 'e2e-replay', tier: 'commit', type: 'e2e', dir: 'web', when: '^web/' }] }),
  );
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0, 'idempotent');
  const claude = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
  assert.deepEqual(claude.mcpServers.e2e, { command: 'npx', args: ['-y', 'e2e@0.18.0', 'mcp', '--config', 'web/e2e.config.ts'] });
  assert.ok(claude.mcpServers.andere, 'bestaande server blijft');
  const cursor = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/mcp.json'), 'utf8'));
  assert.ok(cursor.mcpServers.e2e);
});

test('init: geen e2e-MCP als de e2e-check niet geldt; een ongepinde registratie wordt vastgepind (repro Polpo-review)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-mcp2-'));
  sh('git init -q -b main', dir);
  fs.writeFileSync(
    path.join(dir, 'p.json'),
    JSON.stringify({ checks: [{ id: 'e2e-replay', tier: 'push', type: 'e2e', dir: 'web', when: '^web/', if: 'test -f e2e.config.ts', ifHint: 'geen e2e-config' }] }),
  );
  fs.mkdirSync(path.join(dir, 'web'));
  const r = sh(`node ${POORT} init p.json --no-hooks`, dir);
  assert.match(r.stdout, /· e2e-MCP niet geregistreerd: de e2e-check geldt hier niet \(geen e2e-config\)/);
  assert.ok(!fs.existsSync(path.join(dir, '.mcp.json')) || !JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8')).mcpServers?.e2e);
  // Later wel e2e, met een oude ongepinde registratie: bijwerken naar de versie uit package.json.
  fs.writeFileSync(path.join(dir, 'web/e2e.config.ts'), 'export default {}\n');
  fs.writeFileSync(path.join(dir, 'web/package.json'), JSON.stringify({ devDependencies: { e2e: '^0.17.2' } }));
  fs.writeFileSync(path.join(dir, '.mcp.json'), JSON.stringify({ mcpServers: { e2e: { command: 'npx', args: ['-y', 'e2e', 'mcp'] } } }));
  const r2 = sh(`node ${POORT} init p.json --no-hooks`, dir);
  assert.match(r2.stdout, /✓ e2e-MCP in \.mcp\.json vastgepind op e2e@0\.17\.2/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8')).mcpServers.e2e.args[1], 'e2e@0.17.2');
});

test('init: koppelt de PR-poort aan Claude Code en Cursor, naast bestaande hooks, één keer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-gate-'));
  sh('git init -q -b main', dir);
  fs.mkdirSync(path.join(dir, '.cursor'));
  fs.writeFileSync(
    path.join(dir, '.cursor/hooks.json'),
    JSON.stringify({ version: 1, hooks: { beforeShellExecution: [{ command: 'node .cursor/hooks/oud.js' }] } }),
  );
  fs.writeFileSync(path.join(dir, 'p.json'), JSON.stringify({ checks: [] }));
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  const cursor = JSON.parse(fs.readFileSync(path.join(dir, '.cursor/hooks.json'), 'utf8'));
  assert.equal(cursor.hooks.beforeShellExecution.length, 2, 'oude hook blijft, poort één keer erbij');
  const claude = JSON.parse(fs.readFileSync(path.join(dir, '.claude/settings.json'), 'utf8'));
  assert.equal(claude.hooks.PreToolUse.length, 1);
  assert.match(claude.hooks.PreToolUse[0].hooks[0].command, /pr-gate\.mjs/);
});

test('hook: de vorige hook draait eerst mee, rood blokkeert; pre-push geeft beide de refs', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-chain-'));
  const dir = path.join(root, 'repo');
  sh(`git init -q --bare remote.git && git init -q -b main repo`, root);
  sh('git config user.email t@t.test && git config user.name t && git config commit.gpgsign false && git remote add origin ../remote.git', dir);
  fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), '#!/bin/sh\necho oud >> ../oud.txt\ntest ! -f STOP\n', { mode: 0o755 });
  fs.writeFileSync(path.join(dir, '.git/hooks/pre-push'), '#!/bin/sh\ncat > ../oud-stdin.txt\n', { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'p.json'), JSON.stringify({ checks: [{ id: 'unit', tier: 'push', when: '\\.txt$', run: 'echo y >> ../push.txt' }] }));
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'x\n');
  assert.equal(sh('git add -A && git commit -q -m x', dir).status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'oud.txt'), 'utf8'), 'oud\n', 'oude pre-commit draaide');
  fs.writeFileSync(path.join(dir, 'STOP'), '');
  assert.notEqual(sh('git add STOP && git commit -q -m stop', dir).status, 0, 'oude hook rood = commit geblokkeerd');
  sh('git rm -q --cached STOP && rm STOP', dir);
  const r = sh('git push -q origin main', dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(fs.readFileSync(path.join(root, 'oud-stdin.txt'), 'utf8'), /^refs\/heads\/main [0-9a-f]{40} refs\/heads\/main 0{40}/, 'oude pre-push kreeg de refs');
  assert.ok(fs.existsSync(path.join(root, 'push.txt')), 'poort kreeg de refs ook en draaide de push-check');
});

test('hook: pre-commit-framework draait niet dubbel als poort het al als check heeft', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-pcf-'));
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), '#!/bin/sh\n# File generated by pre-commit: https://pre-commit.com\necho FRAMEWORK\n', { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'p.json'), JSON.stringify({ checks: [{ id: 'pre-commit', tier: 'commit', when: '.', run: 'pre-commit run --files {files}', if: 'false' }] }));
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  fs.writeFileSync(path.join(dir, 'a.txt'), 'x\n');
  const r = sh('git add -A && git commit -q -m x', dir);
  assert.equal(r.status, 0, r.stdout);
  assert.doesNotMatch(r.stdout, /FRAMEWORK/);
});

test('init met husky: één regel in .husky/<hook>, niets in .husky/_, idempotent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-husky-'));
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false && git config core.hooksPath .husky/_', dir);
  fs.mkdirSync(path.join(dir, '.husky/_'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.husky/pre-commit'), 'npm test\n');
  fs.writeFileSync(path.join(dir, 'p.json'), JSON.stringify({ checks: [] }));
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  const pc = fs.readFileSync(path.join(dir, '.husky/pre-commit'), 'utf8');
  assert.match(pc, /^npm test\n\n# poort-hook\n\[ ! -f \.poort\/poort\.mjs \] \|\| node \.poort\/poort\.mjs hook pre-commit "\$@"\n$/);
  assert.match(fs.readFileSync(path.join(dir, '.husky/pre-push'), 'utf8'), /hook pre-push/);
  assert.deepEqual(fs.readdirSync(path.join(dir, '.husky/_')), []);
  assert.match(sh(`node ${POORT} doctor`, dir).stdout, /✓ hook pre-commit/);
});

test('hook: op een branch zonder .poort/ draait de vorige hook', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-fb-'));
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  fs.writeFileSync(path.join(dir, '.git/hooks/pre-commit'), '#!/bin/sh\necho OUDE-HOOK\nexit 0\n', { mode: 0o755 });
  fs.writeFileSync(path.join(dir, 'p.json'), JSON.stringify({ checks: [] }));
  assert.equal(sh(`node ${POORT} init p.json`, dir).status, 0);
  fs.rmSync(path.join(dir, '.poort'), { recursive: true }); // zoals een oudere branch
  fs.writeFileSync(path.join(dir, 'a.txt'), 'x\n');
  const r = sh('git add a.txt && git commit -q -m x', dir);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /OUDE-HOOK/);
});

test('init: weigert in de poort-repo zelf en schrijft niets zonder profiel', () => {
  const poortTop = path.dirname(POORT);
  const self = sh(`node ${POORT} init`, poortTop);
  assert.equal(self.status, 2);
  assert.match(self.stdout, /poort-repo zelf/);
  assert.ok(!fs.existsSync(path.join(poortTop, '.poort')), 'geen .poort/ in de bronrepo');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-np-'));
  sh('git init -q -b main', dir);
  assert.equal(sh(`node ${POORT} init`, dir).status, 2);
  assert.ok(!fs.existsSync(path.join(dir, '.poort')), 'mislukte init laat niets achter');
});

test('cli: werkt ook via een symlink (npx/npm-bin)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-bin-'));
  const link = path.join(dir, 'poort');
  fs.symlinkSync(POORT, link);
  const r = spawnSync('node', [link, '--version'], { encoding: 'utf8' });
  assert.equal(r.stdout.trim(), VERSION);
  assert.equal(JSON.parse(fs.readFileSync(path.join(path.dirname(POORT), 'package.json'), 'utf8')).version, VERSION, 'package.json en poort.mjs gelijk');
});

// ---------- needs: een ontbrekende tool is rood, nooit stil groen ----------

// Repo met een eigen poort.config.json, zonder init (geen hooks nodig voor `run`).
function cfgRepo(cfg, files = {}) {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-cfg-')), 'repo');
  fs.mkdirSync(dir);
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  fs.writeFileSync(path.join(dir, 'poort.config.json'), JSON.stringify(cfg));
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), s);
  // Zoals een gewone clone: de eerste commit staat op origin/main (de target).
  sh('git add -A && git commit -q -m init && git update-ref refs/remotes/origin/main HEAD', dir);
  return dir;
}

test('fullOn: een configwijziging laat een {files}-check op alle bestanden draaien', () => {
  const dir = cfgRepo(
    { checks: [{ id: 'lint', tier: 'push', when: '\\.py$', fullOn: '^lint\\.toml$', run: 'echo {files} >> ../args.txt' }] },
    { 'a.py': 'a\n', 'b.py': 'b\n', 'lint.toml': 'x\n' },
  );
  const args = () => fs.readFileSync(path.join(path.dirname(dir), 'args.txt'), 'utf8').trim().split('\n').pop();
  fs.writeFileSync(path.join(dir, 'a.py'), 'a2\n');
  assert.equal(sh(`node ${POORT} run push --only`, dir).status, 0);
  assert.equal(args(), 'a.py', 'gewone wijziging: alleen het gewijzigde bestand');
  sh('git commit -qam a2', dir);
  fs.writeFileSync(path.join(dir, 'lint.toml'), 'y\n');
  const r = sh(`node ${POORT} run push --only`, dir);
  assert.match(r.stdout, /✓ lint .* alle bestanden \(lint\.toml gewijzigd\)/);
  assert.equal(args(), 'a.py b.py', 'config gewijzigd: alles, maar het configbestand zelf niet als argument');
});

test('verify: een branch die een check niet raakt, eist er geen bewijs voor (docs-PR)', () => {
  const dir = cfgRepo({ checks: [{ id: 'unit', tier: 'push', when: '\\.py$', run: 'true' }] }, { 'a.py': 'x = 1\n' });
  sh('git checkout -q -b docs && echo docs > README.md && git add -A && git commit -q -m docs', dir);
  assert.match(sh(`node ${POORT} run push`, dir).stdout, /niets te doen/);
  const r = sh(`node ${POORT} verify`, dir);
  assert.equal(r.status, 0, 'run push had niets te doen, dus verify mag niets eisen\n' + r.stdout);
});

test('verify: verplichte stack-check zonder draaiende stack is geen bewijs', () => {
  const dir = cfgRepo({ checks: [{ id: 'api', tier: 'push', when: '\\.py$', run: 'true', stack: { url: 'http://localhost:59997', start: 'make up' } }] });
  sh('git checkout -q -b f && echo "x = 1" > a.py && git add -A && git commit -q -m code', dir);
  const r = sh(`node ${POORT} verify`, dir);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /✗ api +geen bewijs: geen stack op :59997 \(start: make up\).*"required": false/);
});

test('contentIndex: bestandsnaam met een newline breekt de run niet', () => {
  const dir = cfgRepo({ checks: [{ id: 'unit', tier: 'push', when: '\\.txt$', run: 'true' }] });
  fs.writeFileSync(path.join(dir, 'a\nb.txt'), 'x\n');
  const r = sh(`node ${POORT} run push --only`, dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /✓ unit/);
});

test('checkKey: {base} in run of usesBase maakt de base deel van de sleutel', () => {
  const blobs = new Map([['a.py', 'aaa']]);
  const [plain, withBase, flagged] = normalizeConfig({
    checks: [
      { id: 'p', tier: 'push', when: '\\.py$', run: 'lint' },
      { id: 'b', tier: 'push', when: '\\.py$', run: 'lint --since {base}' },
      { id: 'f', tier: 'push', when: '\\.py$', run: 'node ruff-new.mjs', usesBase: true },
    ],
  }).checks;
  assert.equal(checkKey(plain, blobs, 'b1'), checkKey(plain, blobs, 'b2'));
  assert.notEqual(checkKey(withBase, blobs, 'b1'), checkKey(withBase, blobs, 'b2'));
  assert.notEqual(checkKey(flagged, blobs, 'b1'), checkKey(flagged, blobs, 'b2'));
});

test('deleted: true geeft verwijderde bestanden mee in {files}, anders niet', () => {
  const dir = cfgRepo(
    {
      checks: [
        { id: 'lint', tier: 'push', when: '\\.py$', run: 'echo lint {files} >> ../args.txt' },
        { id: 'select', tier: 'push', when: '\\.py$', deleted: true, run: 'echo select {files} >> ../args.txt' },
      ],
    },
    { 'weg.py': 'x\n' },
  );
  sh('git rm -q weg.py', dir);
  const r = sh(`node ${POORT} run push --only`, dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /↷ lint +overgeslagen: geen bestaande bestanden/);
  assert.equal(fs.readFileSync(path.join(path.dirname(dir), 'args.txt'), 'utf8').trim(), 'select weg.py');
});

test('stale-branch uit het profiel blokkeert een echt conflict met de target-branch', () => {
  const profile = JSON.parse(fs.readFileSync(path.join(path.dirname(POORT), 'profiles', 'python.json'), 'utf8'));
  const check = profile.checks.find((c) => c.id === 'stale-branch');
  const dir = cfgRepo({ checks: [check] }, { 'f.txt': 'basis\n' });
  sh('git checkout -q -b feat && echo feat > f.txt && git commit -qam feat', dir);
  sh('git checkout -q main && echo main > f.txt && git commit -qam main && git update-ref refs/remotes/origin/main main && git checkout -q feat', dir);
  const r = sh(`node ${POORT} run push --only`, dir, { POORT_OFFLINE: '1' });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /Conflict met origin\/main \(1 commits achter\)/);
  assert.match(r.stdout, /│ +f\.txt/);
});

function needsRepo() {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-needs-')), 'repo');
  fs.mkdirSync(dir);
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  fs.writeFileSync(
    path.join(dir, 'p.json'),
    JSON.stringify({
      checks: [
        { id: 'lint', tier: 'push', when: '\\.py$', run: 'true', needs: 'command -v poort-tool-die-niet-bestaat', needsHint: 'installeer de tool' },
        { id: 'optioneel', tier: 'push', when: '\\.py$', run: 'true', if: 'test -f bestaat-niet.toml' },
      ],
    }),
  );
  sh('git add -A && git commit -q -m init', dir);
  assert.equal(sh(`node ${POORT} init p.json --no-hooks`, dir).status, 0);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  sh('git add -A && git commit -q -m code', dir);
  return dir;
}

test('needs: ontbrekende tool maakt run rood met de hint', () => {
  const dir = needsRepo();
  const r = sh(`node ${POORT} run push --all`, dir);
  assert.notEqual(r.status, 0, r.stdout);
  assert.match(r.stdout, /✗ lint/);
  assert.match(r.stdout, /tool ontbreekt \(command -v poort-tool-die-niet-bestaat\); installeer: installeer de tool/);
  assert.match(r.stdout, /↷ optioneel +overgeslagen: voorwaarde niet voldaan/, 'if blijft overslaan');
});

test('needs: verify opent de poort niet als de tool ontbreekt; if wel (n.v.t.)', () => {
  const dir = needsRepo();
  const r = sh(`node ${POORT} verify --json`, dir);
  assert.notEqual(r.status, 0, r.stdout);
  const json = JSON.parse(r.stdout); // alleen JSON, niets ervoor of erna
  assert.equal(json.ok, false);
  const { rows } = json;
  const byId = Object.fromEntries(rows.map((x) => [x.id, x]));
  assert.equal(byId.lint.ok, false);
  assert.match(byId.lint.reason, /tool ontbreekt: installeer de tool/);
  assert.equal(byId.optioneel.ok, null);
});

// ---------- generieke profielen: stack herkennen en {web} invullen ----------

function stackDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-stack-'));
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), '{}');
  }
  return dir;
}

test('detectStack: python, node, fullstack met webmap, en geen gok bij twee webapps', () => {
  assert.equal(detectStack(stackDir(['pyproject.toml'])).profile, 'python');
  assert.equal(detectStack(stackDir(['requirements-dev.txt'])).profile, 'python');
  assert.deepEqual(detectStack(stackDir(['package.json'])), { profile: 'node', web: '.', reason: 'package.json in de root', python: false, webDirs: [] });
  const full = detectStack(stackDir(['manage.py', 'frontend/package.json']));
  assert.equal(full.profile, 'fullstack');
  assert.equal(full.web, 'frontend');
  assert.equal(detectStack(stackDir(['pyproject.toml', 'a/package.json', 'b/package.json'])).profile, 'python');
  assert.equal(detectStack(stackDir(['README.md'])).profile, null);
});

test('fillWeb: {web} wordt de map, {web/} een regex-voorvoegsel', () => {
  const p = { cwd: '{web}', when: ['^{web/}src/'] };
  assert.deepEqual(fillWeb(p, '.'), { cwd: '.', when: ['^src/'] });
  assert.deepEqual(fillWeb(p, 'web.app'), { cwd: 'web.app', when: ['^web\\.app/src/'] });
});

test('init zonder profiel kiest fullstack en vult de webmap in', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-auto-')), 'repo');
  fs.mkdirSync(path.join(dir, 'web'), { recursive: true });
  sh('git init -q -b main', dir);
  fs.writeFileSync(path.join(dir, 'pyproject.toml'), '[project]\nname = "x"\n');
  fs.writeFileSync(path.join(dir, 'web/package.json'), '{}');
  const r = sh(`node ${POORT} init --no-hooks`, dir);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /uit fullstack\.json — herkend: Python \+ package\.json in web\//);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'poort.config.json'), 'utf8'));
  const typecheck = cfg.checks.find((c) => c.id === 'typecheck');
  assert.equal(typecheck.cwd, 'web');
  assert.ok(typecheck.when.every((w) => w.startsWith('^web/')), JSON.stringify(typecheck.when));
  assert.ok(!JSON.stringify(cfg).includes('{web'), 'geen placeholders over');
});

test('init fullstack met twee webapps: fout in plaats van stil de root; --web kiest de map (repro Polpo-review)', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-tweeweb-')), 'repo');
  for (const d of ['frontend-v4', 'tests']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  sh('git init -q -b main', dir);
  fs.writeFileSync(path.join(dir, 'frontend-v4/package.json'), '{}');
  fs.writeFileSync(path.join(dir, 'tests/package.json'), '{}');
  const fout = sh(`node ${POORT} init fullstack --no-hooks`, dir);
  assert.equal(fout.status, 2, fout.stdout);
  assert.match(fout.stdout, /meerdere mappen met een package\.json \(frontend-v4, tests\); kies de webapp met --web <map>/);
  assert.ok(!fs.existsSync(path.join(dir, 'poort.config.json')), 'niets geschreven');
  const goed = sh(`node ${POORT} init fullstack --web frontend-v4 --no-hooks`, dir);
  assert.equal(goed.status, 0, goed.stdout);
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'poort.config.json'), 'utf8'));
  assert.equal(cfg.checks.find((c) => c.id === 'typecheck').cwd, 'frontend-v4');
  assert.match(sh(`node ${POORT} init fullstack --web bestaat-niet --force --no-hooks`, dir).stdout, /--web bestaat-niet: daar staat geen package\.json/);
  // Een profiel direct via POORT_CONFIG: zelfde regel, met POORT_WEB als keuze.
  const prof = path.resolve(path.dirname(POORT), 'profiles', 'fullstack.json');
  const viaEnv = sh(`node ${POORT} doctor`, dir, { POORT_CONFIG: prof });
  assert.match(viaEnv.stdout, /meerdere \(frontend-v4, tests\): kies met POORT_WEB=<map>/);
  assert.doesNotMatch(sh(`node ${POORT} doctor`, dir, { POORT_CONFIG: prof, POORT_WEB: 'frontend-v4' }).stdout, /POORT_WEB/);
});

test("init: base uit de laatste gemergde PR's, --base wint, doctor toont hem (repro Polpo-review)", () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-base-')), 'repo');
  fs.mkdirSync(dir);
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git commit -q --allow-empty -m init', dir);
  sh('git update-ref refs/remotes/origin/acceptance HEAD && git update-ref refs/remotes/origin/main HEAD', dir);
  fs.writeFileSync(path.join(dir, 'pyproject.toml'), '[project]\nname = "x"\n');
  const gh = path.join(path.dirname(dir), 'gh');
  fs.writeFileSync(gh, '#!/bin/sh\nprintf "acceptance\\nacceptance\\nmain\\nacceptance\\n"\n', { mode: 0o755 });
  const r = sh(`node ${POORT} init --no-hooks`, dir, { POORT_GH: gh });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /✓ base: origin\/acceptance \(de meest gebruikte base van de laatste gemergde PR's\)/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'poort.config.json'), 'utf8')).base, 'origin/acceptance');
  assert.match(sh(`node ${POORT} doctor`, dir).stdout, /✓ base: origin\/acceptance \(config\)/);
  const eigen = sh(`node ${POORT} init --force --base origin/main --no-hooks`, dir, { POORT_GH: gh });
  assert.match(eigen.stdout, /✓ base: origin\/main\n/);
  // Bestaande config zonder base: alleen een melding, niets herschreven.
  const cfgFile = path.join(dir, 'poort.config.json');
  const zonder = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  delete zonder.base;
  fs.writeFileSync(cfgFile, JSON.stringify(zonder));
  const melding = sh(`node ${POORT} init --no-hooks`, dir, { POORT_GH: gh });
  assert.match(melding.stdout, /! base: PR's gaan naar origin\/acceptance, maar poort vergelijkt met origin\/main; zet "base": "origin\/acceptance"/);
  assert.equal(JSON.parse(fs.readFileSync(cfgFile, 'utf8')).base, undefined);
  assert.match(sh(`node ${POORT} doctor`, dir).stdout, /! base: origin\/main \(standaard\)/);
});

test('init zonder profiel en zonder herkenbare stack: duidelijke fout, niets geschreven', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-none-')), 'repo');
  fs.mkdirSync(dir);
  sh('git init -q -b main', dir);
  const r = sh(`node ${POORT} init --no-hooks`, dir);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /geen stack herkend/);
  assert.ok(!fs.existsSync(path.join(dir, 'poort.config.json')));
  assert.ok(!fs.existsSync(path.join(dir, '.poort')));
});

test('typecheck: eigen script, anders --build bij references, anders --noEmit', () => {
  const TC = path.join(path.dirname(POORT), 'checks', 'typecheck.mjs');
  const app = (pkg, tsconfig) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-tc-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg));
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), tsconfig);
    fs.mkdirSync(path.join(dir, 'node_modules', '.bin'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', '.bin', 'tsc'), '#!/bin/sh\necho "tsc $*"\n', { mode: 0o755 });
    return dir;
  };
  let r = sh(`node ${TC}`, app({ scripts: { typecheck: 'echo eigen; exit 3' } }, '{}'));
  assert.equal(r.status, 3, 'exitcode van het eigen script');
  assert.match(r.stdout, /npm run -s typecheck\neigen/);
  r = sh(`node ${TC}`, app({}, '{ // vite\n "files": [],\n "references": [ { "path": "./tsconfig.app.json" } ] }'));
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /tsc --build/);
  r = sh(`node ${TC}`, app({}, '{ "compilerOptions": {} }'));
  assert.match(r.stdout, /tsc --noEmit/);
});

test('meegeleverde bestanden: geen hex-hash zonder pragma (detect-secrets blokkeert anders .poort/)', () => {
  const root = path.dirname(POORT);
  const files = ['poort.mjs', ...['checks', 'integrations'].flatMap((d) => fs.readdirSync(path.join(root, d)).map((f) => path.join(d, f)))];
  for (const f of files) {
    fs.readFileSync(path.join(root, f), 'utf8')
      .split('\n')
      .forEach((l, i) => assert.ok(!/\b[0-9a-f]{40}\b/.test(l) || l.includes('pragma: allowlist secret'), `${f}:${i + 1} mist "pragma: allowlist secret"`));
  }
});

test('profielen: vitest draait de hele suite bij een lockfile- of configwijziging, anders "related" (repro Polpo-review)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-vitest-'));
  fs.mkdirSync(path.join(dir, 'bin'));
  fs.writeFileSync(path.join(dir, 'bin/npx'), '#!/bin/sh\necho "NPX $*"\n', { mode: 0o755 });
  for (const name of ['node', 'fullstack']) {
    const cfg = JSON.parse(fs.readFileSync(path.resolve(path.dirname(POORT), 'profiles', `${name}.json`), 'utf8'));
    const vitest = cfg.checks.find((c) => c.id === 'vitest');
    const when = [].concat(vitest.when).map((w) => new RegExp(w.replaceAll('{web/}', '')));
    assert.ok(when.some((re) => re.test('package-lock.json')), `${name}: lockfile in when`);
    assert.ok(when.some((re) => re.test('vitest.config.ts')), `${name}: vitest-config in when`);
    const run = (files) => sh(vitest.run.replaceAll('{files}', files.map((f) => `'${f}'`).join(' ')), dir, { PATH: `${path.join(dir, 'bin')}:${process.env.PATH}` }).stdout;
    assert.match(run(['src/a.ts', 'package-lock.json']), /NPX --no-install vitest run --passWithNoTests/);
    assert.match(run(['src/a.ts']), /NPX --no-install vitest related --run --passWithNoTests src\/a\.ts/);
  }
});

test('profielen: geldig, en een tool staat in needs, nooit in if', () => {
  const dir = path.join(path.dirname(POORT), 'profiles');
  const names = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  assert.deepEqual(names, ['fullstack.json', 'node.json', 'python.json']);
  for (const f of names) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    normalizeConfig(fillWeb(structuredClone(raw), 'web'));
    for (const c of [...raw.checks, ...(raw.prepare || [])]) {
      assert.ok(!(c.if && /command -v|node_modules\/\.bin/.test(c.if)), `${f} ${c.id}: een tool hoort in needs, niet in if`);
      // Een overgeslagen check moet in gewone taal zeggen waarom.
      if (c.if && raw.checks.includes(c)) assert.ok(c.ifHint, `${f} ${c.id}: ifHint ontbreekt`);
      assert.doesNotMatch(c.run || '', /stale-branch\.mjs \{base\}/, `${f} ${c.id}: stale-branch wil een branchnaam, geen merge-base`);
    }
  }
});

// ---------- 0.4.0: {worktree} en de e2e-provider in doctor ----------

test('worktreeSlug: mapnaam als hostnaam-veilige slug', () => {
  assert.equal(worktreeSlug('/x/Poort_Seat--Feat.2'), 'poort-seat-feat-2');
  assert.equal(worktreeSlug('/x/-Ünïcode  map-'), 'n-code-map');
  assert.equal(worktreeSlug('/x/___'), 'worktree');
});

test('hostHasWorktree: alleen {worktree} in de echte hostnaam geeft byName', () => {
  const byName = (url) => expandWorktree(normalizeConfig({ checks: [{ id: 'a', tier: 'push', run: 'true', stack: { url } }] }), '/x/repo').checks[0].stack[0].byName === true;
  for (const url of ['http://{worktree}.localhost:3000', 'https://{worktree}-api.localhost', 'http://app.{worktree}.test:8080/pad?x=1']) {
    assert.ok(hostHasWorktree(url), url);
    assert.ok(byName(url), url);
  }
  for (const url of [
    'http://localhost:3000?owner={worktree}', // query
    'http://localhost:3000/#{worktree}', // fragment
    'http://localhost:3000/{worktree}/', // pad
    'http://{worktree}@localhost:3000', // userinfo
    'http://u:{worktree}@localhost:3000', // wachtwoord
    'http://localhost:{worktree}', // poort: geen geldige URL
    'http://localhost:3000',
    // Een hostnaam die toevallig op een interne markering lijkt, met {worktree} alleen in het pad.
    'http://poortwta.localhost/{worktree}',
    'http://poortwtb.localhost/{worktree}',
    'http://poortwtsentinel0.localhost/{worktree}',
  ]) {
    assert.equal(hostHasWorktree(url), false, url);
    assert.equal(byName(url), false, url);
  }
});

test('{worktree}: zelfde slug in een andere worktree van de repo, dan geen herkomst op naam', () => {
  const dir = cfgRepo({ checks: [{ id: 'flow', type: 'e2e', tier: 'push', when: '.', cache: false, run: 'true', stack: { url: 'http://{worktree}.localhost:59995' } }] });
  // /a/repo en /b/Repo worden allebei "repo".
  const twin = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-twin-')), 'Repo');
  sh(`git worktree add -q -b twin "${twin}"`, dir);
  assert.equal(fs.realpathSync(slugTwin(dir, [dir, twin])), fs.realpathSync(twin));
  assert.equal(slugTwin(dir, [dir, path.join(path.dirname(twin), 'anders')]), null);
  const r = sh(`node ${POORT} run push --all`, dir, { E2E_BASE_URL: '' });
  // Zoals elke stack zonder herkomst: overgeslagen, dus geen groen bewijs.
  assert.doesNotMatch(r.stdout, /✓ flow/);
  assert.match(r.stdout, /↷ flow .*\{worktree\} is "repo", net als bij .*Repo; herkomst niet eenduidig/);
});

test('{worktree} in stack.url en stack.start; e2eEnv geeft het adres door', () => {
  const dir = cfgRepo({ checks: [{ id: 'api', tier: 'push', when: '\\.py$', run: 'true', stack: { url: 'http://{worktree}.localhost:59996', start: 'make up NAME={worktree}' } }] });
  const cfg = loadConfig(dir);
  assert.equal(cfg.checks[0].stack[0].url, 'http://repo.localhost:59996');
  assert.equal(cfg.checks[0].stack[0].start, 'make up NAME=repo');
  sh('git checkout -q -b f && echo "x = 1" > a.py && git add -A && git commit -q -m code', dir);
  assert.match(sh(`node ${POORT} verify`, dir).stdout, /geen stack op http:\/\/repo\.localhost:59996 \(start: make up NAME=repo\)/);

  const [e] = normalizeConfig({ checks: [{ id: 'e2e', type: 'e2e', tier: 'push', stack: { url: 'http://x.localhost:1' } }] }).checks;
  assert.deepEqual(e2eEnv(e, {}), { E2E_BASE_URL: 'http://x.localhost:1' });
  assert.deepEqual(e2eEnv(e, { E2E_BASE_URL: 'http://eigen' }), {}, 'zelf gezet wint');
  const [plain] = normalizeConfig({ checks: [{ id: 'u', tier: 'push', run: 'true', stack: { url: 'http://a:1' } }] }).checks;
  assert.deepEqual(e2eEnv(plain, {}), {}, 'alleen e2e-checks');
});

test('{worktree}: een e2e-check tegen de eigen stack krijgt het ingevulde adres als E2E_BASE_URL', async () => {
  const dir = cfgRepo({ checks: [] });
  // Een server met deze repo als werkmap: de provenance-check herkent hem als eigen stack.
  const srv = spawn(process.execPath, ['-e', "const s=require('http').createServer((q,r)=>r.end('ok')).listen(0,'127.0.0.1',()=>console.log(s.address().port))"], { cwd: dir });
  try {
    const port = await new Promise((res) => srv.stdout.once('data', (d) => res(Number(String(d).trim()))));
    fs.writeFileSync(
      path.join(dir, 'poort.config.json'),
      JSON.stringify({ checks: [{ id: 'flow', type: 'e2e', tier: 'push', when: '.', cache: false, run: 'echo "$E2E_BASE_URL {worktree}" > ../base.txt', stack: { url: `http://{worktree}.localhost:${port}` } }] }),
    );
    const r = sh(`node ${POORT} run push --all`, dir, { E2E_BASE_URL: '' });
    assert.equal(r.status, 0, r.stdout);
    assert.equal(fs.readFileSync(path.join(dir, '..', 'base.txt'), 'utf8').trim(), `http://repo.localhost:${port} repo`);
  } finally {
    srv.kill();
  }
});

test('E2E_BASE_URL naar een andere stack dan de gecontroleerde: geen groen bewijs', async () => {
  // Twee stacks: de eigen (gecontroleerd) en een vreemde (bijv. die van main).
  const elders = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-vreemd-'));
  const serve = (cwd) => spawn(process.execPath, ['-e', "const s=require('http').createServer((q,r)=>r.end('ok')).listen(0,'127.0.0.1',()=>console.log(s.address().port))"], { cwd });
  const dir = cfgRepo({ checks: [] });
  const eigen = serve(dir);
  const vreemd = serve(elders);
  try {
    const port = (p) => new Promise((res) => p.stdout.once('data', (d) => res(Number(String(d).trim()))));
    const [own, foreign] = [await port(eigen), await port(vreemd)];
    fs.writeFileSync(
      path.join(dir, 'poort.config.json'),
      // Met cache: een eerder groen bewijs mag een afwijkende URL niet dekken.
      JSON.stringify({ checks: [{ id: 'flow', type: 'e2e', tier: 'push', when: '.', run: 'echo "$E2E_BASE_URL" > ../ran.txt', stack: { url: `http://{worktree}.localhost:${own}` } }] }),
    );
    const ran = path.join(dir, '..', 'ran.txt');
    // Dezelfde stack (ook met een slash erachter): gewoon groen, met een receipt.
    const ok = sh(`node ${POORT} run push --all`, dir, { E2E_BASE_URL: `http://repo.localhost:${own}/` });
    assert.match(ok.stdout, /✓ flow/, ok.stdout);
    fs.rmSync(ran);
    // Daarna een vreemde stack: ook dat eerdere groene bewijs telt niet.
    const r = sh(`node ${POORT} run push --all`, dir, { E2E_BASE_URL: `http://127.0.0.1:${foreign}` });
    assert.doesNotMatch(r.stdout, /✓ flow/);
    assert.match(r.stdout, /↷ flow .*E2E_BASE_URL wijst naar een andere stack dan de gecontroleerde/);
    assert.equal(fs.existsSync(ran), false, 'e2e niet gedraaid tegen de vreemde stack');
  } finally {
    eigen.kill();
    vreemd.kill();
  }
});

test('{worktree}-host: redirect naar een andere host of een andere X-Poort-Worktree is niet van deze worktree', async () => {
  // Een gedeelde proxy met de valkuilen van een echte: doorsturen naar main,
  // een wildcard die main serveert, en een stack die zich netjes meldt.
  const elders = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-proxy-'));
  const code = `const s=require('http').createServer((q,r)=>{const p=q.url;
    if(p==='/redir'){r.writeHead(302,{location:'http://main.localhost:'+s.address().port+'/'});return r.end()}
    if(p==='/binnen'){r.writeHead(302,{location:'/goed'});return r.end()}
    if(p==='/wild'){r.writeHead(200,{'x-poort-worktree':'main'});return r.end()}
    if(p==='/goed'){r.writeHead(200,{'x-poort-worktree':'repo'});return r.end()}
    r.writeHead(200);r.end()}).listen(0,'127.0.0.1',()=>console.log(s.address().port))`;
  const srv = spawn(process.execPath, ['-e', code], { cwd: elders });
  try {
    const port = await new Promise((res) => srv.stdout.once('data', (d) => res(Number(String(d).trim()))));
    const check = (id, p) => ({ id, type: 'e2e', tier: 'push', when: '.', cache: false, run: 'true', stack: { url: `http://{worktree}.localhost:${port}${p}` } });
    const dir = cfgRepo({ checks: [check('redir', '/redir'), check('binnen', '/binnen'), check('wild', '/wild'), check('goed', '/goed'), check('kaal', '/kaal')] });
    const r = sh(`node ${POORT} run push --all`, dir, { E2E_BASE_URL: '' });
    assert.match(r.stdout, /↷ redir .*redirect naar een andere host \(http:\/\/main\.localhost:\d+\/\)/, r.stdout);
    assert.match(r.stdout, /✓ binnen/, 'redirect binnen dezelfde host mag');
    assert.match(r.stdout, /↷ wild .*meldt X-Poort-Worktree "main", niet "repo"/);
    assert.match(r.stdout, /✓ goed/);
    assert.match(r.stdout, /✓ kaal/, 'zonder header: alleen de naam (gedocumenteerde grens)');
  } finally {
    srv.kill();
  }
});

test('sameUrl: query en fragment tellen mee (routering per query), een slash aan het eind niet', () => {
  assert.equal(sameUrl('http://f.localhost/app?backend=feature', 'http://f.localhost/app?backend=main'), false);
  assert.equal(sameUrl('http://f.localhost/app?backend=feature', 'http://f.localhost/app/?backend=feature'), true);
  assert.equal(sameUrl('http://f.localhost/#/a', 'http://f.localhost/#/b'), false);
  assert.equal(sameUrl('http://F.localhost:80/x/', 'http://f.localhost/x'), true);
  assert.equal(sameUrl('http://f.localhost/', 'http://g.localhost/'), false);
});

test('receipts: twee worktrees met dezelfde inhoud maar een eigen {worktree}-host delen geen groen bewijs', async () => {
  // Eén proxy die alleen de stack van worktree A kent (repo.localhost).
  const elders = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-proxy-'));
  const srv = spawn(
    process.execPath,
    ['-e', "const s=require('http').createServer((q,r)=>{r.statusCode=/^repo\\.localhost/.test(q.headers.host)?200:404;r.end()}).listen(0,'127.0.0.1',()=>console.log(s.address().port))"],
    { cwd: elders },
  );
  try {
    const port = await new Promise((res) => srv.stdout.once('data', (d) => res(Number(String(d).trim()))));
    // flow: e2e met stack (E2E_BASE_URL); api: gewone check met stack (alleen het
    // stack-adres); cmd: geen stack, alleen {worktree} in het commando.
    const a = cfgRepo({
      checks: [
        { id: 'flow', type: 'e2e', tier: 'push', when: '.', run: 'true', stack: { url: `http://{worktree}.localhost:${port}` } },
        { id: 'api', tier: 'push', when: '.', run: 'true', stack: { url: `http://{worktree}.localhost:${port}/api` } },
        { id: 'cmd', tier: 'push', when: '.', run: 'test "{worktree}" = repo' },
      ],
    });
    const ra = sh(`node ${POORT} run push --all`, a, { E2E_BASE_URL: '' });
    for (const id of ['flow', 'api', 'cmd']) assert.match(ra.stdout, new RegExp(`✓ ${id}`), ra.stdout);
    // Worktree B van dezelfde repo, zelfde commit, andere naam: wtb.localhost.
    const b = path.join(path.dirname(a), 'wtb');
    sh(`git worktree add -q -b wtb "${b}"`, a);
    const rb = sh(`node ${POORT} run push --all`, b, { E2E_BASE_URL: '' });
    for (const id of ['flow', 'api', 'cmd']) assert.doesNotMatch(rb.stdout, new RegExp(`✓ ${id}`), `geen bewijs van A voor B (${id}): ${rb.stdout}`);
    assert.match(rb.stdout, /geen stack op http:\/\/wtb\.localhost:\d+ \(HTTP 404\)/);
    assert.match(rb.stdout, /✗ cmd/, 'cmd draait echt in B, met wtb, en faalt');
    // A zelf houdt zijn bewijs: opnieuw draaien is een cache-treffer.
    assert.match(sh(`node ${POORT} run push --all`, a, { E2E_BASE_URL: '' }).stdout, /✓ flow/);
  } finally {
    srv.kill();
  }
});

test('{worktree} in de hostnaam: herkomst volgt uit de naam, ook achter een gedeelde proxypoort', async () => {
  // Eén "proxy" voor alle worktrees, gestart vanuit een andere map: op poort-
  // herkomst zou poort hem als vreemd zien. Hij kent alleen repo.localhost.
  const elders = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-proxy-'));
  const srv = spawn(
    process.execPath,
    ['-e', "const s=require('http').createServer((q,r)=>{r.statusCode=/^repo\\.localhost/.test(q.headers.host)?200:404;r.end()}).listen(0,'127.0.0.1',()=>console.log(s.address().port))"],
    { cwd: elders },
  );
  try {
    const port = await new Promise((res) => srv.stdout.once('data', (d) => res(Number(String(d).trim()))));
    const check = (url) => [{ id: 'flow', type: 'e2e', tier: 'push', when: '.', cache: false, run: 'true', stack: { url } }];
    const eigen = cfgRepo({ checks: check(`http://{worktree}.localhost:${port}`) });
    const r = sh(`node ${POORT} run push --all`, eigen, { E2E_BASE_URL: '' });
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /✓ flow/);

    // Zelfde proxy, maar deze worktree hangt er niet achter: 404, dus geen stack.
    const ander = cfgRepo({ checks: check(`http://{worktree}-b.localhost:${port}`) });
    const r2 = sh(`node ${POORT} run push --all`, ander, { E2E_BASE_URL: '' });
    assert.match(r2.stdout, /geen stack op http:\/\/repo-b\.localhost:\d+ \(HTTP 404\)/);

    // Zonder {worktree} in de hostnaam blijft de poort-herkomst gelden: vreemde stack.
    const vast = cfgRepo({ checks: check(`http://localhost:${port}`) });
    assert.match(sh(`node ${POORT} run push --all`, vast, { E2E_BASE_URL: '' }).stdout, /niet van deze worktree|herkomst niet vast te stellen/);
  } finally {
    srv.kill();
  }
});

test('doctor: herkent de e2e-provider uit de config; onbekend is "niet gecontroleerd", nooit rood', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-prov-'));
  const write = (s) => fs.writeFileSync(path.join(dir, 'e2e.config.ts'), s);
  write("import { chatgpt } from 'e2e/oauth/chatgpt';\nimport { claudeSeat } from '../.poort/integrations/e2e-claude-seat.mjs';\nimport { openai } from '@ai-sdk/openai';");
  assert.deepEqual(e2eProviders(dir).map((p) => p.kind), ['chatgpt', 'claude-seat', 'key']);
  write("import { grok } from 'e2e/oauth/grok';");
  assert.deepEqual(e2eProviders(dir), [{ kind: 'unknown', why: 'e2e/oauth/grok' }]);
  write('export default {}');
  const unk = e2eProviderStatus(e2eProviders(dir)[0]);
  assert.equal(unk.ok, null);
  assert.match(unk.msg, /niet gecontroleerd/);

  const key = { kind: 'key', name: 'OpenAI', env: 'OPENAI_API_KEY' };
  assert.equal(e2eProviderStatus(key, { OPENAI_API_KEY: 'x' }).ok, true);
  assert.equal(e2eProviderStatus(key, {}).ok, null);

  // Claude-seat: `claude auth status`, met dezelfde env als de integratie (zonder API-sleutel).
  const bin = path.join(dir, 'claude');
  fs.writeFileSync(
    bin,
    // De nep-claude leest zijn antwoord uit fake.env naast zich: de integratie geeft
    // alleen een allowlist van variabelen door (dus ook geen ANTHROPIC_API_KEY).
    `#!/bin/sh\necho "$@" > "${dir}/args"\n. "${dir}/fake.env"\nif [ -n "$ANTHROPIC_API_KEY" ]; then echo '{"loggedIn":true,"authMethod":"api_key","apiProvider":"firstParty"}'; else echo "{\\"loggedIn\\":$IN,\\"authMethod\\":\\"\${METHOD:-claude.ai}\\",\\"apiProvider\\":\\"\${PROVIDER:-firstParty}\\"}"; fi\n`,
    { mode: 0o755 },
  );
  const seat = { kind: 'claude-seat' };
  // Geen echte token of systeembeleid van deze machine in de test: een lege
  // nepmap via de testnaad, en een minimale, synthetische env.
  const managed = fs.mkdtempSync(path.join(os.tmpdir(), 'poort-managed-'));
  setPolicySourcesForTests({ dir: managed, plists: [], registry: false });
  const base = { PATH: '/usr/bin:/bin', HOME: dir, CLAUDE_BIN: bin, CLAUDE_CODE_OAUTH_TOKEN: '', POORT_CLAUDE_SEAT_TOKEN_FILE: '/bestaat/niet' };
  const nep = (vars) => fs.writeFileSync(path.join(dir, 'fake.env'), Object.entries({ IN: 'true', METHOD: '', PROVIDER: '', ...vars }).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  const status = (vars = {}, env = {}) => (nep(vars), e2eProviderStatus(seat, { ...base, ...env }));
  const yes = status({}, { ANTHROPIC_API_KEY: 'sk' });
  assert.equal(yes.ok, true);
  assert.match(yes.msg, /ingelogd via claude\.ai/);
  assert.match(yes.msg, /via de server uitrolt, is lokaal niet te controleren/, 'doctor noemt het voorbehoud');
  // Met dezelfde isolatie als de opname: instellingen en MCP uit, vóór het subcommando.
  assert.equal(fs.readFileSync(path.join(dir, 'args'), 'utf8').trim(), '--setting-sources  --strict-mcp-config --safe-mode auth status --json');
  const no = status({ IN: 'false' }, { ANTHROPIC_API_KEY: 'sk' });
  assert.equal(no.ok, null);
  assert.match(no.msg, /claude setup-token/);
  assert.equal(status({}, { CLAUDE_BIN: path.join(dir, 'weg') }).ok, null);

  // Ingelogd is niet genoeg: alleen een abonnement telt, anders ✗ met de reden.
  for (const [extra, re] of [
    [{ METHOD: 'api_key' }, /authMethod is api_key/],
    [{ METHOD: 'api_key_helper' }, /authMethod is api_key_helper/],
    [{ METHOD: 'third_party', PROVIDER: 'bedrock' }, /apiProvider is bedrock/],
    [{ METHOD: 'oauth_token' }, /niet uit CLAUDE_CODE_OAUTH_TOKEN/],
  ]) {
    const r = status(extra);
    assert.equal(r.ok, false, JSON.stringify(extra));
    assert.match(r.msg, re);
  }
  // Een sleutel in een auth-veld komt nooit in de doctor-uitvoer.
  const lek = status({ METHOD: 'sk-ant-api03-DOCTORLEKLEK' });
  assert.equal(lek.ok, false);
  assert.ok(!lek.msg.includes('DOCTORLEKLEK'), lek.msg);
  const token = status({ METHOD: 'oauth_token' }, { CLAUDE_CODE_OAUTH_TOKEN: 'seat' });
  assert.equal(token.ok, true);
  assert.match(token.msg, /CLAUDE_CODE_OAUTH_TOKEN/);
  // Beheerd beleid met hooks: ✗, net als de opname zelf, en dat vóór er een
  // claude-kind start (een beheerde env of hook zou dat kind al raken).
  fs.writeFileSync(path.join(managed, 'managed-settings.json'), JSON.stringify({ hooks: { SessionStart: [] } }));
  fs.rmSync(path.join(dir, 'args'));
  const pol = status();
  assert.equal(pol.ok, false);
  assert.match(pol.msg, /beheerde .*managed-settings\.json zet hooks/);
  assert.equal(fs.existsSync(path.join(dir, 'args')), false, 'claude niet gestart');
  setPolicySourcesForTests(null);
  fs.rmSync(managed, { recursive: true, force: true });
  fs.rmSync(dir, { recursive: true, force: true });
});

test('init: vendort de Claude-seat-integratie mee', () => {
  const dir = fixture();
  assert.ok(fs.existsSync(path.join(dir, '.poort', 'integrations', 'e2e-claude-seat.mjs')));
});
