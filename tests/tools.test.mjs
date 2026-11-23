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

const mt = (script) => tool(`skills/humanizer/scripts/${script}`);

function humanizerHome() {
  const home = tempDir('humanizer-');
  write(home, 'chat.txt', [
    '[23-11-2026, 14:05:12] Anna: lukt het vrijdag?',
    '[23-11-2026, 14:06:01] Ik Zelf: ja vrijdag is prima',
    '[23-11-2026, 14:06:20] Ik Zelf: neem jij de sleutel mee',
    '23-11-2026 15:00 - Ik Zelf: hierbij stuur ik je de volledige samenvatting van ons overleg van vandaag toe',
    '23-11-2026 15:30 - Anna: top dank',
    '[23-11-2026, 16:00:00] Ik Zelf: mijn wachtwoord is geheim123 voor straks',
  ].join('\n'));
  return { home, env: { HOME: home, HUMANIZER_HOME: path.join(home, 'mt'), PYTHONDONTWRITEBYTECODE: '1' } };
}

test('humanizer corpus: only own turns, bursts joined, secrets left out, private file mode', () => {
  const { home, env } = humanizerHome();
  const res = runScript('python3', [mt('corpus.py'), 'whatsapp', path.join(home, 'chat.txt'), '--naam', 'Ik Zelf', '--relatie', 'werk'], home, env);
  assert.equal(res.status, 0, res.stderr);
  const file = path.join(home, 'mt/corpus/app.jsonl');
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].tekst, 'ja vrijdag is prima\nneem jij de sleutel mee');
  assert.equal(rows[0].vorige, 'lukt het vrijdag?');
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('humanizer corpus schoon: text that an assistant drafted is removed', () => {
  const { home, env } = humanizerHome();
  runScript('python3', [mt('corpus.py'), 'whatsapp', path.join(home, 'chat.txt'), '--naam', 'Ik Zelf'], home, env);
  write(home, '.claude/projects/p/s.jsonl', `${JSON.stringify({ type: 'assistant', timestamp: '2026-11-23T10:00:00Z', message: { role: 'assistant', content: [{ type: 'text', text: 'Hierbij stuur ik je de volledige samenvatting van ons overleg van vandaag toe.' }] } })}\n`);
  const res = runScript('python3', [mt('corpus.py'), 'schoon'], home, env);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /app: 1 door een assistent opgesteld, 1 over/);
  assert.match(fs.readFileSync(path.join(home, 'mt/corpus/weg/app.jsonl'), 'utf8'), /volledige samenvatting/);
});

test('humanizer meet: an unknown register and an empty text fail instead of reporting green', () => {
  const { home, env } = humanizerHome();
  write(home, 'tekst.txt', 'Dit is een gewone zin.\n');
  write(home, 'leeg.txt', '\n');
  assert.notEqual(runScript('python3', [mt('meet.py'), '--register', 'app-werk', path.join(home, 'tekst.txt')], home, env).status, 0);
  assert.notEqual(runScript('python3', [mt('meet.py'), '--register', 'artikel', path.join(home, 'leeg.txt')], home, env).status, 0);
  const ok = runScript('python3', [mt('meet.py'), '--register', 'artikel', path.join(home, 'tekst.txt')], home, env);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /vergeleken met 294 menselijke teksten/);
});

test('humanizer corpus: nothing recognised or nothing searched is a failure, not a green report', () => {
  const { home, env } = humanizerHome();
  const wrongName = runScript('python3', [mt('corpus.py'), 'whatsapp', path.join(home, 'chat.txt'), '--naam', 'Iemand Anders'], home, env);
  assert.notEqual(wrongName.status, 0);
  assert.match(wrongName.stderr, /geen berichten van 'Iemand Anders' herkend/);
  runScript('python3', [mt('corpus.py'), 'whatsapp', path.join(home, 'chat.txt'), '--naam', 'Ik Zelf'], home, env);
  const noTranscripts = runScript('python3', [mt('corpus.py'), 'schoon'], home, env);
  assert.notEqual(noTranscripts.status, 0);
  assert.match(noTranscripts.stderr, /er is niets gecontroleerd/);
});

test('humanizer corpus: a secret in the other person\'s message is not stored as context', () => {
  const { home, env } = humanizerHome();
  write(home, 'geheim.txt', '[23-11-2026, 14:05:12] Anna: het wachtwoord is zomer2026\n[23-11-2026, 14:06:01] Ik Zelf: top dank je wel\n');
  const res = runScript('python3', [mt('corpus.py'), 'whatsapp', path.join(home, 'geheim.txt'), '--naam', 'Ik Zelf'], home, env);
  assert.equal(res.status, 0, res.stderr);
  assert.doesNotMatch(fs.readFileSync(path.join(home, 'mt/corpus/app.jsonl'), 'utf8'), /zomer2026/);
});

test('humanizer corpus schoon: a genuine text that an assistant quoted later is kept', () => {
  const { home, env } = humanizerHome();
  runScript('python3', [mt('corpus.py'), 'whatsapp', path.join(home, 'chat.txt'), '--naam', 'Ik Zelf'], home, env);
  write(home, '.claude/projects/p/s.jsonl', `["assistant"]\n${JSON.stringify({ timestamp: '2026-12-01T10:00:00Z', message: { role: 'assistant', content: [{ type: 'tool_use', input: { prompt: 'Voorbeeld: hierbij stuur ik je de volledige samenvatting van ons overleg van vandaag toe' } }] } })}\n`);
  const res = runScript('python3', [mt('corpus.py'), 'schoon'], home, env);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /app: 0 door een assistent opgesteld, 2 over/);
});

test('humanizer corpus map: quoted mail from others is cut in the common formats', () => {
  const { home, env } = humanizerHome();
  const own = 'Hi Anna, ik heb de planning bekeken en vrijdag om tien uur past mij het beste.';
  const quotes = [
    'Van: Anna\nVerzonden: maandag\nGEHEIME TEKST VAN ANNA',
    '-----Oorspronkelijk bericht-----\nGEHEIME TEKST VAN ANNA',
    'Op 23 nov 2026 om 10:00 heeft Anna <a@example.com> het volgende geschreven:\n\nGEHEIME TEKST VAN ANNA',
    'Op ma 23 nov. 2026 10:00 schreef Anna <\na@example.com>:\n> GEHEIME TEKST VAN ANNA',
    'On Mon, 23 Nov 2026 at 10:00, Anna wrote:\nGEHEIME TEKST VAN ANNA',
  ];
  quotes.forEach((q, i) => write(home, `mails/2026-11-0${i + 1}-m.txt`, `${own.replace('tien', `${i + 10}`)}\n\n${q}\n`));
  fs.writeFileSync(path.join(home, 'mails/2026-11-09-oud.txt'), Buffer.from(`${own} Met caf\xe9 erbij.`, 'latin1'));
  write(home, 'mails/zonder-datum.txt', own);
  const res = runScript('python3', [mt('corpus.py'), 'map', path.join(home, 'mails'), '--register', 'mail'], home, env);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stderr, /1 bestanden overgeslagen/);
  const body = fs.readFileSync(path.join(home, 'mt/corpus/mail.jsonl'), 'utf8');
  assert.equal(body.trim().split('\n').length, 6);
  assert.doesNotMatch(body, /GEHEIME/);
});

test('humanizer corpus: system lines, stale context, keys and ibans stay out; too little text keeps the old bands', () => {
  const { home, env } = humanizerHome();
  write(home, 'a.txt', [
    '01-03-2026 10:00 - Anna: oude vraag van maart',
    '23-11-2026 14:05 - Ik: ja dat is prima hoor',
    '23-11-2026 14:06 - Anna heeft Piet Jansen toegevoegd',
    `23-11-2026 15:00 - Ik: sleutel is ${['sk', 'ant', 'api03', 'abcdefgh1234'].join('-')}`,
    '23-11-2026 16:00 - Ik: betaal op NL12 ABCD 0123 4567 89 graag',
  ].join('\n'));
  runScript('python3', [mt('corpus.py'), 'whatsapp', path.join(home, 'a.txt'), '--naam', 'Ik'], home, env);
  const rows = fs.readFileSync(path.join(home, 'mt/corpus/app.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(rows.map((r) => [r.tekst, r.vorige]), [['ja dat is prima hoor', '']]);
  write(home, 'mt/banden.json', '{"mail":1}');
  assert.notEqual(runScript('python3', [mt('corpus.py'), 'banden'], home, env).status, 0);
  assert.equal(fs.readFileSync(path.join(home, 'mt/banden.json'), 'utf8'), '{"mail":1}');
  const wrong = runScript('python3', [mt('voorbeelden.py'), '--register', 'app', '--relatie', 'werk'], home, env);
  assert.notEqual(wrong.status, 0);
  assert.match(wrong.stderr, /geen teksten met relatie werk/);
});

test('humanizer toets: missing or invalid verdicts fail, lower case counts', () => {
  const { home, env } = humanizerHome();
  write(home, 'k.json', '{"1":"A","2":"B"}');
  const run = (name, json) => { write(home, name, json); return runScript('python3', [mt('toets.py'), 'score', path.join(home, 'k.json'), path.join(home, name)], home, env); };
  assert.match(run('goed.json', '[{"nr":1,"mens":"a","reden":"x"},{"nr":"2","mens":"b","reden":"y"}]').stdout, /2\/2 = 100%/);
  assert.notEqual(run('half.json', '[{"nr":1,"mens":"A"}]').status, 0);
  assert.notEqual(run('raar.json', '[{"nr":1,"mens":"A"},{"nr":2,"mens":"?"}]').status, 0);
});
