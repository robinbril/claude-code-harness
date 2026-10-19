# Bibliotheken en herkomst: waarmee we tekenen en waar elk idee vandaan komt

Wanneer lezen: als je een bibliotheek toevoegt of vervangt, als iemand vraagt "waarom ECharts" of "waar komt deze visual vandaan", of als je een visual naar Polpo of securo wilt meenemen. Onderzoek van 2026-10-09 (versies uit de npm-registry, repo's via de GitHub API, bundelgroottes zelf gemeten met esbuild + gzip -9, 1 kB = 1000 bytes); het volledige verslag met alle bronnen staat in `onderzoek/bibliotheken-2026-10-09.md`. UNVERIFIED = niet in een primaire bron bevestigd.

## 1. Hoe de keuze tot stand kwam (eerlijk)

- 2026-10-07: Robin vroeg "kies de beste visuals/chartbibliotheek voor alle financiële dashboarding", met [github.com/topics/powerbi-visuals](https://github.com/topics/powerbi-visuals) als start. Die pagina bleek vooral thema's, `.pbix`-sjablonen en PBIR-tools; de echte visuals (`microsoft/powerbi-visuals-*`) draaien alleen binnen Power BI (`powerbi-opties.md`, sectie 1). Op basis daarvan, een scan van de package.json's (Polpo's ATS gebruikt al ECharts in Vue, securo Recharts in React) en het licentieverschil met Highcharts koos de sessie Apache ECharts. Dat was dun onderzoek.
- 2026-10-09: de keuze is nagetrokken tegen 20 bibliotheken (sectie 4). Ze houdt stand, met twee aanscherpingen: ECharts geeft geen toetsenbordtoegang (onze knoppenlaag is dus nodig, niet optioneel) en kleine visuals (databalk, bullet in een tabel, sparkline, 100%-staaf) zijn beter plain HTML/SVG.

## 2. De stack in de backoffice

| Pakket | In package.json | Laatste (2026-10-09) | Licentie | Rol |
|---|---|---|---|---|
| `echarts` | ^6.1.0 | 6.1.0 (2026-05-19) | Apache-2.0 | tekent elke grafiek als custom series |
| `vue-echarts` | ^8.3.1 | 8.3.2 | MIT | `<VChart>` met `autoresize` en `init-options` |
| `@number-flow/vue` | ^0.5.2 | 0.5.2 | MIT | `Money.vue`: rollende cijfers, `nl-NL`, respecteert reduced motion |
| `@lucide/vue` | ^1.26.0 | 1.54.0 | ISC | iconen via `Icon.vue` (niet `lucide-vue-next`, dat is deprecated) |
| `motion-v` | ^2.5.2 | 2.6.0 | MIT | alleen UI-chrome (Modal, Drawer, ConfirmDialog, ThemeSwitcher), niet in grafieken |
| `@tanstack/vue-query` | ^5 | | MIT | databronnen, caching |
| `@tanstack/vue-virtual` | ^3.13 | 3.13.39 | MIT | lange lijsten |
| `zod` | | | MIT | validatie van de bewaarde Weergave (`useGrafiekWeergave.ts`) |
| `dataviz`-validator | skill | | | paletten licht en donker, uitvoer in de kop van `kleursets.ts` |

**ECharts-opzet** (`lib/echarts.ts`): alleen `SVGRenderer`, `CustomChart` en `GridComponent`; gemeten 168 kB gzip (alles importeren: 383 kB). Elke grafiek is een custom series met `renderItem`; tooltip en legenda zijn HTML. `<VChart>` staat op `aria-hidden="true"` en de knoppenlaag (`.ag-plot` met `.ag-band`-knoppen) is een sibling ervan (`BrugGrafiek.vue`). Houd dat zo: zet je ooit `AriaComponent` met `aria.enabled` aan, dan zet ECharts `role="img"` op de container, en volgens [WAI-ARIA](https://www.w3.org/TR/wai-aria-1.2/#img) worden alle kinderen daarvan presentational; zit de knoppenlaag erin, dan verdwijnt hij voor schermlezers. Arcering werkt zonder `AriaComponent`: de decal staat in de `renderItem`-stijl (`kleursets.ts`, `brugOptie.ts`, `maandKolommenOptie.ts`).

**Zonder engine**: `Sparklijn.vue` (SVG), `VerdelingBalk.vue` (ouderdom, HTML), `MatrixVisual.vue` (tabel met databalken), `BalkenLijst.vue`, `KpiStrip.vue`. Bullets zitten in `views/grafieken/RijBalken.vue` (ECharts).

## 3. Herkomst per visual

| Visual bij ons | Idee komt van | Component |
|---|---|---|
| KPI-strook met vergelijking en trendlijn | Power BI [card](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-card) (reference labels), [PowerKPI](https://github.com/microsoft/PowerBI-visuals-PowerKPI), [Tabular Editor](https://tabulareditor.com/blog/kpi-card-best-practices-dashboard-design) (max 5, de afwijking is het belangrijkste) | `KpiStrip`, `Sparklijn` |
| Maandkolommen: AC massief, lopende maand lichter, FC gearceerd | IBCS-scenarionotatie ([Zebra BI](https://zebrabi.com/ibcs/)), [SQLBI](https://www.sqlbi.com/articles/showing-actuals-and-forecasts-in-the-same-chart-with-power-bi/) (per periode AC of FC) | `MaandKolommen` + `maandKolommenOptie.ts` |
| Resultaatbrug | Power BI waterfall ([overzicht](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview)), IBCS [C06](https://www.ibcs.com/resource/chart-template-06/) | `BrugGrafiek` + `brugOptie.ts` |
| Brug van forecast naar netto (afwijkingen bij/af, commissie grijs) | Zebra BI geïntegreerde afwijking, IBCS kleur naar impact | `BrugGrafiek` met `afwijking`, `forecastBrug.ts` |
| Dumbbell forecast tegen actual | IBCS pins en lollipops ([Inforiver](https://inforiver.com/blog/general/variance-analysis-powerbi-inforiver-charts/)); ECharts-basis kan [`@echarts-x/custom-bar-range`](https://github.com/apache/echarts-custom-series/tree/main/custom-series/barRange) zijn | `AfwijkingGrafiek` + `afwijkingOptie.ts` |
| Divergente afwijkingsbalk | IBCS absolute afwijking als balk | `AfwijkingMeter` |
| Omzet per klant: top 8 + Overig met streepje vorige periode | Zebra BI [Top N + Others](https://help.zebrabi.com/using-top-n-others-in-zebra-bi), Pareto ([DAX Patterns ABC](https://www.daxpatterns.com/?p=2381)) | `KlantenGrafiek` + `klantenOptie.ts` |
| Ouderdom als één 100%-staaf | AR-dashboards ([Sigma](https://www.sigmacomputing.com/blog/accounts-receivable-dashboard)), sequentiële warme reeks uit `dataviz` | `VerdelingBalk` (HTML) |
| Marge per week met run-rate en aflopende trap | Power BI analytics pane (constante/gemiddelde lijn), [Forwardly](https://www.forwardly.com/blog/staffing-agency-kpis-every-finance-team-should-track) (staffing-KPI's) | `WeekMarge` + `weekMargeOptie.ts` |
| Bullet (opgebouwd tegen vrijgegeven, doel) | [Stephen Few, spec](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf), Microsoft [bulletchart](https://github.com/microsoft/powerbi-visuals-bulletchart), [SQLBI](https://www.sqlbi.com/articles/building-bullet-charts-in-power-bi-reports/) | `RijBalken` + `rijBalkenOptie.ts` |
| Matrix met databalken en ⊞/⊟ | Power BI matrix + conditional formatting data bars, IBCS [tabel 02](https://www.ibcs.com/resource/table-template-02/) | `MatrixVisual` (HTML) |
| Lateness-balk taken + compacte tabel | eigen ontwerp na Robins 2/100 voor de takenlijst | `FinanceTaken` |
| Slicertegels, filterrij | Power BI [button slicer](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-button-slicer), [ChicletSlicer](https://github.com/microsoft/PowerBI-visuals-ChicletSlicer), [SQLBI 3-30-300](https://www.sqlbi.com/articles/introducing-the-3-30-300-rule-for-better-reports/) | `SlicerTegels`, `FilterRij` |
| Visual-header (tabel, CSV, focus, meer opties) | Power BI visual header ([format pane](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-format-pane-overview)) | `DashboardKaart` |
| Opbouwpaneel achter een getal | Power BI [drillthrough](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough), maar als zijpaneel zonder paginawissel | `FinanceOpbouwPaneel` |
| Assistent naast de cijfers | Copilot-paneel in Power BI, eigen merk "/" | `AssistentPaneel` (`assistent-patroon.md`) |

## 4. Alternatieven (2026-10-09)

| Bibliotheek | Licentie en kosten | Vue | Finance-dekking | Toegankelijkheid | Bundel gzip |
|---|---|---|---|---|---|
| **ECharts** 6.1.0 | Apache-2.0, gratis | vue-echarts 8 (MIT) | waterfall, bullet, dumbbell, brug zelf (custom series); heatmap, calendar, sankey native | `role="img"` + één label, decal; **geen toetsenbord** ([handbook](https://echarts.apache.org/handbook/en/best-practices/aria/)) | 168-383 kB |
| Highcharts 13.1.1 | commercieel, Core 366 USD per seat per jaar ([shop](https://shop.highcharts.com/)) | `highcharts-vue` 2.0.2 | waterfall, bullet, dumbbell native | sterkst: accessibility-module met toetsenbord en schermlezer ([docs](https://www.highcharts.com/docs/accessibility/accessibility-module)) | 105-186 kB |
| AG Charts 14.2.0 | Community MIT; Enterprise 499 USD per dev ([pricing](https://www.ag-grid.com/charts/license-pricing/)) | `ag-charts-vue3` | Enterprise: waterfall, range-bar, heatmap, sankey; geen bullet | toetsenbord en schermlezer ([docs](https://www.ag-grid.com/charts/javascript/accessibility/)) | 406 kB (canvas) |
| Chart.js 4.5.1 | MIT | vue-chartjs | zelf, via floating bars en plugins | zelf toevoegen (canvas) | 70 kB |
| ApexCharts 7.9.1 | **niet meer MIT**: gratis alleen onder 2 mln USD omzet ([LICENSE](https://github.com/apexcharts/apexcharts.js/blob/main/LICENSE)) | vue3-apexcharts | waterfall, rangeBar, heatmap | README claimt toetsenbord | 175-302 kB |
| Plotly.js 4.1.2 | MIT | geen officiële wrapper | waterfall, sankey, bullet-indicator native | UNVERIFIED | 1.467 kB |
| Vega-Lite 6.5.0 (en Deneb in Power BI) | BSD-3 | geen wrapper, `vega-embed` | via transforms en lagen | `aria` standaard aan op SVG-marks | 289 kB |
| Observable Plot 0.6.17 | ISC | via ref | eenvoudig, geen sankey | aria per mark | 133 kB; laatste release feb 2025 |
| D3 7.9.0 | ISC | als fundament | alles zelf | alles zelf | 20-95 kB |
| Unovis 1.7.1 | Apache-2.0 | `@unovis/vue` officieel | stacked/grouped bar, sankey; finance zelf | UNVERIFIED | 65 kB (XY) |
| amCharts 5.21 | linkware (logo) of 280 USD per seat per jaar | geen officiële component | waterfall, bullet, dumbbell | uitgebreid, toetsenbord | 157 kB (canvas) |
| Syncfusion, DevExtreme, Kendo | commercieel (Syncfusion gratis onder 1 mln USD en 5 devs) | officiële Vue-componenten | bullet, waterfall, sankey in de pakketten | UNVERIFIED | niet gemeten |
| Recharts 3.10, visx 4, Nivo 0.99, Tremor 3.18 | MIT/Apache | **alleen React** | | Recharts: `accessibilityLayer` standaard aan | |
| LayerChart 2.6 | MIT | **alleen Svelte** | | | |

IBCS voor het web: er is geen Vue-bibliotheek. `ibcs-react` 1.4.0 (MIT, juni 2026, één maintainer) is React; graphomate en Zebra BI zijn extensies voor Power BI, SAC, Tableau en Excel. ISO 24896:2026 ("Notation for business reporting", volgens de [IBCS Association](https://www.ibcs.com/iso-24896-press-release/) gepubliceerd op 2026-06-11) is de norm achter IBCS 2.0; een eigen implementatie blijft de route.

**Beslisregel**

| Situatie | Kies |
|---|---|
| Vue, geen licentiebudget, maatwerk (IBCS-brug, trap, gearceerde forecast), één engine voor backoffice en Polpo | ECharts (huidig), met eigen knoppenlaag voor toetsenbord |
| Toegankelijkheid is een contractuele harde eis en zelf bouwen past niet | Highcharts |
| AG Grid Enterprise is al nodig (pivot, Excel-export) | AG Charts Enterprise in de bundel |
| Databalk in een cel, bullet in een kaart, sparkline, 100%-staaf | plain HTML/CSS of één inline SVG |
| Matrix of tabel met sorteren en variance-kolommen | echte `<table>`, eventueel `@tanstack/vue-table` |
| React-zusterapp (securo) | Recharts houden (`accessibilityLayer`); consolideren over frameworkgrenzen levert weinig op |
| Niet | ApexCharts (licentie omzetgebonden), visx/Nivo/Tremor/LayerChart (verkeerd framework) |

## 5. ECharts 6 en vue-echarts 8: wat we nog niet gebruiken

Nieuw in 6.0 (2025-07-30): standaardthema op design tokens (legenda standaard onderaan; oude look via `echarts/theme/v5`), `setTheme()` en `darkMode` zonder re-init, matrix-coördinatensysteem, custom-series-registry, chord, beeswarm/jitter, axis breaks, labels die standaard binnen het canvas blijven ([v6 features](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/), [upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/)). In 6.1 (2026-05-19): `min: 'dataMin'`, `containShape`, matrix `triggerEvent`, een XSS-fix in de `lines`-tooltip en een fix voor `markLine` met `dataset` ([release 6.1.0](https://github.com/apache/echarts/releases/tag/6.1.0)).

Op volgorde van nut voor ons:
1. **`echarts.registerCustomSeries(naam, renderItem)`**: registreer de brug, de IBCS-afwijkingsbrug, de dumbbell en de trap als benoemde series, zodat Polpo ze hergebruikt met `renderItem: 'ibcsBrug'` ([patroon](https://github.com/apache/echarts-custom-series/tree/main/custom-series/barRange)). De officiële `@echarts-x/custom-*`-pakketten (bar-range, line-range, violin, contour, stage, segmented-doughnut, liquid-fill, word-cloud) bevatten geen waterfall, bullet of brug.
2. **SSR** (`init(null, null, { renderer: 'svg', ssr: true })` + `renderToSVGString()`): dezelfde opties als SVG in een PDF- of e-mailrapport ([handbook SSR](https://echarts.apache.org/handbook/en/how-to/cross-platform/server/)). Let op: onze knoppenlaag en HTML-tooltip zitten niet in die SVG.
3. **`group` / `echarts.connect`**: gekoppelde hover tussen maand- en weekgrafiek; alleen zinvol als de HTML-tooltips dezelfde koppeling krijgen.
4. **`axis.breaks`**: als één uitschietermaand de rest platdrukt.
5. **`universalTransition`**: vloeiende overgang bij een typewissel in "Meer opties" (alleen met standaardseries; respecteer reduced motion).

Bewust niet: `AriaComponent` (zie sectie 2), ECharts-tooltip of vue-echarts `#tooltip`-slot (onze HTML-tooltip werkt ook op toetsenbordfocus), `toolbox` (de visual-header doet tabel en CSV), `setTheme` (thema's lopen via CSS-tokens in `useChartTokens.ts`, en vue-echarts waarschuwt dat een themawissel interactiestaat kan resetten).

## 6. Ondersteunende bibliotheken

- **NumberFlow** (`@number-flow/vue`, MIT, 6 kB): zet `role="img"` en een `aria-label` met het eindgetal, zodat een schermlezer het bedrag leest en niet de losse cijfers. Gevolg voor tests en render-checks: `textContent` van een bedrag is leeg (shadow DOM); vergelijk met het API-antwoord of het aria-label.
- **Iconen**: Lucide via `@lucide/vue` (ISC). Fluent UI System Icons (MIT) geven de meest letterlijke Office-look, maar Microsoft levert geen Vue-pakket (`@fluentui/svg-icons` of `@iconify-json/fluent`); in Reforge-apps blijft het Lucide plus het eigen assistentmerk "/".
- **motion-v** (MIT, 41 kB): paneel in/uit en hover; grafiekanimatie laat je aan ECharts (en zet hem uit bij reduced motion).
- **Tabellen**: `@tanstack/vue-table` 9 (MIT, 8 kB) heeft een nieuwe API (`useTable`, `FlexRender`, niet meer `useVueTable`). AG Grid Enterprise (1.498 USD per dev in de bundel) loont pas bij echte pivot of Excel-export als eis.

## 7. Andere apps

- **Polpo ATS** (Vue, ECharts): neem de custom series mee via de registry (sectie 5, punt 1), de tokens via `tokens-en-typografie.md`, en het patroon voor knoppenlaag en tooltip uit `echarts-vue-implementatie.md`.
- **securo / RB Finance** (React, Recharts): zelfde kleurtokens en vormkeuzes; geen bibliotheekwissel nodig.
