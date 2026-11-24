// Paths this machine starts programs from without one running right now: MCP servers, hooks,
// scheduled jobs. A worktree named there is in use.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run } from './run.mjs';

const read = (f) => {
  try {
    return fs.readFileSync(f, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return null;
    throw e;
  }
};

// The values themselves: in JSON text a quote after a path carries a backslash.
const strings = (o) => (typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : []);

// The list of projects in ~/.claude.json names every folder Claude ever saw: only what starts counts.
function claudeStarts(text) {
  const c = JSON.parse(text);
  return strings([c.mcpServers, Object.values(c.projects ?? {}).map((p) => p?.mcpServers), c.hooks, c.statusLine]).join('\n');
}

export function pins(extra = []) {
  const home = os.homedir();
  const claude = process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude');
  const found = [];
  const full = (text) => text.replace(/\$\{?HOME\}?(?=[/"'\s]|$)|(^|[\s"'=:<>,;])~(?=\/)/gm, (m, before = '') => `${before}${home}`);
  const add = (file, text) => text && found.push({ file, text: full(text) });
  for (const f of [path.join(home, '.claude.json'), path.join(claude, 'settings.json')]) {
    const text = read(f);
    if (text) add(f, claudeStarts(text));
  }
  const agents = path.join(home, 'Library', 'LaunchAgents');
  const plists = fs.existsSync(agents) ? fs.readdirSync(agents).filter((n) => n.endsWith('.plist')).map((n) => path.join(agents, n)) : [];
  const whole = [path.join(home, '.codex', 'config.toml'), path.join(home, '.cursor', 'mcp.json'), path.join(home, 'Library/Application Support/Claude/claude_desktop_config.json'), ...plists, ...extra];
  for (const f of whole) add(f, read(f));
  const cron = run('crontab', ['-l'], { timeout: 10000 });
  if (cron.code === 0) add('crontab', cron.out);
  return found;
}
