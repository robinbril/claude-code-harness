// One pass over the worktrees. Facts are read again right before each action: between the plan
// and the deed somebody may have started work.
import fs from 'node:fs';
import path from 'node:path';
import { hours } from './config.mjs';
import { git, Unknown } from './run.mjs';
import { findRepos, worktreesOf } from './repos.mjs';
import { inside, real, snapshot } from './busy.mjs';
import { collect } from './facts.mjs';
import { decide, slimmable } from './decide.mjs';
import { containsRepo } from './folders.mjs';
import { freeGB, level, pruneBuildCache } from './disk.mjs';
import { takeLock } from './lock.mjs';
import { pruneRefs, removeWorktree } from './remove.mjs';
import { burn, emptyTrash, moveOut, trashOf } from './trash.mjs';

const keep = (why) => ({ action: 'keep', why });

// Reads one worktree now. ctx: { dir, cfg, state, snap, busySince, opts, now }. origin: where it
// stood before it was moved to be removed.
function look(ctx, at, { snap, origin } = {}) {
  const busy = snap ?? ctx.snap();
  const all = worktreesOf(ctx.dir);
  const wt = all.find((w) => w.path === at);
  if (!wt) return null;
  const f = collect({ ...wt, origin: origin ?? wt.path }, all, ctx.cfg, busy, ctx.state, ctx.busySince);
  return { f, d: decide(f, ctx.cfg, ctx.now(), ctx.opts) };
}

function slim(f, kinds, trash) {
  const done = [];
  for (const { rel } of slimmable(f).filter((s) => kinds.includes(s.kind))) {
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

function act(ctx, at, trash) {
  const seen = look(ctx, at);
  if (!seen) return null;
  const { f, d } = seen;
  if (d.action === 'slim') return { f, d: { ...d, done: slim(f, ['cache', 'deps', 'build'], trash) } };
  if (d.action !== 'remove') return seen;
  let r;
  try {
    r = removeWorktree((to, origin) => look(ctx, to, { origin }), f, trash, ctx.now());
  } catch (e) {
    r = { why: `niet weg: ${e.code ?? e.message}` };
  }
  return { f, d: r.why ? keep(r.why) : { ...d, ref: r.ref } };
}

function sweepRepo({ common, dir }, ctx, apply, only, emit, log) {
  const trash = trashOf(real(common));
  if (apply) emptyTrash(trash);
  const all = worktreesOf(dir);
  // From the main checkout: any other worktree may be gone halfway.
  const here = { ...ctx, dir: all[0].path };
  pruneRefs({ main: all[0].path, common, days: ctx.cfg.keepRefDays, now: ctx.now(), apply, log });
  const first = ctx.snap();
  for (const wt of all.filter((w) => !only || only.includes(w.path))) {
    const lowDisk = level(freeGB(common), ctx.cfg) !== 'ok';
    const wait = Math.min(lowDisk ? ctx.cfg.slimIdleHoursLowDisk : ctx.cfg.slimIdleHours, ctx.cfg.removeMergedIdleHours, ctx.cfg.removePushedIdleHours);
    const now = { ...here, opts: { lowDisk }, busySince: ctx.now() - hours(wait) };
    const waiting = inside(wt.path, trash);
    let seen = waiting ? { f: {}, d: keep('wacht op terugzetten: op de oude plek staat iets anders') } : look(now, wt.path, { snap: first });
    if (seen && apply && seen.d.action !== 'keep') seen = act(now, wt.path, trash);
    if (seen) emit({ repo: path.basename(all[0].path), path: wt.path, branch: wt.branch, head: wt.head, slim: seen.f.slim?.map((s) => s.rel) ?? [], ...seen.d });
  }
}

// Enough to bring a worktree back by hand: git worktree add <path> <branch or commit>.
const line = (r) => [r.action.padEnd(6), `${r.path} `, r.branch ? `branch ${r.branch} ` : 'los ', `HEAD ${r.head} `, r.ref && `${r.ref} `, r.why].filter(Boolean).join(' ');

// repos: [{common, dir}]. only: limit to these worktree paths. Returns one row per worktree.
export function sweep({ repos, cfg, state, apply = false, only = null, log = () => {}, snap = () => snapshot(cfg), now = Date.now }) {
  const rows = [];
  const emit = (row) => {
    rows.push(row);
    log(line(row));
  };
  for (const repo of repos) {
    try {
      sweepRepo(repo, { cfg, state, snap, now }, apply, only, emit, log);
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
export function tidy({ dir, cfg, state, apply = false, snap = () => snapshot(cfg) }) {
  const unlock = takeLock(state);
  if (!unlock) return [];
  try {
    const all = worktreesOf(dir);
    const wt = all.find((w) => w.path === dir);
    if (!wt) return [];
    const f = collect(wt, all, cfg, snap(), state);
    if (f.hold) return [];
    if (!apply) return slimmable(f).filter((x) => x.kind === 'cache').map((x) => x.rel);
    return slim(f, ['cache'], trashOf(git(dir, 'rev-parse', '--path-format=absolute', '--git-common-dir').trim()));
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
