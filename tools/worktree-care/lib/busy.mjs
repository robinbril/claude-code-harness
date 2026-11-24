// Who is at work on this machine right now. When a source gives no answer, the sweep stops:
// "no answer" is not "nobody".
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pins } from './pins.mjs';
import { run, Unknown } from './run.mjs';

const DOCKER_MAX = () => Number(process.env.WORKTREE_CARE_DOCKER_MS) || 60000;
const unknown = (why) => new Unknown(why, { machine: true });

export const inside = (p, dir) => p === dir || p.startsWith(`${dir}/`);

export const real = (p) => {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return p;
  }
};

// Start time per pid, so a reused pid is not mistaken for the process that took the lock.
function processes() {
  const r = run('ps', ['-axww', '-o', 'pid=,lstart=,command=']);
  if (r.code !== 0) throw unknown('ps gaf geen antwoord');
  const rows = new Map();
  for (const line of r.out.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+[\d:]{8}\s+\d{4})\s+(.*)$/);
    if (m) rows.set(Number(m[1]), { start: Date.parse(m[2]), command: m[3] });
  }
  if (!rows.has(process.pid)) throw unknown('ps toont dit proces zelf niet');
  return rows;
}

// Working directories, programs, libraries and open files.
function openPaths() {
  const r = run('lsof', ['-n', '-P', '-w', '-Fpn'], { timeout: 120000 });
  if (r.missing) return procCwds();
  // lsof exits 1 when a single process could not be read; the output still counts.
  if (r.timedOut || r.code === null || !r.out.includes(`p${process.pid}\n`)) throw unknown('lsof gaf geen volledig antwoord');
  const paths = new Set();
  let own = false;
  for (const line of r.out.split('\n')) {
    if (line[0] === 'p') own = Number(line.slice(1)) === process.pid;
    else if (line[0] === 'n' && line[1] === '/' && !own) paths.add(line.slice(1));
  }
  return paths;
}

function procCwds() {
  if (!fs.existsSync('/proc/self/cwd')) throw unknown('lsof ontbreekt');
  const paths = new Set();
  for (const pid of fs.readdirSync('/proc').filter((n) => /^\d+$/.test(n) && Number(n) !== process.pid)) {
    for (const link of ['cwd', 'exe']) {
      try {
        paths.add(fs.readlinkSync(`/proc/${pid}/${link}`));
      } catch {}
    }
  }
  return paths;
}

const SOCKETS = () => (process.env.WORKTREE_CARE_DOCKER_SOCKET ? [process.env.WORKTREE_CARE_DOCKER_SOCKET] : [path.join(os.homedir(), '.docker/run/docker.sock'), '/var/run/docker.sock']);

// A scheduled task has a short PATH. Docker Desktop puts its program in the home folder.
export function dockerProgram() {
  const own = path.join(os.homedir(), '.docker', 'bin', 'docker');
  const onPath = (process.env.PATH || '').split(path.delimiter).some((d) => fs.existsSync(path.join(d, 'docker')));
  return !onPath && fs.existsSync(own) ? own : 'docker';
}

const NONE = { mounts: [], dirs: [] };

// Bind mounts of running containers. No daemon: nothing runs. No program but a daemon: no answer.
function dockerMounts() {
  const docker = dockerProgram();
  const ps = run(docker, ['ps', '-q', '--no-trunc'], { timeout: DOCKER_MAX() });
  if (ps.missing) {
    if (SOCKETS().some((f) => fs.existsSync(f))) throw unknown('docker draait, maar het programma staat niet in PATH');
    return NONE;
  }
  if (ps.timedOut) throw unknown('docker gaf geen antwoord');
  if (ps.code !== 0) {
    if (/cannot connect|failed to connect|connection refused|no such file|not running/i.test(ps.err)) return NONE;
    throw unknown(`docker ps faalde: ${ps.err.trim().slice(0, 120)}`);
  }
  const ids = ps.out.split('\n').filter(Boolean);
  if (!ids.length) return NONE;
  const ask = () => run(docker, ['inspect', '--format', '{{range .Mounts}}{{println "mount" .Source}}{{end}}{{println "dir" (index .Config.Labels "com.docker.compose.project.working_dir")}}', ...ids], { timeout: DOCKER_MAX() });
  // A container that stopped in between makes inspect fail: ask for what runs now.
  let r = ask();
  if (r.code === 1 && /no such object/i.test(r.err)) {
    ids.splice(0, ids.length, ...run(docker, ['ps', '-q', '--no-trunc'], { timeout: DOCKER_MAX() }).out.split('\n').filter(Boolean));
    r = ask();
  }
  if (r.code !== 0) throw unknown('docker inspect gaf geen antwoord');
  const of = (word) => r.out.split('\n').filter((l) => l.startsWith(`${word} /`)).map((l) => l.slice(word.length + 1).trim().replace(/^\/host_mnt(?=\/)/, ''));
  return { mounts: of('mount'), dirs: of('dir') };
}

// Claude Code keeps one file per session with its pid and folder.
function sessionDirs(alive) {
  const dir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'sessions');
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => /^\d+\.json$/.test(n));
  } catch {}
  return names.flatMap((n) => {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
      return s.cwd && alive(s.pid) ? [s.cwd] : [];
    } catch {
      return [];
    }
  });
}

export function snapshot(cfg = {}) {
  const at = Date.now();
  const procs = processes();
  const alive = (pid) => procs.has(Number(pid));
  const docker = dockerMounts();
  const paths = new Set([...openPaths(), ...docker.mounts, ...docker.dirs, ...sessionDirs(alive)]);
  return {
    at,
    procs,
    pins: pins(cfg.pinnedBy),
    paths: [...paths, ...[...paths].map(real)],
    mounts: [...docker.mounts, ...docker.mounts.map(real)],
    commands: [...procs].filter(([pid]) => pid !== process.pid).map(([, p]) => p.command),
  };
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function userOf(snap, dir) {
  const dirs = [...new Set([dir, real(dir)])];
  const at = snap.paths.find((p) => dirs.some((d) => inside(p, d)));
  if (at) return `een proces, sessie of container werkt in ${at}`;
  // A container that mounts a folder above it sees this worktree too.
  const above = snap.mounts.find((m) => m === '/' || dirs.some((d) => inside(d, m)));
  if (above) return `een container heeft ${above} gemount`;
  // macOS shows /private/tmp and /tmp for the same folder.
  const names = dirs.flatMap((d) => [d, d.replace(/^\/private(?=\/)/, '')]);
  const re = new RegExp(`(^|file://|[\\s"'=:<>,;()\\\\])(${names.map(escape).join('|')})(/|[\\s"':<>,;()\\\\]|$)`);
  const cmd = snap.commands.find((c) => re.test(c));
  if (cmd) return `een proces noemt deze map: ${cmd.slice(0, 80)}`;
  const pin = snap.pins.find((p) => re.test(p.text));
  return pin ? `${pin.file} start iets uit deze map` : null;
}

// A lock names its holder as "(pid N ...)". Without a pid nobody can check it, so it holds.
// A process that began after the lock was written got its number later: it is not the holder.
export function lockHolder(snap, reason, lockedAt) {
  const pid = /\bpid (\d+)/.exec(reason || '')?.[1];
  if (!pid) return { live: true, agent: null };
  const agent = /\bclaude agent (?:agent-)?([\w-]+)/.exec(reason)?.[1] ?? null;
  const proc = snap.procs.get(Number(pid));
  return { live: Boolean(proc) && !(proc.start > lockedAt + 5000), agent };
}
