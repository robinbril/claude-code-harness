// What in a worktree can be rebuilt. The list starts from what git ignores, and a folder with
// anything in it that git tracks or would show as untracked is never on it.
import fs from 'node:fs';
import path from 'node:path';
import { git, gitOk, list0 } from './run.mjs';

const CACHES = new Set(['__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.hypothesis', '.import_linter_cache', '.vite', '.turbo', '.parcel-cache', '.nyc_output', '.tox', '.nox']);
const TEST_OUTPUT = new Set(['test-results', 'playwright-report', 'htmlcov']);
const E2E_OUTPUT = /(^|\/)\.e2e\/(logs|artifacts|failures|affected|results|report\.json|summary\.md|gate-run\.json|npm-ci\.log)$/;
const BUILD = new Set(['dist', '.next', '.nuxt', '.svelte-kit']);
const FILES = /(^|\/)(\.coverage(\.[^/]+)?|\.DS_Store|[^/]+\.pyc|[^/]+\.tsbuildinfo)$/;
// Product or evidence, whatever else matches.
const PROTECTED = /(^|\/)(\.git|\.harness|\.loops|\.supergoal|\.run)(\/|$)|(^|\/)\.e2e\/cache(\/|$)/i;

const has = (dir, name) => fs.existsSync(path.join(dir, name));

// 'cache' and 'deps' may be slimmed, 'build' too when there is no open work. 'output' and 'link' may only vanish with the worktree.
// null means: not known to be rebuildable, so it keeps the worktree.
export function classify(root, rel) {
  if (PROTECTED.test(rel)) return null;
  const abs = path.join(root, rel);
  const st = fs.lstatSync(abs, { throwIfNoEntry: false });
  if (!st) return 'output';
  if (st.isSymbolicLink()) return 'link';
  const name = path.basename(rel);
  if (!st.isDirectory()) return FILES.test(rel) || E2E_OUTPUT.test(rel) ? 'output' : null;
  if (CACHES.has(name)) return 'cache';
  if (name === 'node_modules') return 'deps';
  if (name === '.venv' || name === 'venv') return has(abs, 'pyvenv.cfg') ? 'deps' : null;
  if (BUILD.has(name)) return has(path.dirname(abs), 'package.json') || has(path.dirname(abs), 'pyproject.toml') ? 'build' : null;
  if (TEST_OUTPUT.has(name) || E2E_OUTPUT.test(rel)) return 'output';
  return null;
}

// An ignored file that is the same in the main checkout (a copied .env) is not lost with this one.
function sameInMain(root, main, rel) {
  try {
    const [a, b] = [path.join(root, rel), path.join(main, rel)];
    const [x, y] = [fs.lstatSync(a), fs.lstatSync(b)];
    return x.isFile() && y.isFile() && x.size === y.size && fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

// Some caches ignore themselves with a .gitignore of one `*`. Then git names their contents
// instead of the folder.
function selfIgnored(dir) {
  try {
    return fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').split('\n').some((l) => l.trim() === '*');
  } catch {
    return false;
  }
}

function cacheAbove(root, rel) {
  const parts = rel.split('/');
  for (let i = 1; i < parts.length; i++) {
    const dir = parts.slice(0, i).join('/');
    if (['cache', 'deps', 'build'].includes(classify(root, dir)) && selfIgnored(path.join(root, dir))) return dir;
  }
  return rel;
}

// git reports `src/` when everything in it is ignored, for example only src/__pycache__. Then the
// folders below count. A folder that an ignore rule names itself is not opened.
function expand(root, rel) {
  if (PROTECTED.test(rel) || classify(root, rel)) return [rel];
  const st = fs.lstatSync(path.join(root, rel), { throwIfNoEntry: false });
  if (!st?.isDirectory() || gitOk(root, 'check-ignore', '-q', '--', rel)) return [rel];
  return fs.readdirSync(path.join(root, rel)).flatMap((n) => expand(root, `${rel}/${n}`));
}

// Every folder with something in it that git knows or would show. In lower case: on a disk that
// does not tell Dist from dist, git does.
function ownFolders(root) {
  const files = list0(git(root, 'ls-files', '-z', '-c', '-o', '--exclude-standard'));
  const dirs = new Set();
  for (const f of files) {
    for (let d = path.posix.dirname(f.toLowerCase()); d !== '.' && !dirs.has(d); d = path.posix.dirname(d)) dirs.add(d);
  }
  return dirs;
}

// { slim: [{rel, kind}], keep: [rel], output: [rel] }: keep is what removing would lose.
export function ignored(root, main) {
  const listed = list0(git(root, 'ls-files', '-z', '-o', '-i', '--exclude-standard', '--directory')).map((r) => cacheAbove(root, r.replace(/\/$/, '')));
  const own = ownFolders(root);
  const result = { slim: [], keep: [], output: [] };
  for (const rel of new Set([...new Set(listed)].flatMap((r) => expand(root, r)))) {
    const kind = own.has(rel.toLowerCase()) ? null : classify(root, rel);
    if (['cache', 'deps', 'build'].includes(kind)) result.slim.push({ rel, kind });
    else if (kind === 'output') result.output.push(rel);
    else if (!kind && !sameInMain(root, main, rel)) result.keep.push(rel);
  }
  return result;
}

// A repository inside a folder is somebody's work, also when the folder is ignored. A folder that
// cannot be read may hold one.
export function containsRepo(dir) {
  const st = fs.lstatSync(dir, { throwIfNoEntry: false });
  if (!st?.isDirectory()) return false;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return true;
    }
    for (const e of entries) {
      if (e.name === '.git') return true;
      if (e.isDirectory()) stack.push(path.join(d, e.name));
    }
  }
  return false;
}
