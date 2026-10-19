# Menubalk (TSS-sidebar) — hoe hij gebouwd is

De TSS-zijbalk uit `web/components/layout/app-sidebar.tsx`. Alle kleur loopt via
`--shell-*` tokens (niet de content-tokens), zodat de menubalk het thema volgt
met gegarandeerd contrast: licht menu op licht thema, donker op donker. Dit is
de nice-to-have laag bovenop de theme-selector.

## Groottes (exacte waarden uit de code)

| Onderdeel | Waarde |
|---|---|
| Breedte uitgeklapt | `w-[244px]`, padding `px-2` |
| Breedte ingeklapt (icon-rail) | `w-12` (48px), padding `px-1.5` |
| Verticale padding balk | `py-4` |
| Layout | `sticky top-0 h-screen flex flex-col`, rechterrand `border-r border-shell-border` |
| Nav-item | `h-8` (32px), `gap-2`, `px-2`, `text-[13px]`, `rounded-sm` |
| Sectielabel | `h-8`, `text-xs`, `text-shell-muted` |
| Gaps | `gap-0.5` binnen sectie, `gap-4` tussen secties |
| Header (logo + toggle) | `mb-6`; forge-mark `h-7` uitgeklapt, `h-6` ingeklapt |
| Iconen | `h-4 w-4` (16px), lucide-react |
| Actief-indicator | accent-streep links `w-[2px] rounded-pill bg-shell-accent` + rij-fill `bg-shell-hover` |
| Account-chip | `size-7 rounded-pill bg-shell-active`, initiaal |
| Scroll | alleen de nav scrollt: `nav` is `min-h-0 flex-1 overflow-y-auto`; footer `shrink-0` blijft staan |

Collapse: `Cmd/Ctrl+B` of het knopje (`SidebarToggle`, `size-7`). State in een
module-store + `localStorage` sleutel `tss_sidebar_collapsed`; dezelfde store
voedt de topbar-toggle zodat een ingeklapte rail altijd een zichtbare weg terug
heeft.

## Thema: de --shell-* tokens

De menu-chrome heeft een eigen tokenset, los van de content-tokens (`--text`,
`--surface`), zodat het menu een eigen licht/donker kan hebben en de theme-engine
het contrast kan floor-en. Waarden uit `web/app/globals.css`:

| Token | Licht (`:root`) | Donker (`.dark`) | Waarvoor |
|---|---|---|---|
| `--shell-bg` | `#ffffff` | `#09090b` | Balk-achtergrond |
| `--shell-bg-2` | `#fafafa` | `#0f0f11` | Account-kaart |
| `--shell-text` | `#52525b` | `rgba(250,250,250,.72)` | Inactieve item-tekst |
| `--shell-text-strong` | `#09090b` | `#fafafa` | Actief item, kop, logo |
| `--shell-muted` | `#71717a` | `rgba(250,250,250,.5)` | Sectielabels, meta |
| `--shell-hover` | `rgba(9,9,11,.045)` | `rgba(255,255,255,.06)` | Hover + actief-fill |
| `--shell-active` | `mix(#4800dd 10%)` | `mix(#8e6bff 22%)` | Account-chip vlak |
| `--shell-active-text` | `#4800dd` | `#ffffff` | Chip-tekst |
| `--shell-border` | `#e4e4e7` | `rgba(255,255,255,.09)` | Randen |
| `--shell-accent` | `#4800dd` | `#8e6bff` | Actief-indicator + icoon |

Regel: elke menu-kleur is een `--shell-*` token, nooit een content-token of vaste
hex. De engine leidt deze per thema af (zie `shellVars` in de colourway-engine),
met de accent-tint bewust circa 20% kalmer dan de inhoud.

## Logo: contrast-veilig via currentColor

De forge-mark is een inline-SVG met `fill="currentColor"`. In de lockup en de
ingeklapte rail staat de mark op `text-shell-text-strong`, hetzelfde token als de
wordmark. Zo is hij in elk thema en elke modus zichtbaar. Eerder keyde de mark op
`text-[#170144] dark:text-white` (de modus), wat losraakte van de shell-bg: een
donker thema op modus "licht" gaf een donkere mark op een donkere balk, dus
onzichtbaar. Les: kleur het logo op het shell-token, niet op `.dark`.

## Fonts

De font-picker (Weergave-tab, `FONTS` in `theme-engine.ts`) zet `--font-sans` op
`documentElement`. De menubalk erft dat via de cascade, dus een gekozen font
werkt automatisch door in de balk. Geen aparte menu-font nodig.

## Icon pack

`lucide-react` (line-icons, `h-4 w-4`). De set in de TSS-balk: `LayoutGrid`,
`Vault`, `Briefcase`, `Users`, `Handshake`, `ShieldCheck`, `Settings`, en
`PanelLeftClose`/`PanelLeftOpen` voor de toggle (`stroke-[1.75]`). Elk nav-item
draagt zijn eigen icoon-component in de `NAV_SECTIONS`-data. Regel: line-icons,
nooit emoji als control.
