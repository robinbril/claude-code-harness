// worktree-care: who is at work, no answer, and what happens between the plan and the deed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { git, tempDir, write } from './helpers.mjs';
import { DAY, CFG, quiet, setup, gitDirOf, deps, later, go, kept, child, realSnap, fakeBin, withPath } from './worktree-care.helpers.mjs';
import { snapshot } from '../tools/worktree-care/lib/busy.mjs';
import { sweep, tidy } from '../tools/worktree-care/lib/sweep.mjs';
import { takeLock } from '../tools/worktree-care/lib/lock.mjs';
import { worktreesOf } from '../tools/worktree-care/lib/repos.mjs';
import { gitOk, Unknown } from '../tools/worktree-care/lib/run.mjs';
import { pins } from '../tools/worktree-care/lib/pins.mjs';

// ---------- who is at work ----------

test('a process that works inside', async () => {
  const s = setup();
  deps(s.wt);
  fs.mkdirSync(path.join(s.wt, 'web/src'));
  const p = child(path.join(s.wt, 'web'));
  try {
    await new Promise((r) => p.once('spawn', r));
    kept(s, go(s, { snap: realSnap }), /werkt in/);
    assert.ok(fs.existsSync(path.join(s.wt, '.venv')));
  } finally {
    p.kill();
  }
});

test('a process that names the folder on its command line', async () => {
  const s = setup();
  const p = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)', path.join(s.wt, 'web')], { cwd: '/', stdio: 'ignore' });
  try {
    await new Promise((r) => p.once('spawn', r));
    kept(s, go(s, { snap: realSnap }), /noemt deze map/);
  } finally {
    p.kill();
  }
});

test('a Claude session in the worktree, and a dead one', async () => {
  const s = setup();
  const p = child('/');
  const config = path.join(s.top, 'claude');
  process.env.CLAUDE_CONFIG_DIR = config;
  try {
    await new Promise((r) => p.once('spawn', r));
    write(config, `sessions/${p.pid}.json`, JSON.stringify({ pid: p.pid, cwd: s.wt }));
    kept(s, go(s, { snap: realSnap }), /werkt in/);
    write(config, `sessions/${p.pid}.json`, JSON.stringify({ pid: 999999, cwd: s.wt }));
    assert.equal(go(s, { snap: realSnap, apply: false }).action, 'remove');
  } finally {
    p.kill();
    delete process.env.CLAUDE_CONFIG_DIR;
  }
});

test('a folder that an MCP server or hook starts from, not one that is only listed as a project', () => {
  const s = setup();
  process.env.CLAUDE_CONFIG_DIR = path.join(s.top, 'claude');
  const settings = (c) => write(s.top, 'claude/settings.json', JSON.stringify(c));
  try {
    settings({ projects: { [s.wt]: {} } });
    assert.equal(go(s, { snap: realSnap, apply: false }).action, 'remove');
    settings({ mcpServers: { x: { command: 'python', env: { PYTHONPATH: `${s.wt}/services/x` } } } });
    kept(s, go(s, { snap: realSnap }), /start iets uit deze map/);
    const home = process.env.HOME;
    process.env.HOME = s.top;
    for (const cmd of ['cd "$HOME/wt" && npm start', '(cd ~/wt)', 'node --import=file://$HOME/wt/a.js x', 'node "$HOME/wt/hook.js" x', 'node ~/wt/hook.js', 'node ${HOME}/wt/hook.js']) {
      settings({ hooks: { Stop: [{ hooks: [{ type: 'command', command: cmd }] }] } });
      kept(s, go(s, { snap: () => ({ ...quiet(), pins: pins() }) }), /start iets uit deze map/);
    }
    process.env.HOME = home;
    settings({});
    write(s.top, 'servers.json', JSON.stringify({ x: { args: [`${s.wt}/server.js`] } }));
    kept(s, go(s, { snap: () => snapshot({ pinnedBy: [path.join(s.top, 'servers.json')] }) }), /servers\.json start iets/);
  } finally {
    delete process.env.CLAUDE_CONFIG_DIR;
  }
});

test('a transcript written an hour ago is activity', () => {
  const s = setup();
  const config = path.join(s.top, 'claude');
  process.env.CLAUDE_CONFIG_DIR = config;
  try {
    const name = `projects/${s.wt.replace(/[^A-Za-z0-9]/g, '-')}/a.jsonl`;
    write(config, name, '');
    const when = new Date(Date.now() + 29.95 * DAY);
    fs.utimesSync(path.join(config, name), when, when);
    kept(s, go(s), /gebruikt op|uur stil/);
  } finally {
    delete process.env.CLAUDE_CONFIG_DIR;
  }
});

test('lock of a live process, also with a reason that names no pid', () => {
  for (const reason of [`claude session (pid ${process.pid})`, 'on a usb disk', '']) {
    const s = setup();
    deps(s.wt);
    git(s.main, 'worktree', 'lock', ...(reason ? ['--reason', reason] : []), s.wt);
    kept(s, go(s, { snap: realSnap }), /vergrendeld/);
    assert.ok(fs.existsSync(path.join(s.wt, '.venv')));
  }
});

test('lock of a dead process, or of a pid that now belongs to another', () => {
  for (const reason of ['claude agent agent-a1 (pid 999999 start Tue Nov 24 14:25:07 2026)', `claude agent agent-a1 (pid ${process.pid})`]) {
    const s = setup();
    git(s.main, 'worktree', 'lock', '--reason', reason, s.wt);
    const old = new Date('2020-01-01');
    fs.utimesSync(path.join(gitDirOf(s.wt), 'locked'), old, old);
    assert.equal(go(s, { snap: realSnap }).action, 'remove');
    assert.ok(!fs.existsSync(s.wt));
  }
});

function lockedAgent() {
  const s = setup();
  deps(s.wt);
  git(s.main, 'worktree', 'lock', '--reason', `claude agent agent-a1 (pid ${process.pid})`, s.wt);
  const mark = path.join(s.state, 'agents/a1');
  write(s.state, 'agents/a1', s.wt);
  return { s, mark };
}

test('a finished subagent: slim after the grace period, never removed while its lock lives', () => {
  const { s } = lockedAgent();
  assert.match(go(s, { snap: realSnap, days: 0.01 }).why, /vergrendeld/);
  const row = go(s, { snap: realSnap, days: 30 });
  assert.equal(row.action, 'slim');
  assert.ok(fs.existsSync(path.join(s.wt, 'app.txt')));
  assert.ok(!fs.existsSync(path.join(s.wt, '.venv')));
});

test('a subagent that went on after its end mark is at work', () => {
  const { s, mark } = lockedAgent();
  const before = new Date(Date.now() - DAY);
  fs.utimesSync(mark, before, before);
  assert.match(go(s, { snap: realSnap }).why, /vergrendeld/);
  assert.ok(fs.existsSync(path.join(s.wt, '.venv')));
});

// ---------- no answer is not "nobody" ----------

for (const [name, body] of [['lsof', 'exit 1'], ['ps', 'exit 1'], ['docker', 'echo "permission denied" >&2; exit 1']]) {
  test(`${name} gives no answer: nothing is done`, () => {
    const s = setup();
    withPath(fakeBin(s.top, name, body), () => assert.throws(() => go(s, { snap: realSnap }), Unknown));
    assert.ok(fs.existsSync(s.wt));
  });
}

test('git gives no answer about one worktree: that one stays', () => {
  const s = setup();
  fs.writeFileSync(path.join(git(s.wt, 'rev-parse', '--absolute-git-dir').trim(), 'index'), 'garbage');
  kept(s, go(s), /niet te bepalen/);
});

test('a container that mounts the worktree', () => {
  const s = setup();
  const bin = fakeBin(s.top, 'docker', `[ "$1" = ps ] && echo abc || printf '/host_mnt${s.wt}/web\\n\\n'`);
  withPath(bin, () => kept(s, go(s, { snap: realSnap }), /werkt in/));
});

for (const [what, ps, inspect, why] of [
  ['docker ps hangs', 'sleep 5', '', /geen antwoord/],
  ['docker inspect fails', 'echo abc', 'echo half; exit 1', /inspect/],
  ['docker inspect hangs', 'echo abc', 'sleep 5', /inspect/],
]) {
  test(`${what}: nothing is done`, () => {
    const s = setup();
    process.env.WORKTREE_CARE_DOCKER_MS = '400';
    try {
      withPath(fakeBin(s.top, 'docker', `if [ "$1" = ps ]; then ${ps}; else ${inspect || ':'}; fi`), () => assert.throws(() => go(s, { snap: realSnap }), why));
    } finally {
      delete process.env.WORKTREE_CARE_DOCKER_MS;
    }
    assert.ok(fs.existsSync(s.wt));
  });
}

test('a docker that runs without its program in PATH is no answer', () => {
  const s = setup();
  write(s.top, 'docker.sock', '');
  const old = { path: process.env.PATH, home: process.env.HOME };
  const bin = path.join(s.top, 'only');
  fs.mkdirSync(bin);
  for (const p of ['git', 'ps', 'lsof']) {
    const at = spawnSync('sh', ['-c', `command -v ${p}`], { encoding: 'utf8' }).stdout.trim();
    if (at) fs.symlinkSync(at, path.join(bin, p));
  }
  Object.assign(process.env, { PATH: bin, HOME: s.top, WORKTREE_CARE_DOCKER_SOCKET: path.join(s.top, 'docker.sock') });
  try {
    assert.throws(() => snapshot(), /niet in PATH/);
    process.env.WORKTREE_CARE_DOCKER_SOCKET = path.join(s.top, 'none');
    assert.ok(snapshot().paths.length);
    fs.rmSync(path.join(bin, 'lsof'), { force: true });
    if (!fs.existsSync('/proc/self/cwd')) assert.throws(() => snapshot(), /lsof ontbreekt/);
  } finally {
    Object.assign(process.env, { PATH: old.path, HOME: old.home });
    delete process.env.WORKTREE_CARE_DOCKER_SOCKET;
  }
});

test('half an answer of lsof or ps is no answer', () => {
  const s = setup();
  withPath(fakeBin(s.top, 'lsof', 'printf "p1\\nn/\\n"'), () => assert.throws(() => snapshot(), /lsof/));
  fs.rmSync(path.join(s.top, 'bin/lsof'));
  withPath(fakeBin(s.top, 'ps', 'echo "    1 Tue Nov 24 14:25:07 2026     /sbin/launchd"'), () => assert.throws(() => snapshot(), /dit proces zelf/));
});

test('git says nothing about the machine: an exit of 128 is not a no', () => {
  assert.throws(() => gitOk(tempDir('care-nogit-'), 'check-ignore', '-q', 'x'), Unknown);
});

test('one repository without an answer does not stop the others', () => {
  const s = setup();
  git(s.main, 'worktree', 'add', '-q', '-b', 'zz', path.join(s.top, 'zz'));
  const rows = sweep({ repos: [{ common: '/nowhere', dir: '/nowhere' }, { common: path.join(s.main, '.git'), dir: s.wt }], cfg: CFG, state: s.state, apply: true, snap: quiet, now: later(30) });
  assert.equal(rows.find((r) => r.path === s.wt).action, 'remove');
  // The sweep started from the worktree that is gone now, and went on.
  assert.equal(rows.find((r) => r.path === path.join(s.top, 'zz')).action, 'remove');
});

// ---------- between the plan and the deed ----------

// Runs fn at the moment the big folders have left and the facts are asked again.
const onSecondLook = (fn) => {
  let n = 0;
  return () => {
    if (++n === 3) fn();
    return quiet();
  };
};

for (const [what, deed, why] of [
  ['a new file', (s) => write(s.wt, 'new.md', 'mine'), /onbekende/],
  ['a new file in a repo that hides untracked files', (s) => (git(s.main, 'config', 'status.showUntrackedFiles', 'no'), write(s.wt, 'new.md', 'mine')), /onbekende/],
  ['a commit', (s) => (write(s.wt, 'own.txt', 'x'), git(s.wt, 'commit', '-qam', 'now')), /gebruikt|remote|stil/],
  ['a lock', (s) => git(s.main, 'worktree', 'lock', s.wt), /vergrendeld/],
  ['a new secret that git ignores', (s) => write(s.wt, '.env', 'K=1'), /genegeerd/],
  ['an install', (s) => write(s.wt, '.venv/pyvenv.cfg', 'new'), /verscheen/],
]) {
  test(`${what} during the removal: the worktree stays and its folders come back`, () => {
    const s = setup();
    deps(s.wt);
    const row = go(s, { snap: onSecondLook(() => deed(s)), days: what === 'a commit' ? 8 : 30 });
    kept(s, row, why);
    assert.ok(fs.existsSync(path.join(s.wt, 'web/node_modules/x/index.js')), 'node_modules');
    assert.ok(fs.existsSync(path.join(s.wt, '.venv/pyvenv.cfg')), '.venv');
  });
}

test('git refuses: the folders come back and the lock is set again', () => {
  const s = setup();
  deps(s.wt);
  git(s.main, 'worktree', 'lock', '--reason', 'claude agent agent-a1 (pid 999999)', s.wt);
  const real = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  const bin = fakeBin(s.top, 'git', `case "$*" in *"worktree remove"*) echo no >&2; exit 1;; esac; exec "${real}" "$@"`);
  withPath(bin, () => kept(s, go(s), /git weigert: no/));
  assert.ok(fs.existsSync(path.join(s.wt, '.venv/pyvenv.cfg')));
  assert.equal(worktreesOf(s.main).find((w) => w.path === s.wt).locked, 'claude agent agent-a1 (pid 999999)');
});

test('a folder that cannot be emptied at first does not stop the sweep', () => {
  const s = setup();
  deps(s.wt);
  fs.chmodSync(path.join(s.wt, 'web/node_modules/x'), 0o555);
  assert.equal(go(s).action, 'remove');
  assert.deepEqual(fs.readdirSync(path.join(s.main, '.git/worktree-care-trash')), []);
});

test('a sweep that was killed halfway: the folder goes back to the worktree that still stands', () => {
  const s = setup();
  const trash = path.join(s.main, '.git/worktree-care-trash');
  write(trash, '999999-a/x/index.js', 'x');
  write(trash, '999999-a.from', path.join(s.wt, 'web/node_modules'));
  write(trash, '999999-b/x', 'x');
  write(trash, '999999-b.from', path.join(s.top, 'gone/node_modules'));
  go(s, { days: 0 });
  assert.ok(fs.existsSync(path.join(s.wt, 'web/node_modules/x/index.js')));
  assert.deepEqual(fs.readdirSync(trash), []);
});

test('trash of a killed sweep goes, of a running one stays', () => {
  const s = setup();
  const trash = path.join(s.main, '.git/worktree-care-trash');
  write(trash, '999999-a/x', 'x');
  write(trash, `${process.ppid}-b/x`, 'x');
  go(s, { days: 0 });
  assert.deepEqual(fs.readdirSync(trash), [`${process.ppid}-b`]);
});


test('work that starts after the plan is seen before the deed', () => {
  const s = setup();
  let n = 0;
  const snap = () => {
    if (n++) return quiet();
    return { ...quiet(), get paths() { write(s.wt, 'new.txt', 'just now'); return []; } };
  };
  const row = go(s, { snap });
  kept(s, row, /onbekende bestanden/);
  assert.ok(fs.existsSync(path.join(s.wt, 'new.txt')));
});

test('a process that starts after the plan is seen before the deed', () => {
  const s = setup();
  const snaps = [quiet(), { ...quiet(), paths: [s.wt] }];
  kept(s, go(s, { snap: () => snaps.shift() }), /werkt in/);
});

test('one sweep at a time, and a lock of a dead sweep does not block', () => {
  const state = tempDir('care-lock-');
  const release = takeLock(state);
  assert.equal(takeLock(state), null);
  release();
  write(state, 'sweep.lock', JSON.stringify({ pid: 999999, at: 1 }));
  assert.ok(takeLock(state));
});

test('tidy takes test caches only', () => {
  const s = setup();
  deps(s.wt);
  write(s.wt, '.pytest_cache/v/x', 'x');
  assert.deepEqual(tidy({ dir: s.wt, cfg: CFG, state: s.state, snap: quiet }).sort(), ['.pytest_cache', 'src/__pycache__']);
  assert.ok(fs.existsSync(path.join(s.wt, '.venv')) && fs.existsSync(path.join(s.wt, 'web/node_modules')));
  assert.deepEqual(tidy({ dir: s.main, cfg: CFG, state: s.state, snap: quiet }), []);
});
