// The rule itself: facts in, one action and its reason out. No disk, no git, no clock of its own.
import { hours } from './config.mjs';

const keep = (why) => ({ action: 'keep', why });

// Reasons that something would be lost. Every one of them keeps the worktree.
export function losses(f) {
  return [
    f.tracked.length && `${f.tracked.length} gewijzigde bestanden`,
    f.untracked.length && `${f.untracked.length} onbekende bestanden`,
    f.hidden.length && `${f.hidden.length} bestanden met skip-worktree of assume-unchanged`,
    f.ignored.length && `genegeerd en niet herbouwbaar: ${f.ignored.slice(0, 3).join(', ')}`,
    f.local.length && `${f.local.length} commits staan op geen remote`,
    f.logged.length && `${f.logged.length} commits staan alleen in het logboek van deze werkboom`,
    f.nested.length && 'er ligt een andere werkboom in',
    f.submodules && 'heeft submodules',
  ].filter(Boolean);
}

export function decide(f, cfg, now, { lowDisk = false } = {}) {
  if (f.hold) return keep(f.hold);
  const idle = now - f.activeAt;
  if (f.lock?.live) {
    // The lock of a subagent carries the pid of its parent, which outlives it.
    const done = f.agentDoneAt && f.activeAt <= f.agentDoneAt + 120000 && now - f.agentDoneAt >= hours(cfg.agentGraceHours);
    if (done && f.slim.length) return { action: 'slim', why: 'subagent is klaar; de vergrendeling blijft' };
    return keep('vergrendeld door een levend proces');
  }
  const lost = losses(f);
  const wait = f.merged ? cfg.removeMergedIdleHours : cfg.removePushedIdleHours;
  if (!lost.length && idle >= hours(wait)) return { action: 'remove', why: f.merged ? 'gemerged en schoon' : 'schoon, alles staat op een remote' };
  const why = lost.join('; ') || `pas ${Math.round(idle / hours(1))} uur stil`;
  const slimAfter = hours(lowDisk ? cfg.slimIdleHoursLowDisk : cfg.slimIdleHours);
  return f.slim.length && idle >= slimAfter ? { action: 'slim', why } : keep(why);
}
