// worktree-care: what goes, and everything in a worktree that keeps it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GIT_ENV, git, write, tempDir } from './helpers.mjs';
import { DAY, CFG, quiet, setup, gitDirOf, deps, later, go, kept, newGateOnBase, realSnap, fakeBin, withPath } from './worktree-care.helpers.mjs';
import { loadConfig } from '../tools/worktree-care/lib/config.mjs';
import { lockHolder } from '../tools/worktree-care/lib/busy.mjs';
import { sweep, tidy } from '../tools/worktree-care/lib/sweep.mjs';

// ---------- what goes ----------

test('a clean pushed worktree goes after its idle time, its branch stays', () => {
  const s = setup();
  deps(s.wt);
  assert.equal(go(s, { days: 6, apply: false }).action, 'slim');
  assert.equal(go(s, { days: 8 }).action, 'remove');
  assert.ok(!fs.existsSync(s.wt));
  assert.match(git(s.main, 'branch', '--list', 'feat/a'), /feat\/a/);
});

test('a merged worktree goes after three days', () => {
  const s = setup();
  git(s.main, 'merge', '-q', '--no-ff', '-m', 'merge', 'feat/a');
  git(s.main, 'push', '-q');
  assert.equal(go(s, { days: 2.5, apply: false }).action, 'keep');
  assert.match(go(s, { days: 3.1 }).why, /gemerged/);
  assert.ok(!fs.existsSync(s.wt));
});

test('a dry run changes nothing', () => {
  const s = setup();
  deps(s.wt);
  assert.equal(go(s, { apply: false }).action, 'remove');
  assert.ok(fs.existsSync(path.join(s.wt, '.venv/pyvenv.cfg')));
});

test('a worktree with work is slimmed: rebuildable folders go, everything else stays', () => {
  const s = setup();
  deps(s.wt);
  write(s.wt, 'web/dist/a.js', 'x');
  write(s.wt, '.e2e/cache/a.json', 'product');
  write(s.wt, '.harness/t/spec.md', 'spec');
  write(s.wt, '.env', 'A=1');
  write(s.wt, 'app.txt', 'changed\n');
  const row = go(s);
  assert.equal(row.action, 'slim');
  assert.deepEqual(row.done.sort(), ['.venv', 'src/__pycache__', 'web/node_modules']);
  for (const f of ['.e2e/cache/a.json', '.harness/t/spec.md', '.env', 'app.txt', 'web/package.json', 'web/dist/a.js']) assert.ok(fs.existsSync(path.join(s.wt, f)), f);
  assert.ok(!fs.existsSync(path.join(s.wt, 'web/node_modules')));
});

test('build output goes only from a worktree without open work', () => {
  const makers = [null, (s) => write(s.wt, 'app.txt', 'changed\n'), (s) => write(s.wt, 'notes.md', 'x'), (s) => write(s.wt, '.env', 'A=1'), (s) => git(s.wt, 'update-index', '--skip-worktree', 'app.txt')];
  for (const open of makers) {
    const s = setup();
    write(s.wt, 'web/dist/release.pdf', 'x');
    write(s.wt, 'web/node_modules/x.js', 'x');
    open?.(s);
    // Two days: too soon to remove a clean one, long enough to slim.
    const row = go(s, { days: 2 });
    assert.deepEqual(row.done.sort(), open ? ['web/node_modules'] : ['web/dist', 'web/node_modules'], String(open));
    assert.equal(fs.existsSync(path.join(s.wt, 'web/dist/release.pdf')), Boolean(open), String(open));
  }
});

test('build output alone is no reason to slim a worktree with open work', () => {
  const s = setup();
  write(s.wt, 'web/dist/release.pdf', 'x');
  write(s.wt, 'app.txt', 'changed\n');
  assert.equal(go(s).action, 'keep');
});

test('slimming waits until the worktree is quiet, shorter when the disk is low', () => {
  const s = setup();
  deps(s.wt);
  assert.equal(go(s, { days: 0.2, apply: false }).action, 'keep');
  process.env.WORKTREE_CARE_FREE_GB = '20';
  try {
    assert.equal(go(s, { days: 0.2, apply: false }).action, 'slim');
  } finally {
    delete process.env.WORKTREE_CARE_FREE_GB;
  }
});

test('taking folders out is not work: it does not restart the idle time', () => {
  const s = setup();
  deps(s.wt);
  write(s.wt, 'app.txt', 'changed\n');
  const old = new Date(Date.now() - DAY);
  fs.utimesSync(s.wt, old, old);
  assert.equal(go(s).action, 'slim');
  assert.equal(Math.round(fs.statSync(s.wt).mtimeMs / 1000), Math.round(old / 1000));
});

// ---------- what never goes ----------

test('main checkout', () => {
  const s = setup();
  const common = path.join(s.main, '.git');
  deps(s.main);
  for (const apply of [false, true]) {
    const rows = sweep({ repos: [{ common, dir: s.main }], cfg: CFG, state: s.state, apply, snap: quiet, now: later(900) });
    assert.equal(rows.find((r) => r.path === s.main).why, 'hoofdcheckout');
  }
  assert.ok(fs.existsSync(path.join(s.main, '.venv')));
});

test('tracked change', () => {
  const s = setup();
  write(s.wt, 'app.txt', 'changed\n');
  kept(s, go(s), /1 gewijzigde bestanden/);
});

test('staged change', () => {
  const s = setup();
  write(s.wt, 'app.txt', 'changed\n');
  git(s.wt, 'add', 'app.txt');
  kept(s, go(s), /gewijzigde bestanden/);
});

test('untracked file, also when the repo hides untracked files', () => {
  const s = setup();
  git(s.main, 'config', 'status.showUntrackedFiles', 'no');
  write(s.wt, 'notes.txt', 'mine');
  kept(s, go(s), /1 onbekende bestanden/);
});

for (const [what, file] of [['.env', '.env'], ['.harness', '.harness/t/spec.md'], ['.e2e/cache', '.e2e/cache/a.json'], ['an unknown ignored file', '.env.local']]) {
  test(`ignored and not rebuildable: ${what}`, () => {
    const s = setup();
    fs.appendFileSync(path.join(s.main, '.git/info/exclude'), '.env.local\n');
    write(s.wt, file, 'mine');
    kept(s, go(s), /genegeerd en niet herbouwbaar/);
    assert.ok(fs.existsSync(path.join(s.wt, file)));
  });
}

test('an ignored file that is the same in the main checkout does not keep it', () => {
  const s = setup();
  write(s.main, '.env', 'A=1');
  write(s.wt, '.env', 'A=1');
  assert.equal(go(s).action, 'remove');
});

test('an ignored file that differs from the main checkout, also at the same size', () => {
  const s = setup();
  write(s.main, '.env', 'A=1');
  write(s.wt, '.env', 'A=2');
  kept(s, go(s), /genegeerd en niet herbouwbaar: \.env/);
});

test('an ignored folder is never opened to look for something rebuildable', () => {
  const s = setup();
  fs.appendFileSync(path.join(s.main, '.git/info/exclude'), 'private/\n');
  write(s.wt, 'private/node_modules/x.js', 'x');
  kept(s, go(s), /genegeerd en niet herbouwbaar: private/);
  assert.ok(fs.existsSync(path.join(s.wt, 'private/node_modules/x.js')));
});

for (const dir of ['.loops', '.supergoal', '.run', '.harness', '.HARNESS']) {
  test(`an ignored cache directly below ${dir}`, () => {
    const s = setup();
    write(s.main, '.gitignore', '__pycache__/\n');
    git(s.main, 'commit', '-qam', 'ignore less');
    git(s.main, 'push', '-q');
    git(s.wt, 'merge', '-q', '-m', 'm', 'main');
    write(s.wt, `${dir}/a.md`, 'tracked');
    git(s.wt, 'add', '-A');
    git(s.wt, 'commit', '-q', '-m', 'x');
    git(s.wt, 'push', '-q');
    write(s.wt, `${dir}/__pycache__/a.pyc`, 'x');
    kept(s, go(s), /genegeerd en niet herbouwbaar/);
    assert.ok(fs.existsSync(path.join(s.wt, `${dir}/__pycache__/a.pyc`)));
  });
}

test('dist without a manifest next to it is not known to be rebuildable', () => {
  const s = setup();
  write(s.wt, 'reports/dist/final.pdf', 'x');
  kept(s, go(s), /genegeerd en niet herbouwbaar/);
});

test('own files in a folder with a rebuildable name: one ignored file does not take them along', () => {
  for (const [file, junk] of [['dist/report.md', 'dist/.DS_Store'], ['.vite/notes.md', '.vite/a.log']]) {
    const s = setup();
    write(s.main, '.gitignore', '*.log\n.DS_Store\n');
    write(s.main, 'package.json', '{}');
    git(s.main, 'add', '-A');
    git(s.main, 'commit', '-qm', 'ignore');
    git(s.main, 'push', '-q');
    git(s.wt, 'merge', '-q', '-m', 'm', 'main');
    git(s.wt, 'push', '-q');
    write(s.wt, file, 'mine');
    write(s.wt, junk, 'x');
    kept(s, go(s), /onbekende/);
    assert.ok(fs.existsSync(path.join(s.wt, file)), file);
  }
});

test('a tracked folder that differs only in case', () => {
  const s = setup();
  write(s.wt, 'web/Dist/kept.js', 'product');
  git(s.wt, 'add', '-f', 'web/Dist/kept.js');
  git(s.wt, 'commit', '-q', '-m', 'tracked Dist');
  git(s.wt, 'push', '-q');
  fs.renameSync(path.join(s.wt, 'web/Dist'), path.join(s.wt, 'web/tmp'));
  fs.renameSync(path.join(s.wt, 'web/tmp'), path.join(s.wt, 'web/dist'));
  write(s.wt, 'web/dist/kept.js', 'edited');
  go(s);
  assert.equal(fs.readFileSync(path.join(s.wt, 'web/dist/kept.js'), 'utf8'), 'edited');
});

for (const repo of ['web/node_modules/.cache/a/b/c/lib', 'src/__pycache__/lib', 'web/test-results/lib']) {
  test(`a repository deep in ${repo.split('/').slice(0, 2).join('/')}`, () => {
    const s = setup();
    git(s.wt, 'init', '-q', repo);
    write(s.wt, `${repo}/own.txt`, 'mine');
    for (const prepare of [() => {}, () => write(s.wt, 'app.txt', 'changed\n')]) {
      prepare();
      go(s);
      assert.ok(fs.existsSync(path.join(s.wt, repo, 'own.txt')));
    }
  });
}

test('commits that only the log of this worktree holds', () => {
  const s = setup();
  git(s.wt, 'checkout', '-q', '--detach');
  write(s.wt, 'own.txt', 'more\n');
  git(s.wt, 'commit', '-qam', 'detached, then left');
  git(s.wt, 'checkout', '-q', 'feat/a');
  kept(s, go(s), /alleen in het logboek/);
});

test('a commit that only ORIG_HEAD of this worktree holds', () => {
  const s = setup();
  const sha = git(s.wt, 'commit-tree', '-m', 'lone', 'HEAD^{tree}').trim();
  git(s.wt, 'update-ref', 'ORIG_HEAD', sha);
  kept(s, go(s), /alleen in het logboek/);
});

test('a repository that keeps its logs in another form', () => {
  const s = setup();
  const bin = fakeBin(s.top, 'git', `case "$*" in *extensions.refStorage*) echo reftable; exit 0;; esac; exec "${spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim()}" "$@"`);
  withPath(bin, () => kept(s, go(s), /logboek staat niet/));
});

test('an edit outside the sparse patterns', () => {
  const s = setup();
  git(s.wt, 'config', 'core.sparseCheckout', 'true');
  git(s.wt, 'config', 'sparse.expectFilesOutsideOfPatterns', 'true');
  git(s.wt, 'update-index', '--skip-worktree', 'app.txt');
  write(s.wt, 'app.txt', 'hidden edit\n');
  kept(s, go(s), /skip-worktree|gewijzigde/);
});

test('an amended commit stays in the log of its branch', () => {
  const s = setup();
  git(s.wt, 'commit', '-q', '--amend', '-m', 'amended');
  git(s.wt, 'push', '-qf');
  assert.equal(go(s).action, 'remove');
  assert.ok(git(s.main, 'reflog', 'feat/a'));
});

test('a detached head keeps its commit in a ref of its own', () => {
  const s = setup();
  git(s.wt, 'checkout', '-q', '--detach');
  const head = git(s.wt, 'rev-parse', 'HEAD').trim();
  git(s.main, 'branch', '-q', '-D', 'feat/a');
  assert.equal(go(s).action, 'remove');
  git(s.main, 'update-ref', '-d', 'refs/remotes/origin/feat/a');
  assert.match(git(s.main, 'for-each-ref', '--contains', head), /refs\/worktree-care\/\d{8}-wt-/);
});

test('exclude: a trailing slash, a link on the way and other case all count', () => {
  const s = setup();
  const link = path.join(s.top, 'link');
  fs.symlinkSync(s.top, link);
  const spellings = [`${s.wt}/`, path.join(link, 'wt'), ...(process.platform === 'linux' ? [] : [s.wt.toUpperCase()])];
  for (const p of spellings) {
    write(s.top, 'c.json', JSON.stringify({ exclude: [p] }));
    const cfg = loadConfig({ WORKTREE_CARE_CONFIG: path.join(s.top, 'c.json') });
    kept(s, go(s, { cfg }), /uitgesloten/);
  }
  write(s.top, 'c.json', JSON.stringify({ exclude: ['wt'] }));
  assert.throws(() => loadConfig({ WORKTREE_CARE_CONFIG: path.join(s.top, 'c.json') }), /geen volledig pad/);
});

test('assume-unchanged, also with a sparse checkout', () => {
  for (const sparse of [false, true]) {
    const s = setup();
    if (sparse) git(s.wt, 'config', 'core.sparseCheckout', 'true');
    git(s.wt, 'update-index', '--assume-unchanged', 'app.txt');
    write(s.wt, 'app.txt', 'hidden edit\n');
    kept(s, go(s), /skip-worktree of assume-unchanged/);
  }
});

test('a path that ps and lsof would write differently', () => {
  const s = setup();
  const odd = path.join(s.top, 'caf\u00e9');
  git(s.main, 'worktree', 'move', s.wt, odd);
  kept({ ...s, wt: odd }, go({ ...s, wt: odd }), /bijzonder teken/);
});

test('a folder where git sees another repository', () => {
  const s = setup();
  const other = setup();
  fs.writeFileSync(path.join(s.wt, '.git'), `gitdir: ${gitDirOf(other.wt)}\n`);
  kept(s, go(s), /andere map/);
});

test('an edited file or a checkout is activity', () => {
  const s = setup();
  deps(s.wt);
  write(s.wt, 'app.txt', 'changed\n');
  const soon = new Date(Date.now() + 29.9 * DAY);
  fs.utimesSync(path.join(s.wt, 'app.txt'), soon, soon);
  assert.equal(go(s).action, 'keep');
  const t = setup();
  deps(t.wt);
  const env = { ...GIT_ENV, GIT_COMMITTER_DATE: `${Math.floor(Date.now() / 1000) + 29.9 * 86400} +0000` };
  spawnSync('git', ['-C', t.wt, 'checkout', '-q', '--detach'], { env });
  assert.equal(go(t).action, 'keep');
});

test('a merge or a root commit with the subject of a gate commit is work', () => {
  const s = setup();
  newGateOnBase(s);
  git(s.wt, 'merge', '-q', '--no-ff', '-m', 'chore: push gate from main (x)', 'main');
  kept(s, go(s), /commits staan op geen remote/);
  const t = setup();
  git(t.wt, 'checkout', '-q', '--orphan', 'lone');
  git(t.wt, 'commit', '-qm', 'chore: push gate from main (x)');
  kept(t, go(t), /commits staan op geen remote/);
});

test('a gate commit that deletes a file the base deleted too', () => {
  const s = setup();
  git(s.main, 'rm', '-q', 'gate.json');
  git(s.main, 'commit', '-qm', 'no gate');
  git(s.main, 'push', '-q');
  git(s.wt, 'rm', '-q', 'gate.json');
  git(s.wt, 'commit', '-qm', 'chore: push gate from main (x)');
  assert.equal(go(s).action, 'remove');
});

// ---------- what never goes, continued: who and when ----------

test('a process that only holds a file open', async () => {
  const s = setup();
  write(s.wt, 'web/node_modules/db.sqlite', 'x');
  const p = spawn(process.execPath, ['-e', 'const fs = require("fs"); fs.openSync(process.env.F, "r+"); console.log("open"); setInterval(() => {}, 1000)'], { cwd: '/', env: { ...process.env, F: path.join(s.wt, 'web/node_modules/db.sqlite') }, stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    await new Promise((r) => p.stdout.once('data', r));
    if (process.platform === 'darwin') kept(s, go(s, { snap: realSnap }), /werkt in/);
  } finally {
    p.kill();
  }
});

test('a live holder of a lock written in another time zone', () => {
  const snap = { procs: new Map([[7, { start: 1000000 }]]) };
  assert.equal(lockHolder(snap, 'claude agent agent-a1 (pid 7 start Tue Nov 24 14:25:07 1999)', 2000000).live, true);
  assert.equal(lockHolder(snap, 'x (pid 7)', 900000).live, false);
});

test('tidy leaves a worktree where somebody works alone', () => {
  const s = setup();
  deps(s.wt);
  assert.deepEqual(tidy({ dir: s.wt, cfg: CFG, state: s.state, snap: () => ({ ...quiet(), paths: [s.wt] }) }), []);
  assert.ok(fs.existsSync(path.join(s.wt, 'src/__pycache__')));
});

test('a venv without pyvenv.cfg is not known to be rebuildable', () => {
  const s = setup();
  write(s.wt, '.venv/notes.txt', 'mine');
  kept(s, go(s), /genegeerd en niet herbouwbaar: \.venv/);
});

test('a repository inside a rebuildable folder', () => {
  const s = setup();
  write(s.wt, '.venv/pyvenv.cfg', 'x');
  git(s.wt, 'init', '-q', '.venv/src/lib');
  kept(s, go(s), /repo in een genegeerde map/);
  assert.ok(fs.existsSync(path.join(s.wt, '.venv/src/lib/.git')));
});

test('a tracked folder with a rebuildable name', () => {
  const s = setup();
  write(s.wt, 'web/dist/kept.js', 'product');
  git(s.wt, 'add', '-f', 'web/dist/kept.js');
  git(s.wt, 'commit', '-q', '-m', 'tracked dist');
  git(s.wt, 'push', '-q');
  write(s.wt, 'app.txt', 'changed\n');
  go(s);
  assert.ok(fs.existsSync(path.join(s.wt, 'web/dist/kept.js')));
});

test('a cache that ignores itself goes as a whole, with a tracked file in it stays', () => {
  const s = setup();
  write(s.wt, '.ruff_cache/.gitignore', '*\n');
  write(s.wt, '.ruff_cache/0.16/a', 'x');
  write(s.wt, 'api/.mypy_cache/.gitignore', '*\n');
  write(s.wt, 'api/.mypy_cache/kept.json', 'product');
  git(s.wt, 'add', '-f', 'api/.mypy_cache/kept.json');
  git(s.wt, 'commit', '-q', '-m', 'tracked cache');
  git(s.wt, 'push', '-q');
  assert.deepEqual(go(s).done, ['.ruff_cache']);
  assert.ok(fs.existsSync(path.join(s.wt, 'api/.mypy_cache/kept.json')));
});

test('a folder with a protected name is never opened, whatever is in it', () => {
  const s = setup();
  write(s.wt, '.harness/t/__pycache__/a.pyc', 'x');
  write(s.wt, '.e2e/cache/node_modules/a.js', 'x');
  write(s.wt, 'app.txt', 'changed\n');
  go(s);
  for (const f of ['.harness/t/__pycache__/a.pyc', '.e2e/cache/node_modules/a.js']) assert.ok(fs.existsSync(path.join(s.wt, f)), f);
});

test('a rebuildable name below a protected name', () => {
  const s = setup();
  write(s.wt, '.loops/a.md', 'tracked');
  git(s.wt, 'add', '-A');
  git(s.wt, 'commit', '-q', '-m', 'loops');
  git(s.wt, 'push', '-q');
  write(s.wt, '.loops/__pycache__/a.pyc', 'x');
  kept(s, go(s), /genegeerd en niet herbouwbaar: \.loops/);
  assert.ok(fs.existsSync(path.join(s.wt, '.loops/__pycache__/a.pyc')));
});

test('a symlinked node_modules: the folder it points to stays', () => {
  const s = setup();
  const shared = path.join(s.top, 'shared');
  write(shared, 'x.js', 'x');
  fs.symlinkSync(shared, path.join(s.wt, 'web/node_modules'));
  fs.appendFileSync(path.join(s.main, '.git/info/exclude'), 'node_modules\n');
  assert.equal(go(s).action, 'remove');
  assert.ok(fs.existsSync(path.join(shared, 'x.js')));
});

test('a file git was told to ignore changes in', () => {
  const s = setup();
  git(s.wt, 'update-index', '--skip-worktree', 'app.txt');
  write(s.wt, 'app.txt', 'hidden edit\n');
  kept(s, go(s), /skip-worktree/);
});

test('commit that is on no remote', () => {
  const s = setup();
  write(s.wt, 'own.txt', 'more\n');
  git(s.wt, 'commit', '-qam', 'local only');
  kept(s, go(s), /1 commits staan op geen remote/);
});

test('detached commit that is on no remote', () => {
  const s = setup();
  git(s.wt, 'checkout', '-q', '--detach');
  write(s.wt, 'own.txt', 'more\n');
  git(s.wt, 'commit', '-qam', 'detached');
  kept(s, go(s), /commits staan op geen remote/);
});


test('an automated gate commit does not keep it', () => {
  const s = setup();
  newGateOnBase(s);
  write(s.wt, 'gate.json', '{"v":2}');
  git(s.wt, 'commit', '-qam', 'chore: push gate from main (x)');
  assert.equal(go(s).action, 'remove');
});

test('a gate commit with other content than the base ever had is work', () => {
  const s = setup();
  write(s.wt, 'gate.json', '{"mine":1}');
  git(s.wt, 'commit', '-qam', 'chore: push gate from main (x)');
  kept(s, go(s), /1 commits staan op geen remote/);
});

test('a gate commit that also touches another file is work', () => {
  const s = setup();
  newGateOnBase(s);
  write(s.wt, 'gate.json', '{"v":2}');
  write(s.wt, 'app.txt', 'sneaked in\n');
  git(s.wt, 'commit', '-qam', 'chore: push gate from main (x)');
  kept(s, go(s), /commits staan op geen remote/);
});

test('a gate commit that puts another file back to an old version is work', () => {
  const s = setup();
  write(s.main, 'app.txt', 'newer\n');
  git(s.main, 'commit', '-qam', 'newer app');
  git(s.main, 'push', '-q');
  git(s.wt, 'merge', '-q', '-m', 'merge', 'main');
  git(s.wt, 'push', '-q');
  write(s.wt, 'app.txt', 'hello\n');
  git(s.wt, 'commit', '-qam', 'chore: push gate from main (x)');
  kept(s, go(s), /1 commits staan op geen remote/);
});

test('a gate commit does not count as activity', () => {
  const s = setup();
  newGateOnBase(s);
  const env = { ...GIT_ENV, GIT_COMMITTER_DATE: `${Math.floor(Date.now() / 1000) + 29.9 * 86400} +0000` };
  write(s.wt, 'gate.json', '{"v":2}');
  spawnSync('git', ['-C', s.wt, 'commit', '-qam', 'chore: push gate from main (x)'], { env });
  assert.equal(go(s, { apply: false }).action, 'remove');
});

for (const state of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_LOG', 'rebase-merge', 'rebase-apply', 'sequencer', 'index.lock']) {
  test(`git is busy: ${state}`, () => {
    const s = setup();
    deps(s.wt);
    fs.writeFileSync(path.join(git(s.wt, 'rev-parse', '--absolute-git-dir').trim(), state), git(s.wt, 'rev-parse', 'HEAD'));
    kept(s, go(s), /git is hier bezig/);
    assert.ok(fs.existsSync(path.join(s.wt, '.venv')));
  });
}

test('another worktree inside', () => {
  const s = setup();
  git(s.main, 'worktree', 'add', '-q', '-b', 'inner', path.join(s.wt, '.harness/inner'));
  write(s.wt, '.harness/inner/mine.txt', 'mine');
  kept(s, go(s), /andere werkboom/);
  assert.ok(fs.existsSync(path.join(s.wt, '.harness/inner/app.txt')));
});

test('submodule', () => {
  const s = setup();
  fs.mkdirSync(path.join(git(s.wt, 'rev-parse', '--absolute-git-dir').trim(), 'modules'));
  kept(s, go(s, { apply: false }), /^heeft submodules/);
});

// Another real volume, or null where this machine cannot make one.
function otherVolume() {
  const dir = tempDir('care-vol-');
  if (process.platform === 'linux') {
    if (fs.statSync('/dev/shm', { throwIfNoEntry: false })?.dev === fs.statSync(dir).dev || !fs.existsSync('/dev/shm')) return null;
    const at = fs.mkdtempSync('/dev/shm/care-');
    return { at, close: () => fs.rmSync(at, { recursive: true, force: true }) };
  }
  const image = path.join(dir, 'v.dmg');
  const at = path.join(dir, 'mnt');
  fs.mkdirSync(at);
  if (spawnSync('hdiutil', ['create', '-size', '30m', '-fs', 'APFS', '-volname', 'care', image]).status !== 0) return null;
  if (spawnSync('hdiutil', ['attach', '-nobrowse', '-mountpoint', at, image]).status !== 0) return null;
  return { at: fs.realpathSync.native(at), close: () => spawnSync('hdiutil', ['detach', '-force', at]) };
}

test('a worktree on another volume stays, also a clean one without anything to slim', (t) => {
  const vol = otherVolume();
  if (!vol) return t.skip('geen tweede volume te maken');
  try {
    const s = setup();
    const far = path.join(vol.at, 'wt');
    git(s.main, 'worktree', 'add', '-q', '-b', 'far', far);
    const at = { ...s, wt: far };
    kept(at, go(at), /ander volume/);
    deps(far);
    kept(at, go(at), /ander volume/);
    assert.ok(fs.existsSync(path.join(far, '.venv')));
    // The one on the same volume went.
    assert.ok(!fs.existsSync(s.wt));
  } finally {
    vol.close();
  }
});

test('excluded path', () => {
  const s = setup();
  kept(s, go(s, { cfg: { ...CFG, exclude: [s.wt] } }), /uitgesloten/);
});
