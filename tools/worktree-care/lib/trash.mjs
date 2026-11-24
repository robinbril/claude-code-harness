// Folders and whole worktrees leave in one step (a rename inside the volume) and are deleted later.
// Until then the step can be undone, and nobody ever sees half a folder. Next to each lies a note
// that says where it came from, so a sweep that was killed can be undone too.
import fs from 'node:fs';
import path from 'node:path';
import { isAlive } from './lock.mjs';
import { run } from './run.mjs';

export const trashOf = (common) => path.join(common, 'worktree-care-trash');
const noteOf = (to) => `${to}.from`;
const slot = (trash) => path.join(trash, `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
const read = (file) => fs.readFileSync(file, 'utf8');
const noteAt = (to) => JSON.parse(read(noteOf(to)));
// A worktree whose deletion was stopped may have lost its .git: the note still knows.
const isTree = (to) => {
  try {
    return Boolean(noteAt(to).gitDir);
  } catch {
    return fs.existsSync(path.join(to, '.git'));
  }
};
const git = (main, ...args) => run('git', ['-C', main, ...args]);

// Taking something out is not work: the folder keeps the time it was last worked in.
function keepTime(dir, fn, after = dir) {
  const before = fs.statSync(dir, { throwIfNoEntry: false });
  try {
    return fn();
  } finally {
    if (before && fs.existsSync(after)) fs.utimesSync(after, before.atime, before.mtime);
  }
}

// ---------- folders ----------

export const moveOut = (root, rels, trash) => keepTime(root, () => takeOut(root, rels, trash));
export const moveBack = (root, moved) => keepTime(root, () => putBack(moved));

function takeOut(root, rels, trash) {
  fs.mkdirSync(trash, { recursive: true });
  const moved = [];
  for (const rel of rels) {
    const m = { rel, from: path.join(root, rel), to: slot(trash) };
    try {
      fs.writeFileSync(noteOf(m.to), JSON.stringify({ from: m.from, root }));
      fs.renameSync(m.from, m.to);
      moved.push(m);
    } catch (e) {
      fs.rmSync(noteOf(m.to), { force: true });
      if (e.code === 'ENOENT') continue;
      putBack(moved);
      throw e;
    }
  }
  return moved;
}

// Somebody may have installed again meanwhile: then theirs stays and ours goes.
function putBack(moved) {
  for (const m of moved) {
    if (!fs.existsSync(m.from) && fs.existsSync(path.dirname(m.from))) {
      fs.renameSync(m.to, m.from);
      fs.rmSync(noteOf(m.to), { force: true });
    } else erase(m.to);
  }
}

// A read-only folder cannot be emptied until it is made writable.
function unlockFolders(dir) {
  const st = fs.lstatSync(dir, { throwIfNoEntry: false });
  if (!st?.isDirectory()) return;
  fs.chmodSync(dir, st.mode | 0o700);
  for (const n of fs.readdirSync(dir)) unlockFolders(path.join(dir, n));
}

// Never throws: what cannot go now is tried again by the next sweep. Never a worktree: only git
// takes those away.
function erase(to) {
  if (isTree(to)) return false;
  for (const prepare of [() => {}, () => unlockFolders(to)]) {
    try {
      prepare();
      fs.rmSync(to, { recursive: true, force: true, maxRetries: 3 });
      fs.rmSync(noteOf(to), { force: true });
      return true;
    } catch {}
  }
  return false;
}

export const burn = (moved) => moved.filter((m) => !erase(m.to)).map((m) => m.rel);

// ---------- whole worktrees ----------

// Returns where the worktree is now, or { refused }.
export function moveTree({ main, path: from, gitDir }, trash) {
  fs.mkdirSync(trash, { recursive: true });
  const to = slot(trash);
  const note = { from, main, gitDir, gitdir: read(path.join(gitDir, 'gitdir')), dotgit: read(path.join(from, '.git')) };
  fs.writeFileSync(noteOf(to), JSON.stringify(note));
  const r = keepTime(from, () => git(main, 'worktree', 'move', from, to), to);
  if (r.code === 0) return { to };
  // git may have been stopped after the rename.
  if (fs.existsSync(to)) restoreTree(to);
  else fs.rmSync(noteOf(to), { force: true });
  return { refused: `git weigert: ${r.err.trim().split('\n').at(-1)}` };
}

// From here on git may delete files: what a stop leaves is completed from the index.
export function markFinal(to) {
  fs.writeFileSync(noteOf(to), JSON.stringify({ ...noteAt(to), final: true }));
}

export const forget = (to) => fs.rmSync(noteOf(to), { force: true });

// An empty folder may have come in its place; anything else is somebody's and stays.
function freeSpot(from) {
  if (!fs.existsSync(from)) return true;
  try {
    fs.rmdirSync(from);
    return true;
  } catch {
    return false;
  }
}

// Back where it was. True when it stands there again.
export function restoreTree(to) {
  const n = noteAt(to);
  if (!freeSpot(n.from)) return false;
  fs.mkdirSync(path.dirname(n.from), { recursive: true });
  const intact = fs.existsSync(path.join(to, '.git')) && keepTime(to, () => git(n.main, 'worktree', 'move', to, n.from), n.from).code === 0;
  if (!intact) {
    keepTime(to, () => fs.renameSync(to, n.from), n.from);
    fs.writeFileSync(path.join(n.from, '.git'), n.dotgit);
    fs.writeFileSync(path.join(n.gitDir, 'gitdir'), n.gitdir);
  }
  // Writes what is missing, never over what is there.
  if (n.final) git(n.from, 'checkout-index', '-a', '-q');
  forget(to);
  return true;
}

// ---------- after a sweep that was killed ----------

// The name holds the pid and the moment, so a pid that was given out again does not count.
function stillRunning(name) {
  const [pid, at] = name.split('-');
  return isAlive(Number(pid), parseInt(at, 36));
}

function recover(to, waiting) {
  const n = noteAt(to);
  if (!fs.existsSync(to)) return forget(to);
  if (n.gitDir) return restoreTree(to) || waiting.add(n.from);
  // Its worktree could not go back yet: what stands there now is of another.
  if (waiting.has(n.root)) return null;
  return moveBack(path.dirname(n.from), [{ to, from: n.from }]);
}

// Everything goes back to a worktree that still stands; the rest goes.
export function emptyTrash(trash) {
  let names = [];
  try {
    names = fs.readdirSync(trash);
  } catch {}
  const entries = [...new Set(names.map((n) => n.replace(/\.from$/, '')))].filter((n) => !stillRunning(n)).map((n) => path.join(trash, n));
  const waiting = new Set();
  // Worktrees first: the folders belong inside them.
  for (const to of entries.sort((a, b) => isTree(b) - isTree(a))) {
    try {
      recover(to, waiting);
    } catch {
      erase(to);
    }
  }
}
