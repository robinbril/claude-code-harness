// Folders leave in one step (a rename inside the volume) and are deleted later. Until then the
// step can be undone, and nobody ever sees half a folder.
import fs from 'node:fs';
import path from 'node:path';
import { isAlive } from './lock.mjs';

export const trashOf = (common) => path.join(common, 'worktree-care-trash');
const note = (to) => `${to}.from`;

// Taking something out is not work: the folder keeps the time it was last worked in.
function keepTime(dir, fn) {
  const before = fs.statSync(dir, { throwIfNoEntry: false });
  try {
    return fn();
  } finally {
    if (before && fs.existsSync(dir)) fs.utimesSync(dir, before.atime, before.mtime);
  }
}

export const moveOut = (root, rels, trash) => keepTime(root, () => takeOut(root, rels, trash));
export const moveBack = (root, moved) => keepTime(root, () => putBack(moved));

function takeOut(root, rels, trash) {
  fs.mkdirSync(trash, { recursive: true });
  const moved = [];
  for (const rel of rels) {
    const m = { rel, from: path.join(root, rel), to: path.join(trash, `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`) };
    try {
      fs.writeFileSync(note(m.to), m.from);
      fs.renameSync(m.from, m.to);
      moved.push(m);
    } catch (e) {
      fs.rmSync(note(m.to), { force: true });
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
      fs.rmSync(note(m.to), { force: true });
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

// Never throws: what cannot go now is tried again by the next sweep.
function erase(to) {
  for (const prepare of [() => {}, () => unlockFolders(to)]) {
    try {
      prepare();
      fs.rmSync(to, { recursive: true, force: true, maxRetries: 3 });
      fs.rmSync(note(to), { force: true });
      return true;
    } catch {}
  }
  return false;
}

export const burn = (moved) => moved.filter((m) => !erase(m.to)).map((m) => m.rel);

// What a sweep that was killed left behind: back if its worktree still stands, otherwise gone.
export function emptyTrash(trash) {
  let names = [];
  try {
    names = fs.readdirSync(trash);
  } catch {}
  for (const n of names.filter((x) => !x.endsWith('.from'))) {
    const pid = Number(n.split('-')[0]);
    if (pid === process.pid || isAlive(pid)) continue;
    const to = path.join(trash, n);
    try {
      const from = fs.readFileSync(note(to), 'utf8');
      moveBack(path.dirname(from), [{ to, from }]);
    } catch {
      erase(to);
    }
  }
}
