// A sweep every three hours: launchd on macOS, a crontab line to paste elsewhere.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run } from './run.mjs';

export const LABEL = 'dev.worktree-care.sweep';
// "Operation now in progress" and "already in progress".
const STOPPING = [36, 37];
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The sweep is in nobody's way: lowest CPU and disk priority.
export function plist(care, state, env = process.env) {
  const where = (env.PATH || '').split(':').filter((d) => path.isAbsolute(d) && ['docker', 'git', 'lsof', 'ps'].some((p) => fs.existsSync(path.join(d, p))));
  const vars = Object.entries(env).filter(([k]) => /^(CLAUDE_CONFIG_DIR|WORKTREE_CARE_(CONFIG|STATE)|XDG_(CONFIG|STATE)_HOME|DOCKER_(HOST|CONTEXT))$/.test(k));
  const all = [['PATH', [...new Set([path.dirname(process.execPath), ...where, '/usr/sbin', '/usr/bin', '/bin'])].join(':')], ...vars];
  const str = (s) => `<string>${xml(s)}</string>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key>${str(LABEL)}
  <key>ProgramArguments</key><array>${[process.execPath, care, 'sweep', '--apply'].map(str).join('')}</array>
  <key>EnvironmentVariables</key><dict>${all.map(([k, v]) => `<key>${k}</key>${str(v)}`).join('')}</dict>
  <key>StartInterval</key><integer>10800</integer>
  <key>ProcessType</key>${str('Background')}
  <key>LowPriorityIO</key><true/>
  <key>Nice</key><integer>15</integer>
  <key>StandardOutPath</key>${str(path.join(state, 'launchd.log'))}
  <key>StandardErrorPath</key>${str(path.join(state, 'launchd.log'))}
</dict></plist>
`;
}

// No task by that name, or no session of this user for a task to run in.
const GONE = /could not find (service|domain)|domain does not support/i;
const STOP_MAX = 25000;
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Only launchd itself says whether the task is off. One that runs gets time to stop.
function bootout(target, wait = STOP_MAX) {
  const r = run('launchctl', ['bootout', target], { timeout: wait });
  const until = Date.now() + (r.code === 0 || STOPPING.includes(r.code) ? wait : 0);
  let now;
  do {
    now = run('launchctl', ['print', target], { timeout: 5000 });
    if (now.code !== 0 && GONE.test(now.err + now.out)) return;
    if (now.code !== 0) break;
    pause(250);
  } while (Date.now() < until);
  const said = r.missing ? 'launchctl ontbreekt' : r.timedOut ? 'launchctl gaf geen antwoord' : r.err.trim() || `exit ${r.code}`;
  if (now.code === 0) throw new Error(`de vaste taak staat nog aan, launchctl bootout: ${said}`);
  throw new Error(`niet te bepalen of de vaste taak nog aan staat, launchctl bootout: ${said}; launchctl print: ${now.timedOut ? 'geen antwoord' : now.err.trim() || `exit ${now.code}`}`);
}

export function schedule(care, state, remove, out, { platform = process.platform, wait = STOP_MAX } = {}) {
  if (platform !== 'darwin') return out(`Zet dit in je crontab (crontab -e):\n17 */3 * * * nice -n 15 "${process.execPath}" "${care}" sweep --apply`);
  const file = path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
  const domain = `gui/${process.getuid()}`;
  bootout(`${domain}/${LABEL}`, wait);
  if (remove) {
    fs.rmSync(file, { force: true });
    return out('vaste taak weg');
  }
  fs.mkdirSync(state, { recursive: true });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, plist(care, state));
  const r = run('launchctl', ['bootstrap', domain, file]);
  if (r.code !== 0) throw new Error(`launchctl: ${r.err.trim()}`);
  return out(`elke drie uur een opruiming: ${file}`);
}
