// env-assert-guard.js — environment assertion.
// Before an outward/prod action (push, deploy, migration) this guard checks the
// CURRENT environment against the `env` block of the most recent spec file. That
// keeps work from landing on the wrong branch or server (e.g. deploying to the
// wrong host or pushing the wrong branch). It only asserts hard when the spec
// names a CONCRETE value (not a <placeholder>); otherwise it passes (blast-radius
// covers the rest).
//
// Interface: run(data) -> string (block reason) | null. Fail-open (throw = null),
// so a broken guard never blocks the terminal. Required in-process by the
// dispatcher (e.g. $HOME/.claude/claude-code-harness/hooks/bash-precheck.js).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Actions that touch the outside world or production. Migration included: a
// migration on the wrong tenant/environment is as harmful as a push to the wrong branch.
const OUTWARD = /\bgit\s+push\b|\bgh\s+release\b|\bnpm\s+publish\b|\bvercel\b[^\n]*(--prod|\bdeploy\b)|\bdocker\b[^\n]*\bpush\b|\brsync\b[^\n]*(prod|live|:)|\bssh\b|\bscp\b|\balembic\s+upgrade\b|\bprisma\s+migrate\s+deploy\b|\bmigrate\b[^\n]*\b(prod|deploy|upgrade)\b|\bcaddy\s+reload\b/;

function findSpecEnv(cwd) {
  const base = path.join(cwd || process.cwd(), '.harness');
  if (!fs.existsSync(base)) return null;
  let newest = null, newestT = 0;
  for (const d of fs.readdirSync(base)) {
    const f = path.join(base, d, 'spec.md');
    try {
      const st = fs.statSync(f);
      if (st.mtimeMs > newestT) { newestT = st.mtimeMs; newest = f; }
    } catch (_) {}
  }
  if (!newest) return null;
  const txt = fs.readFileSync(newest, 'utf8');
  const env = (txt.split(/##\s*env/i)[1] || '').split(/\n##\s/)[0] || '';
  const pick = (key) => {
    const m = env.match(new RegExp('\\b' + key + '\\s*:\\s*([^\\s<][^\\s]*)', 'i'));
    return m ? m[1].trim() : null; // values starting with < (placeholder) are dropped
  };
  return { file: newest, branch: pick('branch'), host: pick('host') || pick('deploy'), cwd: pick('cwd') };
}

function currentBranch(cwd) {
  try {
    return execFileSync('git', ['-C', cwd || '.', 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch (_) { return null; }
}

function run(data) {
  const cmd = (data && data.tool_input && data.tool_input.command) || '';
  if (!OUTWARD.test(cmd)) return null;
  const spec = findSpecEnv(data && data.cwd);
  if (!spec) return null;

  const rel = path.basename(path.dirname(spec.file));

  // Branch assertion on git push / release.
  if (spec.branch && /\bgit\s+push\b|\bgh\s+release\b/.test(cmd)) {
    const cur = currentBranch(data && data.cwd);
    if (cur && cur !== spec.branch) {
      return `[env-assert] BLOCKED: the spec (.harness/${rel}) says branch '${spec.branch}', ` +
        `but you are on '${cur}'. Wrong branch for this push. Fix the branch or the spec.`;
    }
  }

  // Host/deploy assertion: if the spec names a concrete host but the command does
  // not, the deploy is probably going to the wrong place.
  if (spec.host && /\bssh\b|\bscp\b|\brsync\b|\bvercel\b|\bdeploy\b/.test(cmd)) {
    if (!cmd.includes(spec.host)) {
      return `[env-assert] BLOCKED: the spec (.harness/${rel}) says host '${spec.host}', ` +
        `but the command does not name that host. Are you deploying to the right server? Fix the command or the spec.`;
    }
  }
  return null;
}

module.exports = { run };

// Standalone: when registered directly as a PreToolUse (Bash) hook with no
// dispatcher, read the hook payload from stdin, run the assertion, and block
// (exit 2) on a reason. Fail-open on any parse error.
if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(raw); } catch (_) { process.exit(0); }
    let reason = null;
    try { reason = run(data); } catch (_) {}
    if (reason) { process.stderr.write(reason + '\n'); process.exit(2); }
    process.exit(0);
  });
}
