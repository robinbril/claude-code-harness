// Runs a program without a shell. A timeout or a missing program is an error the caller sees,
// never an empty answer that looks like "nothing found".
import { spawnSync } from 'node:child_process';

// machine: no answer about the whole machine, so nothing at all can be judged.
export class Unknown extends Error {
  constructor(message, { machine = false } = {}) {
    super(message);
    this.machine = machine;
  }
}

const INHERITED = /^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|COMMON_DIR|PREFIX)$/;
export const cleanEnv = (env = process.env) => Object.fromEntries(Object.entries(env).filter(([k]) => !INHERITED.test(k)));

export function run(cmd, args, { cwd, timeout = 60000, input } = {}) {
  const r = spawnSync(cmd, args, { cwd, timeout, input, encoding: 'utf8', env: { ...cleanEnv(), LC_ALL: 'C' }, maxBuffer: 256 * 1024 * 1024 });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '', missing: r.error?.code === 'ENOENT', timedOut: r.error?.code === 'ETIMEDOUT' };
}

export function git(cwd, ...args) {
  const r = run('git', ['--no-optional-locks', '-C', cwd, ...args]);
  if (r.code !== 0) throw new Unknown(`git ${args.slice(0, 2).join(' ')} faalde in ${cwd}: ${r.err.trim().split('\n').at(-1) || (r.timedOut ? 'timeout' : `exit ${r.code}`)}`);
  return r.out;
}

// For questions where git answers "no" with a nonzero exit.
export function gitOk(cwd, ...args) {
  const r = run('git', ['--no-optional-locks', '-C', cwd, ...args]);
  if (r.code === null || r.code >= 128) throw new Unknown(`git ${args[0]} gaf geen antwoord in ${cwd}`);
  return r.code === 0;
}

export const list0 = (text) => text.split('\0').filter(Boolean);
