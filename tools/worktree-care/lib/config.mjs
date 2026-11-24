// Defaults plus an optional JSON file. Unknown keys are refused: a typo in a limit would
// otherwise silently keep the default.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOUR = 3600000;

export const DEFAULTS = {
  // Off: hooks warn and refuse, and only a command you type removes something.
  autoSweep: false,
  // Folders the sweep searches for git repositories, two levels deep.
  roots: [],
  // Worktrees below these paths are never touched.
  exclude: [],
  // Extra files that name programs to start, such as a list of MCP servers.
  pinnedBy: [],
  // Branches that count as "merged into".
  baseBranches: ['development', 'acceptance', 'dev', 'main', 'master'],
  // A clean worktree whose commits are all on a remote goes after this many idle hours.
  removeMergedIdleHours: 72,
  removePushedIdleHours: 24 * 7,
  // Dependencies and caches go after this many idle hours, sooner when the disk is low.
  slimIdleHours: 24,
  slimIdleHoursLowDisk: 3,
  // A finished subagent may still be resumed: its folders stay this long.
  agentGraceHours: 0.5,
  // Automated commits that copy files from the base branch. Content is checked, not only the subject.
  syncCommits: [],
  // The ref that keeps the commit of a removed detached worktree goes after this many days.
  keepRefDays: 30,
  warnFreeGB: 40,
  minFreeGB: 15,
  buildCacheMaxGB: 20,
  buildCacheMaxGBLowDisk: 5,
};

export const configFile = (env = process.env) => env.WORKTREE_CARE_CONFIG || path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'worktree-care', 'config.json');
export const stateDir = (env = process.env) => env.WORKTREE_CARE_STATE || path.join(env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'worktree-care');

export const expandHome = (p) => (p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p);

// One spelling per folder: no trailing slash, no link on the way.
function place(file, p) {
  const abs = expandHome(p);
  if (!path.isAbsolute(abs)) throw new Error(`${file}: exclude ${p} is geen volledig pad`);
  try {
    return fs.realpathSync.native(abs);
  } catch {
    return path.resolve(abs);
  }
}

function checkSync(file, rule, i) {
  const bad = (why) => new Error(`${file}: syncCommits[${i}] ${why}`);
  const text = (x) => typeof x === 'string' && x !== '';
  if (!text(rule?.subject)) throw bad('heeft geen subject (een regex op de eerste regel van de commit)');
  if (!Array.isArray(rule.paths) || !rule.paths.length || !rule.paths.every(text)) throw bad('heeft geen paths (een lijst van bestanden en mappen/ die de commit mag raken)');
  try {
    new RegExp(rule.subject);
  } catch (e) {
    throw bad(`subject is geen geldige regex: ${e.message}`);
  }
}

export function loadConfig(env = process.env) {
  const file = configFile(env);
  const own = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const unknown = Object.keys(own).filter((k) => !(k in DEFAULTS));
  if (unknown.length) throw new Error(`${file}: onbekende sleutel ${unknown.join(', ')}`);
  for (const [k, v] of Object.entries(own)) {
    if (typeof v !== typeof DEFAULTS[k] || Array.isArray(v) !== Array.isArray(DEFAULTS[k])) throw new Error(`${file}: ${k} heeft het verkeerde type`);
    if (typeof v === 'number' && !(v >= 0)) throw new Error(`${file}: ${k} moet 0 of meer zijn`);
  }
  const cfg = { ...DEFAULTS, ...own };
  cfg.syncCommits.forEach((r, i) => checkSync(file, r, i));
  if (cfg.minFreeGB > cfg.warnFreeGB) throw new Error(`${file}: minFreeGB is hoger dan warnFreeGB`);
  return { ...cfg, roots: cfg.roots.map(expandHome), exclude: cfg.exclude.map((p) => place(file, p)), pinnedBy: cfg.pinnedBy.map(expandHome) };
}

export const hours = (n) => n * HOUR;
