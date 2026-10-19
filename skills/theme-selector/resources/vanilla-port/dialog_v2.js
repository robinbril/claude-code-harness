// dialog_v2.js - complete aansturing van de theme-dialoog (Odysseus)
// Een module voor grid, kleuren, weergave, materiaal, tabs en open/sluiten.

import {
  COLOURWAYS,
  deriveVars,
  colourwayById,
  resolvePalette,
  paletteIsDark,
  PALETTE_CHANNELS
} from './colourways.js';

import {
  applyColourway,
  resolveColourwayId,
  loadV2,
  saveV2,
  migrateFromV1
} from './theme_v2.js';

// ---------------------------------------------------------------------------
// Constanten
// ---------------------------------------------------------------------------

const TAB_IDS = ['theme-tab-browse', 'theme-tab-customize', 'theme-tab-display'];
const MATERIALS = ['flat', 'frosted', 'liquid'];
const FEATURED = ['polpohire', 'midnight', 'iris'];
const DEFAULT_ID = 'polpohire';
const SWATCH_KEYS = ['--bg', '--surface', '--brand', '--text'];

let currentTab = TAB_IDS[0];
let bound = false;

// ---------------------------------------------------------------------------
// Kleine helpers
// ---------------------------------------------------------------------------

// Alle document-toegang loopt hierlangs.
function hasDom() {
  return typeof document !== 'undefined' && !!document && !!document.documentElement;
}

function byId(id) {
  if (!hasDom()) return null;
  return document.getElementById(id);
}

function qsa(sel, root) {
  if (!hasDom()) return [];
  const scope = root || document;
  return Array.prototype.slice.call(scope.querySelectorAll(sel));
}

function clearNode(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

// Kanalen uit de engine, met vaste fallback.
function channels() {
  if (Array.isArray(PALETTE_CHANNELS) && PALETTE_CHANNELS.length) return PALETTE_CHANNELS;
  return ['bg', 'fg', 'panel', 'border', 'accent'];
}

// input[type=color] wil altijd #rrggbb.
function toHex(value) {
  if (typeof value !== 'string') return '#000000';
  const v = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toLowerCase();
  }
  const m = v.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) {
    const hex = (n) => {
      const c = Math.max(0, Math.min(255, parseInt(n, 10) || 0)).toString(16);
      return c.length === 1 ? '0' + c : c;
    };
    return ('#' + hex(m[1]) + hex(m[2]) + hex(m[3])).toLowerCase();
  }
  return '#000000';
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

function defaultState() {
  return {
    id: DEFAULT_ID,
    overrides: {},
    intensity: 100,
    mode: 'auto',
    frosted: false,
    font: '',
    density: '',
    frost: 60,
    material: 'flat'
  };
}

function normalise(raw) {
  const base = defaultState();
  const s = (raw && typeof raw === 'object') ? raw : {};
  const out = {
    id: typeof s.id === 'string' && s.id ? s.id : base.id,
    overrides: (s.overrides && typeof s.overrides === 'object') ? Object.assign({}, s.overrides) : {},
    intensity: Number.isFinite(Number(s.intensity)) ? Number(s.intensity) : base.intensity,
    mode: typeof s.mode === 'string' && s.mode ? s.mode : base.mode,
    frosted: !!s.frosted,
    font: typeof s.font === 'string' ? s.font : base.font,
    density: typeof s.density === 'string' ? s.density : base.density,
    frost: Number.isFinite(Number(s.frost)) ? Number(s.frost) : base.frost,
    material: MATERIALS.indexOf(s.material) >= 0 ? s.material : base.material
  };
  // Materiaal en frosted-vlag blijven consistent.
  if (out.material === 'flat') out.frosted = false;
  else out.frosted = true;
  return out;
}

function readState() {
  let raw = null;
  try {
    raw = typeof loadV2 === 'function' ? loadV2() : null;
  } catch (e) {
    raw = null;
  }
  return normalise(raw);
}

let state = normalise(null);

function persist() {
  try {
    if (typeof saveV2 === 'function') saveV2(state);
  } catch (e) {
    // stille opslagfout, UI blijft werken
  }
}

// Opties zoals applyColourway ze verwacht.
function themeOpts() {
  const o = {
    overrides: state.overrides || {},
    intensity: state.intensity,
    mode: state.mode,
    frosted: !!state.frosted,
    frost: state.frost
  };
  if (state.font) o.font = state.font;
  if (state.density) o.density = state.density;
  return o;
}

function apply() {
  try {
    applyColourway(safeId(state.id), themeOpts());
  } catch (e) {
    // engine-fout mag de dialoog niet blokkeren
  }
}

function safeId(id) {
  let wanted = id;
  try {
    if (typeof resolveColourwayId === 'function') wanted = resolveColourwayId(id) || id;
  } catch (e) {
    wanted = id;
  }
  try {
    if (colourwayById(wanted)) return wanted;
  } catch (e) {
    // val terug op default
  }
  return DEFAULT_ID;
}

// Palet van een colourway, met mode uit de state.
function paletteOf(cw) {
  if (!cw) return null;
  try {
    if (typeof resolvePalette === 'function') {
      return resolvePalette(cw, state.mode) || cw;
    }
  } catch (e) {
    // ruwe colourway is bruikbaar genoeg
  }
  return cw;
}

// ---------------------------------------------------------------------------
// Themas-tab
// ---------------------------------------------------------------------------

// Featured eerst, daarna de rest in engine-volgorde.
function orderedColourways() {
  const list = Array.isArray(COLOURWAYS) ? COLOURWAYS.slice() : [];
  const featured = [];
  const rest = [];
  list.forEach((cw) => {
    if (cw && FEATURED.indexOf(cw.id) >= 0) featured.push(cw);
    else if (cw) rest.push(cw);
  });
  featured.sort((a, b) => FEATURED.indexOf(a.id) - FEATURED.indexOf(b.id));
  return featured.concat(rest);
}

function buildCard(cw) {
  const pal = paletteOf(cw);
  let vars = {};
  try {
    vars = deriveVars(pal) || {};
  } catch (e) {
    vars = {};
  }

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'cw-card';
  card.setAttribute('data-cw', cw.id);
  card.setAttribute('aria-label', cw.name || cw.id);

  let dark = false;
  try {
    dark = !!paletteIsDark(pal);
  } catch (e) {
    dark = false;
  }
  card.classList.toggle('is-dark', dark);

  const swatches = document.createElement('div');
  swatches.className = 'cw-swatches';
  SWATCH_KEYS.forEach((key) => {
    const sw = document.createElement('span');
    sw.className = 'cw-sw';
    sw.style.setProperty('background-color', vars[key] || 'transparent');
    swatches.appendChild(sw);
  });

  const label = document.createElement('div');
  label.className = 'cw-label';

  const name = document.createElement('span');
  name.className = 'cw-name';
  name.textContent = cw.name || cw.id;

  const dot = document.createElement('span');
  dot.className = 'cw-dot';
  dot.style.setProperty('background-color', vars['--brand'] || cw.accent || 'currentColor');

  label.appendChild(name);
  label.appendChild(dot);

  card.appendChild(swatches);
  card.appendChild(label);
  return card;
}

function markActiveCard() {
  qsa('#themeGrid .cw-card').forEach((card) => {
    const on = card.getAttribute('data-cw') === state.id;
    card.classList.toggle('is-active', on);
    card.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function selectColourway(id) {
  const next = safeId(id);
  if (!next) return;
  state.id = next;
  apply();
  persist();
  markActiveCard();
  syncColorInputs();
}

export function renderThemeGrid() {
  const grid = byId('themeGrid');
  if (!grid) return;

  clearNode(grid);
  orderedColourways().forEach((cw) => {
    grid.appendChild(buildCard(cw));
  });
  markActiveCard();

  if (grid.getAttribute('data-bound') !== '1') {
    grid.setAttribute('data-bound', '1');
    grid.addEventListener('click', (ev) => {
      const card = ev.target && ev.target.closest ? ev.target.closest('.cw-card') : null;
      if (!card || !grid.contains(card)) return;
      selectColourway(card.getAttribute('data-cw'));
    });
  }
}

// ---------------------------------------------------------------------------
// Kleuren-tab
// ---------------------------------------------------------------------------

function channelValue(chan) {
  const ov = state.overrides || {};
  if (typeof ov[chan] === 'string' && ov[chan]) return toHex(ov[chan]);
  const cw = colourwayById(safeId(state.id));
  const pal = paletteOf(cw) || {};
  return toHex(pal[chan]);
}

function syncColorInputs() {
  qsa('input.cw-chan[data-chan]').forEach((inp) => {
    const chan = inp.getAttribute('data-chan');
    if (channels().indexOf(chan) < 0) return;
    inp.value = channelValue(chan);
  });
  const reset = hasDom() ? document.querySelector('.cw-reset') : null;
  if (reset) {
    const dirty = Object.keys(state.overrides || {}).length > 0;
    reset.disabled = !dirty;
  }
}

function onChannelInput(ev) {
  const inp = ev.currentTarget;
  const chan = inp && inp.getAttribute ? inp.getAttribute('data-chan') : null;
  if (!chan || channels().indexOf(chan) < 0) return;
  if (!state.overrides || typeof state.overrides !== 'object') state.overrides = {};
  state.overrides[chan] = toHex(inp.value);
  apply();
  persist();
  syncColorInputs();
}

function resetOverrides() {
  state.overrides = {};
  apply();
  persist();
  syncColorInputs();
}

export function initColorTab() {
  if (!hasDom()) return;

  qsa('input.cw-chan[data-chan]').forEach((inp) => {
    if (inp.getAttribute('data-bound') === '1') return;
    inp.setAttribute('data-bound', '1');
    inp.addEventListener('input', onChannelInput);
    inp.addEventListener('change', onChannelInput);
  });

  const reset = document.querySelector('.cw-reset');
  if (reset && reset.getAttribute('data-bound') !== '1') {
    reset.setAttribute('data-bound', '1');
    if (!reset.textContent || !reset.textContent.trim()) {
      reset.textContent = 'Kleuren herstellen';
    }
    reset.addEventListener('click', (ev) => {
      ev.preventDefault();
      resetOverrides();
    });
  }

  syncColorInputs();
}

// ---------------------------------------------------------------------------
// Weergave-tab
// ---------------------------------------------------------------------------

function syncDisplayControls() {
  const font = byId('theme-font-select');
  if (font && state.font) font.value = state.font;

  const density = byId('theme-density-select');
  if (density && state.density) density.value = state.density;

  const frosted = byId('theme-frosted-toggle');
  if (frosted) frosted.checked = state.material !== 'flat';

  const frost = byId('theme-frost-range');
  if (frost) frost.value = String(state.frost);

  const intensity = byId('theme-intensity-range');
  if (intensity) intensity.value = String(state.intensity);
}

function bindOnce(el, type, handler) {
  if (!el || el.getAttribute('data-bound') === '1') return;
  el.setAttribute('data-bound', '1');
  el.addEventListener(type, handler);
}

export function initDisplayTab() {
  if (!hasDom()) return;

  const font = byId('theme-font-select');
  bindOnce(font, 'change', (ev) => {
    state.font = ev.currentTarget.value || '';
    apply();
    persist();
  });
  if (font && !state.font) state.font = font.value || '';

  const density = byId('theme-density-select');
  bindOnce(density, 'change', (ev) => {
    state.density = ev.currentTarget.value || '';
    apply();
    persist();
  });
  if (density && !state.density) state.density = density.value || '';

  const frosted = byId('theme-frosted-toggle');
  bindOnce(frosted, 'change', (ev) => {
    const on = !!ev.currentTarget.checked;
    // Toggle uit betekent altijd plat, aan houdt liquid intact.
    if (on) setMaterial(state.material === 'liquid' ? 'liquid' : 'frosted');
    else setMaterial('flat');
  });

  const frost = byId('theme-frost-range');
  bindOnce(frost, 'input', (ev) => {
    state.frost = Number(ev.currentTarget.value) || 0;
    apply();
  });
  bindOnce2(frost, 'change', () => persist());

  const intensity = byId('theme-intensity-range');
  bindOnce(intensity, 'input', (ev) => {
    state.intensity = Number(ev.currentTarget.value) || 0;
    apply();
  });
  bindOnce2(intensity, 'change', () => persist());

  syncDisplayControls();
}

// Tweede binding op hetzelfde element, met eigen vlag.
function bindOnce2(el, type, handler) {
  if (!el || el.getAttribute('data-bound-2') === '1') return;
  el.setAttribute('data-bound-2', '1');
  el.addEventListener(type, handler);
}

// ---------------------------------------------------------------------------
// Materiaal-segment
// ---------------------------------------------------------------------------

function applyMaterial(material) {
  if (!hasDom()) return;
  const mat = MATERIALS.indexOf(material) >= 0 ? material : 'flat';
  const root = document.documentElement;
  const body = document.body;

  // Exclusief: liquid OF frosted OF niets.
  root.classList.toggle('liquid-glass', mat === 'liquid');
  root.classList.toggle('app-frosted', mat === 'frosted');
  if (body) body.classList.toggle('theme-frosted', mat === 'frosted');

  qsa('#theme-material-seg .material-opt').forEach((btn) => {
    const on = btn.getAttribute('data-material') === mat;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  const toggle = byId('theme-frosted-toggle');
  if (toggle) toggle.checked = mat !== 'flat';
}

function setMaterial(material) {
  const mat = MATERIALS.indexOf(material) >= 0 ? material : 'flat';
  state.material = mat;
  state.frosted = mat !== 'flat';
  applyMaterial(mat);
  apply();
  persist();
}

export function initMaterialSeg() {
  if (!hasDom()) return;
  const seg = byId('theme-material-seg');
  if (seg && seg.getAttribute('data-bound') !== '1') {
    seg.setAttribute('data-bound', '1');
    seg.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.material-opt') : null;
      if (!btn || !seg.contains(btn)) return;
      ev.preventDefault();
      setMaterial(btn.getAttribute('data-material'));
    });
  }
  applyMaterial(state.material);
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export function moveTabIndicator() {
  if (!hasDom()) return;
  const nav = byId('theme-tabs');
  if (!nav) return;
  const indicator = nav.querySelector('.theme-tab-indicator');
  if (!indicator) return;

  const active = nav.querySelector('.theme-tab.is-active') || nav.querySelector('.theme-tab');
  if (!active) return;

  const width = active.offsetWidth;
  if (!width) return; // nog niet gelayout, later opnieuw
  indicator.style.setProperty('left', active.offsetLeft + 'px');
  indicator.style.setProperty('width', width + 'px');
  indicator.style.setProperty('opacity', '1');
}

// Twee passes: direct en na de eerstvolgende frame.
function scheduleIndicator() {
  moveTabIndicator();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => moveTabIndicator());
  }
}

export function showThemeTab(tabId) {
  if (!hasDom()) return;
  const target = TAB_IDS.indexOf(tabId) >= 0 ? tabId : TAB_IDS[0];

  TAB_IDS.forEach((id) => {
    const panel = byId(id);
    if (!panel) return;
    const on = id === target;
    panel.classList.toggle('is-active', on);
    panel.classList.toggle('is-hidden', !on);
    if (on) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  });

  qsa('#theme-tabs .theme-tab').forEach((btn) => {
    const on = btn.getAttribute('data-tab') === target;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
    btn.setAttribute('tabindex', on ? '0' : '-1');
  });

  currentTab = target;
  scheduleIndicator();
}

// Pijltjes links en rechts binnen de tab-capsule.
function onTabKeydown(ev) {
  if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
  const index = TAB_IDS.indexOf(currentTab);
  if (index < 0) return;
  const step = ev.key === 'ArrowRight' ? 1 : -1;
  const next = TAB_IDS[(index + step + TAB_IDS.length) % TAB_IDS.length];
  ev.preventDefault();
  showThemeTab(next);
  const btn = hasDom() ? document.querySelector('#theme-tabs .theme-tab.is-active') : null;
  if (btn && btn.focus) btn.focus();
}

// ---------------------------------------------------------------------------
// Openen en sluiten
// ---------------------------------------------------------------------------

export function openThemeDialog(tabId) {
  if (!hasDom()) return;
  const modal = byId('theme-modal');
  if (!modal) return;

  modal.removeAttribute('hidden');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  if (document.body) document.body.classList.add('modal-open');

  showThemeTab(tabId || currentTab);
  syncColorInputs();
  syncDisplayControls();
  markActiveCard();
  scheduleIndicator();

  const close = modal.querySelector('.theme-close');
  if (close && close.focus) close.focus();
}

export function closeThemeDialog() {
  if (!hasDom()) return;
  const modal = byId('theme-modal');
  if (!modal) return;

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('hidden', '');
  if (document.body) document.body.classList.remove('modal-open');
}

function isOpen() {
  const modal = byId('theme-modal');
  return !!modal && modal.classList.contains('is-open');
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initThemeDialog() {
  if (!hasDom()) return;

  state = readState();

  const nav = byId('theme-tabs');
  if (nav && nav.getAttribute('data-bound') !== '1') {
    nav.setAttribute('data-bound', '1');
    nav.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.theme-tab') : null;
      if (!btn || !nav.contains(btn)) return;
      ev.preventDefault();
      showThemeTab(btn.getAttribute('data-tab'));
    });
    nav.addEventListener('keydown', onTabKeydown);
  }

  const modal = byId('theme-modal');
  if (modal && modal.getAttribute('data-bound') !== '1') {
    modal.setAttribute('data-bound', '1');
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) closeThemeDialog();
    });
    const close = modal.querySelector('.theme-close');
    if (close) {
      close.addEventListener('click', (ev) => {
        ev.preventDefault();
        closeThemeDialog();
      });
    }
  }

  if (!bound) {
    bound = true;
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && isOpen()) closeThemeDialog();
    });
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', moveTabIndicator);
    }
  }

  renderThemeGrid();
  initColorTab();
  initDisplayTab();
  initMaterialSeg();

  showThemeTab(TAB_IDS[0]);
}

export function bootTheme() {
  try {
    if (typeof migrateFromV1 === 'function') migrateFromV1();
  } catch (e) {
    // migratie mag nooit de boot blokkeren
  }

  state = readState();
  state.id = safeId(state.id);

  applyMaterial(state.material);
  apply();
  persist();
}