// Everything the decision needs to know about one worktree, read at one moment.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { git, list0, Unknown } from './run.mjs';
import { ignored } from './folders.mjs';
import { inside, lockHolder, userOf } from './busy.mjs';
import { localCommits } from './commits.mjs';

const BUSY_STATE = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_LOG', 'rebase-merge', 'rebase-apply', 'sequencer', 'index.lock'];

const mtime = (f) => fs.lstatSync(f, { throwIfNoEntry: false })?.mtimeMs ?? 0;

// Last time somebody worked here. The index does not count: reading `git status` rewrites it.
function lastActivity(wt, gitDir, files, cfg) {
  const times = [mtime(wt.path), ...files.slice(0, 500).map((f) => mtime(path.join(wt.path, f)))];
  const log = path.join(gitDir, 'logs', 'HEAD');
  if (fs.existsSync(log)) {
    for (const line of fs.readFileSync(log, 'utf8').trim().split('\n').slice(-50)) {
      const m = line.match(/> (\d+) [+-]\d{4}\t(.*)$/);
      const subject = m?.[2].replace(/^commit[^:]*: /, '') ?? '';
      if (m && !cfg.syncCommits.some((s) => new RegExp(s.subject).test(subject))) times.push(Number(m[1]) * 1000);
    }
  }
  // Claude Code writes the transcripts of a session under the name of its folder.
  const projects = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects', wt.path.replace(/[^A-Za-z0-9]/g, '-'));
  if (fs.existsSync(projects)) for (const n of fs.readdirSync(projects)) if (n.endsWith('.jsonl')) times.push(mtime(path.join(projects, n)));
  return Math.max(...times);
}

function status(dir) {
  const tracked = [];
  const untracked = [];
  for (const r of list0(git(dir, 'status', '--porcelain', '-z', '--untracked-files=all', '--ignore-submodules=none', '--no-renames'))) (r.startsWith('??') ? untracked : tracked).push(r.slice(3));
  return { tracked, untracked };
}

// Files git was told not to look at: an edit in them does not show in `git status`.
function hidden(dir) {
  const sparse = git(dir, 'config', '--type=bool', '--default=false', '--get', 'core.sparseCheckout').trim() === 'true';
  const flagged = list0(git(dir, 'ls-files', '-z', '-v')).filter((l) => /^([a-z]|S) /.test(l));
  // With a sparse checkout S is ordinary for a file that is not there.
  return flagged.filter((l) => !sparse || l[0] !== 'S' || fs.existsSync(path.join(dir, l.slice(2)))).map((l) => l.slice(2));
}

const low = (p) => (process.platform === 'linux' ? p : p.toLowerCase());
const excluded = (p, cfg) => cfg.exclude.some((d) => [p, realOf(p)].some((q) => inside(low(q), low(d))));
const realOf = (p) => {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return p;
  }
};

const finishedAgent = (agent, state) => (agent ? mtime(path.join(state, 'agents', agent.replace(/[^\w-]/g, ''))) : 0);

// busySince: whoever worked here after that moment is at work; the rest need not be looked up.
export function collect(wt, all, cfg, snap, state, busySince = Infinity) {
  const base = { path: wt.path, branch: wt.branch, head: wt.head, main: wt.main, locked: wt.locked };
  const hold = (why) => ({ ...base, hold: why });
  if (wt.isMain || wt.bare) return hold('hoofdcheckout');
  // ps and lsof write such a path differently: nobody would be seen at work in it.
  if (!/^[\x20-\x5b\x5d-\x7e]+$/.test(wt.path)) return hold('bijzonder teken in het pad');
  if (excluded(wt.path, cfg)) return hold('uitgesloten in de config');
  if (!fs.existsSync(path.join(wt.path, '.git'))) return hold('map bestaat niet meer (git worktree prune)');
  try {
    const gitDir = git(wt.path, 'rev-parse', '--absolute-git-dir').trim();
    // A .git file that points elsewhere belongs to another repository: not ours to judge.
    if (git(wt.path, 'config', '--default=files', '--get', 'extensions.refStorage').trim() !== 'files') return hold('logboek staat niet in bestanden');
    const back = fs.readFileSync(path.join(gitDir, 'gitdir'), 'utf8').trim();
    const own = realOf(path.dirname(path.resolve(gitDir, back))) === realOf(wt.path);
    if (!own || git(wt.path, 'rev-parse', '--show-toplevel').trim() !== realOf(wt.path)) return hold('git ziet hier een andere map');
    const op = BUSY_STATE.find((n) => fs.existsSync(path.join(gitDir, n)));
    if (op) return hold(`git is hier bezig (${op})`);
    const user = userOf(snap, wt.path);
    if (user) return hold(user);
    const lock = wt.locked === null ? null : lockHolder(snap, wt.locked, mtime(path.join(gitDir, 'locked')));
    const seen = lastActivity(wt, gitDir, [], cfg);
    if (!lock && seen > busySince) return hold(`gebruikt op ${new Date(seen).toISOString().slice(0, 16)}`);
    const { tracked, untracked } = status(wt.path);
    const ign = ignored(wt.path, wt.main);
    return {
      ...base,
      lock,
      agentDoneAt: finishedAgent(lock?.agent, state),
      tracked,
      untracked,
      hidden: hidden(wt.path),
      ignored: ign.keep,
      output: ign.output,
      slim: ign.slim,
      nested: all.filter((o) => o.path !== wt.path && inside(o.path, wt.path)).map((o) => o.path),
      submodules: fs.existsSync(path.join(gitDir, 'modules')),
      ...localCommits(wt.path, cfg, gitDir, wt.branch),
      activeAt: lastActivity(wt, gitDir, [...tracked, ...untracked], cfg),
    };
  } catch (e) {
    if (e instanceof Unknown || e.code) return hold(`niet te bepalen: ${e.message}`);
    throw e;
  }
}
