#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const POLICY_FILE = '.project-structure.json';
const DEFAULT_ROOT_FILES = new Set([
  'README.md', 'LICENSE', 'NOTICE', '.gitignore', '.gitattributes', '.editorconfig',
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb',
  'pyproject.toml', 'uv.lock', 'requirements.txt', 'go.mod', 'go.sum', 'Cargo.toml', 'Cargo.lock',
  'compose.yaml', 'compose.yml', 'docker-compose.yml', 'Dockerfile', POLICY_FILE,
]);
const DEFAULT_HIDDEN_DIRS = new Set(['.git', '.github', '.claude', '.codex', '.cursor', '.harness']);
const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.py']);

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function findProject(start) {
  let current = path.resolve(start);
  if (fs.existsSync(current) && !fs.statSync(current).isDirectory()) current = path.dirname(current);
  for (;;) {
    const policy = path.join(current, POLICY_FILE);
    if (fs.existsSync(policy)) return { root: current, policy: readJson(policy) };
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function normalize(rel) { return rel.split(path.sep).join('/'); }
function allowedRootFile(name, policy) {
  return DEFAULT_ROOT_FILES.has(name) || (policy.allowedRootFiles || []).includes(name);
}
function allowedRootDir(name, policy) {
  return DEFAULT_HIDDEN_DIRS.has(name) || (policy.allowedDirectories || []).includes(name);
}
function validatePath(root, policy, target) {
  const rel = normalize(path.relative(root, path.resolve(target)));
  if (!rel || rel === '.') return [];
  if (rel.startsWith('../') || path.isAbsolute(rel)) return [`${target} is outside this project`];
  const parts = rel.split('/');
  const isDirectory = fs.existsSync(target) && fs.statSync(target).isDirectory();
  if (parts.length === 1 && isDirectory && !allowedRootDir(parts[0], policy)) {
    return [`${parts[0]}/ is not an allowed root directory`];
  }
  if (parts.length === 1 && !isDirectory && !allowedRootFile(parts[0], policy)) {
    return [`${parts[0]} is not an allowed root file`];
  }
  if (parts.length > 1 && !allowedRootDir(parts[0], policy)) {
    return [`${parts[0]}/ is not an allowed root directory`];
  }
  return [];
}
function walk(root, visit, relative = '') {
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) walk(root, visit, rel);
    else visit(rel);
  }
}
function importViolations(root, policy) {
  const rules = policy.forbiddenImports || [];
  const errors = [];
  if (!rules.length) return errors;
  walk(root, rel => {
    if (!SOURCE_EXTENSIONS.has(path.extname(rel))) return;
    const from = normalize(rel).split('/')[0];
    const source = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const rule of rules) {
      if (from !== rule.from) continue;
      const target = String(rule.to).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:from\\s*|require\\s*\\(|import\\s*\\()(['\"][^'\"]*(?:^|/)${target}(?:/|['\"]))`, 'g');
      if (re.test(source)) errors.push(`${normalize(rel)} imports forbidden ${rule.to}/ code`);
    }
  });
  return errors;
}
function validateProject(root) {
  const found = findProject(root);
  if (!found) return { errors: [] };
  const { policy } = found;
  const errors = [];
  for (const entry of fs.readdirSync(found.root, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const target = path.join(found.root, entry.name);
    errors.push(...validatePath(found.root, policy, target));
  }
  if (policy.boundariesDocument && !fs.existsSync(path.join(found.root, policy.boundariesDocument))) {
    errors.push(`missing required boundaries document: ${policy.boundariesDocument}`);
  }
  errors.push(...importViolations(found.root, policy));
  return { errors, root: found.root, policy };
}
function validateWrite(target, cwd) {
  const found = findProject(cwd);
  if (!found) return { errors: [] };
  return { errors: validatePath(found.root, found.policy, target), root: found.root, policy: found.policy };
}
function main(argv) {
  const index = argv.indexOf('--repo');
  if (index >= 0) return validateProject(argv[index + 1] || process.cwd());
  const pathIndex = argv.indexOf('--path');
  if (pathIndex >= 0) return validateWrite(argv[pathIndex + 1], argv[argv.indexOf('--cwd') + 1] || process.cwd());
  throw Error('Use --repo <directory> or --path <file> --cwd <directory>.');
}
if (require.main === module) {
  try {
    const result = main(process.argv.slice(2));
    if (result.errors.length) { process.stderr.write(result.errors.map(error => `[project-structure] ${error}`).join('\n') + '\n'); process.exitCode = 2; }
  } catch (error) { process.stderr.write(`[project-structure] ${error.message}\n`); process.exitCode = 2; }
}
module.exports = { findProject, validatePath, validateProject, validateWrite };
