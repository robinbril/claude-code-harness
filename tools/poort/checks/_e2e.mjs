// Moet e2e nu draaien, en mag hij blokkeren? Hangt af van hoeveel UI de PR raakt en
// van hoe druk de machine is. decideE2E is puur; readMachine meet.
import { spawnSync } from 'node:child_process';
import os from 'node:os';

// Elke drempel is te zetten met POORT_E2E_<NAAM>, bijvoorbeeld POORT_E2E_LARGE_UI_LINES.
// Precies op de drempel telt mee. Vrij geheugen telt andersom: pas eronder.
export const E2E_LIMITS = {
  largeUiLines: 200, // zoveel gewijzigde UI-regels is een grote wijziging
  largeUiFiles: 8, // of zoveel UI-bestanden
  largeSharedLines: 50, // of zoveel regels op een gedeeld oppervlak
  busyLoad: 0.8, // load per core: druk
  fullLoad: 1.6, // load per core: vol (18 cores: load 29)
  busyFree: 0.25, // vrij geheugen, deel van het totaal: druk
  fullFree: 0.1, // vol
  maxRuns: 1, // zoveel e2e-runs bezig: vol
};

export function e2eLimits(env = process.env) {
  const value = (key) => {
    const raw = env[`POORT_E2E_${key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`];
    const n = Number(raw);
    return raw?.trim() && Number.isFinite(n) && n >= 0 ? n : E2E_LIMITS[key];
  };
  return Object.fromEntries(Object.keys(E2E_LIMITS).map((k) => [k, value(k)]));
}

// ---------- soort bestand ----------

const DOCS = /\.(mdx?|txt|rst|adoc)$|^docs?\//i;
const BACKEND = /^((apps|packages|services)\/)?(backend|server|api|db|migrations|scripts)\//i;
const UNIT = /\.(test|spec)\.[cm]?[jt]sx?$|\.d\.[cm]?ts$|(^|\/)__tests__\//;
// Altijd scherm, waar het ook staat; teksten in locales zijn wat een opname op het scherm zoekt.
const SCREEN = /\.(vue|svelte|astro|[jt]sx|css|s[ac]ss|less|html|svg)$|(^|\/)(locales?|i18n)\/.*\.(json|ya?ml)$/i;
const SCRIPT = /\.[cm]?[jt]s$/i;
const SHARED_DIR = /(^|\/)(components\/(ui|base|common|shared|layouts?|primitives)|design-system|layouts?|shared|common|stores?|router|composables|hooks|theme|tokens|styles)\//;
const SHARED_FILE = /(^|\/)(App\.(vue|svelte|[jt]sx)|(main|router|e2e\.config|tailwind\.config)\.[cm]?[jt]sx?|index\.html|(global|tokens|theme)[^/]*\.(css|s[ac]ss|less))$/;

// shared: de regexen van de repo zelf voor gedeelde oppervlakken (pr.sections).
export function fileKind(file, shared = []) {
  if (DOCS.test(file)) return 'docs';
  if (UNIT.test(file) || !(SCREEN.test(file) || (SCRIPT.test(file) && !BACKEND.test(file)))) return 'other';
  return [SHARED_DIR, SHARED_FILE, ...shared].some((re) => re.test(file)) ? 'shared' : 'ui';
}

// ---------- beslissing ----------

const sumLines = (files) => files.reduce((n, f) => n + f.lines, 0);

function complexity(files, limits, shared) {
  const kinds = files.map((f) => ({ ...f, kind: fileKind(f.path, shared) }));
  const ui = kinds.filter((f) => f.kind === 'ui' || f.kind === 'shared');
  if (!ui.length) return { size: 'none', text: kinds.length && kinds.every((f) => f.kind === 'docs') ? 'alleen docs' : 'geen UI geraakt' };
  const common = ui.filter((f) => f.kind === 'shared');
  const large = sumLines(ui) >= limits.largeUiLines || ui.length >= limits.largeUiFiles || (common.length > 0 && sumLines(common) >= limits.largeSharedLines);
  const counts = `${ui.length} UI-bestand${ui.length === 1 ? '' : 'en'}, ${sumLines(ui)} regels${common.length ? `, ${common.length} gedeeld` : ''}`;
  return { size: large ? 'large' : 'small', text: `${large ? 'grote' : 'kleine'} UI-wijziging (${counts})` };
}

// Afgerond naar beneden, anders staat er 25% bij een meting onder de drempel van 25%.
const pct = (n) => `${Math.floor(n * 100)}%`;

// Een meting die ontbreekt (null), telt niet mee.
function pressure({ load = null, free = null, runs = null }, limits) {
  const loadText = load !== null && `load ${load.toFixed(2)} per core`;
  const freeText = free !== null && `${pct(free)} geheugen vrij`;
  const full = [
    runs !== null && runs >= limits.maxRuns && `${runs} e2e-run${runs === 1 ? '' : 's'} bezig`,
    load !== null && load >= limits.fullLoad && loadText,
    free !== null && free < limits.fullFree && freeText,
  ].filter(Boolean);
  if (full.length) return { level: 'full', text: `machine vol (${full.join(', ')})` };
  const busy = [load !== null && load >= limits.busyLoad && loadText, free !== null && free < limits.busyFree && freeText].filter(Boolean);
  return busy.length ? { level: 'busy', text: `machine druk (${busy.join(', ')})` } : { level: 'calm', text: 'machine rustig' };
}

const MODES = {
  none: { calm: 'skip', busy: 'skip', full: 'skip' },
  small: { calm: 'advisory', busy: 'skip', full: 'skip' },
  large: { calm: 'run', busy: 'advisory', full: 'skip' },
};

// files: [{ path, lines }] die de check raken. machine: { load (per core), free (0..1), runs }.
// run = draait en blokkeert; advisory = draait, rood blokkeert niet; skip = draait niet.
export function decideE2E({ files, machine = {}, limits = E2E_LIMITS, shared = [] }) {
  const pr = complexity(files, limits, shared);
  const mac = pressure(machine, limits);
  const mode = MODES[pr.size][mac.level];
  return { mode, reason: pr.size === 'none' ? pr.text : `${pr.text}, ${mac.text}` };
}

export const e2eText = ({ mode, reason }) => `e2e ${mode} · ${reason}`;

// ---------- meten ----------

const cpuCount = () => os.availableParallelism?.() ?? os.cpus().length;

// os.freemem telt op macOS alleen ongebruikte pagina's; dat is daar bijna altijd 1%.
function freeMemory() {
  if (process.platform !== 'darwin') return os.freemem() / os.totalmem();
  const r = spawnSync('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_level'], { encoding: 'utf8', timeout: 5000 });
  return r.status === 0 && /^\d+\s*$/.test(r.stdout) ? Number(r.stdout) / 100 : null;
}

// Het node-proces van de runner, niet de shell, npx of de e2e-MCP eromheen.
const E2E_PROC = /^\S*\bnode(\.exe)?\s(.*\s)?\S*\/(\.bin\/e2e|e2e\/dist\/cli\/bin\.js)\s+run(\s|$)/;
export const countE2ERuns = (ps) => ps.split('\n').filter((l) => E2E_PROC.test(l.trim())).length;

function e2eRuns() {
  if (process.platform === 'win32') return null;
  const r = spawnSync('ps', ['-axo', 'command='], { encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? countE2ERuns(r.stdout) : null;
}

// Windows heeft geen load en geen ps: daar telt alleen het geheugen. POORT_LOAD,
// POORT_FREE_MEM en POORT_E2E_RUNS vervangen de meting.
export function readMachine(env = process.env) {
  const given = (name, read) => (env[name]?.trim() ? Number(env[name]) : read());
  return {
    load: process.platform === 'win32' && !env.POORT_LOAD ? null : given('POORT_LOAD', () => os.loadavg()[0]) / cpuCount(),
    free: given('POORT_FREE_MEM', freeMemory),
    runs: given('POORT_E2E_RUNS', e2eRuns),
  };
}
