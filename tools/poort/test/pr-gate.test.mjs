// PR-poort: herkent een PR zoals de shell hem ziet, en blokkeert zonder bewijs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { commands, prCommand, bodyFrom } from '../integrations/pr-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = path.join(ROOT, 'integrations', 'pr-gate.mjs');
const POORT = path.join(ROOT, 'poort.mjs');

test('commands: quotes weg, aan elkaar geplakte delen samen, scheidingstekens splitsen', () => {
  assert.deepEqual(commands(`gh pr "create" --body='twee woorden' && echo "a\\"b"; x`), [
    ['gh', 'pr', 'create', '--body=twee woorden'],
    ['echo', 'a"b'],
    ['x'],
  ]);
});

test('prCommand: ook gequote, via pad, met variabele; niet bij lezen of gh api', () => {
  for (const c of ['gh pr create --fill', 'gh pr "create"', "gh 'pr' new", '/opt/homebrew/bin/gh pr ready 12', 'env X=1 gh pr create', 'gh pr $SUB --fill', 'gh $CMD create', 'cd x && gh -R o/r pr create', 'gh pr `echo create`']) {
    assert.ok(prCommand(c), `herkend: ${c}`);
  }
  for (const c of ['gh pr list', 'gh pr view 12', 'gh pr --help', 'gh api "repos/$OWNER/x/pulls"', 'echo gh pr create is een tekst', 'ghx pr create']) {
    assert.equal(prCommand(c), null, `niet herkend: ${c}`);
  }
});

test('bodyFrom: --body met spaties, --body=, heredoc en --body-file', () => {
  const body = (c) => bodyFrom(c, prCommand(c), os.tmpdir());
  assert.equal(body(`gh pr create --body='twee woorden'`), 'twee woorden');
  assert.equal(body('gh pr create -b "a b c"'), 'a b c');
  assert.equal(body(`gh pr create --body "$(cat <<'EOF'\n## Gedrag\nregel\nEOF\n)"`), '## Gedrag\nregel');
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-body-')), 'b.md');
  fs.writeFileSync(f, 'uit bestand');
  assert.equal(body(`gh pr create --body-file ${f}`), 'uit bestand');
  assert.equal(body('gh pr create --fill'), null);
});

test('pr-gate: zonder bewijs geblokkeerd, ook gequote; andere gh-commando\'s vrij', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'poort-gate-')), 'repo');
  fs.mkdirSync(dir);
  const sh = (cmd) => spawnSync('sh', ['-c', cmd], { cwd: dir, encoding: 'utf8' });
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false');
  fs.writeFileSync(path.join(dir, 'p.json'), JSON.stringify({ checks: [{ id: 'unit', tier: 'push', when: '\\.py$', run: 'true' }] }));
  assert.equal(sh(`node ${POORT} init p.json --no-hooks`).status, 0);
  fs.writeFileSync(path.join(dir, 'a.py'), 'x = 1\n');
  sh('git add -A && git commit -q -m code');
  const gate = (command, cursor = false) =>
    spawnSync('node', [GATE], { cwd: dir, encoding: 'utf8', input: JSON.stringify(cursor ? { command, cwd: dir } : { tool_input: { command }, cwd: dir }) });

  let r = gate('gh pr "create" --title x --body y');
  assert.equal(r.status, 2, 'Claude Code: exit 2');
  assert.match(r.stderr, /PR geblokkeerd door poort[\s\S]*✗ unit/);
  r = gate('gh pr create --fill', true);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).permission, 'deny', 'Cursor: deny');
  assert.equal(gate('gh pr list').status, 0);
  assert.equal(JSON.parse(gate('git status', true).stdout).permission, 'allow');

  const run = spawnSync('node', [POORT, 'run', 'push'], { cwd: dir, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  r = gate('gh pr "create" --title x --body y');
  assert.equal(r.status, 0, `met bewijs voor de commit: door\n${run.stdout}\n${r.stderr}`);
});
