// worktree-care: settings, the disk floor, the Docker build cache and the hooks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GIT_ENV, ROOT, git, tempDir, write } from './helpers.mjs';
import { CFG, setup, fakeBin, withPath, quiet, later } from './worktree-care.helpers.mjs';
import { sweep } from '../tools/worktree-care/lib/sweep.mjs';
import { loadConfig } from '../tools/worktree-care/lib/config.mjs';
import { takeLock } from '../tools/worktree-care/lib/lock.mjs';
import { worktreesOf } from '../tools/worktree-care/lib/repos.mjs';
import { heavyCommand, heavyTool } from '../tools/worktree-care/lib/guard.mjs';
import { pruneBuildCache } from '../tools/worktree-care/lib/disk.mjs';
import { plist, schedule } from '../tools/worktree-care/lib/schedule.mjs';

// ---------- config ----------

test('config: a typo, a wrong type and limits in the wrong order are refused', () => {
  const dir = tempDir('care-cfg-');
  const load = (c) => {
    write(dir, 'c.json', JSON.stringify(c));
    return loadConfig({ WORKTREE_CARE_CONFIG: path.join(dir, 'c.json') });
  };
  assert.throws(() => load({ minFreeGb: 1 }), /onbekende sleutel/);
  assert.throws(() => load({ minFreeGB: '1' }), /verkeerde type/);
  assert.throws(() => load({ minFreeGB: 50 }), /hoger dan/);
  assert.equal(load({ minFreeGB: 10 }).minFreeGB, 10);
  assert.equal(load({}).autoSweep, false);
});

// ---------- disk floor ----------

test('heavy commands are recognised, recovery and quoted text are not', () => {
  for (const c of ['docker build .', 'cd x && docker buildx build --platform linux/amd64 .', 'docker compose up -d --build', 'git -C r worktree add ../x', 'npm ci', 'pnpm -C apps/web install', 'uv sync --locked', 'uv run pytest -q', 'CI=1 npx vitest run', 'node .poort/poort.mjs run push', 'npx playwright install'])
    assert.ok(heavyCommand(c), c);
  for (const c of ['rm -rf node_modules', 'docker builder prune -f', 'docker system df', 'git worktree remove x', 'git worktree list', 'git commit -m "npm install en pytest"', 'ls', 'npm ls', 'cat pytest.ini', 'df -h', 'node tools/worktree-care/care.mjs sweep --apply', 'docker compose up -d', 'docker compose -f build.yml down -v', 'pip3 install --help', 'npm test -- --help', 'pytest --collect-only', 'docker compose rm -sf build', 'docker compose stop build', 'docker compose logs build', 'npm rm i', 'pnpm remove add', 'npx jest --clearCache', 'git commit -F - <<EOF\nnpm test\nEOF', 'cat > n.md <<"EOF"\nnpm install\nEOF\nls'])
    assert.equal(heavyCommand(c), null, c);
  assert.ok(heavyCommand('docker compose -f a.yml --profile x build web'));
  assert.ok(heavyCommand('docker compose --progress plain build'));
  assert.ok(heavyCommand('git -c a=b worktree add y'));
  assert.ok(heavyCommand('cat <<EOF\nx\nEOF\nnpm ci'));
  const t = Date.now();
  heavyCommand('\n'.repeat(20000) + ' '.repeat(20000) + 'A=1 '.repeat(5000));
  heavyCommand(`npm${' -p'.repeat(60)}`);
  heavyCommand('"a\\'.repeat(20000));
  assert.ok(Date.now() - t < 1000);
  assert.ok(heavyTool('Agent', { isolation: 'worktree' }));
  assert.equal(heavyTool('Agent', {}), null);
  assert.ok(heavyTool('EnterWorktree', {}));
});

function hook(event, payload, { free = '100', cfg = {}, env = {} } = {}) {
  const dir = env.STATE || tempDir('care-hook-');
  write(dir, 'c.json', JSON.stringify(cfg));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/worktree-care/hook.mjs'), event], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...GIT_ENV, WORKTREE_CARE_CONFIG: path.join(dir, 'c.json'), WORKTREE_CARE_STATE: path.join(dir, 'state'), WORKTREE_CARE_FREE_GB: free, WORKTREE_CARE_NO_SPAWN: '1', ...env },
  });
  return { ...r, dir };
}
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command }, cwd: ROOT });

test('guard: refuses heavy work below the floor, says what to do, and lets recovery through', () => {
  const r = hook('guard', bash('docker build .'), { free: '9' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Nog 9\.0 GB vrij, onder de vloer van 15 GB: een image-build start niet/);
  assert.equal(hook('guard', bash('docker builder prune -f'), { free: '1' }).status, 0);
  assert.equal(hook('guard', bash('WORKTREE_CARE_SKIP=spoed docker build .'), { free: '9' }).status, 0);
  assert.equal(hook('guard', bash('docker build .'), { free: '30' }).status, 0);
  assert.equal(hook('guard', { tool_name: 'Agent', tool_input: { isolation: 'worktree' }, cwd: ROOT }, { free: '9' }).status, 2);
});

test('guard: the message leaves cleaning up and getting past the floor to the user', () => {
  const off = hook('guard', bash('docker build .'), { free: '9' });
  assert.match(off.stderr, /Automatisch opruimen staat uit\. De gebruiker/);
  assert.match(off.stderr, /proef, wijzigt niets\): node ".*care\.mjs" sweep\n$/);
  const on = hook('guard', bash('docker build .'), { free: '9', cfg: { autoSweep: true } });
  assert.match(on.stderr, /Het opruimen is gestart/);
  const again = hook('guard', bash('docker build .'), { free: '9', cfg: { autoSweep: true }, env: { STATE: on.dir } });
  assert.match(again.stderr, /minder dan een kwartier geleden/);
  const failed = hook('guard', bash('docker build .'), { free: '9', cfg: { autoSweep: true }, env: { WORKTREE_CARE_STATE: '/dev/null/x' } });
  assert.match(failed.stderr, /staat aan maar kan niet starten\. De gebruiker/);
  for (const r of [off, on, again, failed]) {
    assert.match(r.stderr, /De gebruiker beslist wat er weg mag: ruim niet zelf op/);
    assert.equal(r.status, 2);
    assert.doesNotMatch(r.stderr.replace(/^spawn: .*$/m, ''), /--apply|WORKTREE_CARE_SKIP|minFreeGB|config\.json/);
  }
});

test('guard: a low disk starts one sweep in the background, only when automatic sweeping is on', () => {
  assert.doesNotMatch(hook('guard', bash('npm ci'), { free: '30' }).stderr, /spawn/);
  const first = hook('guard', bash('npm ci'), { free: '30', cfg: { autoSweep: true } });
  assert.match(first.stderr, /spawn: sweep --apply/);
  assert.doesNotMatch(hook('guard', bash('npm ci'), { free: '30', cfg: { autoSweep: true }, env: { STATE: first.dir } }).stderr, /spawn/);
});

test('guard: its own errors never block, also on a state folder that cannot be written', () => {
  assert.equal(hook('guard', 'no json', { free: '1' }).status, 0);
  assert.equal(hook('guard', bash('npm ci'), { free: '1', cfg: { nope: 1 } }).status, 0);
  const r = hook('guard', bash('npm ci'), { free: '1', cfg: { autoSweep: true }, env: { WORKTREE_CARE_STATE: '/dev/null/x' } });
  assert.equal(r.status, 2);
});

test('after: an image build prunes the build cache', () => {
  assert.match(hook('after', bash('docker build .'), { cfg: { autoSweep: true } }).stderr, /spawn: build-cache --apply/);
  assert.equal(hook('after', bash('ls'), { cfg: { autoSweep: true } }).stderr, '');
});

test('agent-end: marks the worktree of that agent and tidies it', () => {
  const s = setup();
  const agent = path.join(s.main, '.claude/worktrees/agent-a1b2');
  git(s.main, 'worktree', 'add', '-q', '-b', 'worktree-agent-a1b2', agent);
  const r = hook('agent-end', { agent_id: 'a1b2', cwd: s.main }, { cfg: { autoSweep: true } });
  assert.match(r.stderr, /spawn: tidy .*agent-a1b2 --apply --after/);
  assert.ok(fs.existsSync(path.join(r.dir, 'state/agents/a1b2')));
  assert.equal(hook('agent-end', { agent_id: '../x', cwd: s.main }, { cfg: { autoSweep: true } }).stderr, '');
});

test('build cache: only the builder cache, with an upper limit', () => {
  const top = tempDir('care-docker-');
  const calls = path.join(top, 'calls');
  withPath(fakeBin(top, 'docker', `echo "$@" >> "${calls}"; echo "Total: 4GB"`), () => {
    assert.match(pruneBuildCache(CFG), /boven 20 GB gesnoeid: 4GB/);
    pruneBuildCache(CFG, { lowDisk: true });
    assert.equal(pruneBuildCache(CFG, { dryRun: true }), 'bouwcache zou tot 20 GB gesnoeid worden');
  });
  assert.equal(fs.readFileSync(calls, 'utf8'), 'builder prune --force --max-used-space 20GB\nbuilder prune --force --max-used-space 5GB\n');
});

test('schedule: the task finds docker where this shell finds it and keeps the settings', () => {
  const top = tempDir('care-plist-');
  fakeBin(top, 'docker', ':');
  const text = plist('/x/care.mjs', '/s', { PATH: `${top}/bin:/usr/bin`, CLAUDE_CONFIG_DIR: '/c', SECRET: 'no' });
  assert.ok(text.includes(`${top}/bin`));
  assert.match(text, /CLAUDE_CONFIG_DIR<\/key><string>\/c</);
  assert.doesNotMatch(text, /SECRET/);
});

// launchctl that keeps its task in a file, and fails the way the test says.
function launchctl(top, bootout) {
  const task = path.join(top, 'task');
  return fakeBin(top, 'launchctl', `case "$1" in
    bootout) ${bootout} ;;
    print) [ -f "${task}" ] && exit 0; echo 'Could not find service "x" in domain for user gui: 501' >&2; exit 113 ;;
    bootstrap) [ -f "${task}" ] && exit 5; touch "${task}" ;;
  esac`);
}

for (const [what, bootout, loaded, error] of [
  ['stops it', 'rm -f "$TASK"', true, null],
  ['finds nothing to stop', "echo 'Boot-out failed: 3: No such process' >&2; exit 3", false, null],
  ['stops it a moment later', '(sleep 1; rm -f "$TASK") >/dev/null 2>&1 & exit 36', true, null],
  ['is already stopping it', '(sleep 1; rm -f "$TASK") >/dev/null 2>&1 & exit 37', true, null],
  ['fails', "echo 'Boot-out failed: 5: Input/output error' >&2; exit 5", true, /staat nog aan, launchctl bootout: Boot-out failed: 5/],
  ['says it worked while the task stays', 'exit 0', true, /staat nog aan, launchctl bootout: exit 0/],
]) {
  test(`schedule --remove: launchctl ${what}`, () => {
    const top = fs.realpathSync.native(tempDir('care-launch-'));
    const task = path.join(top, 'task');
    const file = path.join(top, 'Library/LaunchAgents/dev.worktree-care.sweep.plist');
    write(top, 'Library/LaunchAgents/dev.worktree-care.sweep.plist', 'x');
    if (loaded) fs.writeFileSync(task, '');
    const said = [];
    const old = process.env.HOME;
    Object.assign(process.env, { HOME: top, TASK: task });
    try {
      withPath(launchctl(top, bootout), () => {
        const go = () => schedule('/x/care.mjs', path.join(top, 'state'), true, (l) => said.push(l), { platform: 'darwin', wait: 4000 });
        if (error) assert.throws(go, error);
        else go();
      });
    } finally {
      process.env.HOME = old;
      delete process.env.TASK;
    }
    assert.deepEqual(said, error ? [] : ['vaste taak weg']);
    assert.equal(fs.existsSync(file), Boolean(error));
    assert.equal(fs.existsSync(task), Boolean(error));
  });
}

// print: what launchctl says about the task after the bootout.
for (const [what, print, error] of [
  ['there is no session of this user', "echo 'Could not find domain for user gui: 501' >&2; exit 112", null],
  ['root asks, whose domain holds no tasks', "echo 'Could not print domain: 125: Domain does not support specified action' >&2; exit 125", /niet te bepalen.*does not support/],
  ['launchctl answers something else', "echo 'Input/output error' >&2; exit 5", /niet te bepalen of de vaste taak nog aan staat.*print: Input\/output error/],
]) {
  test(`schedule --remove: ${what}`, () => {
    const top = fs.realpathSync.native(tempDir('care-launch-'));
    write(top, 'Library/LaunchAgents/dev.worktree-care.sweep.plist', 'x');
    const bin = fakeBin(top, 'launchctl', `case "$1" in bootout) exit 3 ;; print) ${print} ;; esac`);
    const old = process.env.HOME;
    process.env.HOME = top;
    try {
      const go = () => withPath(bin, () => schedule('/x/care.mjs', top, true, () => {}, { platform: 'darwin', wait: 500 }));
      if (error) assert.throws(go, error);
      else go();
    } finally {
      process.env.HOME = old;
    }
    assert.equal(fs.existsSync(path.join(top, 'Library/LaunchAgents/dev.worktree-care.sweep.plist')), Boolean(error));
  });
}

test('schedule: a task that cannot be stopped is not replaced', () => {
  const top = fs.realpathSync.native(tempDir('care-launch-'));
  fs.writeFileSync(path.join(top, 'task'), '');
  const old = process.env.HOME;
  process.env.HOME = top;
  try {
    withPath(launchctl(top, 'exit 5'), () => assert.throws(() => schedule('/x/care.mjs', top, false, () => {}, { platform: 'darwin', wait: 500 }), /staat nog aan/));
  } finally {
    process.env.HOME = old;
  }
  assert.ok(!fs.existsSync(path.join(top, 'Library/LaunchAgents/dev.worktree-care.sweep.plist')));
});

test('cli: a failed bootout is a failure, not "vaste taak weg"', (t) => {
  if (process.platform !== 'darwin') return t.skip('launchd is er alleen op macOS');
  const top = fs.realpathSync.native(tempDir('care-launch-cli-'));
  fs.writeFileSync(path.join(top, 'task'), '');
  const bin = launchctl(top, 'echo nope >&2; exit 5');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/worktree-care/care.mjs'), 'schedule', '--remove'], { encoding: 'utf8', env: { ...GIT_ENV, HOME: top, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stdout, /weg/);
  assert.match(r.stderr, /staat nog aan, launchctl bootout: nope/);
});

test('six starters on an orphaned lock: one wins', async () => {
  for (let round = 0; round < 3; round++) {
    const state = tempDir('care-race-');
    write(state, 'sweep.lock', JSON.stringify({ pid: 999999, at: 1 }));
    const code = `import { takeLock } from ${JSON.stringify(path.join(ROOT, 'tools/worktree-care/lib/lock.mjs'))}; console.log(takeLock(${JSON.stringify(state)}) ? 'won' : 'lost'); setTimeout(() => {}, 4000);`;
    const outs = await Promise.all(Array.from({ length: 6 }, () => new Promise((done) => {
      const p = spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'inherit'] });
      p.stdout.once('data', (d) => done(String(d).trim()));
    })));
    assert.equal(outs.filter((o) => o === 'won').length, 1, outs.join());
  }
});

test('release leaves a lock that is now somebody else\'s', () => {
  const state = tempDir('care-rel-');
  const release = takeLock(state);
  write(state, 'sweep.lock', JSON.stringify({ pid: process.ppid, at: Date.now() }));
  release();
  assert.ok(fs.existsSync(path.join(state, 'sweep.lock')));
});

test('config: a sync rule without paths, without subject or with a broken regex is refused by name', () => {
  const dir = tempDir('care-sync-');
  const load = (rule) => {
    write(dir, 'c.json', JSON.stringify({ syncCommits: [rule] }));
    return loadConfig({ WORKTREE_CARE_CONFIG: path.join(dir, 'c.json') });
  };
  for (const rule of [{ subject: '^x' }, { subject: '^x', paths: [] }, { subject: '^x', paths: 'a' }, { subject: '^x', paths: [1] }]) assert.throws(() => load(rule), /syncCommits\[0\] heeft geen paths/);
  assert.throws(() => load({ paths: ['a'] }), /syncCommits\[0\] heeft geen subject/);
  assert.throws(() => load({ subject: '(', paths: ['a'] }), /geen geldige regex/);
  assert.equal(load({ subject: '^x', paths: ['a/'] }).syncCommits.length, 1);
});

const cli = (s, ...args) => spawnSync(process.execPath, [path.join(ROOT, 'tools/worktree-care/care.mjs'), ...args], { cwd: s.main, encoding: 'utf8', env: { ...GIT_ENV, WORKTREE_CARE_STATE: s.state, WORKTREE_CARE_CONFIG: path.join(s.top, 'c.json'), WORKTREE_CARE_DOCKER_SOCKET: path.join(s.top, 'none') } });

test('cli: tidy is a trial run unless --apply', () => {
  const s = setup();
  write(s.wt, 'src/__pycache__/a.pyc', 'x');
  assert.match(cli(s, 'tidy', s.wt).stdout, /src\/__pycache__\nproef, niets gewijzigd: 1 testcaches/);
  assert.ok(fs.existsSync(path.join(s.wt, 'src/__pycache__')));
  assert.match(cli(s, 'tidy', s.wt, '--apply').stdout, /weg: 1 testcaches/);
  assert.ok(!fs.existsSync(path.join(s.wt, 'src/__pycache__')));
});

test('log: each line names branch, commit and the ref of a detached head', () => {
  const s = setup();
  const two = path.join(s.top, 'two');
  git(s.main, 'worktree', 'add', '-q', '--detach', two);
  const heads = [s.wt, two].map((d) => git(d, 'rev-parse', 'HEAD').trim());
  const lines = [];
  sweep({ repos: [{ common: path.join(s.main, '.git'), dir: s.main }], cfg: CFG, state: s.state, apply: true, snap: quiet, now: later(30), log: (l) => lines.push(l) });
  assert.match(lines.find((l) => l.includes(s.wt)), new RegExp(`^remove .* branch feat/a  HEAD ${heads[0]}  schoon`));
  const lone = lines.find((l) => l.includes(two));
  assert.match(lone, new RegExp(`^remove .* los  HEAD ${heads[1]}  refs/worktree-care/\\d{8}-two-${heads[1].slice(0, 12)}  gemerged`));
  assert.ok(git(s.main, 'rev-parse', /refs\/\S+/.exec(lone)[0]));
});

test('refs of removed worktrees go after the days in the config, and the log says which', () => {
  const s = setup();
  const head = git(s.main, 'rev-parse', 'HEAD').trim();
  const day = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10).replaceAll('-', '');
  const [old, young, plain] = [`refs/worktree-care/${day(40)}-a-1`, `refs/worktree-care/${day(20)}-b-1`, 'refs/worktree-care/plain-1'];
  for (const r of [old, young, plain]) git(s.main, 'update-ref', r, head);
  const refs = () => git(s.main, 'for-each-ref', '--format=%(refname)', 'refs/worktree-care').split('\n').filter(Boolean).sort();
  const lines = [];
  const run = (apply, cfg = CFG) => sweep({ repos: [{ common: path.join(s.main, '.git'), dir: s.main }], cfg, state: s.state, apply, snap: quiet, log: (l) => lines.push(l) });
  run(false);
  assert.equal(refs().length, 3);
  run(true);
  assert.deepEqual(refs(), [young, plain].sort());
  assert.ok(lines.filter((l) => l.startsWith(`ref    ${old}  HEAD ${head}  ouder dan 30 dagen`)).length === 2);
  run(true, { ...CFG, keepRefDays: 10 });
  assert.deepEqual(refs(), [plain]);
  const before = new Date(Date.now() - 40 * 86400000);
  fs.utimesSync(path.join(s.main, '.git', plain), before, before);
  run(true);
  assert.deepEqual(refs(), []);
});

test('cli: a sweep on one repository keeps the main checkout and reports', () => {
  const s = setup();
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/worktree-care/care.mjs'), 'sweep'], { cwd: s.main, encoding: 'utf8', env: { ...GIT_ENV, WORKTREE_CARE_STATE: s.state, WORKTREE_CARE_CONFIG: path.join(s.top, 'none.json') } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /proef, niets gewijzigd: 1 repo's, 2 werkbomen/);
  assert.equal(worktreesOf(s.main).length, 2);
});
