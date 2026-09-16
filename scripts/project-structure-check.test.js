#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const check = require('./project-structure-check.js');
const guard = require('../hooks/project-structure-guard.js');
const adapter = path.join(__dirname, '../hooks/codex-project-structure-adapter.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-structure-'));
function write(relative, content = '') {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function policy(areas = ['app', 'infra', 'tests', 'docs']) {
  return {
    areas: Object.fromEntries(areas.map(name => [name, { responsibility: `${name} work` }])),
    allowedRootFiles: ['package.json', 'compose.yml'],
    boundariesDocument: 'docs/architecture.md',
    forbiddenDependencies: [{ from: 'app', to: 'infra' }],
  };
}
write('.project-structure.json', JSON.stringify(policy()));
write('README.md'); write('package.json'); write('docs/architecture.md');
write('app/index.js', "import runtime from '../infra/runtime.js';"); write('infra/runtime.js'); write('tests/app.test.js');
assert.match(check.validateProject(root).errors.join('\n'), /forbidden infra/);
write('app/index.js', "import runtime from '../app/runtime.js';");
assert.deepEqual(check.validateProject(root).errors, []);
assert.match(check.validateWrite(path.join(root, 'scratch.js'), root).errors.join('\n'), /approved root file/);
assert.match(check.validateWrite(path.join(root, 'random', 'file.js'), root).errors.join('\n'), /named project area/);
assert.deepEqual(check.validateWrite(path.join(root, 'app', 'new.js'), root).errors, []);
assert.match(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(root, 'bad.md') }, cwd: root }).join('\n'), /approved root file/);
assert.match(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(root, '.project-structure.json') }, cwd: root }).join('\n'), /protected/);
assert.match(guard.check({ tool_name: 'Bash', tool_input: { command: 'Remove-Item .project-structure.json' }, cwd: root }).join('\n'), /protected/);
assert.match(guard.check({ tool_name: 'Bash', tool_input: { command: 'Set-Content bad.md x' }, cwd: root }).join('\n'), /approved root file/);
const tooMany = policy(['app', 'infra', 'tests', 'docs', 'ops', 'tools', 'assets']);
write('.project-structure.json', JSON.stringify(tooMany));
assert.deepEqual(check.validateProject(root).errors, []);
assert.match(check.validateProject(root).advice.join('\n'), /review whether a junior/);
assert.deepEqual(check.validateWrite(path.join(root, 'app', 'later.js'), root).errors, []);
write('.project-structure.json', JSON.stringify(policy()));
write('loose-compose.yml');
assert.match(check.validateProject(root).errors.join('\n'), /approved root file/);
fs.unlinkSync(path.join(root, 'loose-compose.yml'));
const noContract = fs.mkdtempSync(path.join(os.tmpdir(), 'project-structure-no-contract-'));
fs.mkdirSync(path.join(noContract, '.git'));
fs.mkdirSync(path.join(noContract, 'existing-module'));
assert.deepEqual(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(noContract, 'rogue-area', 'app.js') }, cwd: noContract }), []);
assert.deepEqual(guard.check({ tool_name: 'Write', tool_input: { file_path: path.join(noContract, 'existing-module', 'app.js') }, cwd: noContract }), []);
const patch = JSON.stringify({ tool_name: 'functions.apply_patch', cwd: root, tool_input: { patch: '*** Begin Patch\n*** Delete File: .project-structure.json\n*** End Patch' } });
const result = require('node:child_process').spawnSync(process.execPath, [adapter], { input: patch, encoding: 'utf8' });
assert.equal(result.status, 2); assert.match(result.stderr, /protected/);
console.log('project structure checker tests passed');
