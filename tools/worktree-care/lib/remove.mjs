// Takes one worktree away. The rebuildable folders and then the worktree itself leave with a rename.
// From then on nobody finds it, and everything is asked again about what lies there. Only what still
// may go is deleted; otherwise it all goes back.
import fs from 'node:fs';
import path from 'node:path';
import { git, run } from './run.mjs';
import { containsRepo } from './folders.mjs';
import { forget, burn, markFinal, moveBack, moveOut, moveTree, restoreTree } from './trash.mjs';

const GIT_REMOVE_MAX = 30 * 60000;
const REFS = 'refs/worktree-care/';
const DAY = 86400000;

// A branch keeps its commits. A detached head has only this worktree, so it gets a ref.
function saveHead(f, now) {
  if (f.branch) return null;
  const day = new Date(now).toISOString().slice(0, 10).replaceAll('-', '');
  const ref = `${REFS}${day}-${path.basename(f.origin).replace(/[^A-Za-z0-9-]/g, '-')}-${f.head.slice(0, 12)}`;
  git(f.main, 'update-ref', ref, f.head);
  return ref;
}

const lastLine = (r) => r.err.trim().split('\n').at(-1);

// look(at, origin) reads the worktree at `at` as it is now. Returns { why } when it stays, else { ref }.
function removeMoved(look, f, trash, now) {
  if (f.locked !== null) run('git', ['-C', f.main, 'worktree', 'unlock', f.path]);
  const { to, refused } = moveTree(f, trash);
  if (refused) return { why: refused };
  let why;
  try {
    const again = look(to, f.path);
    if (again?.d.action !== 'remove') why = again?.d.why ?? 'verdween tijdens het opruimen';
    else if (again.f.slim.length) why = `${again.f.slim[0].rel} verscheen tijdens het opruimen`;
    else {
      const ref = saveHead(again.f, now);
      markFinal(to);
      const r = run('git', ['-c', 'status.showUntrackedFiles=all', '-C', f.main, 'worktree', 'remove', to], { timeout: GIT_REMOVE_MAX });
      if (r.code === 0) {
        forget(to);
        return { ref };
      }
      why = `git weigert: ${lastLine(r)}`;
    }
  } catch (e) {
    why = `niet te bepalen: ${e.message}`;
  }
  if (restoreTree(to)) return { why };
  return { why: `${why}; op ${f.path} staat nu iets anders, de werkboom wacht in ${to}`, waits: true };
}

function relock(f) {
  if (f.locked === null || !fs.existsSync(f.path)) return;
  run('git', ['-C', f.main, 'worktree', 'lock', ...(f.locked ? ['--reason', f.locked] : []), f.path]);
}

export function removeWorktree(look, f, trash, now) {
  const folders = f.slim.map((s) => s.rel);
  if ([...folders, ...f.output].some((rel) => containsRepo(path.join(f.path, rel)))) return { why: 'er ligt een repo in een genegeerde map' };
  const moved = moveOut(f.path, folders, trash);
  let result;
  try {
    result = removeMoved(look, f, trash, now);
  } catch (e) {
    result = { why: `niet weg: ${e.code ?? e.message}`, waits: !fs.existsSync(f.path) };
  }
  if (result.waits) return result;
  if (result.why) {
    relock(f);
    moveBack(f.path, moved);
  } else burn(moved);
  return result;
}

// When a ref was made: the day in its name, otherwise the time of its file.
function madeAt(common, ref) {
  const m = /^refs\/worktree-care\/(\d{4})(\d\d)(\d\d)-/.exec(ref);
  if (m) return Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return fs.statSync(path.join(common, ref), { throwIfNoEntry: false })?.mtimeMs ?? Infinity;
}

export function pruneRefs({ main, common, days, now, apply, log }) {
  for (const line of git(main, 'for-each-ref', '--format=%(refname) %(objectname)', REFS).split('\n').filter(Boolean)) {
    const [ref, sha] = line.split(' ');
    if (now - madeAt(common, ref) <= days * DAY) continue;
    if (apply) git(main, 'update-ref', '-d', ref, sha);
    log(`ref    ${ref}  HEAD ${sha}  ouder dan ${days} dagen`);
  }
}
