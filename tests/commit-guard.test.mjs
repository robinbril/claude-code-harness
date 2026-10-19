// commit-guard must scan what the commit command will actually record, in the repo it targets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRepo, write, git, runHook, FAKE_SECRET } from './helpers.mjs';

const HOOK = 'hooks/commit-guard.js';
const bash = (command, cwd) => ({ tool_name: 'Bash', tool_input: { command }, cwd });

test('blocks a staged secret (baseline)', () => {
  const repo = makeRepo();
  write(repo, 'config.js', `const key = "${FAKE_SECRET}";\n`);
  git(repo, 'add', 'config.js');
  assert.equal(runHook(HOOK, bash('git commit -m add', repo), repo).status, 2);
});

test('passes a clean commit', () => {
  const repo = makeRepo();
  write(repo, 'app.txt', 'hello again\n');
  git(repo, 'add', 'app.txt');
  assert.equal(runHook(HOOK, bash('git commit -m ok', repo), repo).status, 0);
});

test('git commit -a: blocks a secret in an unstaged tracked change', () => {
  const repo = makeRepo();
  write(repo, 'app.txt', `token = "${FAKE_SECRET}"\n`);
  assert.equal(runHook(HOOK, bash('git commit -am wip', repo), repo).status, 2);
});

test('git commit --all: same as -a', () => {
  const repo = makeRepo();
  write(repo, 'app.txt', `token = "${FAKE_SECRET}"\n`);
  assert.equal(runHook(HOOK, bash('git commit --all -m wip', repo), repo).status, 2);
});

test('git commit <path>: blocks a secret in the named, unstaged file', () => {
  const repo = makeRepo();
  write(repo, 'app.txt', `token = "${FAKE_SECRET}"\n`);
  assert.equal(runHook(HOOK, bash('git commit -m wip app.txt', repo), repo).status, 2);
});

test('git -C <repo>: scans the target repo, not the hook cwd', () => {
  const clean = makeRepo();
  const target = makeRepo();
  write(target, 'config.js', `const key = "${FAKE_SECRET}";\n`);
  git(target, 'add', 'config.js');
  assert.equal(runHook(HOOK, bash(`git -C ${target} commit -m add`, clean), clean).status, 2);
});

test('cd <repo> && git commit: scans the repo the command moves into', () => {
  const clean = makeRepo();
  const target = makeRepo();
  write(target, 'config.js', `const key = "${FAKE_SECRET}";\n`);
  git(target, 'add', 'config.js');
  assert.equal(runHook(HOOK, bash(`cd ${target} && git commit -m add`, clean), clean).status, 2);
});

test('refuses a commit it cannot inspect: wrapped in bash -c', () => {
  const repo = makeRepo();
  const res = runHook(HOOK, bash('bash -c "git commit -am wip"', repo), repo);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /cannot inspect|niet controleren/i);
});

test('refuses a commit it cannot inspect: GIT_DIR override', () => {
  const repo = makeRepo();
  assert.equal(runHook(HOOK, bash('GIT_DIR=/tmp/x/.git git commit -m wip', repo), repo).status, 2);
});

test('ignores text that only mentions git commit', () => {
  const repo = makeRepo();
  assert.equal(runHook(HOOK, bash('echo "run git commit later"', repo), repo).status, 0);
});
