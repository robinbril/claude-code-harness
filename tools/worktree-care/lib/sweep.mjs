// One pass over the worktrees. Facts are read again right before each action: between the plan
// and the deed somebody may have started work.
import fs from 'node:fs';
import path from 'node:path';
import { hours } from './config.mjs';
import { git, run, Unknown } from './run.mjs';
import { findRepos, worktreesOf } from './repos.mjs';
import { snapshot } from './busy.mjs';
import { collect } from './facts.mjs';
import { decide } from './decide.mjs';
import { containsRepo } from './folders.mjs';
import { freeGB, level, pruneBuildCache } from './disk.mjs';
import { takeLock } from './lock.mjs';
import { burn, emptyTrash, moveBack, moveOut, trashOf } from './trash.mjs';

const GIT_REMOVE_MAX = 30 * 60000;
const keep = (why) => ({ action: 'keep', why });

// Reads one worktree now. ctx: { dir, cfg, state, snap, busySince, opts, now }.
function look(ctx, at, snap) {
  const busy = snap ?? ctx.snap();
  const all = worktreesOf(ctx.dir);
  const wt = all.find((w) => w.path === at);
  if (!wt) return null;
  const f = collect(wt, all, ctx.cfg, busy, ctx.state, ctx.busySince);
  return { f, d: decide(f, ctx.cfg, ctx.now(), ctx.opts) };
}

const rebuildable = (f, kinds) => f.slim.filter((s) => kinds.includes(s.kind)).map((s) => s.rel);

function slim(f, trash, kinds) {
  const done = [];
  for (const rel of rebuildable(f, kinds)) {
    if (containsRepo(path.join(f.path, rel))) continue;
    try {
      const moved = moveOut(f.path, [rel], trash);
      const stuck = burn(moved);
      done.push(...moved.map((m) => (stuck.includes(m.rel) ? `${m.rel} (wissen volgt)` : m.rel)));
    } catch (e) {
      done.push(`${rel} (mislukt: ${e.code ?? e.message})`);
    }
  }
  return done;
}

// A branch keeps its commits. A detached head has only this worktree, so it gets a ref.
function saveHead(f) {
  if (f.branch) return;
  const name = `refs/worktree-care/${path.basename(f.path).replace(/[^A-Za-z0-9-]/g, '-')}-${f.head.slice(0, 12)}`;
  git(f.main, 'update-ref', name, f.head);
}

function gitRemove(f) {
  if (f.locked !== null) run('git', ['-C', f.main, 'worktree', 'unlock', f.path]);
  const r = run('git', ['-c', 'status.showUntrackedFiles=all', '-C', f.main, 'worktree', 'remove', f.path], { timeout: GIT_REMOVE_MAX });
  if (r.code === 0) return null;
  if (f.locked !== null && fs.existsSync(f.path)) run('git', ['-C', f.main, 'worktree', 'lock', ...(f.locked ? ['--reason', f.locked] : []), f.path]);
  return `git weigert: ${r.err.trim().split('\n').at(-1)}`;
}

// The big folders leave first and can come back. Then everything is asked again: processes,
// locks, files and commits. What remains is small, so git is done in a moment.
function remove(ctx, f, trash) {
  const doomed = [...rebuildable(f, ['cache', 'deps']), ...f.output];
  if (doomed.some((rel) => containsRepo(path.join(f.path, rel)))) return keep('er ligt een repo in een genegeerde map');
  const moved = moveOut(f.path, rebuildable(f, ['cache', 'deps']), trash);
  let why = null;
  try {
    const again = look(ctx, f.path);
    if (again?.d.action !== 'remove') why = again?.d.why ?? 'verdween tijdens het opruimen';
    else if (again.f.slim.length) why = `${again.f.slim[0].rel} verscheen tijdens het opruimen`;
    else {
      saveHead(again.f);
      why = gitRemove(again.f);
    }
  } catch (e) {
    why = `niet te bepalen: ${e.message}`;
  }
  if (why) {
    moveBack(f.path, moved);
    return keep(why);
  }
  burn(moved);
  return null;
}

function act(ctx, at, trash) {
  const seen = look(ctx, at);
  if (!seen) return null;
  const { f, d } = seen;
  if (d.action === 'slim') return { f, d: { ...d, done: slim(f, trash, ['cache', 'deps']) } };
  if (d.action !== 'remove') return { f, d };
  let refused;
  try {
    refused = remove(ctx, f, trash);
  } catch (e) {
    refused = keep(`niet weg: ${e.code ?? e.message}`);
  }
  return { f, d: refused ?? d };
}

function sweepRepo({ common, dir }, ctx, apply, only, emit) {
  const trash = trashOf(common);
  if (apply) emptyTrash(trash);
  const all = worktreesOf(dir);
  // From the main checkout: any other worktree may be gone halfway.
  const here = { ...ctx, dir: all[0].path, snap: ctx.snap };
  const first = ctx.snap();
  for (const wt of all.filter((w) => !only || only.includes(w.path))) {
    const lowDisk = level(freeGB(common), ctx.cfg) !== 'ok';
    const wait = Math.min(lowDisk ? ctx.cfg.slimIdleHoursLowDisk : ctx.cfg.slimIdleHours, ctx.cfg.removeMergedIdleHours, ctx.cfg.removePushedIdleHours);
    const now = { ...here, opts: { lowDisk }, busySince: ctx.now() - hours(wait) };
    let seen = look(now, wt.path, first);
    if (seen && apply && seen.d.action !== 'keep') seen = act(now, wt.path, trash);
    if (seen) emit({ repo: path.basename(all[0].path), path: wt.path, branch: wt.branch, slim: seen.f.slim?.map((s) => s.rel) ?? [], ...seen.d });
  }
}

// repos: [{common, dir}]. only: limit to these worktree paths. Returns one row per worktree.
export function sweep({ repos, cfg, state, apply = false, only = null, log = () => {}, snap = () => snapshot(cfg), now = Date.now }) {
  const rows = [];
  const emit = (row) => {
    rows.push(row);
    log(`${row.action.padEnd(6)} ${row.path}  ${row.why}`);
  };
  for (const repo of repos) {
    try {
      sweepRepo(repo, { cfg, state, snap, now }, apply, only, emit);
    } catch (e) {
      if (!(e instanceof Unknown)) throw e;
      // No answer about the machine stops everything, about one repository only that one.
      if (e.machine) throw e;
      log(`! ${e.message}`);
    }
  }
  return rows;
}

// After a subagent or session ends: its test caches go at once, unless somebody is still in there.
export function tidy({ dir, cfg, state, snap = () => snapshot(cfg) }) {
  const unlock = takeLock(state);
  if (!unlock) return [];
  try {
    const all = worktreesOf(dir);
    const wt = all.find((w) => w.path === dir);
    if (!wt) return [];
    const f = collect(wt, all, cfg, snap(), state);
    if (f.hold) return [];
    return slim(f, trashOf(git(dir, 'rev-parse', '--path-format=absolute', '--git-common-dir').trim()), ['cache']);
  } finally {
    unlock();
  }
}

const AGENT_MARK_KEEP = 7 * 86400000;
function dropOldMarks(state) {
  const dir = path.join(state, 'agents');
  for (const n of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const f = path.join(dir, n);
    if (Date.now() - fs.statSync(f).mtimeMs > AGENT_MARK_KEEP) fs.rmSync(f, { force: true });
  }
}

export function fullSweep({ roots, cfg, state, apply, log }) {
  const unlock = takeLock(state);
  if (!unlock) return { busy: true, rows: [] };
  try {
    if (apply) dropOldMarks(state);
    const repos = findRepos(roots);
    const before = freeGB(state);
    const rows = sweep({ repos, cfg, state, apply, log });
    log(pruneBuildCache(cfg, { lowDisk: level(freeGB(state), cfg) !== 'ok', dryRun: !apply }));
    return { rows, repos: repos.length, before, after: freeGB(state) };
  } finally {
    unlock();
  }
}
