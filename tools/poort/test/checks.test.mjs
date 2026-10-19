import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkBody } from '../checks/pr-body.mjs';

const CHECKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'checks');
const INTEGRATIONS = path.resolve(CHECKS, '..', 'integrations');
const GIT_INIT = 'git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false';
const node = (script, args, cwd, env = {}) =>
  spawnSync('node', [path.join(CHECKS, script), ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
const sh = (cmd, cwd) => spawnSync('sh', ['-c', cmd], { cwd, encoding: 'utf8' });
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const write = (dir, rel, s) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), s);
};

// ---------- migration-deps: een functie die pas ná de migraties ontstaat ----------

function migrationsFixture() {
  const dir = tmp('poort-mig-');
  write(dir, 'm/001_schema.sql', 'CREATE SCHEMA IF NOT EXISTS billing;\nCREATE TABLE billing.orders (id int);\n');
  write(dir, 'm/002_fn.sql', 'CREATE OR REPLACE FUNCTION billing.workdays(d date) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;\n');
  write(dir, 'm/003_uses_late.sql', '-- billing.is_holiday() komt uit het ensure-script\nSELECT billing.is_holiday(now()::date);\n');
  write(dir, 'm/004_uses_ok.sql', 'SELECT billing.workdays(now()::date);\nINSERT INTO billing.orders (id) VALUES (1);\n');
  write(dir, 'm/005_uses_future.sql', 'SELECT billing.later_fn(1);\n');
  write(dir, 'm/006_defines_future.sql', 'CREATE FUNCTION billing.later_fn(i int) RETURNS int AS $$ SELECT i $$ LANGUAGE sql;\n');
  write(dir, 'm/006_rollback_defines_future.sql', 'SELECT billing.nope(1);\n');
  write(dir, 'ensure.py', 'SQL = """CREATE OR REPLACE FUNCTION billing.is_holiday(d date) RETURNS bool"""\n');
  return dir;
}

test('migration-deps: functie die alleen ná de migraties bestaat blokkeert', () => {
  const dir = migrationsFixture();
  const r = node('migration-deps.mjs', ['--dir', 'm', '--after', 'ensure.py', 'm/003_uses_late.sql'], dir);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /billing\.is_holiday\(\) bestaat alleen in ensure\.py/);
});

test('migration-deps: functie uit een latere migratie blokkeert; eerdere en tabellen niet', () => {
  const dir = migrationsFixture();
  const late = node('migration-deps.mjs', ['--dir', 'm', 'm/005_uses_future.sql'], dir);
  assert.equal(late.status, 1);
  assert.match(late.stdout, /later_fn\(\) wordt pas in migratie 6 aangemaakt \(deze is 5\)/);
  const ok = node('migration-deps.mjs', ['--dir', 'm', 'm/004_uses_ok.sql'], dir);
  assert.equal(ok.status, 0, ok.stdout);
  assert.equal(ok.stdout.trim(), '', 'INSERT INTO billing.orders (...) is geen functieaanroep');
});

test('migration-deps: --all vindt precies de twee fouten, rollbacks tellen niet', () => {
  const dir = migrationsFixture();
  const r = node('migration-deps.mjs', ['--dir', 'm', '--after', 'ensure.py', '--all'], dir);
  assert.equal(r.status, 1);
  assert.equal((r.stdout.match(/^✗/gm) || []).length, 2);
  assert.doesNotMatch(r.stdout, /nope/);
});

// ---------- stale-branch: exact conflict vs schone achterstand ----------

function repoWithBase() {
  const dir = tmp('poort-stale-');
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  write(dir, 'a.txt', 'een\n');
  write(dir, 'b.txt', 'b\n');
  sh('git add -A && git commit -qm base && git branch base', dir);
  return dir;
}

test('stale-branch: echte conflicten blokkeren, met bestandsnaam', () => {
  const dir = repoWithBase();
  sh('git checkout -q base && echo upstream > a.txt && git commit -qam up && git checkout -q main && echo mine > a.txt && git commit -qam mine', dir);
  const r = node('stale-branch.mjs', ['base'], dir, { POORT_OFFLINE: '1' });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /Conflict met base \(1 commits achter\)/);
  assert.match(r.stdout, /^ {2}a\.txt$/m);
});

test('stale-branch: schone achterstand met overlap is advies, geen blokkade', () => {
  const dir = repoWithBase();
  sh('git checkout -q base && printf "een\\ntwee\\n" > a.txt && git commit -qam up && git checkout -q main && printf "nul\\neen\\n" > a.txt && git commit -qam mine', dir);
  const r = node('stale-branch.mjs', ['base'], dir, { POORT_OFFLINE: '1' });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /^poort:warn 1 commits achter base; 1 bestand\(en\) ook daar gewijzigd \(a\.txt\)/m);
});

test('stale-branch: niet achter = stil', () => {
  const dir = repoWithBase();
  const r = node('stale-branch.mjs', ['base'], dir, { POORT_OFFLINE: '1' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

// ---------- ripple: ghost version + blast radius ----------

test('ripple: zelfde functie elders en consumers van een gedeelde surface', () => {
  const dir = tmp('poort-ripple-');
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  write(dir, 'src/lib/dates.ts', 'export function addWorkdays(d, n) { return d }\n');
  write(dir, 'src/views/A.vue', '<script>import { addWorkdays } from "../lib/dates"; addWorkdays(1,2)</script>\n');
  write(dir, 'src/views/B.vue', '<script>import { addWorkdays } from "../lib/dates"; addWorkdays(3,4)</script>\n');
  write(dir, 'src/views/C.ts', 'function addWorkdays(d, n) { return d + n }\n');
  sh('git add -A && git commit -qm base', dir);
  write(dir, 'src/lib/dates.ts', 'export function addWorkdays(d, n) { return d + n }\n');
  sh('git add -A', dir);
  const r = node('ripple.mjs', ['--shared', '^src/lib/', 'src/lib/dates.ts'], dir, { POORT_STAGED: '1' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /poort:warn addWorkdays \(src\/lib\/dates\.ts\) is ook gedefinieerd in src\/views\/C\.ts/);
  assert.match(r.stdout, /poort:warn addWorkdays \(gedeelde surface\) heeft 3 consumers/);
});

// ---------- pr-body ----------

const rules = {
  sections: [{ when: '^src/composables/', heading: 'Behaviou?r (delta|changes?)' }],
  migrationsDir: 'db/migrations',
};
const exists = {
  file: (p) => p === 'src/composables/useX.ts',
  topDir: (d) => d === 'src',
  migration: (n) => Number(n) === 141,
};

test('pr-body: gedeelde surface zonder delta-sectie faalt, met sectie (ook "geen") niet', () => {
  const files = ['src/composables/useX.ts'];
  assert.equal(checkBody({ body: '## Summary\nfix', files, rules, exists }).length, 1);
  assert.deepEqual(checkBody({ body: '## Summary\nfix\n\n## Behaviour delta\ngeen', files, rules, exists }), []);
  assert.deepEqual(checkBody({ body: '**Behavior changes:** sortering', files, rules, exists }), []);
});

test('pr-body: verzonnen migratie en niet-bestaand pad, afkorting en diff-bestand niet', () => {
  const errs = checkBody({ body: 'Zie migration 142 en `src/composables/useY.ts`; ook `core/auth.py` en migratie 141.', files: ['src/old.ts'], rules, exists });
  assert.equal(errs.length, 2, errs.join('\n'));
  assert.match(errs.join('\n'), /migratie 142/);
  assert.match(errs.join('\n'), /useY\.ts/);
  assert.deepEqual(checkBody({ body: 'verwijdert `src/old.ts`', files: ['src/old.ts'], rules, exists }), []);
});

// ---------- ruff-new: alleen nieuwe overtredingen op gewijzigde regels ----------

const hasRuff = spawnSync('sh', ['-c', 'command -v ruff']).status === 0;

test('ruff-new: blokkeert een nieuwe overtreding, bestaande alleen als advies', { skip: !hasRuff && 'ruff ontbreekt' }, () => {
  const dir = tmp('poort-ruffnew-');
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git config commit.gpgsign false', dir);
  write(dir, 'a.py', 'import os\n\n\ndef f():\n    return 1\n');
  sh('git add -A && git commit -qm base', dir);
  write(dir, 'a.py', 'import os\nimport sys\n\n\ndef f():\n    return 1\n');
  const r = node('ruff-new.mjs', ['--ruff-args', '--isolated --select F', 'a.py'], dir, { POORT_BASE: 'HEAD' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /a\.py:2:\d+: F401/);
  assert.doesNotMatch(r.stdout, /a\.py:1:/);
  assert.match(r.stdout, /poort:warn 1 bestaande overtreding/);
});

// ---------- pytest-affected: selectie op imports ----------

function pytestRepo() {
  const dir = tmp('poort-pyaff-');
  sh('git init -q -b main', dir);
  write(dir, 'app/svc/reken.py', 'def som(a, b):\n    return a + b\n');
  write(dir, 'app/svc/los.py', 'X = 1\n');
  write(dir, 'tests/test_reken.py', 'from app.svc import reken\n');
  write(dir, 'tests/test_ander.py', 'import json\n');
  write(dir, 'tests/test_direct.py', 'from app.svc.reken import som\n');
  // Nep-python: print de pytest-argumenten in plaats van te testen.
  write(dir, 'fakepy', '#!/bin/sh\necho "ARGS $*"\n');
  fs.chmodSync(path.join(dir, 'fakepy'), 0o755);
  return dir;
}

test('tests-affected: kiest tests die de gewijzigde module importeren', () => {
  const dir = pytestRepo();
  const r = node('tests-affected.mjs', ['--src', 'app', '--tests', 'tests', '--python', './fakepy', 'app/svc/reken.py'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ARGS .*tests\/test_direct\.py/);
  assert.match(r.stdout, /ARGS .*tests\/test_reken\.py/);
  assert.doesNotMatch(r.stdout, /test_ander/);
});

test('tests-affected: relatieve en meerregelige imports, Django-labels via een eigen runner', () => {
  const dir = tmp('poort-django-');
  sh('git init -q -b main', dir);
  write(dir, 'proj/modules/kassa/services.py', 'def boek():\n    return 1\n');
  write(dir, 'proj/modules/kassa/tests_boeken.py', 'from .services import boek\n');
  write(dir, 'proj/modules/kassa/tests_meer.py', 'from proj.modules.kassa import (\n    models,\n    services,\n)\n');
  write(dir, 'proj/modules/andere/tests_los.py', 'from proj.modules.andere.models import X\n');
  const r = node(
    'tests-affected.mjs',
    ['--src', 'proj', '--tests', 'proj', '--test-pattern', '^tests.*\\.py$', '--label', 'module', '--cmd', 'echo RUN', 'proj/modules/kassa/services.py'],
    dir,
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RUN proj\.modules\.kassa\.tests_boeken proj\.modules\.kassa\.tests_meer\s*$/m);
  assert.doesNotMatch(r.stdout, /tests_los/);
});

test('tests-affected: volgt standaard de importgraaf (--direct niet); verwijderde module telt mee', () => {
  const dir = pytestRepo();
  write(dir, 'app/svc/factuur.py', 'from app.svc.reken import som\n');
  write(dir, 'tests/helpers.py', 'from app.svc import factuur\n');
  write(dir, 'tests/test_factuur.py', 'from app.svc.factuur import *\n');
  write(dir, 'tests/test_via_helper.py', 'from tests.helpers import factuur\n');
  const args = ['--src', 'app', '--tests', 'tests', '--python', './fakepy'];
  const direct = node('tests-affected.mjs', [...args, '--direct', 'app/svc/reken.py'], dir);
  assert.doesNotMatch(direct.stdout, /test_factuur|test_via_helper/);
  const trans = node('tests-affected.mjs', [...args, 'app/svc/reken.py'], dir);
  assert.equal(trans.status, 0, trans.stdout + trans.stderr);
  for (const t of ['test_direct', 'test_reken', 'test_factuur', 'test_via_helper']) assert.match(trans.stdout, new RegExp(`ARGS .*tests/${t}\\.py`));
  assert.doesNotMatch(trans.stdout, /test_ander/);
  fs.rmSync(path.join(dir, 'app/svc/reken.py'));
  const weg = node('tests-affected.mjs', [...args, 'app/svc/reken.py'], dir);
  assert.match(weg.stdout, /ARGS .*tests\/test_reken\.py/);
});

test('tests-affected: --routes kiest tests die via een URL binnenkomen als de keten een router raakt', () => {
  const dir = tmp('poort-routes-');
  sh('git init -q -b main', dir);
  write(dir, 'proj/views.py', 'from proj.services import boek\n');
  write(dir, 'proj/services.py', 'def boek():\n    return 1\n');
  write(dir, 'proj/los.py', 'X = 1\n');
  write(dir, 'proj/urls.py', 'from proj import views\n');
  write(dir, 'proj/tests_api.py', "class T:\n    def test_x(self):\n        self.client.get('/boek/')\n");
  write(dir, 'proj/tests_los.py', 'from proj.los import X\n');
  const run = (file) =>
    node(
      'tests-affected.mjs',
      ['--src', 'proj', '--tests', 'proj', '--test-pattern', '^tests.*\\.py$', '--label', 'module', '--transitive', '--routes', 'urls$=self\\.client\\.', '--cmd', 'echo RUN', file],
      dir,
    );
  const via = run('proj/services.py');
  assert.equal(via.status, 0, via.stdout + via.stderr);
  assert.match(via.stdout, /RUN proj\.tests_api\s*$/m);
  const los = run('proj/los.py');
  assert.match(los.stdout, /RUN proj\.tests_los\s*$/m);
});

test('tests-affected: kernbestand = hele suite; module die geen test raakt = hele suite (geen vals groen)', () => {
  const dir = pytestRepo();
  const full = node('tests-affected.mjs', ['--src', 'app', '--tests', 'tests', '--python', './fakepy', '--full-on', '^app/svc/reken', 'app/svc/reken.py'], dir);
  assert.match(full.stdout, /volledige suite \(kernbestand gewijzigd: app\/svc\/reken\.py\)/);
  assert.match(full.stdout, /ARGS -m pytest -q -p no:cacheprovider tests\s*$/m);
  const los = node('tests-affected.mjs', ['--src', 'app', '--tests', 'tests', '--python', './fakepy', 'app/svc/los.py'], dir);
  assert.equal(los.status, 0, los.stdout + los.stderr);
  assert.match(los.stdout, /volledige suite \(geen test raakt app\.svc\.los\)/);
  assert.match(los.stdout, /ARGS -m pytest -q -p no:cacheprovider tests\s*$/m);
  const bewust = node('tests-affected.mjs', ['--src', 'app', '--tests', 'tests', '--python', './fakepy', '--no-fallback', 'app/svc/los.py'], dir);
  assert.match(bewust.stdout, /poort:warn geen test raakt app\.svc\.los; .*--no-fallback/);
  assert.match(bewust.stdout, /geen tests geraakt/);
});

test('tests-affected: route-test via app.main raakt de route-module (repro uit de Polpo-review)', () => {
  const dir = pytestRepo();
  // Zoals FastAPI: de route-module wordt alleen door app.main geïmporteerd, de
  // test praat over HTTP met app.main en importeert de route nooit zelf.
  write(dir, 'app/api/portal/auth.py', 'def check_purpose(token):\n    return token.purpose == "portal"\n');
  write(dir, 'app/api/__init__.py', 'from app.api.portal import auth\n');
  write(dir, 'app/main.py', 'from app import api\napp = object()\n');
  write(dir, 'tests/test_portal_http.py', 'from app.main import app\n');
  const r = node('tests-affected.mjs', ['--src', 'app', '--tests', 'tests', '--python', './fakepy', 'app/api/portal/auth.py'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ARGS .*tests\/test_portal_http\.py/);
  assert.doesNotMatch(r.stdout, /volledige suite/, 'gevonden via de graaf, geen fallback nodig');
});

test('tests-affected: --pg-db weigert een naam zonder "test" en een template dat niet van poort is', () => {
  const dir = tmp('poort-pgguard-');
  write(dir, 'app/svc/reken.py', 'X = 1\n');
  write(dir, 'tests/test_reken.py', 'from app.svc import reken\n');
  write(dir, 'bin/docker', '#!/bin/sh\ncase "$*" in\n  *"compose port"*) echo 127.0.0.1:5432 ;;\n  *"select 1 from pg_database"*) echo 1 ;;\nesac\nexit 0\n');
  fs.chmodSync(path.join(dir, 'bin/docker'), 0o755);
  const args = (db) => ['--src', 'app', '--tests', 'tests', '--cmd', 'echo RUN', '--pg-service', 'db', '--pg-db', db, '--migrate', 'true', 'app/svc/reken.py'];
  const env = { PATH: `${path.join(dir, 'bin')}:${process.env.PATH}` };
  const dev = node('tests-affected.mjs', args('ats'), dir, env);
  assert.equal(dev.status, 1);
  assert.match(dev.stdout, /--pg-db "ats" geweigerd/);
  const vreemd = node('tests-affected.mjs', args('ats_test'), dir, env);
  assert.equal(vreemd.status, 1, vreemd.stdout);
  assert.match(vreemd.stdout, /ats_test_template bestaat al en is niet door poort gemaakt/);
  assert.doesNotMatch(vreemd.stdout, /RUN/);
});

test('tests-affected: een "(" in commentaar slokt de imports erna niet op', () => {
  const dir = pytestRepo();
  write(dir, 'tests/test_comment.py', '# zie (later\nfrom app.svc.reken import som\n\n\ndef test_x():\n    assert som(1, 2) == 3\n');
  const r = node('tests-affected.mjs', ['--src', 'app', '--tests', 'tests', '--python', './fakepy', 'app/svc/reken.py'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ARGS .*tests\/test_comment\.py/);
});

test('tests-affected: --requires die de enige test wegfiltert draait niet de hele suite', () => {
  const dir = pytestRepo();
  const r = node('tests-affected.mjs', ['--src', 'app', '--tests', 'tests', '--python', './fakepy', '--requires', 'poort-bestaat-niet-xyz=tests/test_ander.py', 'tests/test_ander.py'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /poort:warn tests\/test_ander\.py overgeslagen/);
  assert.match(r.stdout, /geen tests over na --requires/);
  assert.doesNotMatch(r.stdout, /ARGS/);
});

test('tests-affected: --cmd quote een testpad met een apostrof correct', () => {
  const dir = pytestRepo();
  write(dir, "tests/test_it's.py", 'from app.svc import reken\n');
  const r = node('tests-affected.mjs', ['--src', 'app', '--tests', 'tests', '--cmd', 'echo RUN', 'app/svc/reken.py'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RUN .*tests\/test_it's\.py/);
});

test('tests-affected: template-hash leest de migraties onder --root van schijf, ook ongetrackt', () => {
  const dir = tmp('poort-pgtpl-');
  write(dir, 'backend/app/svc/reken.py', 'def som(a, b):\n    return a + b\n');
  write(dir, 'backend/tests/test_reken.py', 'from app.svc import reken\n');
  write(dir, 'backend/db/migrations/001_init.sql', 'create table t (id int);\n');
  write(dir, 'fakepy', '#!/bin/sh\necho "ARGS $*"\n');
  // Nep-docker: onthoudt het template-commentaar, zodat de tweede run de hash vergelijkt.
  write(
    dir,
    'bin/docker',
    `#!/bin/sh\nd=$(dirname "$0")\ncase "$*" in\n  *"compose port"*) echo 127.0.0.1:5432 ;;\n  *"select shobj_description"*) cat "$d/comment" 2>/dev/null ;;\n  *"comment on database"*) echo "$*" | sed "s/.*'\\(poort:[0-9a-f]*\\)'.*/\\1/" > "$d/comment" ;;\nesac\nexit 0\n`,
  );
  fs.chmodSync(path.join(dir, 'fakepy'), 0o755);
  fs.chmodSync(path.join(dir, 'bin/docker'), 0o755);
  const log = path.join(dir, 'migrate.log');
  const run = () =>
    node(
      'tests-affected.mjs',
      ['--root', 'backend', '--src', 'app', '--tests', 'tests', '--python', path.join(dir, 'fakepy'), '--pg-service', 'db', '--pg-db', 'app_test', '--migrations', 'db/migrations', '--migrate', `echo x >> '${log}'`, 'backend/app/svc/reken.py'],
      dir,
      { PATH: `${path.join(dir, 'bin')}:${process.env.PATH}` },
    );
  const count = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length : 0);
  const first = run();
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.equal(count(), 1);
  assert.match(first.stdout, /verse database app_test_[0-9a-f]{8}/, 'eigen database per worktree');
  run();
  assert.equal(count(), 1, 'ongewijzigde migraties: template hergebruiken');
  write(dir, 'backend/db/migrations/001_init.sql', 'create table t (id int, naam text);\n');
  run();
  assert.equal(count(), 2, 'gewijzigde (ongetrackte) migratie: template opnieuw opbouwen');
});

// ---------- ci-job: een CI-job lokaal ----------

test('ci-job: draait de run-stappen van één job met github-context, env en if; rood bij een mislukte stap', () => {
  const dir = tmp('poort-cijob-');
  sh('git init -q -b main && git config user.email t@t.test && git config user.name t && git commit -q --allow-empty -m init', dir);
  sh('git update-ref refs/remotes/origin/acceptance HEAD', dir);
  write(
    dir,
    '.github/workflows/ci.yml',
    `name: CI
on: pull_request
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo ANDERE-JOB
  invariants:
    runs-on: ubuntu-latest
    env:
      JOB_VAR: van-de-job
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - name: Base en env
        env:
          STAP_VAR: \${{ github.base_ref }}
        run: |
          echo "BASE=\${{ github.base_ref }} EVENT=$GITHUB_EVENT_NAME JOB=$JOB_VAR STAP=$STAP_VAR"
      - name: Alleen op main
        if: github.base_ref == 'main'
        run: echo MAIN-STAP
      - name: Niet op promotie
        if: github.event_name == 'pull_request' && github.base_ref != 'main'
        run: echo WEL-GEDRAAID
      - name: Onbekend
        run: echo \${{ steps.x.outputs.y }}
      - name: Faalt
        run: exit 3
`,
  );
  const r = node('ci-job.mjs', ['--workflow', '.github/workflows/ci.yml', '--job', 'invariants', '--base-ref', 'origin/acceptance'], dir);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /BASE=acceptance EVENT=pull_request JOB=van-de-job STAP=acceptance/);
  assert.doesNotMatch(r.stdout, /ANDERE-JOB|MAIN-STAP/);
  assert.match(r.stdout, /^WEL-GEDRAAID$/m);
  assert.match(r.stdout, /poort:warn ci-job: "Onbekend" overgeslagen: .*steps\.x\.outputs\.y/);
  assert.match(r.stdout, /✗ Faalt \(exit 3\)/);
  assert.match(r.stdout, /ci-job invariants: 3 stap\(pen\) gedraaid, 1 rood/);
  assert.match(node('ci-job.mjs', ['--job', 'bestaat-niet'], dir).stdout, /job "bestaat-niet" niet gevonden/);
});

test('ci-job: git fetch --depth in een stap maakt een volledige clone niet shallow', () => {
  const remote = tmp('poort-cijob-remote-');
  sh('git init -q --bare -b main', remote);
  const dir = tmp('poort-cijob-clone-');
  sh(`git clone -q '${remote}' . && git config user.email t@t.test && git config user.name t && git commit -q --allow-empty -m a && git commit -q --allow-empty -m b && git push -q origin main`, dir);
  write(dir, '.github/workflows/ci.yml', 'jobs:\n  inv:\n    steps:\n      - name: Haal de base\n        run: git fetch origin main --depth=1\n');
  const r = node('ci-job.mjs', ['--job', 'inv'], dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(sh('git rev-parse --is-shallow-repository', dir).stdout.trim(), 'false', 'zonder shim zou dit true zijn');
});

// ---------- _lib: wat de wijziging toevoegt ----------

const LIB = pathToFileURL(path.join(CHECKS, '_lib.mjs')).href;
const lib = (dir, expr, env = {}) => {
  const code = `import * as L from ${JSON.stringify(LIB)};\nconsole.log(JSON.stringify(${expr}));`;
  const r = spawnSync('node', ['--input-type=module', '-e', code], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, POORT_STAGED: '', POORT_BASE: '', POORT_HEAD: '', ...env },
  });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('_lib: ongetrackt bestand en repo zonder commits tellen als nieuw; a[1].py werkt', () => {
  const dir = tmp('poort-lib-');
  sh(GIT_INIT, dir);
  write(dir, 'a[1].py', 'x = 1\ny = 2\n');
  assert.deepEqual(lib(dir, `[L.isNewFile('a[1].py'), [...L.addedLineNumbers('a[1].py')]]`), [true, [1, 2]]);
  sh('git add -A && git commit -qm base', dir);
  write(dir, 'a[1].py', 'x = 1\ny = 20\n');
  write(dir, 'nieuw.py', 'z = 3\n');
  assert.deepEqual(lib(dir, `[L.isNewFile('a[1].py'), [...L.addedLineNumbers('a[1].py')], L.isNewFile('nieuw.py'), L.addedLines('nieuw.py')]`), [false, [2], true, ['z = 3']]);
});

test('_lib: een hernoemd bestand is niet nieuw; alleen de gewijzigde regels tellen', () => {
  const dir = tmp('poort-rename-');
  sh(GIT_INIT, dir);
  const src = Array.from({ length: 12 }, (_, i) => `regel_${i} = ${i}\n`).join('');
  write(dir, 'oud.py', src);
  sh('git add -A && git commit -qm base && git mv oud.py nieuw.py', dir);
  write(dir, 'nieuw.py', src.replace('regel_5 = 5', 'regel_5 = 50'));
  assert.deepEqual(lib(dir, `[L.isNewFile('nieuw.py'), [...L.addedLineNumbers('nieuw.py')]]`), [false, [6]]);
  assert.deepEqual(lib(dir, `[L.isNewFile('nieuw.py'), [...L.addedLineNumbers('nieuw.py')]]`, { POORT_STAGED: '1' }), [false, []]);
});

// ---------- ruff-new: paden en nieuwe bestanden ----------

test('ruff-new: een nieuw, ongetrackt bestand blokkeert op elke overtreding', { skip: !hasRuff && 'ruff ontbreekt' }, () => {
  const dir = tmp('poort-ruffuntracked-');
  sh(GIT_INIT, dir);
  write(dir, 'a.py', 'x = 1\n');
  sh('git add -A && git commit -qm base', dir);
  write(dir, 'b.py', 'import os\n');
  const r = node('ruff-new.mjs', ['--ruff-args', '--isolated --select F', 'b.py'], dir, { POORT_BASE: 'HEAD', POORT_STAGED: '' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /b\.py:1:\d+: F401/);
});

test('ruff-new: a.py en pkg/a.py worden niet verward', { skip: !hasRuff && 'ruff ontbreekt' }, () => {
  const dir = tmp('poort-ruffsuffix-');
  sh(GIT_INIT, dir);
  write(dir, 'a.py', 'x = 1\n');
  write(dir, 'pkg/a.py', 'x = 1\n');
  sh('git add -A && git commit -qm base', dir);
  write(dir, 'a.py', 'x = 1\ny = 2\n');
  write(dir, 'pkg/a.py', 'import os\nx = 1\n');
  const r = node('ruff-new.mjs', ['--ruff-args', '--isolated --select F', 'a.py', 'pkg/a.py'], dir, { POORT_BASE: 'HEAD', POORT_STAGED: '' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^pkg\/a\.py:1:\d+: F401/m);
});

// ---------- migration-deps: aanroepen die niet als aanroep telden ----------

test('migration-deps: FROM app.fn(), EXECUTE FUNCTION en gequote namen tellen als aanroep', () => {
  const dir = tmp('poort-mig2-');
  write(dir, 'm/001_schema.sql', 'CREATE SCHEMA app;\nCREATE TABLE app.orders (id int);\n');
  write(
    dir,
    'm/002_uses.sql',
    'CREATE TRIGGER t AFTER INSERT ON app.orders FOR EACH ROW EXECUTE FUNCTION app.trg_fn();\nSELECT * FROM app.set_fn();\nSELECT "app"."quoted_fn"(1);\nINSERT INTO app.orders (id) VALUES (1);\n',
  );
  write(
    dir,
    'm/003_defs.sql',
    'CREATE OR REPLACE FUNCTION app.trg_fn() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql;\nCREATE FUNCTION app.set_fn() RETURNS SETOF int AS $$ SELECT 1 $$ LANGUAGE sql;\nCREATE FUNCTION "app"."quoted_fn"(i int) RETURNS int AS $$ SELECT i $$ LANGUAGE sql;\n',
  );
  const r = node('migration-deps.mjs', ['--dir', 'm', 'm/002_uses.sql'], dir);
  assert.equal(r.status, 1, r.stdout);
  for (const f of ['trg_fn', 'set_fn', 'quoted_fn']) assert.match(r.stdout, new RegExp(`app\\.${f}\\(\\) wordt pas in migratie 3 aangemaakt`));
  assert.doesNotMatch(r.stdout, /orders/);
  const defs = node('migration-deps.mjs', ['--dir', 'm', 'm/003_defs.sql'], dir);
  assert.equal(defs.status, 0, defs.stdout);
  assert.equal(defs.stdout.trim(), '');
});

// ---------- ripple: zonder --shared, root-bestanden, tsx en body-wijzigingen ----------

test('ripple: zonder --shared, in de root, in .tsx en bij een wijziging in de body', () => {
  const dir = tmp('poort-ripple2-');
  sh(GIT_INIT, dir);
  write(dir, 'src/lib/dates.ts', 'export function addWorkdays(d, n) {\n  return d\n}\n');
  write(dir, 'src/views/C.tsx', 'function addWorkdays(d, n) {\n  return d + n\n}\n');
  write(dir, 'util.ts', 'export function formatMoney(x) {\n  return x\n}\n');
  write(dir, 'other.ts', 'function formatMoney(x) {\n  return String(x)\n}\n');
  sh('git add -A && git commit -qm base', dir);
  write(dir, 'src/lib/dates.ts', 'export function addWorkdays(d, n) {\n  return d + 0\n}\n');
  write(dir, 'util.ts', 'export function formatMoney(x) {\n  return x + 0\n}\n');
  sh('git add -A', dir);
  const r = node('ripple.mjs', ['src/lib/dates.ts', 'util.ts'], dir, { POORT_STAGED: '1' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /poort:warn addWorkdays \(src\/lib\/dates\.ts\) is ook gedefinieerd in src\/views\/C\.tsx/);
  assert.match(r.stdout, /poort:warn formatMoney \(util\.ts\) is ook gedefinieerd in other\.ts/);
});

// ---------- stale-branch: zonder argument, en een SHA als argument ----------

test('stale-branch: zonder argument via POORT_BASE_REF; een SHA geeft een waarschuwing', () => {
  const dir = repoWithBase();
  sh('git checkout -q base && echo upstream > a.txt && git commit -qam up && git checkout -q main && echo mine > a.txt && git commit -qam mine', dir);
  const noArg = node('stale-branch.mjs', [], dir, { POORT_OFFLINE: '1', POORT_BASE_REF: 'base' });
  assert.equal(noArg.status, 1, noArg.stdout);
  assert.match(noArg.stdout, /Conflict met base/);
  const mb = sh('git merge-base HEAD base', dir).stdout.trim();
  const sha = node('stale-branch.mjs', [mb], dir, { POORT_OFFLINE: '1', POORT_BASE_REF: 'base' });
  assert.match(sha.stdout, /^poort:warn stale-branch verwacht een branchnaam/m);
  assert.equal(sha.status, 1, sha.stdout);
});

// ---------- pr-body CLI: base, niet-ASCII-paden en symlinks ----------

function prRepo() {
  const dir = tmp('poort-prcli-');
  sh(GIT_INIT, dir);
  write(dir, 'README.md', 'x\n');
  sh('git add -A && git commit -qm base', dir);
  write(dir, 'src/composables/ü.ts', 'export const x = 1\n');
  sh('git add -A && git commit -qm nieuw', dir);
  const cfg = path.join(tmp('poort-prcfg-'), 'poort.config.json');
  fs.writeFileSync(cfg, JSON.stringify({ pr: { sections: [{ when: '^src/composables/', heading: 'Behaviou?r delta' }] } }));
  const body = path.join(path.dirname(cfg), 'body.md');
  fs.writeFileSync(body, '## Summary\nfix\n');
  return { dir, env: { POORT_CONFIG: cfg, POORT_BASE_REF: '' }, body };
}

test('pr-body CLI: niet-ASCII-pad in de diff telt mee (geen gequote naam)', () => {
  const { dir, env, body } = prRepo();
  const r = node('pr-body.mjs', ['--body-file', body, '--base', 'HEAD~1'], dir, env);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /src\/composables\/ü\.ts/);
});

test('pr-body CLI: HEAD~1 als fallback, één commit = alles nieuw, geen commit = exit 2 met uitleg', () => {
  const { dir, env, body } = prRepo();
  const fallback = node('pr-body.mjs', ['--body-file', body], dir, env);
  assert.equal(fallback.status, 1, fallback.stdout + fallback.stderr);
  const solo = tmp('poort-prsolo-');
  sh(`${GIT_INIT} && echo x > a && git add -A && git commit -qm een`, solo);
  let r = node('pr-body.mjs', ['--body-file', body], solo, env);
  assert.notEqual(r.status, 2, 'één commit: vergelijkt met de lege tree\n' + r.stdout + r.stderr);
  const empty = tmp('poort-prleeg-');
  sh(GIT_INIT, empty);
  r = node('pr-body.mjs', ['--body-file', body], empty, env);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /geen base gevonden/);
});

test('pr-body CLI: draait ook via een symlink in een map met een spatie', () => {
  const { dir, env, body } = prRepo();
  const linkDir = path.join(tmp('poort-prlink-'), 'met spatie');
  fs.mkdirSync(linkDir);
  const link = path.join(linkDir, 'pr-body.mjs');
  fs.symlinkSync(path.join(CHECKS, 'pr-body.mjs'), link);
  const r = spawnSync('node', [link, '--body-file', body, '--base', 'HEAD~1'], { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } });
  assert.equal(r.status, 1, r.stdout + r.stderr);
});

// ---------- format-on-edit: een kapotte regel blokkeert nooit ----------

test('format-on-edit: regel zonder "run" wordt overgeslagen, exit 0, volgende regel draait', () => {
  const dir = tmp('poort-fmt-');
  sh(GIT_INIT, dir);
  write(dir, 'poort.config.json', JSON.stringify({ format: [{ when: '\\.py$' }, { when: '\\.py$', run: 'echo ok > formatted.txt' }] }));
  write(dir, 'a.py', 'x = 1\n');
  const r = spawnSync('node', [path.join(INTEGRATIONS, 'format-on-edit.mjs')], {
    cwd: dir,
    encoding: 'utf8',
    input: JSON.stringify({ file_path: path.join(dir, 'a.py') }),
    env: { ...process.env, POORT_CONFIG: '' },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(dir, 'formatted.txt')), r.stderr);
});
