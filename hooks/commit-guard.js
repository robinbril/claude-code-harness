#!/usr/bin/env node
/**
 * commit-guard.js
 * PreToolUse(Bash) hook. When the command runs `git commit`, scans what that commit
 * will actually record, in the repository it targets, for things that should never
 * land in a repo: secrets, temp/scratch files, and (configurable) personal info.
 * Hard findings BLOCK the commit (exit 2) with a report and a one-line fix. Emails
 * and em dashes only warn.
 *
 * What is scanned follows the command: `cd <dir> &&` and `git -C <dir>` pick the repo;
 * `-a`/`--all` adds tracked working-tree changes; `git commit <paths>` adds the
 * working-tree version of those paths. A commit the hook cannot inspect (wrapped in
 * `bash -c`/`eval`, GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE overrides, `--git-dir`,
 * `--pathspec-from-file`, or a shell expansion in a path) is refused.
 *
 * Self-contained, no dependencies. To hard-block project-specific strings (a name,
 * a company, an internal hostname), add one regex per line to `.harness-blocklist`
 * at the repo root; matches there are treated as blocks.
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SECRET = [
  { re: /sk-ant-[A-Za-z0-9_-]{12,}/, label: 'Anthropic API key' },
  { re: /\bsk-[A-Za-z0-9]{24,}\b/, label: 'OpenAI-style API key' },
  { re: /\bgh[posru]_[A-Za-z0-9]{20,}\b/, label: 'GitHub token' },
  { re: /\bAKIA[0-9A-Z]{16}\b/, label: 'AWS access key id' },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/, label: 'Slack token' },
  { re: /\bapify_api_[A-Za-z0-9]{20,}/, label: 'Apify token' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: 'private key' },
  { re: /\b(password|passwd|secret|api[_-]?key|access[_-]?token)\b\s*[:=]\s*['"][^'"\s]{6,}['"]/i, label: 'hardcoded credential' },
];

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const EMDASH = /—/;
const TEMP_PATH = /(^|\/)(\.env(\.local|\.production)?$|[^/]*\.(tmp|bak|orig|swp|swo|log)$|[^/]*~$|\.DS_Store$|Thumbs\.db$|node_modules\/|__pycache__\/|[^/]*\.pyc$)/i;
const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|woff2?|ttf|mp4|mov)$/i;

const WRAPPERS = new Set(['bash', 'sh', 'zsh', 'eval', 'xargs', 'exec', 'env', 'sudo', 'nohup', 'time', 'command']);
const ENV_OVERRIDE = /^(GIT_DIR|GIT_WORK_TREE|GIT_INDEX_FILE|GIT_OBJECT_DIRECTORY)=/;
// `git commit` options that take a separate value.
const COMMIT_VALUE_LONG = new Set(['--message', '--file', '--author', '--date', '--reuse-message', '--reedit-message',
  '--fixup', '--squash', '--template', '--cleanup', '--trailer']);
const COMMIT_VALUE_SHORT = new Set(['m', 'F', 'C', 'c', 't']);

class Unsupported extends Error {}

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });
  } catch (_) {
    return '';
  }
}

// Splits a command line into segments of words. Quotes group words; && || ; | and newlines end a segment.
function segments(cmd) {
  const out = [];
  let words = [];
  let word = null;
  let quote = null;
  const end = () => { if (word !== null) { words.push(word); word = null; } };
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < cmd.length) word += cmd[++i];
      else word += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; word = word ?? ''; continue; }
    if (ch === '\\' && i + 1 < cmd.length) { word = (word ?? '') + cmd[++i]; continue; }
    if (/\s/.test(ch) && ch !== '\n') { end(); continue; }
    if (ch === '\n' || ch === ';' || ch === '&' || ch === '|') {
      end();
      if (words.length) out.push(words);
      words = [];
      continue;
    }
    word = (word ?? '') + ch;
  }
  end();
  if (words.length) out.push(words);
  return out;
}

const hasExpansion = (s) => /[$`]/.test(s);

function resolveDir(base, target) {
  if (hasExpansion(target)) throw new Unsupported(`path with a shell expansion: ${target}`);
  const expanded = target === '~' ? os.homedir() : target.startsWith('~/') ? path.join(os.homedir(), target.slice(2)) : target;
  return path.resolve(base, expanded);
}

// Parses one `git ... commit ...` segment into { dir, all, paths }.
function parseCommit(words, dir) {
  let i = 1;
  while (i < words.length && words[i] !== 'commit') {
    const w = words[i];
    if (w === '-C') { dir = resolveDir(dir, words[i + 1] || ''); i += 2; continue; }
    if (w === '-c') { i += 2; continue; }
    if (/^--(git-dir|work-tree|namespace)\b/.test(w)) throw new Unsupported(`git ${w}`);
    if (w.startsWith('-')) { i += 1; continue; }
    return null; // another subcommand, e.g. `git log --grep commit`
  }
  if (words[i] !== 'commit') return null;
  let all = false;
  const paths = [];
  let onlyPaths = false;
  for (i += 1; i < words.length; i++) {
    const w = words[i];
    if (onlyPaths) { paths.push(w); continue; }
    if (w === '--') { onlyPaths = true; continue; }
    if (w === '--all') { all = true; continue; }
    if (w.startsWith('--pathspec-from-file')) throw new Unsupported('git commit --pathspec-from-file');
    if (w.startsWith('--')) { if (!w.includes('=') && COMMIT_VALUE_LONG.has(w)) i += 1; continue; }
    if (w.startsWith('-') && w.length > 1) {
      for (let k = 1; k < w.length; k++) {
        if (w[k] === 'a') all = true;
        if (COMMIT_VALUE_SHORT.has(w[k])) { if (k === w.length - 1) i += 1; break; }
      }
      continue;
    }
    paths.push(w);
  }
  for (const p of paths) if (hasExpansion(p)) throw new Unsupported(`path with a shell expansion: ${p}`);
  return { dir, all, paths };
}

// Finds every git commit in the command, following `cd` the way the shell would.
function findCommits(cmd, cwd) {
  const commits = [];
  let dir = cwd;
  for (const words of segments(cmd)) {
    let w = words;
    while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) {
      if (ENV_OVERRIDE.test(w[0])) {
        if (w.slice(1).some((x) => x === 'git')) throw new Unsupported(w[0].split('=')[0]);
      }
      w = w.slice(1);
    }
    if (!w.length) continue;
    if (w[0] === 'cd') { dir = resolveDir(dir, w[1] || os.homedir()); continue; }
    if (w[0] === 'git') {
      const c = parseCommit(w, dir);
      if (c) commits.push(c);
      continue;
    }
    if (WRAPPERS.has(path.basename(w[0])) && /\bgit\b[\s\S]*\bcommit\b/.test(w.slice(1).join(' '))) {
      throw new Unsupported(`git commit inside \`${w[0]}\``);
    }
  }
  return commits;
}

// The files a commit will record, each with a reader for the version it records.
function commitContents({ dir, all, paths }) {
  const top = git(dir, ['rev-parse', '--show-toplevel']).trim();
  if (!top) return { top: null, files: [] };
  const lines = (s) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const files = new Map();
  for (const f of lines(git(top, ['diff', '--cached', '--name-only', '--diff-filter=d']))) {
    files.set(f, () => git(top, ['show', `:${f}`]));
  }
  const fromTree = (f) => () => { try { return fs.readFileSync(path.join(top, f), 'utf8'); } catch (_) { return ''; } };
  if (all) {
    for (const f of lines(git(top, ['diff', '--name-only', '--diff-filter=d']))) files.set(f, fromTree(f));
  }
  if (paths.length) {
    // Let git resolve the pathspecs from the command's own directory; --full-name makes them top-relative.
    for (const f of lines(git(dir, ['ls-files', '--full-name', '--cached', '--', ...paths]))) {
      if (fs.existsSync(path.join(top, f))) files.set(f, fromTree(f));
    }
  }
  return { top, files };
}

function loadBlocklist(top) {
  const out = [];
  for (const line of git(top, ['show', ':./.harness-blocklist']).split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    try { out.push({ re: new RegExp(t, 'i'), label: `blocklist "${t}"` }); } catch (_) {}
  }
  return out;
}

function scan(commit, blocks, warns, tempFiles) {
  const { top, files } = commitContents(commit);
  if (!top) return;
  const blocklist = loadBlocklist(top);
  for (const [f, readVersion] of files) {
    if (TEMP_PATH.test(f)) { blocks.push(`temp/scratch file in commit: ${f}`); tempFiles.push(f); }
    if (BINARY_EXT.test(f)) continue;
    const content = readVersion();
    if (!content) continue;
    for (const { re, label } of SECRET) if (re.test(content)) blocks.push(`${label} in ${f}`);
    for (const { re, label } of blocklist) if (re.test(content)) blocks.push(`${label} in ${f}`);
    const em = content.match(EMAIL);
    if (em) warns.push(`email ${em[0]} in ${f}`);
    if (/\.(md|txt|mdx|rst)$/i.test(f) && EMDASH.test(content)) warns.push(`em dash (AI slop) in ${f}`);
  }
}

function refuse(lines) {
  process.stderr.write(lines.join('\n') + '\n');
  process.exit(2);
}

let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  const pass = () => process.stdout.write(input);
  let data;
  try { data = JSON.parse(input); } catch (_) { return pass(); }
  if ((data.tool_name || '') !== 'Bash') return pass();
  const cmd = data.tool_input?.command || '';
  if (!/\bgit\b[\s\S]*\bcommit\b/.test(cmd)) return pass();

  let commits;
  try {
    commits = findCommits(cmd, data.cwd || process.cwd());
  } catch (e) {
    if (!(e instanceof Unsupported)) return pass();
    return refuse([
      `[commit-guard] BLOCKED: cannot inspect this commit (${e.message}).`,
      '[commit-guard] Run `git commit` directly, optionally after `cd <repo> &&` or with `git -C <repo>`, so the guard can scan what it records.',
    ]);
  }

  const blocks = [];
  const warns = [];
  const tempFiles = [];
  for (const c of commits) scan(c, blocks, warns, tempFiles);

  if (warns.length) {
    process.stderr.write('[commit-guard] warnings (not blocking):\n');
    warns.slice(0, 12).forEach((w) => process.stderr.write(`  - ${w}\n`));
  }
  if (blocks.length) {
    const report = ['[commit-guard] BLOCKED git commit. These must not be committed:', ...blocks.slice(0, 20).map((b) => `  - ${b}`)];
    if (tempFiles.length) report.push(`[commit-guard] unstage or discard temp files: ${tempFiles.join(' ')}`);
    report.push('[commit-guard] Remove secrets/PII, add patterns to .gitignore, then recommit. To override, disable this hook.');
    return refuse(report);
  }
  pass();
});
