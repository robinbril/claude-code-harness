#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const check = require('./project-structure-check.js');
const guard = require('../hooks/project-structure-guard.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-structure-'));
function write(relative, content = '') {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content);
}
write('.project-structure.json', JSON.stringify({
  allowedDirectories: ['frontend', 'backend', 'docs'],
  boundariesDocument: 'docs/architecture.md',
  forbiddenImports: [{ from: 'frontend', to: 'backend' }],
}));
write('README.md'); write('docs/architecture.md'); write('frontend/app.js', "import api from '../backend/api.js';"); write('backend/api.js');
assert.match(check.validateProject(root).errors.join('\n'), /forbidden backend/);
write('frontend/app.js', "import api from '../integrations/api.js';");
assert.deepEqual(check.validateProject(root).errors, []);
assert.match(check.validateWrite(path.join(root, 'scratch.js'), root).errors.join('\n'), /not an allowed root file/);
assert.match(check.validateWrite(path.join(root, 'random', 'file.js'), root).errors.join('\n'), /not an allowed root directory/);
assert.deepEqual(check.validateWrite(path.join(root, 'frontend', 'app.js'), root).errors, []);
assert.match(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(root, 'bad.md') }, cwd: root }).join('\n'), /allowed root file/);
assert.match(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(root, '.project-structure.json') }, cwd: root }).join('\n'), /protected/);
assert.match(guard.check({ tool_name: 'Bash', tool_input: { command: 'Set-Content bad.md x' }, cwd: root }).join('\n'), /allowed root file/);
assert.match(guard.check({ tool_name: 'Bash', tool_input: { cmd: 'Set-Content -Path bad.md -Value x' }, cwd: root }).join('\n'), /allowed root file/);
assert.match(guard.check({ tool_name: 'Bash', tool_input: { command: 'Out-File -FilePath bad.md' }, cwd: root }).join('\n'), /allowed root file/);
assert.deepEqual(guard.check({ tool_name: 'Bash', tool_input: { command: 'Set-Content frontend/new.js x' }, cwd: root }), []);
const noContract = fs.mkdtempSync(path.join(os.tmpdir(), 'project-structure-no-contract-'));
fs.mkdirSync(path.join(noContract, '.git'));
fs.mkdirSync(path.join(noContract, 'existing-module'));
assert.match(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(noContract, 'rogue-area', 'app.js') }, cwd: noContract }).join('\n'), /needs .project-structure.json first/);
assert.deepEqual(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(noContract, 'existing-module', 'app.js') }, cwd: noContract }), []);
assert.deepEqual(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(noContract, '.project-structure.json') }, cwd: noContract }), []);
console.log('project structure checker tests passed');
