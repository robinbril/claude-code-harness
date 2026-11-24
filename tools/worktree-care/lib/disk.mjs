// Free space and the Docker build cache. Volumes, containers and images are never touched:
// those hold data of other projects.
import fs from 'node:fs';
import { dockerProgram } from './busy.mjs';
import { run } from './run.mjs';

const GB = 1e9;

export function freeGB(dir, env = process.env) {
  if (env.WORKTREE_CARE_FREE_GB) return Number(env.WORKTREE_CARE_FREE_GB);
  const s = fs.statfsSync(dir);
  return (Number(s.bavail) * Number(s.bsize)) / GB;
}

export const level = (free, cfg) => (free < cfg.minFreeGB ? 'full' : free < cfg.warnFreeGB ? 'low' : 'ok');

export function pruneBuildCache(cfg, { lowDisk = false, dryRun = false } = {}) {
  const max = lowDisk ? cfg.buildCacheMaxGBLowDisk : cfg.buildCacheMaxGB;
  const args = ['builder', 'prune', '--force', '--max-used-space', `${max}GB`];
  if (dryRun) return `docker ${args.join(' ')}`;
  const r = run(dockerProgram(), args, { timeout: 300000 });
  if (r.missing) return 'docker staat niet op deze machine';
  if (r.code !== 0) return `bouwcache niet gesnoeid: ${r.timedOut ? 'docker gaf geen antwoord' : r.err.trim().split('\n').at(-1)}`;
  return `bouwcache boven ${max} GB gesnoeid: ${/Total:\s*(\S+)/.exec(r.out)?.[1] ?? '0B'}`;
}
