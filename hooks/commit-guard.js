#!/usr/bin/env node
/**
 * commit-guard.js
 * PreToolUse(Bash) hook. When the command is a `git commit`, scans the staged
 * changes for things that should never land in a repo: secrets, temp/scratch
 * files, and (configurable) personal info. Hard findings BLOCK the commit
 * (exit 2) with a report and a one-line fix. Emails and AI slop only warn.
 *
 * Self-contained, no dependencies. To hard-block project-specific strings
 * (a name, a company, an internal hostname), add one regex per line to
 * `.harness-blocklist` at the repo root; matches there are treated as blocks.
 */

const { execFileSync } = require('child_process');

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

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024 });
  } catch (_) {
    return '';
  }
}

function loadBlocklist() {
  const out = [];
  const txt = git(['show', ':./.harness-blocklist']);
  for (const line of txt.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    try { out.push({ re: new RegExp(t, 'i'), label: `blocklist "${t}"` }); } catch (_) {}
  }
  return out;
}

let input = '';
process.stdin.on('data', c => (input += c));
process.stdin.on('end', () => {
  const pass = () => process.stdout.write(input);
  try {
    const data = JSON.parse(input);
    if ((data.tool_name || '') !== 'Bash') return pass();
    const cmd = data.tool_input?.command || '';
    if (!/\bgit\b[^\n]*\bcommit\b/.test(cmd)) return pass();

    const staged = git(['diff', '--cached', '--name-only']).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!staged.length) return pass();

    const blocklist = loadBlocklist();
    const blocks = [];
    const warns = [];

    const tempFiles = staged.filter(f => TEMP_PATH.test(f));
    tempFiles.forEach(f => blocks.push(`temp/scratch file staged: ${f}`));

    for (const f of staged) {
      if (BINARY_EXT.test(f)) continue;
      const content = git(['show', `:${f}`]);
      if (!content) continue;
      for (const { re, label } of SECRET) if (re.test(content)) blocks.push(`${label} in ${f}`);
      for (const { re, label } of blocklist) if (re.test(content)) blocks.push(`${label} in ${f}`);
      const em = content.match(EMAIL);
      if (em) warns.push(`email ${em[0]} in ${f}`);
      if (/\.(md|txt|mdx|rst)$/i.test(f) && EMDASH.test(content)) warns.push(`em dash (AI slop) in ${f}`);
    }

    if (warns.length) {
      process.stderr.write('[commit-guard] warnings (not blocking):\n');
      warns.slice(0, 12).forEach(w => process.stderr.write(`  - ${w}\n`));
    }
    if (blocks.length) {
      process.stderr.write('[commit-guard] BLOCKED git commit. These must not be committed:\n');
      blocks.slice(0, 20).forEach(b => process.stderr.write(`  - ${b}\n`));
      if (tempFiles.length) {
        process.stderr.write(`[commit-guard] unstage temp files: git restore --staged ${tempFiles.join(' ')}\n`);
      }
      process.stderr.write('[commit-guard] Remove secrets/PII, add patterns to .gitignore, then recommit. To override, disable this hook.\n');
      process.exit(2);
    }
  } catch (_) {}
  pass();
});
