#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { projectFiles } = require(path.join(__dirname, 'project-structure-check.js'));

const args = process.argv.slice(2);
const root = path.resolve(args.includes('--repo') ? args[args.indexOf('--repo') + 1] : process.cwd());
const entries = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.name !== '.git');
const rootFiles = entries.filter(entry => !entry.isDirectory()).map(entry => entry.name).sort();
const areas = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.')).map(entry => entry.name).sort();
const references = [];
// Gitignored build output (.venv, dist) is skipped, as in the checker.
for (const next of projectFiles(root)) {
  if (!/\.(yml|yaml|json|js|cjs|mjs|ts|py|sh|ps1)$/i.test(next)) continue;
  const source = fs.readFileSync(path.join(root, next), 'utf8');
  for (const area of areas) if (source.includes(`${area}/`) || source.includes(`./${area}`)) references.push({ file: next.split(path.sep).join('/'), area });
}
console.log(JSON.stringify({ root, areas, rootFiles, references }, null, 2));
