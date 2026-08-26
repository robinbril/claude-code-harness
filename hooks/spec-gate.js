// spec-gate.js  (Stop) — spec requirement.
// Substantial build work should have a persistent, machine-readable spec file
// so the requirements don't drift out of the chat window and verification can
// check against them. This gate blocks ONLY genuinely large builds without a
// spec; it leaves trivial edits and conversation alone.
//
// Let the turn pass as soon as one of these holds:
//   - the turn is not substantial (conservative threshold below);
//   - the assistant text carries a `SPEC: <path>` or `UNSPEC: <reason>` artifact;
//   - a .harness/<task>/spec.md|yaml was written this turn.
// Otherwise: block once, asking for a spec file or an explicit reason.
//
// stop_hook_active prevents a loop. Fail-open on any parse error. Once per task.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const SPEC_LABEL = /\b(SPEC|UNSPEC)\s*:/;
const SPEC_FILE = /[\\/]\.harness[\\/][^\\/]+[\\/]spec\.(md|ya?ml)$/i;
const EXEMPT = /[\\/](scratchpad|_archive|node_modules|\.git|dist|build|AppData[\\/]Local[\\/]Temp)[\\/]/i;
const MUTATING_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
const MUTATING_BASH = /(>>?|\bSet-Content\b|\bOut-File\b|\bNew-Item\b|\bgit\s+(commit|push|merge|apply)\b|\bnpm\s+(install|publish)\b|\bmv\b|\bcp\b|\brm\b)/;

function isRealUser(e) {
  if (!e || !e.message || e.message.role !== 'user' || e.isMeta) return false;
  const c = e.message.content;
  if (typeof c === 'string') return c.trim().length > 0;
  if (Array.isArray(c)) return c.some(b => b && b.type === 'text') && !c.some(b => b && b.type === 'tool_result');
  return false;
}

function main(raw) {
  let input;
  try { input = JSON.parse(raw); } catch (_) { return 0; }
  if (input.stop_hook_active) return 0;
  const tp = input.transcript_path;
  if (!tp || !fs.existsSync(tp)) return 0;

  let entries = [];
  try {
    entries = fs.readFileSync(tp, 'utf8').split('\n').filter(Boolean).map(l => {
      try { return JSON.parse(l); } catch (_) { return null; }
    }).filter(Boolean);
  } catch (_) { return 0; }

  let lastUser = -1;
  for (let i = entries.length - 1; i >= 0; i--) { if (isRealUser(entries[i])) { lastUser = i; break; } }
  if (lastUser < 0) return 0;
  const turn = entries.slice(lastUser + 1);

  let writes = 0, mutations = 0, specWritten = false, turnText = '';
  const files = new Set();
  for (const e of turn) {
    if (!e.message || e.message.role !== 'assistant' || !Array.isArray(e.message.content)) continue;
    for (const b of e.message.content) {
      if (b && b.type === 'text' && b.text) turnText += b.text + '\n';
      if (!b || b.type !== 'tool_use') continue;
      const fp = (b.input && b.input.file_path) || '';
      if (fp && SPEC_FILE.test(fp)) specWritten = true;
      if (fp && EXEMPT.test(fp)) continue;
      if (MUTATING_TOOLS.has(b.name)) {
        mutations++;
        if (fp) files.add(fp);
        if (b.name === 'Write') writes++;
      } else if (b.name === 'Bash' && b.input && MUTATING_BASH.test(b.input.command || '')) {
        mutations++;
      }
    }
  }

  // Conservative threshold: really "a build", not a fix. New files weigh more.
  const substantial = writes >= 3 || (mutations >= 6 && files.size >= 3);
  if (!substantial) return 0;
  if (specWritten || SPEC_LABEL.test(turnText)) return 0;

  // Once per task: marker keyed on the last-user index.
  const marker = path.join(os.tmpdir(), `spec-gate-${path.basename(tp, '.jsonl')}.txt`);
  try {
    if (fs.existsSync(marker) && Number(fs.readFileSync(marker, 'utf8')) >= lastUser) return 0;
    fs.writeFileSync(marker, String(lastUser));
  } catch (_) { return 0; }

  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `Substantial build work (${writes} new + ${mutations} mutations across ${files.size} files) without a spec file. ` +
      'Record the requirements + acceptance criteria: `node $HOME/.claude/claude-code-harness/scripts/spec-init.js <task> "goal"` creates ' +
      '`.harness/<task>/spec.md`. Then reference it with a line `SPEC: <path>`. ' +
      'Deliberately skipping (truly trivial, or no repo): `UNSPEC: <reason>`.'
  }));
  return 0;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => { let code = 0; try { code = main(raw); } catch (_) {} process.exit(code); });
