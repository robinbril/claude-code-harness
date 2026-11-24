#!/usr/bin/env node
// worktree-care: keeps agent worktrees, test caches and the Docker build cache from filling the disk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, configFile, stateDir } from './lib/config.mjs';
import { freeGB, level, pruneBuildCache } from './lib/disk.mjs';
import { fullSweep, tidy } from './lib/sweep.mjs';
import { git, Unknown } from './lib/run.mjs';
import { doctor } from './lib/doctor.mjs';
import { schedule } from './lib/schedule.mjs';

const HELP = `worktree-care

  sweep [--apply] [--json]   wat zou er weggaan; met --apply gaat het weg
  tidy <werkboom> [--apply]  welke testcaches van één werkboom weg zouden gaan; met --apply gaan ze weg
  build-cache [--apply]      Docker-bouwcache terug onder de grens
  schedule [--remove]        elke drie uur sweep --apply (launchd of crontab)
  status                     vrije ruimte en grenzen
  doctor                     delen pnpm, uv en Playwright hun opslag op deze machine

Config: ${configFile()}`;

const out = (s) => {
  process.stdout.write(`${s}\n`);
  return 0;
};
const [cmd, ...args] = process.argv.slice(2);
const apply = args.includes('--apply');

function logTo(state) {
  if (!apply) return args.includes('--json') ? () => {} : out;
  const file = path.join(state, 'sweep.log');
  fs.mkdirSync(state, { recursive: true });
  if ((fs.statSync(file, { throwIfNoEntry: false })?.size ?? 0) > 5e6) fs.renameSync(file, `${file}.1`);
  return (line) => {
    if (!/^keep/.test(line)) {
      fs.appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
      if (!args.includes('--json')) out(line);
    }
  };
}

function cmdSweep(cfg, state) {
  const roots = cfg.roots.length ? cfg.roots : [git(process.cwd(), 'rev-parse', '--show-toplevel').trim()];
  const r = fullSweep({ roots, cfg, state, apply, log: logTo(state) });
  if (args.includes('--json')) out(JSON.stringify(r));
  else if (r.busy) out('er loopt al een opruiming');
  else {
    const n = (a) => r.rows.filter((x) => x.action === a).length;
    out(`${apply ? 'gedaan' : 'proef, niets gewijzigd'}: ${r.repos} repo's, ${r.rows.length} werkbomen; ${n('remove')} weg, ${n('slim')} slanker, ${n('keep')} blijven; vrij ${r.before.toFixed(1)} -> ${r.after.toFixed(1)} GB`);
  }
  return 0;
}

function cmdTidy(cfg, state) {
  const wait = Number(args[args.indexOf('--after') + 1]) || 0;
  if (args.includes('--after')) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait * 1000);
  if (!fs.existsSync(args[0] ?? '')) return 0;
  const done = tidy({ dir: fs.realpathSync.native(args[0]), cfg, state, apply });
  done.forEach(out);
  return out(`${apply ? 'weg' : 'proef, niets gewijzigd'}: ${done.length} testcaches`);
}

function main() {
  const cfg = loadConfig();
  const state = stateDir();
  if (cmd === 'sweep') return cmdSweep(cfg, state);
  if (cmd === 'tidy') return cmdTidy(cfg, state);
  if (cmd === 'build-cache') return out(pruneBuildCache(cfg, { lowDisk: level(freeGB('/'), cfg) !== 'ok', dryRun: !apply }));
  if (cmd === 'status') {
    const free = freeGB(process.cwd());
    return out(`${free.toFixed(1)} GB vrij (${level(free, cfg)}); waarschuwen onder ${cfg.warnFreeGB}, weigeren onder ${cfg.minFreeGB}; automatisch opruimen ${cfg.autoSweep ? 'aan' : 'uit'}`);
  }
  if (cmd === 'doctor') return doctor(out);
  if (cmd === 'schedule') return schedule(fileURLToPath(import.meta.url), state, args.includes('--remove'), out);
  out(HELP);
  return cmd && cmd !== 'help' ? 2 : 0;
}

try {
  process.exitCode = main();
} catch (e) {
  // No answer from git, ps, lsof or docker: nothing was removed on a guess.
  process.stderr.write(`worktree-care: ${e.message}\n`);
  process.exitCode = e instanceof Unknown ? 75 : 1;
}
