// verified-claim-guard.js  (Stop) — evidence gate, v2
// Enforces the VERIFIED/UNVERIFIED artifact from the project's CLAUDE.md, but
// evidence over assertion: a `VERIFIED:` line only counts if the turn also
// contains a real tool OBSERVATION (a non-mutating tool call that produced
// output). A bare typed `VERIFIED: works` after only Write/Edit is not evidence
// and is blocked. `UNVERIFIED:` stays freely allowed (honest acknowledgement).
//
// Three block cases (a mutation in the turn + a done-claim in the final message):
//   1. no label                    -> "prove it or mark it unverified"
//   2. VERIFIED without observation -> "your VERIFIED is not backed by a tool call"
//   3. (UNVERIFIED, or VERIFIED with an observation) -> pass
//
// stop_hook_active prevents a loop. Fail open on any parse error.
'use strict';

const fs = require('fs');

const CLAIM = /\b(done|finished|fixed|resolved|shipped|deployed|built|merged|complete|works( now)?|is live|went live|up and running)\b/i;
const VERIFIED_LABEL = /\bVERIFIED\s*:/;
const UNVERIFIED_LABEL = /\bUNVERIFIED\s*:/;
const MUTATING_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
// Broader than v1: python -c / node -e writes, tee/dd, curl with a write method.
// `>`/`>>` (shell redirect) already covers echo/printf-to-file.
const MUTATING_BASH = /(>>?|\bSet-Content\b|\bOut-File\b|\bNew-Item\b|\bmkdir\b|\bgit\s+(commit|push|merge|apply)\b|\bnpm\s+(install|run|publish)\b|\bpip\s+install\b|\bdocker\b|\bscp\b|\bssh\b|\bmv\b|\bcp\b|\brm\b|\bdel\b|\bpython\d?\s+-c\b|\bnode\s+-e\b|\btee\b|\bdd\b|\bcurl\b[^\n]*(-X\s*(POST|PUT|DELETE|PATCH)|--data|--upload-file|\s-d\b))/;

// Tools that do NOT mutate but do produce evidence count as an observation. Bash
// is judged separately: a non-mutating Bash command (test/curl/grep/pytest) is
// an observation; a purely mutating Bash command is not.
const OBSERVING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']);
const RENDER_RE = /(take_screenshot|__screenshot$|__(computer|read_page|get_page_text|read_console_messages|read_network_requests)$)/;
// MCP read tools (mcp__server__get_/list_/search_/read_ ...) also count as an observation.
const MCP_READ_RE = /^mcp__[^_]+.*__(get|list|search|read|show|find|fetch|status|view|inspect)/i;

function isObservation(b) {
  if (!b || b.type !== 'tool_use' || !b.name) return false;
  const n = b.name;
  if (MUTATING_TOOLS.has(n)) return false;
  if (OBSERVING_TOOLS.has(n)) return true;
  if (RENDER_RE.test(n)) return true;
  if (MCP_READ_RE.test(n)) return true;
  if (n === 'Bash') {
    // A Bash that does not (only) mutate produces output = observation. A purely
    // mutating command (rm/mv/cp without a read) does not count.
    const cmd = (b.input && b.input.command) || '';
    return !MUTATING_BASH.test(cmd) || /\b(test|pytest|vitest|jest|curl|grep|cat|ls|node\s+-e|python\d?\s+-c|npm\s+test|npm\s+run\s+(test|typecheck|lint|build)|tsc|eslint|bash\s+-n|node\s+-c|diff|git\s+(status|log|diff|show))\b/i.test(cmd);
  }
  return false;
}

function isRealUserEntry(e) {
  if (!e || !e.message || e.message.role !== 'user' || e.isMeta) return false;
  const c = e.message.content;
  if (typeof c === 'string') return c.trim().length > 0;
  if (Array.isArray(c)) return c.some(b => b && b.type === 'text') && !c.some(b => b && b.type === 'tool_result');
  return false;
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  return 0;
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
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isRealUserEntry(entries[i])) { lastUser = i; break; }
  }
  if (lastUser < 0) return 0;
  const turn = entries.slice(lastUser + 1);

  let mutated = false;
  let observed = false;
  let lastText = '';
  let turnText = '';
  for (const e of turn) {
    if (!e.message || e.message.role !== 'assistant' || !Array.isArray(e.message.content)) continue;
    for (const b of e.message.content) {
      if (b && b.type === 'tool_use') {
        if (MUTATING_TOOLS.has(b.name)) mutated = true;
        else if (b.name === 'Bash' && b.input && MUTATING_BASH.test(b.input.command || '')) mutated = true;
        if (isObservation(b)) observed = true;
      }
      if (b && b.type === 'text' && b.text) { lastText = b.text; turnText += b.text + '\n'; }
    }
  }

  if (!mutated || !CLAIM.test(lastText)) return 0;

  // UNVERIFIED is always a valid, honest closing.
  if (UNVERIFIED_LABEL.test(turnText)) return 0;

  if (!VERIFIED_LABEL.test(turnText)) {
    return block(
      'Done-claim without a VERIFIED:/UNVERIFIED: artifact even though this turn mutated. ' +
      'Run a tool call that proves the claim (test, curl, render, query) and close with ' +
      '`VERIFIED: <what ran> -> <real output>`, or honestly mark `UNVERIFIED: <why not>`.'
    );
  }

  // VERIFIED present, but is there a real observation? Without a non-mutating tool
  // call in the turn, the VERIFIED line is purely typed and not backed by evidence.
  if (!observed) {
    return block(
      'Your VERIFIED line is not backed by evidence: this turn contains a mutation but no ' +
      'tool OBSERVATION at all (test, curl, render, query, read) that proves the claim. A typed ' +
      'VERIFIED without a tool call does not count. Run the proving command, or honestly mark ' +
      '`UNVERIFIED: <why not>`.'
    );
  }

  return 0;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { raw += c; });
process.stdin.on('end', () => {
  let code = 0;
  try { code = main(raw); } catch (_) {}
  process.exit(code);
});
