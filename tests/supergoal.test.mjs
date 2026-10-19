// supergoal: deliverable checks, per-phase snapshots that keep earlier uncommitted work, strict verdicts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, makeRepo, write, git, runScript } from './helpers.mjs';

const STATE = path.join(ROOT, 'skills/supergoal/scripts/repo-state.sh');
const state = (repo, ...args) => runScript('bash', [STATE, ...args], repo);
const read = (repo, rel) => fs.readFileSync(path.join(repo, rel), 'utf8');

test('deliverable: a deleted tracked file is missing', () => {
  const repo = makeRepo();
  const base = git(repo, 'rev-parse', 'HEAD').trim();
  fs.rmSync(path.join(repo, 'app.txt'));
  const res = state(repo, 'deliverable', base, 'app.txt');
  assert.equal(res.status, 1, res.stdout);
  assert.match(res.stdout, /missing/);
});

test('deliverable: a changed file is present', () => {
  const repo = makeRepo();
  const base = git(repo, 'rev-parse', 'HEAD').trim();
  write(repo, 'app.txt', 'changed\n');
  assert.equal(state(repo, 'deliverable', base, 'app.txt').status, 0);
});

test('deliverable: a new untracked file is present', () => {
  const repo = makeRepo();
  const base = git(repo, 'rev-parse', 'HEAD').trim();
  write(repo, 'src/new.js', 'export {};\n');
  assert.equal(state(repo, 'deliverable', base, 'src/new.js').status, 0);
});

test('deliverable: without a baseline, a deleted tracked file is missing', () => {
  const repo = makeRepo();
  fs.rmSync(path.join(repo, 'app.txt'));
  assert.equal(state(repo, 'deliverable', 'no-git', 'app.txt').status, 1);
});

test('snapshot leaves HEAD, index, working tree and stash untouched', () => {
  const repo = makeRepo();
  write(repo, 'app.txt', 'phase 1\n');
  write(repo, 'notes.md', 'untracked\n');
  const before = [git(repo, 'rev-parse', 'HEAD'), git(repo, 'status', '--porcelain'), git(repo, 'stash', 'list')];
  const res = state(repo, 'snapshot', '1');
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout.trim(), /^[0-9a-f]{40}$/);
  assert.deepEqual([git(repo, 'rev-parse', 'HEAD'), git(repo, 'status', '--porcelain'), git(repo, 'stash', 'list')], before);
});

test('rollback restores the phase start, keeping uncommitted work from earlier phases', () => {
  const repo = makeRepo();
  // Phase 1 leaves uncommitted work: a modified tracked file and a new untracked file.
  write(repo, 'app.txt', 'phase 1\n');
  write(repo, 'phase1.md', 'from phase 1\n');
  const snap = state(repo, 'snapshot', '2').stdout.trim();
  // Phase 2 changes both, adds a file, and deletes one.
  write(repo, 'app.txt', 'phase 2 broke this\n');
  write(repo, 'phase1.md', 'phase 2 edit\n');
  write(repo, 'phase2.md', 'new in phase 2\n');
  const res = state(repo, 'rollback', snap);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(read(repo, 'app.txt'), 'phase 1\n');
  assert.equal(read(repo, 'phase1.md'), 'from phase 1\n');
  assert.equal(fs.existsSync(path.join(repo, 'phase2.md')), false);
});

test('rollback of selected paths leaves other changes alone', () => {
  const repo = makeRepo();
  write(repo, 'keep.md', 'phase 1\n');
  const snap = state(repo, 'snapshot', '2').stdout.trim();
  write(repo, 'app.txt', 'phase 2\n');
  write(repo, 'keep.md', 'phase 2 keep\n');
  assert.equal(state(repo, 'rollback', snap, 'app.txt').status, 0);
  assert.equal(read(repo, 'app.txt'), 'hello\n');
  assert.equal(read(repo, 'keep.md'), 'phase 2 keep\n');
});

test('rollback brings back a file deleted in the phase and never touches .supergoal/', () => {
  const repo = makeRepo();
  write(repo, '.supergoal/STATE.md', 'phase 1\n');
  const snap = state(repo, 'snapshot', '2').stdout.trim();
  fs.rmSync(path.join(repo, 'app.txt'));
  write(repo, '.supergoal/STATE.md', 'phase 2 log\n');
  assert.equal(state(repo, 'rollback', snap).status, 0);
  assert.equal(read(repo, 'app.txt'), 'hello\n');
  assert.equal(read(repo, '.supergoal/STATE.md'), 'phase 2 log\n');
});

test('rollback refuses a ref that is not a snapshot', () => {
  const repo = makeRepo();
  assert.notEqual(state(repo, 'rollback', 'no-git').status, 0);
});

test('verdict rules: ACCEPT needs pass on every criterion', () => {
  const judge = fs.readFileSync(path.join(ROOT, 'skills/supergoal/prompts/phase-judge.md'), 'utf8');
  const format = fs.readFileSync(path.join(ROOT, 'skills/supergoal/references/goal-format.md'), 'utf8');
  for (const text of [judge, format]) {
    assert.doesNotMatch(text, /ACCEPT[^\n]*(pass[`]? (of|or) [`]?inconclusive)/i);
  }
  assert.match(judge, /Blocker:/);
});

test('snapshot of a phase that already has one returns the original anchor', () => {
  const repo = makeRepo();
  write(repo, 'app.txt', 'phase 1 done\n');
  const first = state(repo, 'snapshot', '2').stdout.trim();
  write(repo, 'app.txt', 'half of phase 2\n');
  const again = state(repo, 'snapshot', '2');
  assert.equal(again.status, 0, again.stderr);
  assert.equal(again.stdout.trim(), first);
});

test('rollback saves the current state first and prints how to undo it', () => {
  const repo = makeRepo();
  const snap = state(repo, 'snapshot', '2').stdout.trim();
  write(repo, 'app.txt', 'phase 2 work\n');
  write(repo, 'scratch.md', 'untracked phase 2 notes\n');
  const res = state(repo, 'rollback', snap);
  const undo = res.stdout.match(/undo: repo-state\.sh rollback ([0-9a-f]{40})/);
  assert.ok(undo, res.stdout);
  assert.equal(state(repo, 'rollback', undo[1]).status, 0);
  assert.equal(read(repo, 'app.txt'), 'phase 2 work\n');
  assert.equal(read(repo, 'scratch.md'), 'untracked phase 2 notes\n');
});

test('protocol states each verdict rule once', () => {
  const protocol = fs.readFileSync(path.join(ROOT, 'skills/supergoal/templates/PROTOCOL.md'), 'utf8');
  const flat = protocol.replace(/\s+/g, ' ');
  for (const rule of ['vereist `pass` op elk criterium', 'blijft is een `AUDIT_GAP`']) {
    assert.equal(flat.split(rule).length - 1, 1, rule);
  }
});

test('resuming a run keeps phase, baseline and phase anchors', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills/supergoal/SKILL.md'), 'utf8');
  const stage7 = skill.slice(skill.indexOf('## Stage 7'));
  const init = stage7.match(/^1\. .*$/m)[0];
  assert.match(init, /nieuwe run/i, init);
  assert.match(stage7, /Bij hervatten[^\n]*(ongemoeid|niet)[^\n]*`Current phase`/i);
});
