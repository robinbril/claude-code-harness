// One sweep at a time. The file appears with its content in one step (link), and only its owner or
// a single taker of a dead lock ever removes it.
import fs from 'node:fs';
import path from 'node:path';
import { run } from './run.mjs';

const STEAL_MAX = 60000;

export function isAlive(pid, since = Infinity) {
  try {
    process.kill(pid, 0);
  } catch (e) {
    if (e.code !== 'EPERM') return false;
  }
  if (since === Infinity) return true;
  const start = Date.parse(run('ps', ['-o', 'lstart=', '-p', String(pid)]).out.trim());
  return !(start > since + 5000);
}

function create(file) {
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tmp, JSON.stringify({ pid: process.pid, at: Date.now() }));
  try {
    fs.linkSync(tmp, file);
    return true;
  } catch (e) {
    if (e.code === 'EEXIST') return false;
    throw e;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function holder(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    return { pid: 0, at: 0 };
  }
}

// While one process holds the steal file, nobody else removes the lock: what it reads stays true.
function steal(file) {
  const gate = `${file}.steal`;
  const age = Date.now() - (fs.statSync(gate, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
  if (age > STEAL_MAX) {
    // Renamed away, not removed: of two that see the same dead file, one gets it.
    const mine = `${gate}.${process.pid}`;
    try {
      fs.renameSync(gate, mine);
      fs.rmSync(mine, { force: true });
    } catch {
      return false;
    }
  }
  if (!create(gate)) return false;
  try {
    const h = holder(file);
    if (h && h.pid && isAlive(h.pid, h.at)) return false;
    fs.rmSync(file, { force: true });
    return create(file);
  } finally {
    fs.rmSync(gate, { force: true });
  }
}

export function takeLock(state) {
  fs.mkdirSync(state, { recursive: true });
  const file = path.join(state, 'sweep.lock');
  if (!create(file) && !steal(file)) return null;
  return () => {
    if (holder(file)?.pid === process.pid) fs.rmSync(file, { force: true });
  };
}
