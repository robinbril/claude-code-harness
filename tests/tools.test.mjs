// Skill tools that must not report green when they did not check anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, makeRepo, tempDir, write, git, runScript } from './helpers.mjs';

const tool = (rel) => path.join(ROOT, rel);

test('project-structure-check: a forbidden import in a file with an accented name is found', () => {
  const repo = makeRepo();
  write(repo, '.project-structure.json', JSON.stringify({
    areas: { domain: { responsibility: 'rules' }, ui: { responsibility: 'screens' } },
    allowedRootFiles: ['app.txt'],
    forbiddenDependencies: [{ from: 'domain', to: 'ui' }],
  }));
  write(repo, 'ui/button.ts', 'export const b = 1;\n');
  write(repo, 'domain/café.ts', "import { b } from '../ui/button';\n");
  git(repo, 'add', '-A');
  const res = runScript(process.execPath, [tool('skills/projectstructuur/tools/project-structure-check.js'), '--repo', repo], repo);
  assert.equal(res.status, 2, res.stderr);
  assert.match(res.stderr, /café\.ts depends on forbidden ui\/ area/);
});

test('find-polluter: the documented pattern finds the tests', () => {
  const dir = tempDir('polluter-');
  write(dir, 'src/a.test.ts', '');
  write(dir, 'src/deep/b.test.ts', '');
  write(dir, 'package.json', JSON.stringify({ scripts: { test: 'true' } }));
  const res = runScript('bash', [tool('skills/systematic-debugging/find-polluter.sh'), 'polluted.flag', 'src/**/*.test.ts'], dir);
  assert.match(res.stdout, /Found 2 test files/);
  assert.equal(res.status, 0, res.stdout + res.stderr);
});

test('find-polluter: zero matching tests is a failure, not "all clean"', () => {
  const dir = tempDir('polluter-');
  const res = runScript('bash', [tool('skills/systematic-debugging/find-polluter.sh'), 'polluted.flag', 'src/**/*.test.ts'], dir);
  assert.notEqual(res.status, 0);
  assert.doesNotMatch(res.stdout, /all tests clean/);
});

test('render-proof: finds Playwright installed only in the project', () => {
  const project = tempDir('render-project-');
  write(project, 'node_modules/playwright/package.json', JSON.stringify({ name: 'playwright', main: 'index.js' }));
  write(project, 'node_modules/playwright/index.js',
    "exports.chromium = { launch: async () => { throw new Error('STUB_PLAYWRIGHT_FROM_PROJECT'); } };\n");
  const res = runScript(process.execPath, [tool('skills/render-proof/scripts/shoot.js'), 'https://example.invalid', 'out.png'], project,
    { HOME: tempDir('empty-home-'), NODE_PATH: '' });
  assert.doesNotMatch(res.stderr, /MODULE_NOT_FOUND|Cannot find module 'playwright'/);
  assert.match(res.stderr + res.stdout, /STUB_PLAYWRIGHT_FROM_PROJECT/);
});

test('list_skills: includes skills installed through plugins', () => {
  const home = tempDir('skills-home-');
  write(home, '.claude/skills/own/SKILL.md', '---\nname: own\ndescription: Own skill.\n---\n');
  write(home, '.claude/plugins/cache/market/dev-harness/1.0.0/skills/rea/SKILL.md', '---\nname: rea\ndescription: Plugin skill.\n---\n');
  const res = runScript('python3', [tool('skills/skill-finder/scripts/list_skills.py')], home, { HOME: home });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /- own: Own skill\./);
  assert.match(res.stdout, /dev-harness:rea: Plugin skill\./);
});

test('detect-stack: a git worktree is a git repo', () => {
  const repo = makeRepo();
  const wt = path.join(tempDir('worktree-'), 'wt');
  git(repo, 'worktree', 'add', '-q', '-b', 'side', wt);
  assert.equal(fs.statSync(path.join(wt, '.git')).isFile(), true);
  const res = runScript('bash', [tool('skills/supergoal/scripts/detect-stack.sh')], wt);
  assert.doesNotMatch(res.stdout, /Not a git repo/);
  assert.match(res.stdout, /Branch: `side`/);
});

const PHASE_OK = `# Phase 1
SUPERGOAL_PHASE_START
## Work
Build the login form.
## Acceptance criteria
- [tool-output] npm test exits 0
- [empirical] /login renders and accepts a valid sign-in (screenshot)
## Mandatory commands
- npm test (must exit 0)
## Evidence required
- last 10 lines of npm test
`;

test('validate-phase: a complete phase passes', () => {
  const dir = tempDir('phase-');
  write(dir, 'phase-1.md', PHASE_OK);
  const res = runScript('bash', [tool('skills/supergoal/scripts/validate-phase.sh'), path.join(dir, 'phase-1.md')], dir);
  assert.equal(res.status, 0, res.stderr);
});

test('validate-phase: an empty phase with only headings fails', () => {
  const dir = tempDir('phase-');
  write(dir, 'phase-1.md', 'SUPERGOAL_PHASE_START\n## Work\n## Acceptance criteria\n## Mandatory commands\n## Evidence required\n');
  const res = runScript('bash', [tool('skills/supergoal/scripts/validate-phase.sh'), path.join(dir, 'phase-1.md')], dir);
  assert.equal(res.status, 1, res.stdout);
});

test('validate-phase: criteria without a validation class fail', () => {
  const dir = tempDir('phase-');
  write(dir, 'phase-1.md', PHASE_OK.replace('- [tool-output] npm test exits 0', '- npm test exits 0').replace('- [empirical] ', '- '));
  const res = runScript('bash', [tool('skills/supergoal/scripts/validate-phase.sh'), path.join(dir, 'phase-1.md')], dir);
  assert.equal(res.status, 1, res.stdout);
});
