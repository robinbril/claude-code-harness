---
name: theme-selector
description: Bouw de complete PolpoHire/TSS theme-selector na in elke web-app. 18 colourway-presets met contrast-vloeren, custom kleuren met live re-derive, merk-accenten, font-picker, dichtheid, en Liquid Glass (matglas + glossy iOS-variant) met intensiteit, inclusief persistentie en no-flash. Inclusief de compacte top-right topbar-trigger (Licht/Donker/Systeem/Geavanceerd) die de dialoog opent (resources/topbar-toggle/). Twee sporen: het React/TSS-origineel, en een bewezen framework-loze vanilla-JS port (resources/vanilla-port/) die de default is voor niet-React apps. Gebruik bij "themeselector", "theme selector nabouwen", "themeselector rechtsboven/topbar", "light dark system menu", "colourways toevoegen", "matglas/liquid glass", of als een app dezelfde Weergave en thema-dialoog moet krijgen.
---

# Theme-selector (PolpoHire-engine)

Twee sporen, kies op de doel-stack:

1. **React/Next-app**: port het TSS-origineel in je clone van `tss-platform/web` (de vier canonieke bestanden hieronder).
2. **Vanilla-JS / geen build-step** (PWA, server-rendered shell, plain ES6): gebruik de **bewezen port in `resources/vanilla-port/`**. Dit is de default logica, live gebouwd op het Odysseus-platform. Kopieer die bestanden, ze werken zonder framework en zonder dependencies.

Screenshots van het eindresultaat in `reference/`.

## De compacte top-right selector (aanrader als entry point)

De volledige dialoog hieronder toont alles (18 colourways, custom kleuren, glas,
font, dichtheid); de meeste gebruikers willen alleen Licht/Donker/Systeem. Zet
daarom een compacte themeselector rechtsboven in de topbar: een icoon-knop
(zon/maan/monitor die in elkaar morphen) met een klein menu **Licht / Donker /
Systeem** en, na een divider, **Geavanceerd** dat de dialoog opent. Dit is "die
mooie themeselector van rechtsboven"; bouw hem samen met de dialoog, niet in
plaats ervan.

Port en contract staan in `resources/topbar-toggle/` (`ThemeToggle.vue`, 1-op-1
snapshot uit PolpoHire, plus `README.md`). Kernpunten:

- **Vier acties op de engine, nooit een eigen token-write.** Licht/Donker →
  `applyTheme(<light- of dark-default id>)`, Systeem → `followSystem()`,
  Geavanceerd → open de dialoog. `applyTheme` blijft de enige token-writer, zo
  lopen snelmenu en dialoog-picker nooit uit elkaar.
- **Actieve keuze** = `followsSystem` ? "Systeem" : `presetIsDark(activeThemeId)`.
  Systeem is een volg-modus, geen derde thema.
- **Vorm:** panel `right:0; transform-origin:top right`; 34px iconbtn met een
  onzichtbaar 44px tap-target; outside-click en Escape sluiten; icoon-morph en
  panel-pop respecteren `prefers-reduced-motion`.
- **Vanilla-spoor:** dezelfde vier acties tegen `theme_v2.js` (`applyColourway`
  voor Licht/Donker, `openThemeDialog` voor Geavanceerd), Systeem als een eigen
  `prefers-color-scheme`-listener.

## De vanilla-port (default, resources/vanilla-port/)

| Bestand | Wat erin zit |
|---|---|
| `colourways.js` | Framework-loos. De 18 presets (bg/fg/panel/border/accent), kleurwiskunde (mix, luminantie, contrast), `ensureContrast` (AA-vloeren), `desaturate`, `deriveVars` (tokenset uit 5 kleuren), `shellVars`, `paletteIsDark`, `resolvePalette` (custom overrides plus intensiteit). Kopieer integraal. |
| `theme_v2.js` | De engine. `platformVars()` mapt de TSS-tokens op de doel-app-vars (bv. `--text` naar `--fg`, `--surface` naar `--panel`, `--brand` naar `--brand-color`). `applyColourway()` zet alles live via `setProperty` (nooit een style-element, CSP-veilig). `LS_KEY_V2` plus no-flash-cache `odysseus-theme-v2-vars`. `PLATFORM_ALIASES` plus `resolveColourwayId()` zodat oude preset-namen blijven werken. `migrateFromV1()`. |
| `dialog_v2.js` | Een samenhangende module die de HELE dialoog aanstuurt: `renderThemeGrid`, `initColorTab`, `initDisplayTab`, `initMaterialSeg`, `moveTabIndicator`, `showThemeTab`, `openThemeDialog`, `initThemeDialog`, `bootTheme`. Alles in een bestand zodat class-namen per definitie kloppen. |
| `dialog_v2.css` | Het dialoog-design-systeem: paneel, header, capsule-tabs met schuivende `.theme-tab-indicator`, `#themeGrid` kaarten, `.cw-chan-row` kleurpickers, `.display-row` controls, `#theme-material-seg`. |
| `dialog_markup.html` | De innerHTML voor `#theme-popup` (tabs, panelen, controls). `dialog_v2.js` wired dit; het bouwt alleen de kaarten zelf. |
| `glass_tokens.css` | De `--glass-*` tokens per modus (licht plus dark), de lichte overlay, en de rand-fix. |
| `glass_material.css` | De iOS Liquid Glass materiaallaag (transparant, glossy). |
| `CLASS-CONTRACT.txt` | Het harde class-contract dat JS en CSS delen. Lees dit eerst bij elke wijziging. |

Bootstrappen: importeer uit `dialog_v2.js`, roep `bootTheme()` dan `initThemeDialog()` aan, zet de `#theme-modal` markup uit `dialog_markup.html`, en link `glass_tokens.css` plus `glass_material.css` plus `dialog_v2.css` na de basis-stylesheet.

## De canonieke React-bestanden (TSS-origineel, je clone van `tss-platform/web`)

| Bestand | Wat erin zit |
|---|---|
| `web/lib/theme/colourways.ts` | Zelfde wiskunde als `colourways.js`, met TS-types. De 18 presets, `STANDARD_LIGHT`/`STANDARD_DARK`, `DEFAULT_COLOURWAY_ID`, `FEATURED_COLOURWAY_IDS`, `deriveVars`, `shellVars`, `resolvePalette`. |
| `web/lib/theme/theme-engine.ts` | React DOM-laag, injecteert twee `<style>`-elementen (`tss-colourway-vars`, dan `tss-brand-vars`) en cachet het berekende CSS in `tss_theme_css`/`tss_brand_css` voor no-flash. Alle `tss_*` storage-keys, font/dichtheid/materiaal/frost/intensity. |
| `web/lib/theme/use-theme-settings.ts` | React-store (`useSyncExternalStore`) zodat topbar-toggle en dialoog dezelfde staat zien. |
| `web/components/theme-settings.tsx` | De dialoog in JSX: vier tabs (Thema's, Kleuren, Weergave, Account) via Radix Dialog. |
| `web/lib/brand/brands.ts` | De 6 merk-entiteiten; het merk kleurt de HELE interface mee via twee accent-zaadkleuren (licht/donker). |
| `web/app/layout.tsx` | Het inline no-flash script in `<head>` dat modus/dichtheid/font/materiaal/frost én de gecachte kleur-CSS zet vóór hydratie. |
| `web/app/globals.css` | De statische `:root`- en `.dark`-defaults (het "standaard"-palet) plus de drie materiaal-blokken. |

## Architectuur in vijf regels

1. **Statische defaults** in de basis-CSS (`:root` licht, `.dark` donker) zijn het standaard-thema; de engine overschrijft via `setProperty` op `documentElement`, nooit door de stylesheet te muteren.
2. **Een preset is licht of donker** (`paletteIsDark`): kiezen zet de modus mee, zodat `dark:`-classes en logo-varianten blijven kloppen.
3. **Alles wordt afgeleid** uit 5 kleuren door `deriveVars` met contrast-vloeren (tekst 7:1, secundair 4.6, tertiair 3.4, faint 2.6); custom kleuren zijn per-kanaal overrides, daarna dezelfde re-derive.
4. **Volgorde van winnen**: statisch < colourway < merk-accent. Later element wint bij gelijke specificiteit.
5. **Persistentie plus no-flash**: de keuze onder een eigen key, en het berekende var-blok gecacht zodat het inline head-script het voor de eerste paint zet.

## 1-op-1 naar andere software (het recept)

De engine hangt aan een tokenset, niet aan een framework. Op elke stack draait
dezelfde logica; alleen de injectie-laag verschilt. Twee wegen:

**React/Next (kopieer de bronbestanden):**

1. Kopieer `lib/theme/colourways.ts` integraal (kleurwiskunde + 18 presets +
   `STANDARD_LIGHT/DARK`). Dit bestand is framework-loos; niks aanpassen.
2. Kopieer `lib/theme/theme-engine.ts`, `use-theme-settings.ts`,
   `components/theme-settings.tsx`, `lib/brand/brands.ts`.
3. Zet de statische `:root`/`.dark`-tokens uit `globals.css` in je basis-CSS. De
   engine schrijft ALLEEN deze tokennamen; bestaat een token niet in je CSS, dan
   heeft de override niets om op te winnen.
4. Plak het no-flash script uit `app/layout.tsx` in je `<head>`, vóór de bundle.
5. Registreer de font-variabelen (`--font-inter` enz.) zoals `layout.tsx` doet.

**Niet-React (vanilla-port, `resources/vanilla-port/`):** zelfde kleurwiskunde,
`applyColourway()` schrijft via `setProperty` (CSP-veilig, geen style-element).
`platformVars()` mapt de TSS-tokennamen op de doel-app-vars (bv. `--text` →
`--fg`). Kopieer de bestanden, bootstrap met `bootTheme()` + `initThemeDialog()`.

**De harde eis in beide gevallen:** de doel-app moet dezelfde tokennamen gebruiken
(of ze via `platformVars` mappen). De volledige lijst die `deriveVars` +
`shellVars` produceren: `--bg --surface --surface-2 --container --border
--border-strong --text --text-2 --text-3 --text-faint --brand --brand-strong
--brand-text --brand-soft --on-brand --ring-shadow --e1 --e2 --e3` plus per status
`--{ok,warn,danger,info}{,-ink,-soft,-line}` plus de shell-laag `--shell-{bg,bg-2,
text,text-strong,muted,hover,active,active-text,border,accent,field,field-strong}`.
Elk component leest UITSLUITEND deze tokens, nooit een ruwe hex.

## TSS-stand aug 2026 (exact, uit de bron geverifieerd)

De actuele TSS-inrichting zoals nu gecommit in je clone van `tss-platform/web`.
Alle waarden hieronder komen letterlijk uit de bronbestanden, niet uit geheugen.
Wie de selector 1-op-1 repliceert neemt dit over.

### De 18 presets (letterlijk uit `lib/theme/colourways.ts`)

Elk preset is vijf kleuren (bg/fg/panel/border/accent); de engine leidt de rest af.

```
polpohire  bg #f4f4fb  fg #1b1830  panel #ffffff  border #e7e7f1  accent #5b50e6   (licht)
midnight   bg #101017  fg #f6f6fb  panel #181820  border #2d2d3a  accent #6e8bff   (donker)
iris       bg #f6f4fb  fg #241f35  panel #ffffff  border #e2dcee  accent #6d46d9   (licht)
indigo     bg #1a1726  fg #ece9f4  panel #221f30  border #383350  accent #9b87f5   (donker)
rose       bg #fbf2f7  fg #382433  panel #fffafd  border #f1dbe7  accent #d6457f   (licht)
lilac      bg #f4eff9  fg #322b46  panel #fbf8ff  border #e2d9ee  accent #8b5cc4   (licht)
plum       bg #1b1320  fg #ece2f2  panel #251a2e  border #3b2d49  accent #b06fd6   (donker)
ocean      bg #0c1a26  fg #d8eaf5  panel #122433  border #1f3a4d  accent #3fa6d6   (donker)
sky        bg #f1f6fc  fg #1f2c3a  panel #ffffff  border #d9e6f3  accent #2f7fd6   (licht)
slate      bg #0f1622  fg #e6ecf4  panel #18202e  border #2e3a4d  accent #5b9bd6   (donker)
teal       bg #f0f7f6  fg #1e312e  panel #fbffff  border #d4e6e2  accent #199e8e   (licht)
forest     bg #131c17  fg #e0eae0  panel #1b261f  border #2f4035  accent #5aa873   (donker)
amber      bg #fdf6ec  fg #34291b  panel #fffdf8  border #efe0cb  accent #df8324   (licht)
copper     bg #191411  fg #ece1d5  panel #231b15  border #3b2e23  accent #c67c45   (donker)
bordeaux   bg #1b1117  fg #f0e0e5  panel #261820  border #3e2832  accent #d35d72   (donker)
paper      bg #faf8f4  fg #2e2a26  panel #ffffff  border #e6ded2  accent #a05a2c   (licht)
sand       bg #f4efe7  fg #3a352d  panel #fcf9f4  border #e0d7c8  accent #8a7350   (licht)
graphite   bg #1a1a1c  fg #ececec  panel #232326  border #3a3a3e  accent #9aa0a6   (donker)
```

(licht/donker = `paletteIsDark`: luminantie van `bg` onder 0.4 is donker.)

### "Standaard" en "Aanbevolen" (uit `theme-settings.tsx` + `colourways.ts`)

- **`DEFAULT_COLOURWAY_ID = "standaard"` is een VIRTUEEL colourway**, staat NIET
  in de COLOURWAYS-array. De dialoog prepend hem als kaart "Standaard" met het
  palet `STANDARD_LIGHT`/`STANDARD_DARK` (de actieve modus bepaalt welke). Hem
  kiezen zet geen preset, dus `applyColourwayVars` verwijdert het style-element
  en de statische globals-defaults gelden weer.
- **`FEATURED_COLOURWAY_IDS = ["polpohire", "midnight", "iris"]`.** De rij
  "Aanbevolen" = `[standaard, polpohire, midnight, iris]` gefilterd op de modus.
  In DONKER blijven alleen `standaard` + `midnight` over (de andere twee zijn
  licht): daarom toont het scherm precies twee aanbevolen kaarten. "Alle thema's"
  is de rest, ook gefilterd op modus.
- **`STANDARD_LIGHT`** = bg `#ffffff`, fg `#09090b`, panel `#fbfbfc`, border
  `#e4e4e7`, accent `#5442a7`. **`STANDARD_DARK`** = bg `#09090b`, fg `#fafafa`,
  panel `#17171a`, border `#27272a`, accent `#7266bc`.

### Statische defaults (globals.css) — dit is wat "Standaard" toont

- **`:root` (licht):** bg `#ffffff`, surface `#fbfbfc`, surface-2 `#f4f4f5`,
  container `#f6f6f7`, border `#e4e4e7`, border-strong `#d4d4d8`, text `#09090b`,
  text-2 `#52525b`, text-3 `#71717a`, text-faint `#a1a1aa`. Brand `#5442a7`,
  brand-strong `#45328e`, brand-soft `color-mix(in srgb, #5442a7 12%, #fff)`,
  on-brand `#fff`.
- **`.dark` = WARM bruin-zwart** (geen koud zink): bg `#110e09`, surface
  `#1a1610`, surface-2 `#2a2518`, container `#14110c`, border `#2e2920`,
  border-strong `#443d30`, text `#fafafa`, text-2 `#ada598`, text-3 `#8a8278`,
  text-faint `#5c5649`. Brand `#7266bc`, brand-strong/-text `#a19ae3`. Shell
  hover/field zijn warm getint: `rgba(255,240,210,0.06)`, NIET wit-transparant.
- **`--brand` is bewust het gedempte `#5442a7`, NIET het rauwe brandbook-violet
  `#4800DD` of `#170144`.** `#170144` is alleen de letterlijke hex van het
  MERKteken (ForgeMark/BrandLockup op de login), staat los van `--brand`.
- **Statuskleuren (gedempt, hue-stabiel, in `:root`, `.dark` én `deriveVars`):**
  ok `#46996a`, warn `#c98a3d`, danger `#a44e4a`, info `#4871ad`. Per thema
  worden alleen ink/soft/line opnieuw gemengd; de hue blijft staan. In
  `colourways.ts` heet de STATUS-set net iets anders gemengd maar dezelfde vier
  bases: houd beide bronnen gelijk, want de engine overschrijft de stylesheet
  zodra een preset actief is.

### App-brede defaults (wat een nieuwe gebruiker ziet)

- **Colourway = `midnight`** (`readColourway()` valt terug op `"midnight"`,
  matcht de login-navy). **Modus = `dark`** (`readMode()` → `"dark"`, niet
  `system`). **Materiaal = `frosted` (Matglas)**, `frost` = 100, `intensity` = 100
  (`FALLBACK_STATE`). Wie zelf kiest of opslaat overschrijft dit via
  `tss_default_*`-keys.
- Let op: het no-flash script in `app/layout.tsx` MOET exact dezelfde fallbacks
  hebben als de engine (`mode || 'dark'`, materiaal-afleiding uit `tss_frosted`),
  anders flitst het eerste frame verkeerd tot hydratie.

### Merk-entiteiten (`lib/brand/brands.ts`) — het merk herkleurt de HELE UI

Zes entiteiten. Elk levert twee accent-zaadkleuren (licht/donker); de engine
leidt daar de volledige brand-tokenset uit af in een tweede `<style>` dat NA het
kleurthema staat en dus wint op `--brand`/`--shell-accent`.

```
tss              (default, geen accent → stylesheet-violet blijft)
recruitment      light #170144  dark #8e6bff
detachering      light #6f6840  dark #c9c08a
lead-operations  light #0f7f8e  dark #74d5e0
holding          light #131313  dark #d4d4d4
staff            light #525252  dark #a8a8a8
```

De lichte variant is per merk op AA-contrast op wit gekozen; ontbreekt een
accent (TSS), dan verdwijnt het merk-element en winnen kleurthema + stylesheet.

### Materialen en de glas-slider (globals.css + theme-engine.ts)

- **Drie materialen als html-classes**, elkaar uitsluitend: niks (standard),
  `html.app-frosted` (Matglas), `html.liquid-glass` (Liquid Glass). Ze grijpen
  aan op `.tss-topbar`, `.tss-card` en `.tss-modal`.
- **Frosted-defaults:** `--glass-blur: 26px`, `--glass-alpha: 76%`, rim/edge/shadow
  per modus (licht: witte rim `rgba(255,255,255,0.6)`; dark: `0.14`).
- **Liquid-defaults:** vulling licht `--lg-glass: rgba(255,255,255,0.86)` (bijna
  dicht, anders "modder"), donker `rgba(255,255,255,0.08)` via
  `html.liquid-glass.dark`. Blur `clamp(12px, var(--glass-blur), 18px)`.
- **De Glasintensiteit-slider (0-100) zet vier vars** (`applyFrost`, exact deze
  formules, ook in het no-flash script):
  `--glass-alpha = round(86 - n*0.18)%`, `--glass-blur = round(10 + n*0.3)px`,
  `--lg-alpha = round(62 - n*0.16)%`, `--lg-blur = round(18 + n*0.06)px`.
  De slider is disabled bij materiaal "standard".
- **Fonts (`FONTS`, Weergave-tab):** system, inter, poppins, manrope, jakarta,
  grotesk. De picker zet alleen `--font-sans` op `documentElement`; elk font is
  een next/font-variabele (`--font-inter` enz.), `preload:false`.
- **Dichtheid:** `comfortable`/`compact` via `data-density` op `<html>`; compact
  knijpt radius en de ritme-schaal één stap aan (globals `html[data-density="compact"]`).

## Het TSS-loginscherm (resources/tss-login/)

Los meeneembaar: het login-scherm dat je op de screenshots ziet. Eén
self-contained React-component met een fullscreen WebGL-rookveld, een geblurde
glaskaart, floating-label velden en een morphende oog-toggle. Staat BEWUST los
van de colourway-engine (altijd donker navy, ongeacht thema) zodat het
merk-moment consistent blijft. Bestanden en de drie swap-punten (auth-endpoint,
merkteken+wordmark, oog-icoon) staan in `resources/tss-login/README.md`.

- **De rook is een fragment-shader**: 8 iteraties cosinus-distortie op de UV,
  `abs(sin(...))` als golf, `smoothstep(1.15, 0.05, wave)` als gloed, kleur
  `#1a2b5e`. De muis stuurt het ripple-centrum met een kritisch-gedempte ease
  (`1 - exp(-dt/0.35)`), zakt bij vertrek terug naar het midden.
- **Fallbacks ingebouwd**: geen WebGL = vaste `#05070f` achtergrond (geen crash);
  `prefers-reduced-motion` = één stilstaand frame, geen rAF-loop.
- **Bron**: `web/app/(auth)/login/page.tsx`; het merkteken `web/components/forge-mark.tsx`.

## White en dark separatie (belangrijk)

De light/dark scheiding zit op drie plekken en moet consistent blijven:

- **Palet bepaalt de modus.** `paletteIsDark(p)` (luminantie van `bg` onder 0.4) beslist of een colourway licht of donker is. `applyColourway` zet `documentElement.classList.toggle('light', !isDark)` zodat de basis-`.dark`-regels en de logo-`dark:`-varianten meeschuiven.
- **Glas-tokens per modus.** `glass_tokens.css` definieert `--glass-*` twee keer: op `:root` (licht: witte rim rond 0.85, lichte diffuse schaduw) en op `.dark` / `body.theme-dark` (donker: subtielere rim rond 0.2, maar nog steeds een LICHT wit-transparant hoogsel, nooit een zwart paneel). Het glas blijft dus glossy in beide modi, alleen de rim- en sheen-alpha zakken in dark.
- **Contrast-vloeren gelden in beide.** `deriveVars` mengt tekst naar de juiste kant (richting donker op licht, richting licht op donker) zodat elk van de 18 paletten in zijn eigen modus leesbaar blijft.

## Liquid Glass, de glossy transparante default

Er zijn drie materiaal-modi (exclusief, via `#theme-material-seg`):

- **Standaard** (geen class): dicht paneel `var(--panel)`, geen blur. Snelst, veiligst.
- **Matglas** (`html.app-frosted` plus `body.theme-frosted`): zachte blur, iets meer dekking.
- **Liquid Glass** (`html.liquid-glass`): de iOS-variant, transparant en glossy.

De glossy defaults (dit is de gecorrigeerde logica, de eerste versie was te grijs en mat):

- `--glass-alpha: 50%` (niet 76). Paneel-achtergrond `color-mix(in srgb, var(--panel) var(--glass-alpha), transparent)`, op licht thema mag je richting wit mengen zodat het glossy-wit oogt, nooit diep grijs.
- `backdrop-filter: blur(24px) saturate(1.7) brightness(1.05)`. De saturatie plus brightness maakt de vibrancy.
- **Gloss** komt van een `::before` met een witte radiale of lineaire sheen hoog bovenaan (pointer-events none) plus een felle witte bovenrim `inset 0 1px 0 var(--glass-rim)`.
- **Schaduw is licht en getint**, nooit `rgba(0,0,0,...)`: `--glass-shadow: 0 20px 60px rgba(23,1,68,0.10), 0 2px 10px rgba(23,1,68,0.06)` (Reforge-blauw getint). Een zwarte schaduw leest als een donkere rand.
- Materiaaldikte per laag: modal en dropdown vol, topbar `blur * 0.6` met hogere alpha-vloer. Nooit twee glaslagen op elkaar.
- Spring-materialize: scale plus blur samen (rond 340ms, `cubic-bezier(.32,1.28,.42,1)`).
- Fallbacks: `@supports (backdrop-filter)`, `prefers-reduced-transparency` naar dicht paneel, `prefers-reduced-motion` naar geen materialize.

## Valkuilen (elk kostte een echte iteratie)

| Valkuil | Regel |
|---|---|
| Zwarte rand rond de dialoog | De platform `.modal-content` heeft vaak een harde `box-shadow: 0 8px 32px rgba(0,0,0,0.45)` plus padding. Overschrijf op `#theme-popup.modal-content.tss-modal`: `box-shadow: var(--glass-shadow) !important; border: 1px solid var(--glass-edge) !important; padding: 0 !important`. |
| Swatch-strook onzichtbaar (hoogte 0) | Een CSS-grid op `.cw-swatches` collapst. Forceer `display:flex; height:52px` en `.cw-sw{flex:1;height:100%}`. |
| Tab-wissel doet niks | `showThemeTab` moet het `hidden`-attribuut echt togglen (`panel.hidden = !on`), niet alleen classes; de markup verbergt panelen via `[hidden]`. |
| Glas lijkt dekkend | Blur heeft content ACHTER het paneel nodig. Op een lege of egale achtergrond zie je niets. Op het echte platform (chat, sidebar) komt het vanzelf uit; in een demo zet je gekleurde content erachter. |
| deriveVars-keys | De keys hebben een dubbele streep: `v['--brand']`, niet `v['brand']`. |
| Renderer traag | Te veel `backdrop-filter`-elementen plus animaties bevriezen zwakke laptops. Houd blur onder 26px, beperk het aantal glaslagen, geen animatie op grote lijsten. |

## Multi-agent bouw (als je het via een Grok/agent-swarm bouwt)

Geleerd op de Odysseus-build: 28 micro-agents gaven inconsistente, niet-passende stukken. Wat wel werkt:

- **Hard class-contract eerst.** Fixeer de exacte class-namen (`CLASS-CONTRACT.txt`) en geef dat aan elke agent, zodat JS en CSS matchen. Zonder contract krijg je mismatches (JS bouwt `.cw-swatch-strip`, CSS styelt `.cw-swatches`).
- **Grote agents, niet micro.** Opmaak leeft van samenhang (spacing, uitlijning, ritme). Splits in enkele grote domeinen (complete dialoog-CSS, complete dialoog-JS, complete glas-laag), niet in twintig fragmenten.
- **Hoge token-limiet.** Een complete dialoog-JS of glas-laag is 600 tot 800 regels; zet de per-call timeout ruim (rond 560s) en `max_tokens` op 7000 tot 8000, anders kapt de output af.
- **De markup schrijf je zelf** uit het contract (deterministisch), niet per agent.

## Nice-to-have: menubalk-opties

Optionele uitbreidingen die je aan de theme-selector kunt hangen als de app ook
een zijbalk/menu heeft. Default UIT; de kern-selector werkt zonder. De volledige
maatvoering, de `--shell-*` tokenlijst, de icon-set en de logo-fix van de
TSS-menubalk staan in `resources/menubalk.md`. Kort per optie:

- **Menubalk-grootte (compact / normaal / breed).** Raakt de uitgeklapte breedte
  (TSS: `w-[244px]`) en de item-dichtheid (`h-8`, `gap-0.5`). Voer het als een
  eigen segmented control naast Dichtheid, of hang het aan de bestaande
  `data-density`. Zet een `--shell-width`-token en laat de `<aside>` daarop
  sturen, zodat het net als kleur via een token loopt.
- **Icon-pack keuze.** Standaard lucide-react. Bied hooguit een tweede line-pack
  aan (bv. Tabler of Phosphor); harde eis: het blijft een line-pack op dezelfde
  grootte (`h-4 w-4`), nooit emoji als control. Map de nav-items op de gekozen
  set via een lookup, niet per component-import.
- **Font op de menubalk.** Werkt al: de font-picker zet `--font-sans` op
  `documentElement` en de balk erft dat. Een aparte menu-font is alleen nodig als
  je de balk bewust wilt laten afwijken; dan een los `--shell-font`-token.
- **Shell-thema als aparte laag.** De menu-chrome heeft een eigen `--shell-*`
  tokenset (los van de content-tokens) zodat het menu een eigen licht/donker kan
  volgen met eigen contrast-vloeren. `shellVars(palette)` leidt ze per colourway
  af, met de accent-tint circa 20% kalmer dan de inhoud. Wil je de gebruiker het
  menu apart laten kleuren, expose dan alleen de shell-laag als tweede palet.

- **Inklap-rail (collapse naar icoon-rail, ChatGPT-stijl).** De balk klapt van
  vol (`w-[244px]`) naar een smalle icoon-rail (`w-14`, 56px; niet 48, dat oogt
  krap). Kernpunten uit de TSS-implementatie (`web/components/layout/app-sidebar.tsx`):
  - **Eén gedeelde state, geen prop-drilling.** Een module-level store met
    `useSyncExternalStore` plus een `localStorage`-key (`tss_sidebar_collapsed`),
    zodat de rail én elke losse toggle exact dezelfde stand zien. Zonder gedeelde
    state heeft een ingeklapte gebruiker geen zichtbare weg terug. `Cmd/Ctrl+B`
    toggelt globaal via een `keydown`-listener.
  - **Hover-swap logo ↔ uitklap-icoon.** Ingeklapt staat er bovenin één knop:
    het merkteken standaard, en bij `group-hover` crossfade (opacity + `scale-90→100`)
    naar het uitklap-icoon (`PanelLeftOpen`) op dezelfde plek. Klik = uitklappen.
    Nooit logo én toggle gestapeld: dat is ruis. Icon-pack: lucide
    `PanelLeftClose` (inklappen) / `PanelLeftOpen` (uitklappen).
  - **Server/client-splitsing.** In een RSC-app blijft de layout een async server
    component (sessie/pathname via `headers()`); alleen de balk-markup verhuist
    naar een client-component die de collapse-state stuurt. De nav-data is
    statisch en staat lokaal in die client-component, want icoon-componenten mogen
    de server→client-grens niet over.
  - **Animatie.** Breedte `transition-[width,padding] duration-300` met een expo-out
    ease (`cubic-bezier(0.16,1,0.3,1)`); nav-labels komen op met een `fade-in`
    plus lichte `slide-in-from-left` (200ms) zodat ze niet hard poppen; de
    logo↔icoon-swap is 200ms opacity+scale. Ingeklapte items centreren
    (`justify-center`) en tonen alleen het icoon met een `title`/`aria-label`.
  - **Valkuil (meetbaar).** Een niet-compositerende (verborgen) preview-pane
    bevriest de width-transitie op de startwaarde: `getComputedStyle().width` geeft
    dan de oude breedte terwijl `data-collapsed` al `true` is. Meet met
    `transition:none` geforceerd, of in een echte, zichtbare browser. Het is geen
    bug in de rail.

## Nice-to-have: bewegende iconen

Een set state-iconen die tussen hun standen morphen in plaats van te wisselen
(oog open/dicht, kopieer/gekopieerd, verstuur, menu/sluiten, slot, chevron).
Default UIT; puur sfeer, de selector werkt zonder. Referentie-implementatie:
`tss-platform/web/components/animated-icons.tsx` (React plus framer-motion).

- **Stand via props, nooit via een interne timer.** De knop of het formulier
  houdt de waarheid vast (`showPw`, `copied`, `submitPending`); het icoon leest
  hem alleen. Een icoon met een eigen timer loopt vroeg of laat uit de pas met
  de knop eronder, en dat is niet te debuggen.
- **Morph over transform en `pathLength`, nooit over `d`.** Twee paden met een
  verschillend aantal punten interpoleren niet; framer-motion springt dan
  gewoon. Rotatie, schaal, verschuiving en een vinkje dat zichzelf tekent
  dekken alle standen die je in de praktijk nodig hebt.
- **Onder de 350ms en geen layout-beweging.** Alles wat de knop laat verspringen
  trekt de aandacht naar het icoon in plaats van naar de verandering.
- **Kleur uit `currentColor`**, behalve waar de stand zelf betekenis draagt:
  geslaagd pakt `var(--ok)`, fout `var(--danger)`. Nooit een vaste hex, anders
  breekt het icoon op elk ander colourway.
- **`useReducedMotion` zet de duur op nul**, niet de animatie uit: de standen
  moeten blijven kloppen, ze verschijnen alleen zonder tussenweg.
- **Wire spaarzaam.** Drie tot vijf plekken waar de stand echt verandert
  (wachtwoord-toggle, kopieerknop, verzendknop). Overal een bewegend icoon leest
  als speelgoed en haalt de rust uit een ingetogen thema.

## Herkomst

- Bron-engine: `applicant_tracking_system/frontend-v4/src/composables/useTheme.ts` (PolpoHire, Vue). De TSS-port en de vanilla-port zijn 1-op-1 in kleurwiskunde.
- Materiaal-referentie: WWDC Designing Fluid Interfaces (Apple).
- Vanilla-port live bewezen op het Odysseus-platform (poundwise-odysseus/static-brand), 2026-08.
