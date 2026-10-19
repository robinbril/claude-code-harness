// Shared helpers for the behaviour tests: throwaway git repos and hook runners.
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// HARNESS_ROOT points the suite at another install with the same layout (hooks/, skills/supergoal/).
export const ROOT = process.env.HARNESS_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Strip inherited git location variables, so a run from inside a git hook cannot touch the caller's repo.
const INHERITED = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_COMMON_DIR', 'GIT_PREFIX'];
const BASE_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !INHERITED.includes(k)));
export const GIT_ENV = {
  ...BASE_ENV,
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
  GIT_CONFIG_NOSYSTEM: '1',
};

export function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// A repo with one committed file, `app.txt`.
export function makeRepo(prefix = 'harness-test-') {
  const dir = tempDir(prefix);
  git(dir, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(dir, 'app.txt'), 'hello\n');
  git(dir, 'add', 'app.txt');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

export function write(dir, rel, content) {
  const file = path.join(dir, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// Runs a hook script with a JSON payload on stdin; returns { status, stdout, stderr }.
export function runHook(script, payload, cwd) {
  const res = spawnSync(process.execPath, [path.join(ROOT, script)], {
    cwd, env: GIT_ENV, input: JSON.stringify(payload), encoding: 'utf8',
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

export function runScript(cmd, args, cwd, env = {}) {
  const res = spawnSync(cmd, args, { cwd, env: { ...GIT_ENV, ...env }, encoding: 'utf8' });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

// A secret-shaped string assembled at runtime, so this file never holds one itself.
export const FAKE_SECRET = ['sk', 'ant', 'api03', 'A'.repeat(24)].join('-');
