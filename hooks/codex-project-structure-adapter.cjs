'use strict';
const fs = require('node:fs');
const path = require('node:path');
const guard = require('./project-structure-guard.js');

function patchInputs(patch, cwd) {
  const edits = []; let operation;
  for (const line of patch.split(/\r?\n/)) {
    const header = line.match(/^\*\*\* (Add|Update|Delete) File: (.+)$/);
    if (header) { operation = header[1]; edits.push({ operation, file_path: path.resolve(cwd, header[2]) }); }
    const move = line.match(/^\*\*\* Move to: (.+)$/);
    if (move) edits.push({ operation: 'Move', file_path: path.resolve(cwd, move[1]) });
  }
  return edits;
}
function execCommand(input) {
  if (input.cmd || input.command) return input.cmd || input.command;
  const match = String(input.code || '').match(/(?:cmd|command)\s*:\s*['\"]([^'\"]+)/);
  return match ? match[1] : '';
}
function normalize(data) {
  const cwd = data.cwd || process.cwd();
  const name = data.tool_name || '';
  const input = data.tool_input || {};
  if (/(?:^|[._])apply_patch$/.test(name)) return patchInputs(String(input.patch || input.command || ''), cwd).map(item => ({ tool_name: item.operation === 'Delete' ? 'Delete' : 'Edit', tool_input: { file_path: item.file_path }, cwd }));
  if (/^(?:functions\.)?(?:exec|exec_command|shell_command)$/.test(name)) return [{ tool_name: 'Bash', tool_input: { command: execCommand(input) }, cwd }];
  return [{ ...data, cwd }];
}
let raw = '';
process.stdin.setEncoding('utf8'); process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(raw); const errors = normalize(data).flatMap(guard.check);
    if (errors.length) { process.stderr.write(errors.map(error => `[project-structure] ${error}`).join('\n') + '\n'); process.exitCode = 2; return; }
    process.stdout.write(raw);
  } catch (error) { process.stderr.write(`[project-structure] ${error.message}\n`); process.exitCode = 2; }
});
