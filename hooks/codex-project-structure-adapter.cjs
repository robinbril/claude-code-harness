'use strict';
const fs = require('node:fs');
const path = require('node:path');
const guard = require('./project-structure-guard.js');

function patchInputs(patch, cwd) {
  const edits = []; let file;
  for (const line of patch.split(/\r?\n/)) {
    const header = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/);
    if (header) { file = path.resolve(cwd, header[1]); edits.push(file); }
  }
  return edits;
}
function normalize(data) {
  const cwd = data.cwd || process.cwd();
  const name = data.tool_name || '';
  const input = data.tool_input || {};
  if (/(?:^|[._])apply_patch$/.test(name)) return patchInputs(String(input.patch || input.command || ''), cwd).map(file_path => ({ tool_name: 'Edit', tool_input: { file_path }, cwd }));
  if (/^(?:functions\.)?(?:exec|exec_command|shell_command)$/.test(name)) return [{ tool_name: 'Bash', tool_input: { command: input.cmd || input.command || '' }, cwd }];
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
