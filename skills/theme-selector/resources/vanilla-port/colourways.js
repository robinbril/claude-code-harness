// De PolpoHire theme-engine, framework-loos geport naar TSS.
//
// Bron van waarheid: frontend-v4/src/composables/useTheme.ts (Vue). De
// kleurwiskunde (mix, luminantie, contrast, ensureContrast, desaturate) en de
// afleidingsregels (deriveVars, shellVars) zijn 1-op-1 overgenomen; alleen de
// Vue-refs en de DOM-schrijfacties zijn eruit gehaald. Een preset levert vijf
// kleuren (bg/fg/panel/border/accent); de volledige TSS-tokenset wordt hier
// afgeleid met harde contrast-floors, zodat elk palet leesbaar blijft.
//
// De tokennamen zijn die van app/globals.css (:root en .dark), inclusief de
// TSS-specifieke tokens die PolpoHire niet kent: --container, --on-brand en
// --ring-shadow (PolpoHire noemt die laatste --ring).

/** De kanalen van een custom-kleur override, in de volgorde van het Kleuren-tab. */
export const PALETTE_CHANNELS = ["bg", "fg", "panel", "border", "accent"];

export const DEFAULT_COLOURWAY_ID = "standaard";

/** De drie presets die bovenaan als "Aanbevolen" staan. */
export const FEATURED_COLOURWAY_IDS = ["polpohire", "midnight", "iris"];

// De 18 presets, letterlijk uit de bron-engine.
export const COLOURWAYS = [
  { id: "polpohire", name: "Polpohire", bg: "#f4f4fb", fg: "#1b1830", panel: "#ffffff", border: "#e7e7f1", accent: "#5b50e6" },
  { id: "midnight", name: "Midnight", bg: "#101017", fg: "#f6f6fb", panel: "#181820", border: "#2d2d3a", accent: "#6e8bff" },
  { id: "iris", name: "Iris", bg: "#f6f4fb", fg: "#241f35", panel: "#ffffff", border: "#e2dcee", accent: "#6d46d9" },
  { id: "indigo", name: "Indigo", bg: "#1a1726", fg: "#ece9f4", panel: "#221f30", border: "#383350", accent: "#9b87f5" },
  { id: "rose", name: "Rosé", bg: "#fbf2f7", fg: "#382433", panel: "#fffafd", border: "#f1dbe7", accent: "#d6457f" },
  { id: "lilac", name: "Lilac", bg: "#f4eff9", fg: "#322b46", panel: "#fbf8ff", border: "#e2d9ee", accent: "#8b5cc4" },
  { id: "plum", name: "Plum", bg: "#1b1320", fg: "#ece2f2", panel: "#251a2e", border: "#3b2d49", accent: "#b06fd6" },
  { id: "ocean", name: "Ocean", bg: "#0c1a26", fg: "#d8eaf5", panel: "#122433", border: "#1f3a4d", accent: "#3fa6d6" },
  { id: "sky", name: "Sky", bg: "#f1f6fc", fg: "#1f2c3a", panel: "#ffffff", border: "#d9e6f3", accent: "#2f7fd6" },
  { id: "slate", name: "Slate", bg: "#0f1622", fg: "#e6ecf4", panel: "#18202e", border: "#2e3a4d", accent: "#5b9bd6" },
  { id: "teal", name: "Teal", bg: "#f0f7f6", fg: "#1e312e", panel: "#fbffff", border: "#d4e6e2", accent: "#199e8e" },
  { id: "forest", name: "Forest", bg: "#131c17", fg: "#e0eae0", panel: "#1b261f", border: "#2f4035", accent: "#5aa873" },
  { id: "amber", name: "Amber", bg: "#fdf6ec", fg: "#34291b", panel: "#fffdf8", border: "#efe0cb", accent: "#df8324" },
  { id: "copper", name: "Copper", bg: "#191411", fg: "#ece1d5", panel: "#231b15", border: "#3b2e23", accent: "#c67c45" },
  { id: "bordeaux", name: "Bordeaux", bg: "#1b1117", fg: "#f0e0e5", panel: "#261820", border: "#3e2832", accent: "#d35d72" },
  { id: "paper", name: "Paper", bg: "#faf8f4", fg: "#2e2a26", panel: "#ffffff", border: "#e6ded2", accent: "#a05a2c" },
  { id: "sand", name: "Sand", bg: "#f4efe7", fg: "#3a352d", panel: "#fcf9f4", border: "#e0d7c8", accent: "#8a7350" },
  { id: "graphite", name: "Graphite", bg: "#1a1a1c", fg: "#ececec", panel: "#232326", border: "#3a3a3e", accent: "#9aa0a6" },
];

// Het TSS-basispalet ("standaard"), letterlijk de waarden uit globals.css. Nodig
// zodra iemand custom kleuren zet zonder een preset te kiezen: de overrides
// moeten dan ergens bovenop liggen.
export const STANDARD_LIGHT = { bg: "#ffffff", fg: "#09090b", panel: "#fbfbfc", border: "#e4e4e7", accent: "#4800dd" };
export const STANDARD_DARK = { bg: "#09090b", fg: "#fafafa", panel: "#17171a", border: "#27272a", accent: "#8e6bff" };

export function colourwayById(id) {
  return COLOURWAYS.find((c) => c.id === id) || null;
}

// ---- Kleurwiskunde (1-op-1 uit de bron-engine) ----

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((v) => {
        const x = Math.max(0, Math.min(255, Math.round(v))).toString(16);
        return x.length === 1 ? "0" + x : x;
      })
      .join("")
  );
}

function mix(a, b, t) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => ra[i] + (rb[i] - ra[i]) * t));
}

function lum(hex) {
  const rgb = hexToRgb(hex);
  const f = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

function contrast(a, b) {
  const la = lum(a);
  const lb = lum(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function sat(hex) {
  const r = hexToRgb(hex);
  const mx = Math.max(...r);
  const mn = Math.min(...r);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

/** Duwt een kleur richting `towards` tot de contrastratio met `bg` gehaald is;
    lukt dat niet, dan alsnog richting puur zwart of wit. */
export function ensureContrast(hex, bg, towards, ratio) {
  let out = hex;
  for (let i = 0; i < 14 && contrast(out, bg) < ratio; i++) out = mix(out, towards, 0.12);
  if (contrast(out, bg) < ratio) {
    const anchor = lum(bg) > 0.45 ? "#000000" : "#ffffff";
    for (let i = 0; i < 16 && contrast(out, bg) < ratio; i++) out = mix(out, anchor, 0.14);
  }
  return out;
}

/** Trekt een kleur richting zijn luminantie-grijs. 0 = ongewijzigd, 1 = grijs. */
export function desaturate(hex, amount) {
  if (amount <= 0) return hex;
  const [r, g, b] = hexToRgb(hex);
  const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return mix(hex, rgbToHex([y, y, y]), Math.min(1, amount));
}

/** Een palet ÍS licht of donker: dezelfde luminantietest als de bron-engine. */
export function paletteIsDark(p) {
  return lum(p.bg) <= 0.4;
}

// Statuskleuren blijven hue-stabiel; alleen ink/soft/line worden per thema
// opnieuw gemengd. TSS kent geen caution/contract, dus die vallen weg.
const STATUS = { danger: "#e0454a", warn: "#d97a06", ok: "#15a05c", info: "#2f6feb" };

/** De volledige TSS-tokenset afgeleid uit een vijfkleurenpalet. */
export function deriveVars(p) {
  const light = lum(p.bg) > 0.4;
  const neutralBase = light ? "#232029" : "#f4f4f6";
  const tintSource = sat(p.fg) > 0.2 ? p.fg : p.accent;
  const towards = mix(neutralBase, tintSource, 0.18);

  let fg = p.fg;
  if (sat(fg) > 0.38) fg = mix(fg, towards, 0.6);
  const text = ensureContrast(fg, p.bg, towards, 7);
  const text2 = ensureContrast(mix(text, p.bg, 0.3), p.bg, towards, 4.6);
  const text3 = ensureContrast(mix(text, p.bg, 0.44), p.bg, towards, 3.4);
  const textFaint = ensureContrast(mix(text, p.bg, 0.56), p.bg, towards, 2.6);

  const surface2 = light ? mix(p.panel, p.bg, 0.5) : mix(p.panel, "#ffffff", 0.03);
  // TSS-eigen laag tussen pagina-achtergrond en paneel (globals.css --container).
  const container = mix(p.bg, p.panel, 0.45);
  const border = mix(p.border, p.accent, 0.08);
  const borderStrong = mix(border, text, 0.22);

  const brandAnchor = light ? "#000000" : "#ffffff";
  let brandStrong = light ? mix(p.accent, "#000000", 0.16) : mix(p.accent, "#ffffff", 0.12);
  brandStrong = ensureContrast(brandStrong, p.panel, brandAnchor, 4.5);
  brandStrong = ensureContrast(brandStrong, p.bg, brandAnchor, 4.5);
  const brandText = ensureContrast(p.accent, p.panel, brandAnchor, 4.5);
  const brandSoft = `color-mix(in srgb, ${p.accent} ${light ? 12 : 20}%, ${p.panel})`;
  // Tekst op een gevulde accentknop: kies de kant met het meeste contrast.
  const onBrand = contrast("#ffffff", p.accent) >= contrast("#111111", p.accent) ? "#ffffff" : "#111111";

  const [ir, ig, ib] = hexToRgb(mix("#1a1830", p.accent, 0.22));
  const ink = `${ir},${ig},${ib}`;
  const e = light
    ? {
        e1: `0 0.5px 1px rgba(${ink},.05), 0 4px 10px -3px rgba(${ink},.06)`,
        e2: `0 1px 2px rgba(${ink},.05), 0 10px 22px -6px rgba(${ink},.08)`,
        e3: `0 2px 6px rgba(${ink},.06), 0 26px 52px -14px rgba(${ink},.14)`,
      }
    : { e1: "0 1px 2px rgba(0,0,0,.4)", e2: "0 4px 12px rgba(0,0,0,.45)", e3: "0 16px 40px rgba(0,0,0,.55)" };

  const out = {
    "--bg": p.bg,
    "--surface": p.panel,
    "--surface-2": surface2,
    "--container": container,
    "--border": border,
    "--border-strong": borderStrong,
    "--text": text,
    "--text-2": text2,
    "--text-3": text3,
    "--text-faint": textFaint,
    "--brand": p.accent,
    "--brand-strong": brandStrong,
    "--brand-text": brandText,
    "--brand-soft": brandSoft,
    "--on-brand": onBrand,
    "--ring-shadow": `0 0 0 3px color-mix(in srgb, ${p.accent} 40%, transparent)`,
    "--e1": e.e1,
    "--e2": e.e2,
    "--e3": e.e3,
  };

  for (const [k, c] of Object.entries(STATUS)) {
    out[`--${k}`] = c;
    out[`--${k}-ink`] = light ? mix(c, "#000000", 0.32) : mix(c, "#ffffff", 0.35);
    out[`--${k}-soft`] = `color-mix(in srgb, ${c} ${light ? 10 : 16}%, ${p.panel})`;
    out[`--${k}-line`] = `color-mix(in srgb, ${c} ${light ? 22 : 30}%, ${p.panel})`;
  }
  return out;
}

/** Zijbalk en topbar volgen het thema: licht palet krijgt een licht menu met een
    subtiele accenttint, donker palet een rustig donker menu. */
export function shellVars(p) {
  const accent = p.accent;
  const light = lum(p.bg) > 0.4;

  if (light) {
    const chrome = mix(p.panel, accent, 0.032);
    const strong = ensureContrast(mix("#241f2e", accent, 0.12), chrome, "#000000", 7);
    return {
      "--shell-bg": chrome,
      "--shell-bg-2": mix(chrome, accent, 0.04),
      "--shell-text": ensureContrast(mix(strong, chrome, 0.22), chrome, "#000000", 5.5),
      "--shell-text-strong": strong,
      "--shell-muted": ensureContrast(mix(strong, chrome, 0.4), chrome, "#000000", 4.6),
      "--shell-hover": `color-mix(in srgb, ${accent} 8%, transparent)`,
      "--shell-active": `color-mix(in srgb, ${accent} 13%, transparent)`,
      "--shell-active-text": ensureContrast(mix(accent, "#000000", 0.34), mix(chrome, accent, 0.128), "#000000", 4.5),
      "--shell-border": mix(p.border, accent, 0.08),
      "--shell-accent": accent,
      "--shell-field": "rgba(20,16,40,0.045)",
      "--shell-field-strong": "rgba(20,16,40,0.07)",
    };
  }

  const chrome = mix("#0e0c16", accent, 0.096);
  return {
    "--shell-bg": chrome,
    "--shell-bg-2": mix(chrome, "#ffffff", 0.05),
    "--shell-text": "rgba(255,255,255,0.74)",
    "--shell-text-strong": "#ffffff",
    "--shell-muted": "rgba(255,255,255,0.5)",
    "--shell-hover": "rgba(255,255,255,0.08)",
    "--shell-active": `color-mix(in srgb, ${accent} 24%, transparent)`,
    "--shell-active-text": "#ffffff",
    "--shell-border": "rgba(255,255,255,0.1)",
    "--shell-accent": accent,
    "--shell-field": "rgba(255,255,255,0.07)",
    "--shell-field-strong": "rgba(255,255,255,0.1)",
  };
}

/** Alle tokens van een palet, shell inbegrepen. */
export function paletteVars(p) {
  return { ...deriveVars(p), ...shellVars(p) };
}

/** Zet een palet om in het CSS-blok dat de theme-engine injecteert. Zowel :root
    als .dark krijgen dezelfde waarden: een palet ÍS het schema, de modus schuift
    mee zodat dark:-classes (logo-varianten) blijven kloppen. */
export function colourwayCss(p) {
  const vars = Object.entries(paletteVars(p))
    .map(([k, v]) => `${k}: ${v}`)
    .join(";");
  return `:root{${vars}}\n.dark{${vars}}`;
}

/** Het effectieve palet: preset (of het TSS-basispalet) plus custom overrides,
    met het accent gedesatureerd volgens de kleurintensiteit (100 = vol). */
export function resolvePalette(base, overrides, intensity) {
  const merged = { ...base };
  for (const ch of PALETTE_CHANNELS) {
    const v = overrides[ch];
    if (v) merged[ch] = v;
  }
  // Zelfde curve als de bron-engine: exponent > 1 houdt hoge intensiteiten vol,
  // de 0.9-cap laat op 0 nog een spoortje kleur staan.
  const amount = Math.pow(1 - Math.max(0, Math.min(100, intensity)) / 100, 1.7) * 0.9;
  return amount > 0 ? { ...merged, accent: desaturate(merged.accent, amount) } : merged;
}