#!/usr/bin/env node
// Claude Code hook: node hook.mjs <guard|after|agent-end|session-end>, event on stdin.
// Never in the way: any error of its own lets the tool call through.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configFile, loadConfig, stateDir } from './lib/config.mjs';
import { freeGB, level } from './lib/disk.mjs';
import { heavyTool, isImageBuild } from './lib/guard.mjs';
import { worktreesOf } from './lib/repos.mjs';

const CARE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'care.mjs');
const THROTTLE = 15 * 60000;

function background(args, cwd) {
  if (process.env.WORKTREE_CARE_NO_SPAWN) return process.stderr.write(`spawn: ${args.join(' ')}\n`);
  spawn(process.execPath, [CARE, ...args], { cwd, detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
}

// At most once per interval, however many sessions ask for it.
function due(name) {
  const f = path.join(stateDir(), `${name}.stamp`);
  const last = fs.statSync(f, { throwIfNoEntry: false })?.mtimeMs ?? 0;
  if (Date.now() - last < THROTTLE) return false;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, '');
  return true;
}

// Writing the stamp can fail on a full disk; the answer may not depend on it.
function startSweep(cfg, cwd) {
  try {
    if (!cfg.autoSweep || !due('sweep')) return false;
    background(['sweep', '--apply'], cwd);
    return true;
  } catch {
    return false;
  }
}

function guard(event, cfg) {
  const cwd = event.cwd || process.cwd();
  const free = freeGB(cwd);
  const now = level(free, cfg);
  if (now === 'ok') return 0;
  const what = heavyTool(event.tool_name, event.tool_input);
  if (!what || /\bWORKTREE_CARE_SKIP=\S/.test(event.tool_input?.command ?? '')) return 0;
  const started = startSweep(cfg, cwd);
  if (now === 'low') return 0;
  process.stderr.write(
    `[worktree-care] Nog ${free.toFixed(1)} GB vrij, onder de vloer van ${cfg.minFreeGB} GB: ${what} start niet.\n` +
      `${started ? 'Het opruimen is gestart; probeer het over een paar minuten opnieuw.' : `Ruim op met: node "${CARE}" sweep --apply`}\n` +
      `Kijk wat er ligt: node "${CARE}" sweep. Grens aanpassen: minFreeGB in ${configFile()}. Eenmalig toch: WORKTREE_CARE_SKIP=<reden> voor het commando.\n`,
  );
  return 2;
}

function after(event, cfg) {
  if (cfg.autoSweep && event.tool_name === 'Bash' && isImageBuild(event.tool_input?.command) && due('build-cache')) background(['build-cache', '--apply'], '/');
  return 0;
}

// The worktree of a subagent is called agent-<id>. Noted here, so its lock no longer means "at work".
function agentEnd(event, cfg) {
  const id = String(event.agent_id || '');
  if (!/^[\w-]+$/.test(id)) return 0;
  const wt = worktreesOf(event.cwd || process.cwd()).find((w) => !w.isMain && path.basename(w.path) === `agent-${id}`);
  if (!wt) return 0;
  const mark = path.join(stateDir(), 'agents', id);
  fs.mkdirSync(path.dirname(mark), { recursive: true });
  fs.writeFileSync(mark, wt.path);
  if (cfg.autoSweep) background(['tidy', wt.path, '--after', '20'], '/');
  return 0;
}

function sessionEnd(event, cfg) {
  const dir = event.cwd && worktreesOf(event.cwd).find((w) => !w.isMain && (event.cwd === w.path || event.cwd.startsWith(`${w.path}/`)));
  if (dir && cfg.autoSweep) background(['tidy', dir.path, '--after', '60'], '/');
  return 0;
}

const EVENTS = { guard, after, 'agent-end': agentEnd, 'session-end': sessionEnd };

let code = 0;
try {
  code = EVENTS[process.argv[2]](JSON.parse(fs.readFileSync(0, 'utf8')), loadConfig());
} catch (e) {
  process.stderr.write(`[worktree-care] ${process.argv[2]}: ${e.message}\n`);
}
process.exitCode = code;
