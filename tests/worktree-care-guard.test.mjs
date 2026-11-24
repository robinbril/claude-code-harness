// worktree-care: settings, the disk floor, the Docker build cache and the hooks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GIT_ENV, ROOT, git, tempDir, write } from './helpers.mjs';
import { CFG, setup, fakeBin, withPath } from './worktree-care.helpers.mjs';
import { loadConfig } from '../tools/worktree-care/lib/config.mjs';
import { takeLock } from '../tools/worktree-care/lib/lock.mjs';
import { worktreesOf } from '../tools/worktree-care/lib/repos.mjs';
import { heavyCommand, heavyTool } from '../tools/worktree-care/lib/guard.mjs';
import { pruneBuildCache } from '../tools/worktree-care/lib/disk.mjs';
import { plist } from '../tools/worktree-care/lib/schedule.mjs';

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
  assert.match(r.stderr, /care\.mjs" sweep --apply/);
  assert.equal(hook('guard', bash('docker builder prune -f'), { free: '1' }).status, 0);
  assert.equal(hook('guard', bash('WORKTREE_CARE_SKIP=spoed docker build .'), { free: '9' }).status, 0);
  assert.equal(hook('guard', bash('docker build .'), { free: '30' }).status, 0);
  assert.equal(hook('guard', { tool_name: 'Agent', tool_input: { isolation: 'worktree' }, cwd: ROOT }, { free: '9' }).status, 2);
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
  assert.match(r.stderr, /spawn: tidy .*agent-a1b2 --after/);
  assert.ok(fs.existsSync(path.join(r.dir, 'state/agents/a1b2')));
  assert.equal(hook('agent-end', { agent_id: '../x', cwd: s.main }, { cfg: { autoSweep: true } }).stderr, '');
});

test('build cache: only the builder cache, with an upper limit', () => {
  const top = tempDir('care-docker-');
  const calls = path.join(top, 'calls');
  withPath(fakeBin(top, 'docker', `echo "$@" >> "${calls}"; echo "Total: 4GB"`), () => {
    assert.match(pruneBuildCache(CFG), /boven 20 GB gesnoeid: 4GB/);
    pruneBuildCache(CFG, { lowDisk: true });
    pruneBuildCache(CFG, { dryRun: true });
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

test('cli: a sweep on one repository keeps the main checkout and reports', () => {
  const s = setup();
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/worktree-care/care.mjs'), 'sweep'], { cwd: s.main, encoding: 'utf8', env: { ...GIT_ENV, WORKTREE_CARE_STATE: s.state, WORKTREE_CARE_CONFIG: path.join(s.top, 'none.json') } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /proef, niets gewijzigd: 1 repo's, 2 werkbomen/);
  assert.equal(worktreesOf(s.main).length, 2);
});
