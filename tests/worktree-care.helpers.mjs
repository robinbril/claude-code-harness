// Repositories and fakes for the worktree-care tests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { git, tempDir, write } from './helpers.mjs';
import { DEFAULTS } from '../tools/worktree-care/lib/config.mjs';
import { snapshot } from '../tools/worktree-care/lib/busy.mjs';
import { sweep } from '../tools/worktree-care/lib/sweep.mjs';

export const DAY = 86400000;
const SYNC = { subject: '^chore: push gate from ', paths: ['.poort/', 'gate.json'] };
export const CFG = { ...DEFAULTS, syncCommits: [SYNC] };
export const quiet = () => ({ at: Date.now(), procs: new Map(), paths: [], commands: [], pins: [] });
const BASE_IGNORE = 'node_modules/\n.venv/\n__pycache__/\n.pytest_cache/\ndist/\n.env\n.harness/\n.e2e/\ntest-results/\n.coverage*\n';

// A remote, a main checkout on `main`, and one worktree on a pushed branch.
export function setup({ branch = 'feat/a', push = true } = {}) {
  const top = fs.realpathSync.native(tempDir('care-'));
  const remote = path.join(top, 'remote.git');
  const main = path.join(top, 'main');
  const wt = path.join(top, 'wt');
  git(top, 'init', '-q', '--bare', '-b', 'main', remote);
  git(top, 'clone', '-q', remote, main);
  git(main, 'checkout', '-q', '-B', 'main');
  write(main, '.gitignore', BASE_IGNORE);
  write(main, 'app.txt', 'hello\n');
  write(main, 'web/package.json', '{}');
  write(main, 'gate.json', '{"v":1}');
  git(main, 'add', '-A');
  git(main, 'commit', '-q', '-m', 'init');
  git(main, 'push', '-q', '-u', 'origin', 'main');
  git(main, 'worktree', 'add', '-q', '-b', branch, wt);
  if (push) {
    write(wt, 'own.txt', 'own\n');
    git(wt, 'add', '-A');
    git(wt, 'commit', '-q', '-m', 'own work');
    git(wt, 'push', '-q', '-u', 'origin', branch);
  }
  return { top, main, wt, state: path.join(top, 'state') };
}

export const gitDirOf = (dir) => git(dir, 'rev-parse', '--absolute-git-dir').trim();

export const deps = (dir) => {
  write(dir, 'web/node_modules/x/index.js', 'x');
  write(dir, '.venv/pyvenv.cfg', 'home = x');
  write(dir, 'src/__pycache__/a.pyc', 'x');
};

export const later = (days) => () => Date.now() + days * DAY;

export function go(s, { apply = true, days = 30, cfg = CFG, snap = quiet, state = s.state } = {}) {
  const common = git(s.main, 'rev-parse', '--path-format=absolute', '--git-common-dir').trim();
  const rows = sweep({ repos: [{ common, dir: s.main }], cfg, state, apply, snap, now: later(days) });
  return rows.find((r) => r.path === s.wt);
}

export const kept = (s, row, why) => {
  assert.notEqual(row.action, 'remove', row.why);
  assert.match(row.why, why);
  assert.ok(fs.existsSync(path.join(s.wt, 'app.txt')));
};

export function newGateOnBase(s) {
  write(s.main, 'gate.json', '{"v":2}');
  git(s.main, 'commit', '-qam', 'gate 2');
  git(s.main, 'push', '-q');
}

export const child = (dir) => spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd: dir, stdio: 'ignore' });
export const realSnap = () => snapshot();

export function fakeBin(top, name, body) {
  const file = path.join(top, 'bin', name);
  write(top, `bin/${name}`, `#!/bin/sh\n${body}\n`);
  fs.chmodSync(file, 0o755);
  return path.join(top, 'bin');
}

export const withPath = (dir, fn) => {
  const old = process.env.PATH;
  process.env.PATH = `${dir}${path.delimiter}${old}`;
  try {
    return fn();
  } finally {
    process.env.PATH = old;
  }
};
