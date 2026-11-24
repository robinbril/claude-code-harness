// Which commits exist only here.
import fs from 'node:fs';
import path from 'node:path';
import { git, run, Unknown } from './run.mjs';

function bases(dir, cfg) {
  const refs = git(dir, 'for-each-ref', '--format=%(refname)', 'refs/remotes').split('\n').filter(Boolean);
  return refs.filter((r) => cfg.baseBranches.includes(r.split('/').slice(3).join('/')));
}

// Every version of a path that a base branch ever had. The same question comes back for each
// worktree of a repository. An answer of this run may miss a newer version, never invent one.
const known = new Map();
function blobsOnBase(dir, refs, file) {
  const key = [git(dir, 'rev-parse', '--path-format=absolute', '--git-common-dir').trim(), ...refs, file].join('\0');
  if (known.has(key)) return known.get(key);
  const out = git(dir, 'log', '--format=', '--raw', '--no-abbrev', '--no-renames', ...refs, '--', file);
  const blobs = new Set([...out.matchAll(/^:\d+ \d+ [0-9a-f]+ ([0-9a-f]+) /gm)].map((m) => m[1]));
  known.set(key, blobs);
  return blobs;
}

// An automated copy from the base: the subject says so, it touches nothing else, and each
// file it wrote is byte for byte a version the base has had. Own work in it fails the last test.
function isSync(dir, sha, cfg, refs) {
  const subject = git(dir, 'show', '-s', '--format=%s', sha).trim();
  const rule = cfg.syncCommits.find((s) => new RegExp(s.subject).test(subject));
  if (!rule || !refs.length) return false;
  // A merge and a first commit give no rows here: those are work.
  const rows = git(dir, 'diff-tree', '-r', '--no-commit-id', '--no-renames', '--no-abbrev', sha).split('\n').filter(Boolean);
  return rows.length > 0 && rows.every((row) => {
    const m = row.match(/^:\d+ \d+ [0-9a-f]+ ([0-9a-f]+) (\w)\t(.*)$/);
    if (!m || !rule.paths.some((p) => m[3] === p || (p.endsWith('/') && m[3].startsWith(p)))) return false;
    return m[2] === 'D' ? refs.some((r) => !git(dir, 'ls-tree', r, '--', m[3])) : blobsOnBase(dir, refs, m[3]).has(m[1]);
  });
}

const SHA = /\b[0-9a-f]{40,64}\b/g;
const shasIn = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').match(SHA) ?? [] : []);

// Commits made on a detached head and left again live only in the log of this worktree, which goes
// with it. Branch logs stay, so what those hold is safe.
function onlyInLog(dir, gitDir, branch) {
  const zero = /^0+$/;
  const mine = [...new Set([...shasIn(path.join(gitDir, 'logs', 'HEAD')), ...shasIn(path.join(gitDir, 'ORIG_HEAD'))])].filter((s) => !zero.test(s));
  if (!mine.length) return [];
  const common = git(dir, 'rev-parse', '--path-format=absolute', '--git-common-dir').trim();
  const held = branch ? shasIn(path.join(common, 'logs', 'refs', 'heads', branch)).filter((s) => !zero.test(s)) : [];
  // Old entries may point at commits that gc already took.
  const there = (shas) => {
    const r = run('git', ['-C', dir, 'cat-file', '--batch-check'], { input: shas.map((x) => `${x}\n`).join('') });
    if (r.code !== 0) throw new Unknown(`git cat-file faalde in ${dir}`);
    return r.out.split('\n').filter((l) => / commit /.test(l)).map((l) => l.split(' ')[0]);
  };
  const found = there(mine);
  if (!found.length) return [];
  const args = [...found, ...there(held).map((s) => `^${s}`)];
  if (args.length > 4000) return found;
  return git(dir, 'rev-list', '--max-count=201', ...args, '--not', '--branches', '--remotes', '--tags').split('\n').filter(Boolean);
}

// local: commits that no remote branch holds. merged: a base branch holds everything.
export function localCommits(dir, cfg, gitDir, branch) {
  const refs = bases(dir, cfg);
  const outside = (...refArgs) => git(dir, 'rev-list', '--max-count=201', 'HEAD', '--not', ...refArgs).split('\n').filter(Boolean);
  // More than 200 is work, not a row of automated copies.
  const real = (shas) => (shas.length > 200 ? shas : shas.filter((sha) => !isSync(dir, sha, cfg, refs)));
  const local = real(outside('--remotes'));
  const logged = real(onlyInLog(dir, gitDir, branch));
  return { local, logged, merged: !local.length && refs.some((r) => !real(outside(r)).length) };
}
