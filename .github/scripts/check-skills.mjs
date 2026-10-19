#!/usr/bin/env node
// Repo consistency check for CI: skills, docs, plugin metadata and hooks agree with each other.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const errors = [];

const readme = read('README.md');
const onderhoud = read('docs/ONDERHOUD.md');
const skillDirs = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

for (const name of skillDirs) {
  const file = path.join('skills', name, 'SKILL.md');
  if (!fs.existsSync(path.join(root, file))) { errors.push(`${file} ontbreekt`); continue; }
  const front = read(file).match(/^---\n([\s\S]*?)\n---/);
  if (!front) { errors.push(`${file}: geen frontmatter`); continue; }
  const declared = front[1].match(/^name:\s*(\S+)/m);
  if (!declared || declared[1] !== name) errors.push(`${file}: name is ${declared ? declared[1] : 'leeg'}, verwacht ${name}`);
  if (!/^description:\s*\S/m.test(front[1])) errors.push(`${file}: description ontbreekt`);
  if (!readme.includes(`\`${name}\``) && !readme.includes(`\`/${name}\``)) errors.push(`README.md noemt skill ${name} niet`);
  if (!onderhoud.includes(`\`${name}\``)) errors.push(`docs/ONDERHOUD.md noemt skill ${name} niet`);
}

const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
const market = JSON.parse(read('.claude-plugin/marketplace.json'));
if (market.plugins[0].version !== plugin.version) errors.push(`versie: plugin.json ${plugin.version}, marketplace.json ${market.plugins[0].version}`);
if (!market.plugins[0].description.startsWith(`${skillDirs.length} skills`)) errors.push(`marketplace.json noemt niet ${skillDirs.length} skills`);

const hooks = JSON.parse(read('hooks/hooks.json')).hooks;
for (const groups of Object.values(hooks)) {
  for (const group of groups) {
    for (const hook of group.hooks) {
      const script = hook.command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/);
      if (script && !fs.existsSync(path.join(root, script[1]))) errors.push(`hooks.json wijst naar ontbrekend ${script[1]}`);
    }
  }
}

const personal = /\/Users\/|~\/Documents\/Code|C:\\Users/;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
for (const file of walk(path.join(root, 'skills')).filter((f) => /\.(md|mjs|js|ts|json|sh|py)$/.test(f))) {
  if (personal.test(fs.readFileSync(file, 'utf8'))) errors.push(`${path.relative(root, file)}: persoonlijk pad`);
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log(`ok: ${skillDirs.length} skills, versie ${plugin.version}, hooks en docs consistent`);
