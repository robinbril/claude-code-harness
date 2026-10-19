# Tokens, kleur en typografie

Wanneer lezen: bij elke kleur-, letter- of maatkeuze, bij een nieuw palet, bij donker thema, en bij het overzetten naar een ander product (Polpo). De Power BI-look van 2026 is grotendeels Fluent 2-neutralen plus het klassieke Power BI-datapalet en discipline. Contrastwaarden: WCAG-luminantie ([W3C](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)), nagerekend in het onderzoek. **[eigen keuze]** = geen Microsoft-waarde.

Kleurvalidatie zelf gebeurt met de skill `dataviz` (`scripts/validate_palette.js` in die skill, licht en donker, tegen het echte oppervlak). Nooit op het oog.

## Inhoud

1. Fluent 2-basisthema van Power BI
2. Het datapalet en drie correcties
3. Het gevalideerde webpalet (backoffice)
4. Statuskleuren, afwijkingen en scenario's
5. Donker
6. Typografie
7. Radii, spacing, schaduw, layout
8. Plakbare CSS
9. Wat de backoffice werkelijk gebruikt
10. Delen met andere producten

## 1. Fluent 2-basisthema van Power BI

Power BI kent drie basisthema's: **Fluent 2** (standaard voor nieuwe rapporten), Classic 2026 en Classic 2018 ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-reports-visual-defaults)); Fluent 2 kwam als preview in april 2026 ([databear](https://databear.com/power-bi-fluent-2-fluent-theme/)). Waarden uit [Fluent2-CY26SU08.json](https://github.com/microsoft/fabric-toolbox/blob/main/monitoring/query-capacity-correlation/Template/Query%20Capacity%20Correlation.Report/StaticResources/SharedResources/BaseThemes/Fluent2-CY26SU08.json), tokens uit [Fluent lightColor.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/alias/lightColor.ts):

| Rol | Waarde | Fluent-token | Contrast op wit |
|---|---|---|---|
| Wallpaper buiten het canvas | #E6E6E6 | NeutralBackground6 | n.v.t. |
| Pagina | #FAFAFA | NeutralBackground2 | n.v.t. |
| Visual-card | #FFFFFF, 1px rand #E6E6E6, radius 8, padding 14/16/16/16, geen schaduw | Background1, XLarge | rand 1,25:1 (decoratief, mag) |
| Primaire tekst | #242424 | Foreground1 | 15,5:1 |
| Secundair, aslabels | #616161 | Foreground3 | 6,19:1 (5,93 op #FAFAFA) |
| Lichtste leesbare tekst | #707070 | Foreground4 | 4,95:1 (4,74 op #FAFAFA) |
| Uitgeschakeld | #BDBDBD | ForegroundDisabled | **1,88:1, nooit voor leesbare tekst** |
| Gridlines | #F0F0F0 doorgetrokken | Stroke3 | decoratief |
| Tabelraster "Minimal" | #E0E0E0 | Stroke2 | decoratief |
| Focus of betekenisvolle rand | #616161 | StrokeAccessible | 6,19:1 |
| tableAccent | #118DFF | | 3,35:1, niet voor tekst |
| Fluent-merk | #0F6CBD | brand 80 | 5,38:1 |

Verder zet het thema assentitels uit, titels en subtitels aan, lijnen "smooth" ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-reports-visual-defaults)). Microsoft raadt aan vóór publicatie terug te gaan naar het lichte standaardthema ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-report-themes)).

## 2. Het datapalet en drie correcties

Datakleuren in beide thema's: **#118DFF, #12239E, #E66C37, #6B007B, #E044A7, #744EC2, #D9B300, #D64550, #197278, #1AAB40**; klassiek sentiment good #1AAB40, neutral #D9B300, bad #D64554 ([CY24SU10.json](https://github.com/microsoft/unified-data-foundation-with-fabric-solution-accelerator/blob/main/fabric_workspace/reports/sales_dashboard.Report/StaticResources/SharedResources/BaseThemes/CY24SU10.json)). Power BI wijst reekskleuren toe op volgorde van verschijnen, dus dezelfde klant kan in twee visuals verschillende kleuren krijgen ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-report-themes)): leg kleur per categorie vast, nooit per index.

1. **Contrast.** Geel #D9B300 (2,02:1) en groen #1AAB40 (3,02:1; 2,90 op #FAFAFA) halen 3:1 voor grafische objecten niet ([W3C](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)): niet voor dunne lijnen, kleine markers of tekst.
2. **Kleurenblindheid.** Het verschil tussen #1AAB40 en #D64554 daalt van ΔE 117,7 bij normaal zicht naar **10,4 bij deuteranopie** (simulatie [Machado et al. 2009](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html)). Microsoft noemt rood/groen als eerste te vermijden paar en eist markers in plaats van kleur als enig signaal ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)). Een afwijking krijgt dus altijd ook +/−, ▲/▼ of een balkrichting. Blauw/oranje is het kleurenblind-veilige alternatief ([Tabular Editor](https://tabulareditor.com/blog/kpi-card-best-practices-dashboard-design)).
3. **Pastel is vulling.** De Fluent 2-sentimentkleuren #9FD89F / #FDCFB4 / #EEACB2 halen 1,64 / 1,42 / 1,88:1 op wit: alleen als celvulling met #242424 erop (9,46 / 10,91 / 8,26:1). Ook #B3B0AD (2,16:1) en #BDBDBD zijn te licht voor tekst; neem #616161 of #707070.

## 3. Het gevalideerde webpalet (backoffice)

Het originele Power BI-palet faalt de lichtheidsband van de validator: slot 2 #12239E (OKLab L 0,354) en slot 4 #6B007B (L 0,382) vallen onder de lichte band L 0,43-0,77 (nagerekend 2026-10-08). Daarom gebruikt de backoffice een webvariant met een **vaste rol per reeks** (`components/finance/charts/kleursets.ts`, set `powerbi`, de standaard):

| Reeks | Hex | Op #FFFFFF | Op #FAFAFA | Op #1F1F1F | Op #292929 |
|---|---|---|---|---|---|
| Omzet | #118DFF | 3,35 | 3,20 | 4,93 | 4,35 |
| Directe kosten | #3B4FD8 (indigo) | 6,37 | 6,10 | **2,59** | **2,28** |
| Brutomarge | #E66C37 | 3,20 | 3,06 | 5,15 | 4,55 |
| Nettoresultaat | #9B3FB0 (paars) | 5,63 | 5,39 | **2,93** | **2,59** |

Validatoruitvoer uit de kopcomment van `kleursets.ts` (`--pairs all`, volgorde marge, kosten, omzet, netto; donkerregels ingekort tot de afwijkende checks):

```
$ node validate_palette.js "#E66C37,#3B4FD8,#118DFF,#9B3FB0" --mode light --surface "#ffffff" --pairs all
  [PASS] Lightness band         all 4 inside L 0.43-0.77
  [PASS] Chroma floor           all 4 >= 0.1
  [WARN] CVD separation         worst all-pairs #9B3FB0↔#3B4FD8 ΔE 6.4 (protan) · tritan 16.1
  [PASS] Normal-vision floor    worst all-pairs #118DFF↔#3B4FD8 ΔE 15.5 (normal)
  [PASS] Contrast vs surface    all 4 >= 3:1
  → ALL CHECKS PASS
$ ... --mode dark --surface "#16141f" --pairs all
  [WARN] Contrast vs surface    below 3:1, relief required (visible labels or table view): [["#3B4FD8",2.86]]
  → ALL CHECKS PASS
$ ... --mode dark --surface "#161c2b" --pairs all
  [WARN] Contrast vs surface    below 3:1, relief required: [["#3B4FD8",2.67]]
  → ALL CHECKS PASS
Buren (standaard-paarlijst): CVD worst #118DFF↔#3B4FD8 ΔE 12.2 (deutan), PASS.
```

Gevolgen:
- Licht: alles door op #ffffff.
- Donker: indigo haalt op de backoffice-oppervlakken geen 3:1 (validator); op de Fluent-donkerstand (#1F1F1F, #292929) halen indigo én paars geen 3:1 (nagerekend). Regel: **zichtbare labels of een tabelweergave op elke kaart** (de relief-regel).
- Het zwakste paar is indigo met paars (ΔE 6,4 protan): kosten en netto. Die staan alleen samen in de resultaatbrug, waar elke staaf naam en bedrag draagt. Nergens naast elkaar zonder labels.
- Een nieuwe set of een nieuw oppervlak: validator opnieuw, licht en donker, uitvoer in de kopcomment. De andere sets in `kleursets.ts` (Backoffice, Contrastrijk, Ingetogen) halen ALL CHECKS PASS zonder WARN.

## 4. Statuskleuren, afwijkingen en scenario's

| Rol | Licht | Donker [eigen afleiding] | Opmerking |
|---|---|---|---|
| Afwijking als tekst/icoon gunstig, let op, ongunstig | #0E700E / #BC4B09 / #B10E1C (6,28 / 5,06 / 7,12) | #9FD89F / #FDCFB4 / #EEACB2 | Fluent Status Foreground1 |
| Statusvulling | #9FD89F / #FDCFB4 / #EEACB2 met #242424 | rgba-tint 35% van #107C10 / #BC4B09 / #C50F1F | nooit als tekst |
| Afwijking als balk of pin | #107C10 (5,37) / #C50F1F (6,07) | #9FD89F / #EEACB2 | altijd met teken of richting; de backoffice gebruikt voor afwijkingsbruggen `--ok` en `--danger` als vulling (tokens `goed`/`slecht`), niet de `-ink`-tinten, die als balk bruin ogen |
| Neutrale afwijking | #707070 [eigen keuze, IBCS "medium grey"] | #999999 | |
| AC / PY / PL / FC | #424242 massief / #8A8A8A massief / 1,5px rand / arcering | #D6D6D6 / #7A7A7A / rand / arcering | tinten eigen keuze, notatie IBCS |

Bronnen: [Fluent colors.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/colors.ts), [Fluent darkColor.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/alias/darkColor.ts). Sequentieel (ouderdom, hoe laat): één warme tint, later = donkerder in licht en lichter in donker (backoffice `--chart-verval-1` tot `-4`).

## 5. Donker

Power BI publiceert geen hexwaarden voor zijn eigen Dark-thema; afgeleid uit Fluent webDarkTheme: wallpaper #141414, pagina #1F1F1F, kaart #292929, rand #3D3D3D, tekst #FFFFFF / #D6D6D6, aslabels #ADADAD (6,48:1), lichtste tekst #999999, schaduwalfa .24 / .28 ([Fluent darkColor.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/alias/darkColor.ts)). Donker is een **gekozen** set stappen, gevalideerd op het donkere oppervlak, nooit een automatische omkering (dataviz; `useChartTokens` leest licht en donker uit `theme.css`).

## 6. Typografie

Power BI-thema's rekenen in punten; 1 pt = 1,333 px ([W3C CSS Values](https://www.w3.org/TR/css-values-3/#absolute-lengths)). Fluent 2 valt precies op de Fluent-schaal ([Fluent fonts.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/fonts.ts)):

| Element | Klassiek | Fluent 2 | px | Fluent-ramp |
|---|---|---|---|---|
| Labels, tabel- en matrixwaarden, aslabels | 10 pt (assen 9 pt) | 10,5 pt | 14 | base300 (14/20) |
| Visualtitel | 14 pt | 15 pt | 20 | base500 (20/28) |
| Subtitel | | 12 pt | 16 | base400 (16/22) |
| Card-categorielabel | 12 pt #605E5C | 12 pt #616161 | 16 | base400 |
| Card-callout | DIN 45 pt | Segoe UI Semibold 21 pt | 28 | hero700 (28/36) |

Fontstack: `'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif` (valt op een Mac terug op San Francisco). Segoe UI-webfonts zelf hosten: niet doen, de licentie voor derden is niet onderzocht. `font-variant-numeric: tabular-nums` op financiële kolommen [eigen keuze]; KpiStrip gebruikt voor grote losse getallen juist proportionele cijfers (dataviz: tabular-nums alleen in kolommen).

Toegankelijkheid: tekst minstens 4,5:1; alt text tot 250 tekens die het inzicht noemt; tab-volgorde = leesvolgorde; dezelfde lettergrootte voor titels, data labels en assen op alle visuals; squint-test ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)).

## 7. Radii, spacing, schaduw, layout

- Radii 2, 4, 6, 8, 12, 16 px; card 8, controls 4 ([Fluent borderRadius.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/borderRadius.ts)).
- Spacing 2, 4, 6, 8, 10, 12, 16, 20, 24, 32 px; lijndiktes 1 tot 4 ([Fluent spacings.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/spacings.ts)).
- Schaduw: kaart standaard geen; hover `shadow4` = `0 0 2px rgba(0,0,0,.12), 0 2px 4px rgba(0,0,0,.14)` ([Fluent shadows.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/utils/shadows.ts)).
- Layout: canvas 1920x1080, tooltip 320x240 (Microsoft); twaalf kolommen, 16px tussenruimte, assistentpaneel 360 tot 420 px [eigen keuze].
- Marks (dataviz): kolommen hooguit 24px, 4px rond aan het data-eind, 2px lucht, lijnen 2px, markers minstens 8px met 2px ring, hooguit 4 tot 6 categorische reeksen per grafiek.

## 8. Plakbare CSS (Fluent 2 licht en donker)

Voor een nieuw project zonder eigen designsysteem. Herkomst per waarde in de secties hierboven.

```css
:root {
  color-scheme: light;
  --wallpaper: #E6E6E6; --page: #FAFAFA; --card: #FFFFFF;
  --surface-hover: #F5F5F5; --surface-muted: #EBEBEB;
  --text-1: #242424; --text-2: #424242; --text-3: #616161; --text-4: #707070; --text-disabled: #BDBDBD;
  --stroke-1: #D1D1D1; --stroke-2: #E0E0E0; --stroke-3: #F0F0F0; --stroke-card: #E6E6E6; --stroke-accessible: #616161;
  --accent: var(--brand, #0F6CBD); --table-accent: #118DFF;
  --status-success-fg: #0E700E; --status-warning-fg: #BC4B09; --status-danger-fg: #B10E1C;
  --status-success-bg: #9FD89F; --status-warning-bg: #FDCFB4; --status-danger-bg: #EEACB2;
  --variance-good: #107C10; --variance-bad: #C50F1F; --variance-neutral: #707070;
  --scenario-ac: #424242; --scenario-py: #8A8A8A; --scenario-pl: #424242; --scenario-fc: #424242;
  --series-omzet: #118DFF; --series-kosten: #3B4FD8; --series-marge: #E66C37; --series-netto: #9B3FB0;
  --font-sans: 'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
  --fs-caption: 12px; --fs-body: 14px; --fs-subtitle: 16px; --fs-title: 20px; --fs-kpi: 28px;
  --radius-card: 8px; --radius-control: 4px;
  --card-padding: 14px 16px 16px 16px;
  --shadow-4: 0 0 2px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.14);
  --tooltip-width: 320px; --assistant-width: 400px; --grid-gap: 16px;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --wallpaper: #141414; --page: #1F1F1F; --card: #292929;
  --surface-hover: #3D3D3D; --surface-muted: #333333;
  --text-1: #FFFFFF; --text-2: #D6D6D6; --text-3: #ADADAD; --text-4: #999999; --text-disabled: #5C5C5C;
  --stroke-1: #666666; --stroke-2: #525252; --stroke-3: #3D3D3D; --stroke-card: #3D3D3D; --stroke-accessible: #ADADAD;
  --accent: var(--brand-dark, #479EF5);
  --status-success-fg: #9FD89F; --status-warning-fg: #FDCFB4; --status-danger-fg: #EEACB2;
  --status-success-bg: rgba(16, 124, 16, 0.35); --status-warning-bg: rgba(188, 75, 9, 0.35); --status-danger-bg: rgba(197, 15, 31, 0.35);
  --variance-good: #9FD89F; --variance-bad: #EEACB2; --variance-neutral: #999999;
  --scenario-ac: #D6D6D6; --scenario-py: #7A7A7A; --scenario-pl: #D6D6D6; --scenario-fc: #D6D6D6;
  /* reeksen gelijk aan licht; indigo en paars onder 3:1: labels of tabelweergave verplicht */
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* zelfde waarden als [data-theme="dark"] */ } }
```

ECharts leest geen CSS-variabelen: los ze op via het proefelement (`echarts-vue-implementatie.md`, sectie 4) en bouw de optie opnieuw bij een themawissel.

## 9. Wat de backoffice werkelijk gebruikt

De backoffice heeft een eigen designsysteem (Reforge-thema's, accent instelbaar) en neemt daaruit wat Power BI-achtig moet zijn:

- Canvas-tokens in `RapportPagina.vue`, alleen binnen een rapport: `--rp-canvas: color-mix(in srgb, var(--surface) 94%, #3a3a3a)` (donker 45% met zwart), `--rp-rand`, `--rp-hoek: 4px`, `--rp-schaduw: 0 1px 2px` op 5% zwart (donker geen). De visuals hebben dus **4px hoeken, niet de 8px van Fluent 2**: houd binnen één product één hoekmaat.
- Grafiektokens in `styles/theme.css`, vast per betekenis en niet per accent: `--chart-marge` #5b50e6 (donker #7a70f0), `--chart-kosten` #2aa7a3, `--chart-neutraal` (color-mix van tekst), `--chart-verval-1` tot `-4` (licht #ec8f93 → #861d23, donker #b3343a → #f0a3a6), `--chart-grid`. De Power BI-reeksen komen uit `kleursets.ts`, niet uit `theme.css`.
- Tekst `--text`, `--text-2`, `--text-3`; delta's `--ok-ink` en `--danger-ink`; merk `--brand`, `--brand-soft`, `--brand-text`; focus `--focus`.
- Maten: visualtitel 14px/600 (focusmodus 18px), subtitel `--fs-xs` in `--text-3`, KPI-waarde 28px/600, paginatitel 22px/650, kaartpadding 14px 16px 16px.

## 10. Delen met andere producten

| Altijd delen (product-agnostisch) | Per product |
|---|---|
| Neutralen en tekstkleuren, licht en donker | Merk-accent (`--brand`) |
| Status-tekst en -vulling, afwijkingskleuren | Toewijzing van reekskleuren aan rollen (finance: omzet/kosten/marge/netto; ATS: fasen of bronnen) |
| Scenariovullingen AC/PY/PL/FC | Oppervlaktetint als het product geen Fluent-neutralen gebruikt (Polpo) |
| Typografieschaal, tabular-nums | Fontfamilie als het merk er een voorschrijft (Polpo: Inter, zie `polpohire-design`) |
| Radii, spacing, schaduw, layoutconstanten | |

Wijkt een oppervlak af van #FFFFFF (licht) of de geteste donkere tinten, valideer de reekskleuren opnieuw. `kleursets.ts` is gevalideerd op #ffffff, #16141f en #161c2b, niet op de donkere Polpo-thema's.
