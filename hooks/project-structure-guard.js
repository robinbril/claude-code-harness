#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const checkerFile = [
  path.join(__dirname, '../scripts/project-structure-check.js'),
  path.join(__dirname, 'project-structure-check.js'),
].find(fs.existsSync);
if (!checkerFile) throw Error('project-structure-check.js is missing next to the guard.');
const checker = require(checkerFile);
const UNCONTRACTED_EXCEPTIONS = new Set(['.git', '.github', '.claude', '.codex', '.cursor', '.harness', 'node_modules']);
function gitRoot(start) {
  let current = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start);
    current = parent;
  }
}

function shellTargets(command, cwd) {
  const result = [];
  const patterns = [
    /(?:>|>>)\s+['\"]?([^'\"\s;|]+)/gi,
    /(?:Set-Content|Add-Content|Out-File)[^;|\r\n]*?-(?:Path|LiteralPath|FilePath)\s+['\"]?([^'\"\s;|]+)/gi,
    /(?:Set-Content|Add-Content|Out-File)\s+(?!-)["']?([^'\"\s;|]+)/gi,
    /New-Item(?:\s+-\w+\s+\S+)*\s+-Path\s+['\"]?([^'\"\s;|]+)/gi,
  ];
  for (const pattern of patterns) for (const match of command.matchAll(pattern)) result.push(path.resolve(cwd, match[1]));
  return result;
}
function check(data) {
  const cwd = data.cwd || data.workspace_root || process.cwd();
  const name = data.tool_name || '';
  const input = data.tool_input || {};
  const targets = name === 'Write' || name === 'Edit'
    ? [input.file_path || input.path]
    : shellTargets(String(input.command || input.cmd || data.command || ''), cwd);
  const root = gitRoot(cwd);
  const project = checker.findProject(root);
  const policyEdits = targets.filter(target => path.basename(target) === '.project-structure.json');
  if (!project) {
    const newAreas = targets.filter(target => {
      const relative = path.relative(root, target).split(path.sep);
      return relative.length > 1 && !UNCONTRACTED_EXCEPTIONS.has(relative[0]) && !fs.existsSync(path.join(root, relative[0]));
    });
    if (newAreas.length) return [`new top-level area ${path.relative(root, newAreas[0])} needs .project-structure.json first`];
  }
  if (project && policyEdits.length && process.env.PROJECT_STRUCTURE_ALLOW_POLICY_CHANGE !== '1') {
    return ['.project-structure.json is protected. A human may make a deliberate migration with PROJECT_STRUCTURE_ALLOW_POLICY_CHANGE=1.'];
  }
  if (name === 'Write' || name === 'Edit') return checker.validateWrite(targets[0], cwd).errors;
  const command = String(input.command || input.cmd || data.command || '');
  return targets.flatMap(target => checker.validateWrite(target, cwd).errors);
}
function main(raw, cursor) {
  let data = {};
  try { data = JSON.parse(raw || '{}'); } catch { data = {}; }
  let errors;
  try { errors = check(data); } catch (error) { errors = [`policy could not be read: ${error.message}`]; }
  if (cursor) {
    process.stdout.write(JSON.stringify(errors.length ? { permission: 'deny', agent_message: errors.join('; '), user_message: 'Project structure policy blocked this shell write.' } : { permission: 'allow' }));
    return 0;
  }
  if (errors.length) { process.stderr.write(errors.map(error => `[project-structure] ${error}`).join('\n') + '\n'); return 2; }
  process.stdout.write(raw);
  return 0;
}
if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8'); process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => { process.exitCode = main(raw, process.argv.includes('--cursor')); });
}
module.exports = { check, shellTargets, gitRoot, UNCONTRACTED_EXCEPTIONS };
