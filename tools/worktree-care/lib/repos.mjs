// Which repositories and worktrees exist.
import fs from 'node:fs';
import path from 'node:path';
import { git, run } from './run.mjs';

export function worktreesOf(dir) {
  const items = [];
  let cur = null;
  for (const line of git(dir, 'worktree', 'list', '--porcelain', '-z').split('\0')) {
    if (!line) continue;
    const i = line.indexOf(' ');
    const [key, value] = i < 0 ? [line, ''] : [line.slice(0, i), line.slice(i + 1)];
    if (key === 'worktree') items.push((cur = { path: value, locked: null, branch: null, bare: false }));
    else if (key === 'HEAD') cur.head = value;
    else if (key === 'branch') cur.branch = value.replace('refs/heads/', '');
    else if (key === 'locked') cur.locked = value;
    else if (key === 'bare') cur.bare = true;
  }
  return items.map((w, i) => ({ ...w, main: items[0].path, isMain: i === 0 }));
}

// The shared git folder identifies a repository, however many worktrees of it lie around.
export function findRepos(roots, depth = 2) {
  const seen = new Map();
  const visit = (dir, left) => {
    if (fs.existsSync(path.join(dir, '.git'))) {
      const r = run('git', ['-C', dir, 'rev-parse', '--path-format=absolute', '--git-common-dir']);
      if (r.code === 0 && !seen.has(r.out.trim())) seen.set(r.out.trim(), dir);
      return;
    }
    if (left <= 0) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {}
    for (const e of entries) if (e.isDirectory() && e.name !== 'node_modules') visit(path.join(dir, e.name), left - 1);
  };
  for (const r of roots) visit(r, depth);
  return [...seen].map(([common, dir]) => ({ common, dir }));
}
