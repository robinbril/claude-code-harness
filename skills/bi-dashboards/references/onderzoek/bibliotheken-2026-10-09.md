# Chartbibliotheken voor finance-dashboards in Vue 3: ECharts 6 en alternatieven

Peildatum: 9 oktober 2026. Context: Vue 3 + Vite + TypeScript, ECharts 6.1 + vue-echarts 8.3, SVG-renderer, bijna alles als custom series (`renderItem`) met een HTML-knoppenlaag erboven voor focus, aria-labels en Vue-tooltips.

## Hoe dit is onderzocht

- Versies, licentievelden en publicatiedatums komen uit de npm-registry (`npm view PKG version license time`), opgevraagd op 2026-10-09. Link per pakket: `https://www.npmjs.com/package/NAAM`.
- Downloadcijfers komen uit de npm downloads-API (`https://api.npmjs.org/downloads/point/last-week/PKG`), week tot 2026-10-07.
- Repo-activiteit (laatste push, sterren, licentie) komt uit de GitHub API (`gh api repos/OWNER/REPO`), op 2026-10-09.
- **Bundelgroottes zijn eigen metingen**, geen bundlephobia: `esbuild 0.25 --bundle --minify --format=esm`, daarna `gzip -9`, `vue` extern gemarkeerd. Gemeten op 2026-10-09 tegen de vermelde versie. 1 kB = 1000 bytes. Echte Vite/Rollup-builds kunnen iets afwijken.
- Waar ik iets in de broncode of typings van een npm-tarball heb gecontroleerd, staat de unpkg-URL van dat bestand erbij.
- **UNVERIFIED** betekent: niet in een primaire bron bevestigd.

---

## Deel 1. ECharts 6 in de diepte

### 1.1 Versies en datums

| Pakket | Versie | Datum | Bron |
|---|---|---|---|
| echarts 6.0.0 | 6.0.0 | 2025-07-30 (changelog en npm) | [changelog](https://echarts.apache.org/en/changelog.html), [npm](https://www.npmjs.com/package/echarts) |
| echarts 6.1.0 | 6.1.0 | changelog zegt 2026-05-18; GitHub-release en npm-publicatie 2026-05-19 (UTC) | [changelog](https://echarts.apache.org/en/changelog.html), [GitHub release 6.1.0](https://github.com/apache/echarts/releases/tag/6.1.0) |
| echarts (laatste) | 6.1.0 | geen 6.1.x-patch of 6.2 op npm per 2026-10-09 | [npm](https://www.npmjs.com/package/echarts) |
| zrender | 6.1.0 | 2026-05-04 | [npm](https://www.npmjs.com/package/zrender) |
| vue-echarts 8.0.0 | 8.0.0 | 2025-09-27 | [npm](https://www.npmjs.com/package/vue-echarts) |
| vue-echarts (laatste) | 8.3.2 | 2026-10-09 (8.1.0 op 2026-08-07, 8.2.0 op 2026-08-30, 8.3.0 op 2026-09-06) | [npm](https://www.npmjs.com/package/vue-echarts), [repo](https://github.com/ecomfe/vue-echarts) |
| `@echarts-x/custom-*` | 1.0.1 tot 1.2.1 | allemaal 2026-01-12 | [npm-zoekresultaat](https://www.npmjs.com/search?q=%40echarts-x) |

Licentie: echarts is Apache-2.0 ([npm](https://www.npmjs.com/package/echarts)), vue-echarts is MIT ([npm](https://www.npmjs.com/package/vue-echarts)). Activiteit: apache/echarts laatste push 2026-10-04, 67.466 sterren; ecomfe/vue-echarts laatste push 2026-10-09 ([GitHub echarts](https://github.com/apache/echarts), [GitHub vue-echarts](https://github.com/ecomfe/vue-echarts)). npm-downloads echarts: ca. 5,65 mln per week.

### 1.2 Nieuw in ECharts 6.0 (juli 2025)

Bron, tenzij anders vermeld: [v6 feature-pagina](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/), [changelog 6.0.0](https://echarts.apache.org/en/changelog.html), [upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/).

- **Nieuw standaardthema** op basis van design tokens (kleuren, spacing). Breaking: de legenda staat standaard onderaan. Oude look terug via `import 'echarts/theme/v5'` en init met `'v5'`, of alleen het oude palet via `registerTheme`. Het oude `light`-thema heet nu `theme/rainbow.js` ([upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/)). Het pakket bevat ca. 35 themabestanden in `echarts/theme/` (eigen inspectie, [unpkg](https://unpkg.com/browse/echarts@6.1.0/theme/)).
- **Dynamisch thema wisselen en dark mode**: `chart.setTheme(nameOrObject, opts)` zonder dispose/re-init; het handbook toont `matchMedia('(prefers-color-scheme: dark)')` plus `setTheme('dark')`. De typings tonen `setTheme(theme: string | ThemeOption, opts?: SetThemeOpts)` en een root-optie `darkMode?: boolean | 'auto'` ([typings](https://unpkg.com/echarts@6.1.0/types/dist/shared.d.ts)). Let op: vue-echarts 8 meldt dat ECharts bij themawissel het model herbouwt en dat ongecontroleerde interactiestaat (legendaselectie, dataZoom) kan resetten ([vue-echarts README](https://github.com/ecomfe/vue-echarts#props)).
- **Matrix-coördinatensysteem** (`matrix`-component, `MatrixComponent`): tabelachtige layout met hiërarchische x/y-headers, waarin series en componenten in cellen geplaatst worden. Voorbeelden: covariantiematrix, periodiek systeem. Ook "calendar layout support for most series and components" ([changelog 6.0.0](https://echarts.apache.org/en/changelog.html)). 6.1 voegt `matrix.x/y.length` (headless matrix) en `triggerEvent` op cellen toe ([GitHub release 6.1.0](https://github.com/apache/echarts/releases/tag/6.1.0)).
- **Herbruikbare custom series (registry)**: custom series kunnen dynamisch geregistreerd worden en daarna als ingebouwde series gebruikt worden. API in de typings: `echarts.registerCustomSeries(seriesType: string, renderItem: CustomSeriesRenderItem)` ([typings](https://unpkg.com/echarts@6.1.0/types/dist/shared.d.ts)). In de optie verwijs je er met een string naar: `series: [{ type: 'custom', renderItem: 'barRange' }]`; een installer wordt geregistreerd met `echarts.use(installer)` ([barRange README](https://github.com/apache/echarts-custom-series/tree/main/custom-series/barRange)).
- **apache/echarts-custom-series**: officiële repo met kant-en-klare custom series, elk een eigen npm-pakket onder `@echarts-x/` ([repo](https://github.com/apache/echarts-custom-series)). Inhoud van `custom-series/` (gecontroleerd via de GitHub API):
  - `@echarts-x/custom-bar-range` (barRange, bereik als balk)
  - `@echarts-x/custom-line-range` (lineRange, bereikband)
  - `@echarts-x/custom-violin`
  - `@echarts-x/custom-contour`
  - `@echarts-x/custom-stage` (stage/slaapfase-chart)
  - `@echarts-x/custom-segmented-doughnut`
  - `@echarts-x/custom-liquid-fill`
  - `@echarts-x/custom-word-cloud`

  Het handbook noemt er zes (zonder liquidFill en wordCloud); de repo bevat er acht. De repo-README zegt nog "Apache ECharts v6, which is not released yet"; die tekst is verouderd. Er zit **geen waterfall, bullet, dumbbell of variance-bridge** in.
- **Chord-series** (`ChordChart`): relatienetwerk met gradient-randen.
- **Scatter jitter en beeswarm**: `xAxis.jitter`, `jitterOverlap`, `jitterMargin`.
- **Axis breaks**: "torn-paper"-onderbreking van een as, klik om uit te klappen. Optie-API (typings): `axis.breaks?: AxisBreakOption[]`, `breakArea { show, itemStyle, zigzagAmplitude, zigzagMinSpan, zigzagMaxSpan, zigzagZ, expandOnClick }`, `breakLabelLayout { moveOverlap }`; actions `expandAxisBreak`, `collapseAxisBreak`, `toggleAxisBreak`; event `axisbreakchanged` ([typings](https://unpkg.com/echarts@6.1.0/types/dist/shared.d.ts), [vue-echarts events](https://github.com/ecomfe/vue-echarts#events)).
- **Thumbnail** voor graph-series, als component (`ThumbnailComponent`) ([changelog 6.0.0](https://echarts.apache.org/en/changelog.html), [typings](https://unpkg.com/echarts@6.1.0/types/dist/components.d.ts)). Niet relevant voor finance.
- **Nieuwe cartesian layout / labeloverlap**: axislabels en asnamen blijven standaard binnen het canvas en overlappen niet. Uitzetten met `grid.outerBoundsMode: 'none'` en `xAxis/yAxis.nameMoveOverlap: false` ([upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/)).
- **Rich-text-overerving**: `label.rich` erft nu fontSize, fontWeight enz. van het platte label; terug naar v5 met `richInheritPlainLabel: false` ([upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/)).
- Kleiner maar nuttig: `z`/`z2` voor markPoint/markLine/markArea, omkeerbare stack-volgorde, tooltip `displayTransition`, visualMap `unboundedRange`, legend `triggerEvent`, roaming voor sankey, verbeterde stock-charts met `markPoint.data.relativeTo` ([changelog 6.0.0](https://echarts.apache.org/en/changelog.html), [v6 features](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/)).

### 1.3 Nieuw in ECharts 6.1 (mei 2026)

Bron: [GitHub release 6.1.0](https://github.com/apache/echarts/releases/tag/6.1.0).

- `dataMin`/`dataMax` voor een "nice" asbereik (`min: 'dataMin'`).
- Alle astypen kunnen bar-achtige series zonder overflow tekenen; nieuwe optie `containShape` (ook voor category-as met `boundaryGap: false`).
- Log-as sluit niet-positieve waarden automatisch uit.
- `axisLabel.formatter` krijgt de index mee (voor `customValues`).
- Line `triggerEvent`, pie `tangential-noflip`, gauge `progress.color: 'auto'`, radar `clockwise`, candlestick `cursor`, inside-dataZoom `cursorGrab`/`cursorGrabbing`.
- visualMap `seriesTargets` (meerdere series-dimensies mappen).
- Matrix `x/y.length` en `triggerEvent`.
- Security-fix: XSS in de tooltip van `lines`-series (#21608).
- Fix: `marker` (markLine/markArea) werkte niet met `dataset` + `encode` (#21439). Relevant als je markLine op dataset-gebaseerde charts gebruikt.
- Fix: tooltip `valueFormatter` krijgt nu `rawDataIndex` in plaats van de door dataZoom gefilterde index (#21479).

### 1.4 Toegankelijkheid in ECharts

- **`aria`-component** staat standaard uit en moet als `AriaComponent` geïmporteerd worden; zonder import werkt `aria.show/enabled` niet ([handbook aria](https://echarts.apache.org/handbook/en/best-practices/aria/)). Opties in de typings: `aria.enabled`, `aria.label` (o.a. `description`, `general.withTitle/withoutTitle`, `series.maxCount`, `data.maxCount`), `aria.decal { show, decals }` ([typings](https://unpkg.com/echarts@6.1.0/types/dist/shared.d.ts)).
- **Wat een screenreader krijgt** (eigen broncode-inspectie van [dist/echarts.js](https://unpkg.com/echarts@6.1.0/dist/echarts.js), functie `setLabel` in de aria-visual): ECharts zet op de **container-DOM** (`api.getZr().dom`) `role="img"` en één `aria-label`. Dat label is ofwel `aria.label.description` letterlijk, ofwel een gegenereerde tekst uit titel, series en datapunten, standaard maximaal 10 series en 10 datapunten per serie. Bij SSR wordt niets gezet ("TODO: support for SSR" in de bron).
- **Geen toetsenbordnavigatie**: het handbook noemt het niet en de broncode zet alleen role en label. Er zijn geen focusbare datapunten. De HTML-knoppenlaag is daarom terecht: in ECharts is dat de enige manier om per datapunt focus en aria-labels te krijgen.
- **Risico bij combineren**: `role="img"` heeft in WAI-ARIA "Children Presentational: True" ([WAI-ARIA 1.2, img](https://www.w3.org/TR/wai-aria-1.2/#img)). Als de knoppenlaag *binnen* het element zit waarop ECharts `role="img"` zet, kunnen hulptechnologieën de knoppen negeren. Zet de knoppenlaag als sibling naast de chart-container, of laat `aria.label` uit en geef zelf een `figure`/`figcaption` of tabelalternatief. Op welk DOM-element vue-echarts `echarts.init` aanroept heb ik niet gecontroleerd: **open vraag**, te checken in de DOM-inspector.
- **`aria.decal`** (sinds ECharts 5): patronen als tweede codering naast kleur. `decals` accepteert `DecalObject` met `symbol`, `symbolSize`, `symbolKeepAspect`, `color`, `backgroundColor`, `dashArrayX`, `dashArrayY`, `rotation`, `maxTileWidth/Height` ([typings](https://unpkg.com/echarts@6.1.0/types/dist/shared.d.ts), [handbook aria](https://echarts.apache.org/handbook/en/best-practices/aria/)). Een diagonale arcering voor forecast is met `dashArrayX`/`dashArrayY` plus `rotation` te maken. Per-item `itemStyle.decal` binnen een custom series is **UNVERIFIED**; in `renderItem` kun je ook zelf een `PatternObject`/`SVGPatternObject` als `fill` gebruiken (beide geëxporteerd in de typings).

### 1.5 Finance-relevante features

| Feature | Wat het doet | Relevant voor | Bron |
|---|---|---|---|
| `dataset` + `transform` | Data los van series; ingebouwde transforms `echarts:filter` en `echarts:sort` (in de broncode gevonden), eigen transforms via `registerTransform` | Gesorteerde horizontale bars, filteren zonder Vue-herberekening | [handbook data-transform](https://echarts.apache.org/handbook/en/concepts/data-transform/), [dist/echarts.js](https://unpkg.com/echarts@6.1.0/dist/echarts.js) |
| `universalTransition` | Morph-animatie tussen series/charts (`enabled`, `delay`, `divideShape`, `seriesKey`) | Drill van maand naar week, kolom naar bar | [option](https://echarts.apache.org/en/option.html#series-bar.universalTransition), [typings](https://unpkg.com/echarts@6.1.0/types/dist/shared.d.ts) |
| `markLine` / `markArea` / `markPoint` | Referentielijnen, gearceerde gebieden, annotaties; v6 voegt `z`/`z2` toe | Run-rate-lijn, forecastperiode markeren, target | [option markLine](https://echarts.apache.org/en/option.html#series-bar.markLine), [changelog 6.0.0](https://echarts.apache.org/en/changelog.html) |
| `axis.breaks` | Asonderbreking | Eén uitschietermaand die de rest platdrukt | zie 1.2 |
| `brush` / `dataZoom` | Selecteren en zoomen, events `brushselected`, `datazoom` | Periodekeuze in tijdreeksen | [option dataZoom](https://echarts.apache.org/en/option.html#dataZoom), [vue-echarts events](https://github.com/ecomfe/vue-echarts#events) |
| `toolbox` | `saveAsImage`, `dataView` (tabelweergave), `restore`, `magicType` | Export, tabelalternatief | [option toolbox](https://echarts.apache.org/en/option.html#toolbox) |
| `echarts.connect(group)` / `chart.group` | Gekoppelde tooltip/axisPointer/dataZoom over meerdere charts | Maand- en weekgrafieken die samen hoveren | [API connect](https://echarts.apache.org/en/api.html#echarts.connect), [typings](https://unpkg.com/echarts@6.1.0/types/dist/shared.d.ts) |
| SVG vs canvas | Canvas aanbevolen boven ca. 1k elementen en voor sommige effecten; SVG gebruikt minder geheugen, blijft scherp bij zoom, sinds 5.3 virtual-DOM-gebaseerd en 2 tot 10x sneller | De SVG-keuze past bij weinig datapunten en veel instanties | [handbook canvas-vs-svg](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/) |
| SSR | `init(null, null, { renderer: 'svg', ssr: true, width, height })` + `renderToSVGString()` (sinds 5.3); lichte client-runtime `echarts/ssr/client` (minder dan 4 KB, sinds 5.5) voor hover/click op de SVG | PDF/e-mailrapporten, server-side snapshots | [handbook SSR](https://echarts.apache.org/handbook/en/how-to/cross-platform/server/) |
| Tree-shaking | `echarts/core` + `use([...])` uit `echarts/charts`, `echarts/components`, `echarts/renderers` | Bundelgrootte | [vue-echarts README](https://github.com/ecomfe/vue-echarts#on-demand-importing) |

**Bundelgrootte ECharts 6.1.0 (eigen meting, gzip):**

| Import | gzip |
|---|---|
| `CustomChart` + `GridComponent` + `SVGRenderer` | 168 kB |
| plus `BarChart`, `LineChart`, `TooltipComponent`, `AriaComponent`, `MarkLineComponent`, `DatasetComponent` | 202 kB |
| `import * as echarts from 'echarts'` (alles) | 383 kB |
| Ter vergelijking: meegeleverde `dist/echarts.min.js` | 368 kB |

Conclusie: de kern van ECharts (zrender, model, layout) is zwaar; tree-shaken kom je niet onder ca. 165 kB gzip. Apache publiceert geen officiële groottecijfers; bundlephobia niet geraadpleegd.

### 1.6 vue-echarts 8

Bron: [vue-echarts README](https://github.com/ecomfe/vue-echarts) (versie 8.3.2, gelezen uit de npm-tarball).

- **Compatibiliteit**: peerDependencies `vue ^3.3.0`, `echarts ^6.0.0` ([npm](https://www.npmjs.com/package/vue-echarts)). Vue 2 is weg in v8 (gebruik 7.x). De README noemt expliciet dat Vue 3.5's `useTemplateRef` het type van de chart-ref afleidt. Vue 3.5 valt binnen de peer-range.
- **Props**: `option`, `theme` (injectie `THEME_KEY`), `init-options` (`INIT_OPTIONS_KEY`), `update-options` (`UPDATE_OPTIONS_KEY`), `group` (voor `echarts.connect`), `autoresize: boolean | { throttle?, onResize? }`, `loading`, `loading-type`, `loading-options` (`LOADING_OPTIONS_KEY`), `manual-update`.
- **Smart update**: zonder `update-options` analyseert vue-echarts de wijziging en kiest zelf tussen merge, `replaceMerge` en `notMerge: true`; een rebuild kan legenda- en zoomstatus resetten. Met `update-options` gaat de optie rechtstreeks naar `setOption`.
- **Events**: alle ECharts-events (o.a. `datazoom`, `brushselected`, `legendselectchanged`, `axisbreakchanged`, `rendered`, `finished`), muisevents, `zr:*`-events en native DOM-events via `@native:click`. Camel-case handlers als `onDataZoom` werken.
- **Slots (nieuw en relevant)**:
  - `#tooltip` en `#tooltip-PAD`: Vue-template als `tooltip.formatter`. Kan de aparte Vue-tooltiplaag (deels) vervangen voor muis-hover.
  - `#dataView`: Vue-template voor `toolbox.feature.dataView.optionToContent`, dus een echte HTML-tabel als alternatief.
  - `#graphic` (import `vue-echarts/graphic`): declaratieve `GGroup`, `GRect`, `GText`, `GLine`, `GPolygon` enz. met Vue-events, voor overlays.
- **SSR**: VChart rendert server-side alleen de container; `ssr` in `init-options` zet geen server-rendering aan binnen VChart.
- **CSP**: base-styles worden geïnjecteerd; bij strikte CSP zonder `CSSStyleSheet()`-support `vue-echarts/style.css` laden.

### 1.7 ECharts 6-features die het team (waarschijnlijk) nog niet gebruikt

Op basis van de beschrijving in de opdracht; de code zelf heb ik niet ingezien.

1. **`registerCustomSeries` / installer-pakketjes**: de eigen `renderItem`-functies (waterfall, IBCS-bridge, dumbbell, bullet, run-off-step) als benoemde series registreren, zodat opties `renderItem: 'ibcsBridge'` worden. Maakt opties serialiseerbaar en herbruikbaar in Polpo (ook Vue + ECharts). Patroon: [barRange README](https://github.com/apache/echarts-custom-series/tree/main/custom-series/barRange).
2. **`@echarts-x/custom-bar-range` / `custom-line-range`** als startpunt voor dumbbell (bereik tussen forecast en actual) of een bandbreedte rond forecast.
3. **`aria.decal`** voor arcering (forecast) in plaats van handgemaakte patterns, plus automatisch patroon per serie voor kleurenblinden.
4. **`setTheme` + `darkMode: 'auto'`** voor dark mode zonder re-init (let op de rebuild-waarschuwing van vue-echarts).
5. **`axis.breaks`** voor uitschieters.
6. **6.1 `min: 'dataMin'` en `containShape`** voor nette asbereiken bij bars.
7. **vue-echarts `#tooltip`- en `#dataView`-slots** (HTML-tabelalternatief, goed voor toegankelijkheid en export).
8. **`group` / `echarts.connect`** voor gekoppelde hover tussen maandkolommen en weekkolommen.
9. **`dataset` + `echarts:sort`** voor gesorteerde bars, en **`markLine`/`markArea`** voor run-rate en forecastperiode in plaats van custom-getekende lijnen.
10. **`universalTransition`** voor drill-down-animatie.
11. **SSR `renderToSVGString`** voor PDF of e-maildigests met dezelfde opties.
12. **Matrix-coördinatensysteem**: bruikbaar voor een kleine heatmap-matrix, maar voor een tabel met data bars is HTML beter (zie 2.3).

---

## Deel 2. Alternatieven

### 2.1 Vergelijkingstabel

Afkortingen: WF = waterfall, BU = bullet, DB = dumbbell/range, BR = bridge met varianties, HM = heatmap/calendar, SK = sankey. "Native" = ingebouwd serietype; "zelf" = met primitieven of plugins te bouwen. Bundel = eigen meting gzip tenzij anders vermeld.

| Bibliotheek | Versie (npm) | Licentie en kosten | Vue 3-fit | Finance-dekking | Toegankelijkheid | Render | Bundel (gzip) | Activiteit 2025-2026 |
|---|---|---|---|---|---|---|---|---|
| **ECharts** | 6.1.0 | Apache-2.0, gratis ([npm](https://www.npmjs.com/package/echarts)) | Goed: vue-echarts 8 (MIT), slots, provide/inject | WF zelf (stacked bar of custom); BU/DB/BR zelf (custom); HM native + calendar; SK native | `role="img"` + gegenereerd aria-label, decal; geen keyboard ([handbook](https://echarts.apache.org/handbook/en/best-practices/aria/)) | Canvas of SVG, SSR | 168 tot 383 kB | Zeer actief; 6.1.0 mei 2026; 5,65 mln/week |
| **Highcharts** (+ Stock, Dashboards) | 13.1.1; Dashboards 4.2.3 | Commercieel; Core 366 USD/seat/jaar, Stock +366, Dashboards 264/seat ([shop](https://shop.highcharts.com/)); niet-commercieel via EULA ([license.txt](https://unpkg.com/highcharts@13.1.1/license.txt)) | Officieel `highcharts-vue` 2.0.2 (peer vue >=3) ([npm](https://www.npmjs.com/package/highcharts-vue)) | WF native (highcharts-more); BU, DB, lollipop, variwide, xrange, SK, HM als modules ([modules](https://unpkg.com/browse/highcharts@13.1.1/modules/)); BR zelf | Sterkste: accessibility-module in elke licentie, keyboard, screenreader, sonification, WCAG 2.2 als richtlijn ([docs](https://www.highcharts.com/docs/accessibility/accessibility-module)) | SVG (canvas via boost) | Core 105 kB; met more, accessibility, bullet, dumbbell, pattern-fill 186 kB | Zeer actief (push 2026-10-09) |
| **AG Charts** Community / Enterprise | 14.2.0 | Community MIT; Enterprise commercieel, 499 USD/dev perpetueel met 1 jaar updates; bundel met AG Grid Enterprise 1.498 USD/dev ([pricing](https://www.ag-grid.com/charts/license-pricing/), [community vs enterprise](https://www.ag-grid.com/charts/javascript/community-vs-enterprise/)) | Officieel `ag-charts-vue3` (peer vue ^3.5.0) ([npm](https://www.npmjs.com/package/ag-charts-vue3)) | Community: bar, line, area, scatter, bubble, pie, donut, histogram. Enterprise: Waterfall, RangeBar (DB), RangeArea, Heatmap, Sankey, Chord, BoxPlot, Treemap, Sunburst, Funnel, Candlestick (modulelijst uit [typings](https://unpkg.com/browse/ag-charts-enterprise@14.2.0/dist/types/)). **Geen bullet-series** in 14.2.0 gevonden | Keyboard (Tab tussen componenten, pijltjes tussen punten), screenreader-aankondigingen, getest met NVDA, JAWS, Narrator, VoiceOver ([docs](https://www.ag-grid.com/charts/javascript/accessibility/)) | Canvas | Community `AgCharts` 406 kB | Zeer actief (14.2.0 sep 2026) |
| **Chart.js** + vue-chartjs | 4.5.1; vue-chartjs 5.3.4 | MIT, gratis ([npm](https://www.npmjs.com/package/chart.js)) | vue-chartjs (peer vue ^3 of 2.7) ([npm](https://www.npmjs.com/package/vue-chartjs)) | WF/DB via floating bars (zelf); BU/BR zelf; HM/SK via community-plugins; annotaties via chartjs-plugin-annotation 3.1.0 ([npm](https://www.npmjs.com/package/chartjs-plugin-annotation)) | Canvas: ontwikkelaar voegt zelf `role`/`aria-label` of fallback-content toe ([docs](https://www.chartjs.org/docs/latest/general/accessibility.html)) | Canvas | `chart.js/auto` 70 kB | Kern rustig: laatste release 4.5.1 (2025-10-13); repo-push 2026-10-04 |
| **ApexCharts** + vue3-apexcharts | 7.9.1; wrapper 1.11.1 | **Niet meer MIT**: gratis Community License alleen onder 2 mln USD omzet/budget; daarboven betaald (Pro/Premium/OEM) ([LICENSE](https://github.com/apexcharts/apexcharts.js/blob/main/LICENSE), [pricing](https://apexcharts.com/pricing)) | vue3-apexcharts (peer vue >=3) ([npm](https://www.npmjs.com/package/vue3-apexcharts)) | WF, rangeBar (DB), heatmap als entry points in het pakket; SK is apart product (apexsankey); BU **UNVERIFIED** | README claimt "keyboard navigation and ARIA support built in" ([repo](https://github.com/apexcharts/apexcharts.js)) | SVG | Volledig 302 kB; `apexcharts/core` + `bar` 175 kB | Zeer actief; 5.0 jul 2025, 6.0 jul 2026, 7.0 aug 2026 |
| **Plotly.js** | 4.1.2 | MIT ([npm](https://www.npmjs.com/package/plotly.js)) | Geen officiële Vue-wrapper (onderhouden community-wrapper **UNVERIFIED**) | Native traces `waterfall`, `funnel`, `sankey`, `heatmap`, `indicator` met `gauge.shape: 'bullet'` (in de dist gecontroleerd) | **UNVERIFIED** | SVG + WebGL | `plotly.js-dist-min` 1.467 kB | Actief; 4.0.0 aug 2026 |
| **Vega-Lite / Vega** (+ Deneb) | vega-lite 6.5.0, vega 6.4.0, vega-embed 7.3.0 | BSD-3-Clause ([npm](https://www.npmjs.com/package/vega-lite)) | Geen officiële Vue-wrapper; `vega-embed` in `onMounted` | HM native, WF/BU/DB via transforms en layering; SK niet native in Vega-Lite (**UNVERIFIED**) | `config.aria` standaard `true`: ARIA-attributen en gegenereerde beschrijvingen op marks (alleen SVG) ([typings](https://unpkg.com/vega-lite@6.5.0/build/config.d.ts)) | SVG of canvas | vega-embed incl. vega + vega-lite 289 kB | Actief. Deneb (Power BI custom visual op Vega/Vega-Lite) 2.0.0.0 op 2026-09-08 ([repo](https://github.com/deneb-viz/deneb)) |
| **Observable Plot** | 0.6.17 | ISC ([npm](https://www.npmjs.com/package/@observablehq/plot)) | Framework-loos: `Plot.plot()` geeft een SVG-element, in Vue via ref | Bars, ticks, rules, cell (HM), link/dot (DB) eenvoudig; WF/BU zelf; geen SK | `ariaLabel`, `ariaDescription`, `ariaHidden` per mark en plot ([typings](https://unpkg.com/@observablehq/plot@0.6.17/src/mark.d.ts)) | SVG | 133 kB | Traag: laatste release 0.6.17 op 2025-02-14; repo-push 2026-09-01 |
| **D3** | 7.9.0 | ISC ([npm](https://www.npmjs.com/package/d3)) | Als fundament: Vue rendert SVG, D3 levert scales/shapes | Alles zelf | Volledig zelf | SVG/canvas | Alles 95 kB; scale + shape 20 kB | Stabiel/rustig: 7.9.0 uit maart 2024 |
| **visx** | 4.0.0 | MIT ([repo](https://github.com/airbnb/visx)) | **React-only** (peer react 18/19) | Bouwstenen, alles zelf | Zelf | SVG | niet gemeten | Actief (4.0.0 jun 2026) |
| **Nivo** | 0.99.0 | MIT ([repo](https://github.com/plouc/nivo)) | **React-only** | Bar, heatmap, calendar, sankey, bullet (**UNVERIFIED** per type in 0.99) | Deels (**UNVERIFIED**) | SVG/canvas/HTML | niet gemeten | Laatste npm-publicatie mei 2025; repo-push jul 2026 |
| **Recharts** | 3.10.1 | MIT ([npm](https://www.npmjs.com/package/recharts)) | **React-only** (gebruikt door securo) | WF/BU/DB zelf (bar met range-data); Sankey en Treemap native | `accessibilityLayer` standaard aan in 3.x: ARIA, één tabstop, pijltjestoetsen ([wiki](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility)) | SVG | niet gemeten | Zeer actief; 57 mln/week |
| **Tremor** | @tremor/react 3.18.7 | Apache-2.0; Tremor Blocks na Vercel-overname (22 jan 2025) MIT ([Vercel](https://vercel.com/blog/vercel-acquires-tremor)) | **React-only**, gebouwd op Recharts ^2 ([npm](https://www.npmjs.com/package/@tremor/react)) | Wat Recharts kan | Via Recharts 2.x | SVG | niet gemeten | npm-pakket stil sinds jan 2025 |
| **Unovis** | 1.7.1 | Apache-2.0, F5 ([repo](https://github.com/f5/unovis)) | **Officieel `@unovis/vue`** (peer vue ^3) ([npm](https://www.npmjs.com/package/@unovis/vue)) | StackedBar, GroupedBar, Line, Area, Donut, Sankey, Timeline; WF/BU/DB zelf (exact aanbod **UNVERIFIED**) | **UNVERIFIED** | Voornamelijk SVG; SSR-pakket `@unovis/ssr` | XY-subset 65 kB | Actief (1.7.1 okt 2026) |
| **LayerChart** | 2.6.0 | MIT ([repo](https://github.com/techniq/layerchart)) | **Svelte-only** (peer svelte ^5) | Breed (composable) | **UNVERIFIED** | SVG/canvas/HTML | niet gemeten | Actief |
| **amCharts 5** | 5.21.0 | Linkware gratis (logo verplicht) ([LICENSE](https://github.com/amcharts/amcharts5/blob/master/LICENSE)); zonder logo: Single App/SaaS 280 USD/seat/jaar of 650 perpetueel ([store](https://www.amcharts.com/online-store/)) | Geen officiële Vue-component; imperatief in `onMounted` | WF, BU, DB met XY-series; SK (flow), HM (per type **UNVERIFIED**) | Uitgebreid: focusable elementen, tabindex, focusableGroup met pijltjes, `ariaLabel` met placeholders, forced-colors (5.21.0+) ([docs](https://www.amcharts.com/docs/v5/concepts/accessibility/)) | Canvas | core + xy 157 kB | Zeer actief |
| **Syncfusion** (ej2-vue-charts) | 35.1.39 | Commercieel; gratis Community License alleen bij minder dan 1 mln USD omzet, max. 5 devs, max. 10 medewerkers ([community license](https://www.syncfusion.com/products/communitylicense)) | Officiële Vue-componenten ([npm](https://www.npmjs.com/package/@syncfusion/ej2-vue-charts)) | Waterfall-series, range-column, Bullet Chart, Sankey, Sparkline (pakketinspectie) | **UNVERIFIED** | SVG | niet gemeten | Zeer actief |
| **DevExtreme** (devextreme-vue) | 26.1.5 | Commercieel; DevExtreme Complete ca. 900 USD/dev ([buy](https://js.devexpress.com/Buy/)) | Officiële Vue-componenten (wrapper MIT, kern commercieel) ([npm](https://www.npmjs.com/package/devextreme-vue)) | `Chart`, `Bullet`, `Sparkline`, `Sankey`, `RangeSelector` in het pakket (pakketinspectie); WF **UNVERIFIED** | **UNVERIFIED** | SVG | niet gemeten | Zeer actief |
| **Kendo UI for Vue** charts | 10.1.0 (kern `@progress/kendo-charts` 2.13.2) | Commercieel (Telerik EULA); Kendo UI 799 tot 1.299 USD/dev/jaar ([purchase](https://www.telerik.com/purchase/kendo-ui)) | Officiële Vue-componenten ([npm](https://www.npmjs.com/package/@progress/kendo-vue-charts)) | Bullet, waterfall, heatmap, sankey in kendo-charts (pakketinspectie) | **UNVERIFIED** | SVG/canvas | niet gemeten | Actief |
| **IBCS: ibcs-react** | 1.4.0 (eerste publicatie 2026-06-19) | MIT ([npm](https://www.npmjs.com/package/ibcs-react)) | **React-only** | Statement tables, variance- en waterfall-charts, KPI-cards, conformance-linter (volgens npm-beschrijving) | **UNVERIFIED** | SVG | niet gemeten | Nieuw, één maintainer, 169 downloads/maand |

Weekdownloads (npm API, week tot 2026-10-07): recharts 57,4 mln, d3 21,8 mln, chart.js 12,7 mln, echarts 5,65 mln, highcharts 2,59 mln, apexcharts 2,05 mln, ag-charts-community 1,84 mln, @nivo/core 1,65 mln, vega-lite 1,19 mln, @observablehq/plot 0,72 mln, plotly.js 0,72 mln, @amcharts/amcharts5 0,35 mln, layerchart 0,29 mln, @unovis/ts 0,26 mln, @visx/visx 0,09 mln.

Highcharts Dashboards: framework met componenten (KPI, Highcharts, Grid, HTML, custom) die één DataPool met connectors delen, zodat gekoppelde componenten samen bijwerken; er is een Vue-sectie in de docs die ik niet heb gelezen ([KPI component](https://www.highcharts.com/docs/dashboards/kpi-component), [data pool](https://www.highcharts.com/docs/dashboards/data-pool-and-connectors), [product](https://www.highcharts.com/products/dashboards/)). Peer: `highcharts >=10 <14`, plus `@highcharts/grid-lite`/`grid-pro` ([npm](https://www.npmjs.com/package/@highcharts/dashboards)).

### 2.2 IBCS-specifiek

- **ISO 24896:2026 "Notation for business reporting"** is op 11 juni 2026 gepubliceerd; IBCS Standards 2.0 is daarop afgestemd ([IBCS persbericht](https://www.ibcs.com/iso-24896-press-release/), [IBCS standards](https://ibcs.com/standards/)). Bron is de IBCS Association zelf; de ISO-catalogus heb ik niet geopend.
- **graphomate** en **Zebra BI** zijn IBCS-gecertificeerd, maar het zijn extensies voor Power BI, SAP Analytics Cloud, Tableau en Excel, **geen web-JS-bibliotheken** ([IBCS graphomate](https://www.ibcs.com/software/graphomate/), [Zebra BI help](https://help.zebrabi.com/overview)).
- **npm**: `ibcs-react` (React, MIT, nieuw), `standard-charts` 0.3.1 (MIT, laatste publicatie maart 2024), `@bino-bi/bn-template-engine` 1.0.0-alpha.0 (web components, MIT, maart 2026), `ibcs` 0.0.1 (2017, leeg). Geen Vue-native IBCS-bibliotheek gevonden ([npm search "ibcs"](https://www.npmjs.com/search?q=ibcs)).
- Conclusie: voor een IBCS-variance-bridge in Vue blijft een eigen implementatie (ECharts custom series of plain SVG) de realistische route. Web components (`bn-template-engine`) zijn framework-neutraal maar alpha.

### 2.3 Aanbevelingsmatrix

| Situatie | Beste keuze | Waarom |
|---|---|---|
| Vue-app, geen licentiebudget, veel maatwerkvisuals (IBCS-bridge, run-off, gearceerde forecast), één engine voor Backoffice en Polpo | **ECharts** (huidige keuze) | Apache-2.0; `renderItem` + v6-registry maakt maatwerk herbruikbaar; SVG + SSR; sterke Vue-wrapper met tooltip-slots; dataset/transform; connect. Nadeel: keyboard en per-punt-a11y moet je zelf bouwen (gebeurt al) |
| Toegankelijkheid is harde eis (WCAG-audit, overheidsklant) en je wilt dat niet zelf bouwen | **Highcharts** | Accessibility-module in elke licentie (keyboard, screenreader, sonification); native waterfall, bullet, dumbbell; officiële Vue-wrapper. Kost ca. 366 USD per developer per jaar (Core) |
| AG Grid Enterprise is al in gebruik of nodig (pivot, grouping, Excel-export) | **AG Charts Enterprise** (via Enterprise Bundle) | Waterfall, range-bar, heatmap, sankey; keyboard-navigatie; integrated charts in de grid. Nadeel: canvas, grote bundel (406 kB gzip al voor Community), geen bullet-series |
| React-zusterapp (securo) | **Recharts** houden | Al in gebruik, `accessibilityLayer` standaard aan; consolidatie met ECharts over frameworkgrenzen levert weinig op |
| Data bars in tabelcellen, bullet bars in KPI-cards, sparklines, 100%-aging-bar | **Plain HTML/CSS of inline SVG** in Vue | Geen chart-engine nodig (een `div` met `width: x%` of één `svg`-element), echte tekst en tabelcellen voor screenreaders, nul runtime, correct bij print en zoom, geen 165 kB+ kern. Waarde en target in tekst of `aria-label` |
| Matrix/tabel met data bars en variance-kolommen | **HTML-tabel** (eventueel met @tanstack/vue-table) | Sorteren, sticky headers, kopiëren en screenreaders werken alleen goed met een echte `table`; de ECharts-matrix is voor gepositioneerde charts, niet voor datatabellen |
| Snel prototypen, analisten schrijven specs, of Deneb-specs uit Power BI hergebruiken | **Vega-Lite** | Declaratieve JSON, `aria` standaard aan, specs overdraagbaar naar Deneb |
| Verkennende/statistische grafieken in interne tools | **Observable Plot** | Compact, SVG, goede aria-opties; onderhoud rustig |
| Niet doen: ApexCharts | | Licentie nu omzetgebonden (gratis alleen onder 2 mln USD); ECharts dekt hetzelfde gratis |
| Niet doen: visx, Nivo, Tremor, LayerChart | | Framework past niet (React of Svelte) |

---

## Deel 3. Ondersteunende bibliotheken voor "Power BI-gevoel"

**NumberFlow (`@number-flow/vue`).** Versie 0.5.2 (2026-07-18), MIT, onderdeel van [barvian/number-flow](https://github.com/barvian/number-flow) (laatste push 2026-09-20, 7.736 sterren); peer `vue ^3` ([npm](https://www.npmjs.com/package/@number-flow/vue)). Animeert cijferovergangen bij wijziging van `value`, met `format` (`Intl.NumberFormatOptions`: valuta, compact, procent), `locales` (bijv. `nl-NL`), `prefix`/`suffix`, `trend`, `animated` en `respectMotionPreference` (standaard `true`, respecteert `prefers-reduced-motion`); `NumberFlowGroup` synchroniseert meerdere getallen ([docs](https://number-flow.barvian.me/vue)). Toegankelijkheid: in de broncode zet het element `role="img"` en `aria-label` op de geformatteerde string, zodat screenreaders het eindgetal lezen en niet de losse cijfers (eigen inspectie van [number-flow dist](https://unpkg.com/browse/number-flow@0.6.2/dist/)). Bundel: 6 kB gzip (eigen meting, vue extern). Geschikt voor KPI-cards.

**Iconen: Lucide vs Fluent UI System Icons.** Lucide is ISC-gelicenseerd, met een deel van de iconen afgeleid van Feather (MIT) ([LICENSE](https://github.com/lucide-icons/lucide/blob/main/LICENSE)); de repo is zeer actief (push 2026-10-09, 24.912 sterren). Let op: **`lucide-vue-next` is deprecated** ("Please use @lucide/vue instead"); het nieuwe pakket `@lucide/vue` staat op 1.54.0 (2026-10-09) ([npm @lucide/vue](https://www.npmjs.com/package/@lucide/vue), [npm lucide-vue-next](https://www.npmjs.com/package/lucide-vue-next)). Fluent UI System Icons van Microsoft zijn MIT ([repo](https://github.com/microsoft/fluentui-system-icons)), dus licentietechnisch even vrij, en geven de meest letterlijke Office/Power BI-look. Microsoft levert geen officieel Vue-pakket: opties zijn `@fluentui/svg-icons` 1.1.343 (MIT, losse SVG's) of `@iconify-json/fluent` 1.2.59 (MIT) via een Iconify/unplugin-icons-setup ([npm svg-icons](https://www.npmjs.com/package/@fluentui/svg-icons), [npm iconify fluent](https://www.npmjs.com/package/@iconify-json/fluent)); de community-wrapper `@vicons/fluent` 0.13.0 is sinds december 2024 niet bijgewerkt ([npm](https://www.npmjs.com/package/@vicons/fluent)).

**Motion for Vue (`motion-v`).** Versie 2.6.0 (2026-10-05), MIT, repo [motiondivision/motion-vue](https://github.com/motiondivision/motion-vue) (push 2026-10-08); 1.0.0 verscheen 2025-04-26, 2.0.0 op 2026-02-24 ([npm](https://www.npmjs.com/package/motion-v)). Peer-dependencies `vue >=3.0.0` en `@vueuse/core >=10`. Biedt `motion.div` met `:animate`, layout-animaties en een hybride engine (JS + native browser-API's) volgens de README. Reduced-motion-ondersteuning komt in de bundel voor, details **UNVERIFIED**. Bundel voor alleen `motion`: 41 kB gzip (eigen meting). Spaarzaam inzetten: paneel in/uit en kaart-hover; chart-animaties laat je aan ECharts.

**Tabel en virtualisatie: TanStack vs AG Grid.** `@tanstack/vue-table` staat op **9.2.8** (2026-10-08), MIT; v9 (9.0.0 op 2026-08-04) wijzigt de API: export is nu `useTable`, `FlexRender` en `createTableHook`, niet meer `useVueTable`/`getCoreRowModel` (eigen inspectie van de exports; [npm](https://www.npmjs.com/package/@tanstack/vue-table), [repo](https://github.com/TanStack/table)). Headless, dus het team bepaalt de markup (echte `table`, data bars als CSS). Bundel `useTable` + `FlexRender`: 8 kB gzip (eigen meting). `@tanstack/vue-virtual` 3.13.39, MIT, 7 kB gzip (eigen meting), voor lange lijsten ([npm](https://www.npmjs.com/package/@tanstack/vue-virtual)). AG Grid 36.2.0: Community is MIT en gratis in productie; Enterprise (o.a. row grouping, pivot en aggregatie, server-side row model, integrated charts, Excel-export, master/detail, range selection) is commercieel en wordt op de prijspagina alleen als Enterprise Bundle met AG Charts Enterprise getoond, 1.498 USD per developer, perpetueel met 1 jaar updates ([community vs enterprise](https://www.ag-grid.com/vue-data-grid/community-vs-enterprise/), [pricing](https://www.ag-grid.com/charts/license-pricing/)). `ag-grid-vue3` vraagt `vue ^3.5.32` ([npm](https://www.npmjs.com/package/ag-grid-vue3)). Voor finance-matrices met data bars en sortering volstaat TanStack; AG Grid Enterprise loont pas bij echte pivot-tabellen of Excel-export als eis.

---

## Niet geverifieerd / open punten

- Of `role="img"` (bij `aria.enabled`) op hetzelfde element komt dat de knoppenlaag omvat: in de DOM controleren.
- Per-item `itemStyle.decal` binnen custom series.
- Bullet in ApexCharts, waterfall in DevExtreme, toegankelijkheidsclaims van Syncfusion, DevExtreme, Kendo, Unovis, LayerChart, Plotly.
- Exacte serietypen van Nivo 0.99 en amCharts 5.
- Highcharts-prijzen zijn shopprijzen per seat per jaar op 2026-10-09; internal- vs SaaS-licentie in de licentietekst nalezen.
- Of AG Grid Enterprise los te koop is (prijspagina toont alleen de bundel).
- Bundelgroottes van visx, Nivo, Recharts, Tremor, LayerChart, Syncfusion, DevExtreme, Kendo niet gemeten.
