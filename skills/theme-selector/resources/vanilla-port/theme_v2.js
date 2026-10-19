// theme_v2.js — TSS colourway theme-engine voor Odysseus (plain ES6, geen build-step).
// Pure logica (resolveColourwayId / platformVars / computeVars / loadV2-parsing) is DOM-vrij,
// zodat node ze kan importeren en testen zonder document of localStorage.

import {
  COLOURWAYS,
  STANDARD_LIGHT,
  STANDARD_DARK,
  PALETTE_CHANNELS,
  DEFAULT_COLOURWAY_ID,
  colourwayById,
  paletteVars,
  resolvePalette,
  paletteIsDark
} from './colourways.js';

/* ------------------------------------------------------------------ *
 * Storage keys — v2 is rollback-veilig: de oude key wordt NOOIT
 * overschreven, alleen gelezen tijdens de migratie.
 * ------------------------------------------------------------------ */

export const LS_KEY_V2 = 'odysseus-theme-v2';
export const LS_CACHE = 'odysseus-theme-v2-vars';

const LS_KEY_V1 = 'odysseus-theme';

/* ------------------------------------------------------------------ *
 * 1. Platform-aliassen: oude preset-namen -> TSS colourway-ids.
 *    Houdt `set_theme <naam>` van de AI-agent werkend.
 * ------------------------------------------------------------------ */

export const PLATFORM_ALIASES = {
  dark: 'midnight',
  light: 'polpohire',
  midnight: 'midnight',
  paper: 'paper',
  cyberpunk: 'indigo',
  retrowave: 'plum',
  forest: 'forest',
  ocean: 'ocean',
  ume: 'rose',
  copper: 'copper',
  terminal: 'graphite',
  organs: 'bordeaux',
  lavender: 'lilac',
  gpt: 'teal',
  claude: 'amber',
  cute: 'rose'
};

/* ------------------------------------------------------------------ *
 * 2. Naam -> geldig colourway-id.
 * ------------------------------------------------------------------ */

// Bestaat dit id echt als colourway?
function isColourwayId(id) {
  if (!id) return false;
  if (Array.isArray(COLOURWAYS)) {
    return COLOURWAYS.some(function (c) {
      return c && c.id === id;
    });
  }
  const p = colourwayById(id);
  return !!p && p.id === id;
}

export function resolveColourwayId(name) {
  if (typeof name !== 'string') return DEFAULT_COLOURWAY_ID;
  const key = name.trim().toLowerCase();
  if (!key) return DEFAULT_COLOURWAY_ID;
  if (isColourwayId(key)) return key;
  const alias = PLATFORM_ALIASES[key];
  if (alias && isColourwayId(alias)) return alias;
  if (alias) return alias; // alias bewust volgen, ook als de lijst nog niet mee is
  return DEFAULT_COLOURWAY_ID;
}

/* ------------------------------------------------------------------ *
 * 3. Platform-alias-vars bovenop de TSS-tokenmap.
 *    [platform-var, tss-token]
 * ------------------------------------------------------------------ */

const PLATFORM_VAR_MAP = [
  ['--bg', '--bg'],
  ['--fg', '--text'],
  ['--panel', '--surface'],
  ['--border', '--border'],
  ['--red', '--brand'],
  ['--brand-color', '--brand'],
  ['--sidebar-bg', '--shell-bg'],
  ['--hamburger-color', '--shell-text-strong'],
  ['--user-bubble-bg', '--brand-soft'],
  ['--ai-bubble-bg', '--surface-2'],
  ['--bubble-border', '--border'],
  ['--input-bg', '--surface-2'],
  ['--input-border', '--border-strong'],
  ['--send-btn-bg', '--brand'],
  ['--send-btn-hover', '--brand-strong'],
  ['--code-bg', '--container'],
  ['--code-fg', '--text'],
  ['--toggle-active', '--brand']
];

export function platformVars(pv) {
  const out = {};
  if (!pv || typeof pv !== 'object') return out;

  // TSS-tokens ongewijzigd doorgeven.
  for (const key in pv) {
    if (Object.prototype.hasOwnProperty.call(pv, key)) out[key] = pv[key];
  }

  // Aliassen erbij; ontbrekende bron-tokens overslaan (nooit undefined zetten).
  for (const pair of PLATFORM_VAR_MAP) {
    const value = pv[pair[1]];
    if (value == null || value === '') continue;
    out[pair[0]] = value;
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * 4. Kern: id + overrides + intensity -> vars.
 * ------------------------------------------------------------------ */

// Basispalet: preset, of standaard light/dark bij custom-zonder-preset.
function basePalette(id, mode) {
  const preset = id ? colourwayById(id) : null;
  if (preset) return preset;
  return mode === 'light' ? STANDARD_LIGHT : STANDARD_DARK;
}

export function computeVars(id, overrides, intensity, mode) {
  const base = basePalette(id, mode);
  const palette = resolvePalette(
    base,
    overrides || {},
    intensity == null ? 100 : intensity
  );
  return {
    vars: platformVars(paletteVars(palette)),
    light: !paletteIsDark(palette)
  };
}

/* ------------------------------------------------------------------ *
 * 5. Toepassen op :root — geen <style>-element (CSP/SW-veilig).
 * ------------------------------------------------------------------ */

export function applyVars(varsObj, light) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;

  let map = varsObj;
  let isLight = light;
  // Een compleet computeVars-resultaat {vars, light} mag ook.
  if (map && typeof map === 'object' && map.vars && typeof map.vars === 'object') {
    if (isLight == null) isLight = map.light;
    map = map.vars;
  }

  if (map && typeof map === 'object') {
    for (const key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      const value = map[key];
      if (value == null || value === '') continue;
      root.style.setProperty(key, String(value));
    }
  }

  if (typeof isLight === 'boolean') root.classList.toggle('light', isLight);
}

// Matglas / font / density — zelfde vorm als de no-flash cache.
export function applyShell(opts) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const root = document.documentElement;
  const o = opts || {};

  root.classList.toggle('frosted', !!o.frosted);

  if (o.frost == null || o.frost === '') {
    root.style.removeProperty('--frost-blur');
  } else {
    root.style.setProperty(
      '--frost-blur',
      typeof o.frost === 'number' ? o.frost + 'px' : String(o.frost)
    );
  }

  if (o.font) {
    root.setAttribute('data-font', String(o.font));
    root.style.setProperty('--font-family', String(o.font));
  } else {
    root.removeAttribute('data-font');
    root.style.removeProperty('--font-family');
  }

  if (o.density) root.setAttribute('data-density', String(o.density));
  else root.removeAttribute('data-density');
}

/* ------------------------------------------------------------------ *
 * 6. Volledige toepassing + cache. Geen server-call.
 * ------------------------------------------------------------------ */

export function applyColourway(id, opts) {
  const o = opts || {};
  const cid = resolveColourwayId(id);
  const computed = computeVars(cid, o.overrides, o.intensity, o.mode);

  const shell = {
    frosted: !!o.frosted,
    font: o.font == null ? null : o.font,
    density: o.density == null ? null : o.density,
    frost: o.frost == null ? null : o.frost
  };

  applyVars(computed.vars, computed.light);
  applyShell(shell);

  saveV2({
    id: cid,
    overrides: o.overrides || null,
    intensity: o.intensity == null ? 100 : o.intensity,
    mode: o.mode || (computed.light ? 'light' : 'dark'),
    frosted: shell.frosted,
    font: shell.font,
    density: shell.density,
    frost: shell.frost
  });
  writeCache(computed, shell);

  return computed;
}

/* ------------------------------------------------------------------ *
 * 7. Opslag.
 * ------------------------------------------------------------------ */

// localStorage kan ontbreken (node) of gooien (private mode / blocked).
function store() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    return localStorage;
  } catch (e) {
    return null;
  }
}

export function loadV2() {
  const ls = store();
  if (!ls) return null;
  try {
    const raw = ls.getItem(LS_KEY_V2);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (e) {
    return null; // corrupt -> alsof er niks staat
  }
}

export function saveV2(state) {
  const ls = store();
  if (!ls || !state || typeof state !== 'object') return false;
  try {
    ls.setItem(LS_KEY_V2, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export function writeCache(computed, extra) {
  const ls = store();
  if (!ls || !computed || typeof computed !== 'object') return false;
  const e = extra || {};
  const payload = {
    vars: computed.vars && typeof computed.vars === 'object' ? computed.vars : {},
    light: !!computed.light,
    density: e.density == null ? null : e.density,
    font: e.font == null ? null : e.font,
    frost: e.frost == null ? null : e.frost,
    frosted: !!e.frosted
  };
  try {
    ls.setItem(LS_CACHE, JSON.stringify(payload));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadCache() {
  const ls = store();
  if (!ls) return null;
  try {
    const raw = ls.getItem(LS_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * 8. Migratie v1 -> v2. Idempotent; oude key blijft staan.
 * ------------------------------------------------------------------ */

const V1_CHANNELS = ['bg', 'fg', 'panel', 'border', 'accent'];

// Sleutel-varianten die in v1-opslag voorkwamen, per kanaal.
const V1_CHANNEL_KEYS = {
  bg: ['bg', 'background', 'backgroundColor', '--bg'],
  fg: ['fg', 'text', 'foreground', 'textColor', '--fg', '--text'],
  panel: ['panel', 'surface', 'panelColor', '--panel', '--surface'],
  border: ['border', 'borderColor', '--border'],
  accent: ['accent', 'brand', 'red', 'accentColor', '--accent', '--brand', '--red']
};

// Alleen kanalen die de colourway-engine ook echt kent.
function channelSupported(ch) {
  if (Array.isArray(PALETTE_CHANNELS)) {
    if (!PALETTE_CHANNELS.length) return true;
    return PALETTE_CHANNELS.some(function (c) {
      if (typeof c === 'string') return c === ch;
      return !!c && (c.id === ch || c.key === ch || c.name === ch);
    });
  }
  if (PALETTE_CHANNELS && typeof PALETTE_CHANNELS === 'object') {
    return Object.prototype.hasOwnProperty.call(PALETTE_CHANNELS, ch);
  }
  return true;
}

// Herkenbare kleurwaarde? (hex, functioneel, var(), of named colour)
function isColourValue(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!s) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return true;
  if (/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i.test(s)) return true;
  if (/^var\(--[\w-]+/i.test(s)) return true;
  if (/^[a-z]{3,20}$/i.test(s)) return true;
  return false;
}

// Zoek de custom-kleurenbak in een v1-object.
function v1ColourBags(old) {
  const bags = [];
  if (!old || typeof old !== 'object') return bags;
  const names = ['advanced', 'custom', 'customColors', 'colors', 'colours', 'overrides', 'palette'];
  for (const n of names) {
    const bag = old[n];
    if (bag && typeof bag === 'object') bags.push(bag);
  }
  bags.push(old); // platte v1-objecten hielden de kleuren top-level
  return bags;
}

function v1Overrides(old) {
  const bags = v1ColourBags(old);
  if (!bags.length) return null;

  const out = {};
  let found = 0;
  for (const ch of V1_CHANNELS) {
    if (!channelSupported(ch)) continue;
    const keys = V1_CHANNEL_KEYS[ch];
    for (const bag of bags) {
      let hit = null;
      for (const k of keys) {
        if (isColourValue(bag[k])) {
          hit = bag[k].trim();
          break;
        }
      }
      if (hit) {
        out[ch] = hit;
        found++;
        break;
      }
    }
  }
  return found ? out : null;
}

export function migrateFromV1() {
  const ls = store();
  if (!ls) return null;

  let rawV1;
  try {
    if (ls.getItem(LS_KEY_V2)) return null; // al gemigreerd -> niks doen
    rawV1 = ls.getItem(LS_KEY_V1);
  } catch (e) {
    return null;
  }
  if (!rawV1) return null;

  // v1 was of een preset-naam als string, of een JSON-object.
  let old = rawV1;
  try {
    const parsed = JSON.parse(rawV1);
    if (parsed && (typeof parsed === 'object' || typeof parsed === 'string')) old = parsed;
  } catch (e) {
    /* platte string, laat staan */
  }

  const name =
    typeof old === 'string'
      ? old
      : (old && (old.name || old.theme || old.preset || old.id)) || '';

  const id = resolveColourwayId(name);
  const base = colourwayById(id);
  const overrides = typeof old === 'string' ? null : v1Overrides(old);
  const o = old && typeof old === 'object' ? old : {};

  const state = {
    id: id,
    overrides: overrides,
    intensity: typeof o.intensity === 'number' ? o.intensity : 100,
    mode: base && paletteIsDark(base) ? 'dark' : 'light',
    frosted: !!(o.frosted || o.frostedGlass || o.glass),
    font: typeof o.font === 'string' ? o.font : null,
    density: typeof o.density === 'string' ? o.density : null,
    frost: o.frost == null ? null : o.frost
  };

  if (!saveV2(state)) return null;
  return state; // oude key bewust laten staan voor rollback
}