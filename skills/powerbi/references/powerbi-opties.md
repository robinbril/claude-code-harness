# Power BI-visuals: herkomst en opties, naast wat wij hebben

Wanneer lezen: als je wilt weten waar een visual-idee vandaan komt, waarom we Power BI-visuals niet hergebruiken, of welke optie van Power BI we (nog) niet spiegelen. Onderzoek van 2026-10-09; bij Microsoft Learn staat de `ms.date` tussen haakjes. "Wij" = de Reforge-backoffice, stand PR #445 (details in `aanpassingen-per-visual.md`).

## 1. Waarom geen Power BI-visuals in onze app

- Een custom visual is een `.pbiviz`: TypeScript met losse D3-modules, gebouwd met `pbiviz` uit [powerbi-visuals-tools](https://github.com/microsoft/PowerBI-visuals-tools) (MIT; versie 7.2.2 van 2026-09-23 volgens het onderzoek, niet nagetrokken) tegen [powerbi-visuals-api](https://github.com/microsoft/powerbi-visuals-api) (5.11.1 van 2026-07-20, idem).
- Hij doet zelf geen queries: de host roept `update(options)` aan met een voorgeaggregeerde `dataView`; selectie, cross-filter, tooltips, drill, opmaak (`capabilities.json` + `getFormattingModel`), state en licentie lopen via `IVisualHost` ([Visual system integration](https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-visuals-concept), 2025-12-15).
- Hij draait in een iframe met `sandbox="allow-scripts"` zonder origin: geen cookies, localStorage of eigen data ophalen ([Power BI blog](https://asia.powerbi.microsoft.com/en-au/blog/custom-visuals-sandbox); actuele attributen UNVERIFIED).
- Gevolg: buiten Power BI draait hij niet. Hergebruik kan alleen op codeniveau (de Microsoft-repo's zijn MIT); het idee nabouwen in ECharts is goedkoper dan het host-contract nabouwen.
- [github.com/topics/powerbi-visuals](https://github.com/topics/powerbi-visuals) (1.045 repo's) is vooral thema's ([PowerBI-ThemeTemplates](https://github.com/MattRudy/PowerBI-ThemeTemplates)), PBIR-tooling ([pbir.tools](https://github.com/maxanatsko/pbir.tools), [PBI-Inspector](https://github.com/NatVanG/PBI-Inspector)) en portfolio-`.pbix`'en. Een cluster repo's die allemaal op 2026-10-09 gepusht zijn met ~115 sterren en "Dashboard 2026"-titels, plus "100+ templates for Windows", ziet eruit als star-farming of malwarelokaas: niet downloaden.

## 2. Waar de finance-look vandaan komt

**Microsoft open source** (89 repo's `powerbi-visuals-*`, LICENSE: MIT). Relevant voor finance:

| Repo | Idee | Bij ons |
|---|---|---|
| [bulletchart](https://github.com/microsoft/powerbi-visuals-bulletchart) | actual tegen doel met grijze banden | bullet op Commissie en Mijn beloning |
| [Tornado](https://github.com/microsoft/PowerBI-visuals-Tornado) | twee measures gespiegeld (dit jaar / vorig jaar) | nog niet |
| [PowerKPI](https://github.com/microsoft/PowerBI-visuals-PowerKPI), [PowerKPIMatrix](https://github.com/microsoft/PowerBI-visuals-PowerKPIMatrix), [MultiKPI](https://github.com/microsoft/PowerBI-visuals-MultiKPI) | KPI met variance, status en sparkline; scorecard-matrix | KpiStrip met vergelijking en trendlijn |
| [mekkochart](https://github.com/microsoft/powerbi-visuals-mekkochart), [sankey](https://github.com/microsoft/powerbi-visuals-sankey), [heatmap](https://github.com/microsoft/powerbi-visuals-heatmap) | Marimekko, geldstromen, heatmap | nog niet (sankey alleen bij een echte stroom) |
| [ChicletSlicer](https://github.com/microsoft/PowerBI-visuals-ChicletSlicer), [timeline](https://github.com/microsoft/powerbi-visuals-timeline) | knoppenslicer, periodeslicer | SlicerTegels, FilterRij |

Er is geen Microsoft-repo voor een waterfall- of variance-visual: de brug is een core visual, de IBCS-variantes komen van de marktplaats.

**Marktplaats** (de look van een goed finance-rapport):

| Visual | Licentie | Idee | Bij ons |
|---|---|---|---|
| Zebra BI Tables/Charts/Cards ([prijzen](https://help.zebrabi.com/kb/power-bi/pricing-plans/), 2026-09-14) | Free (1 gebruiker) tot Enterprise | IBCS, geïntegreerde absolute en relatieve afwijking, small multiples, [Top N + Others](https://help.zebrabi.com/using-top-n-others-in-zebra-bi), [invert voor kosten](https://help.zebrabi.com/kb/power-bi/how-to-invert-and-rename-groups-in-your-tables/), comments, axis break | brug met afwijkingskleuren, klanten top 8 + Overig, polariteit naar impact |
| Inforiver Analytics+ ([link](https://inforiver.com/analytics-plus/)) | abonnement | eenklik-IBCS, small multiples, annotaties per datapunt, consument wisselt charttype en labels | "Meer opties": type, reeksen, kleuren, arcering |
| xViz, ValQ (Lumel) | freemium / commercieel | hiërarchische variance-tabel, IBCS-bullet, driver tree, what-if | matrix met databalken |
| Acterys ([Matrix Gen2](https://appsource.microsoft.com/en-us/product/power-bi-visuals/managility.acterysmatrixgen2)) | commercieel | planningsmatrix met writeback | buiten scope |
| [Deneb](https://github.com/deneb-viz/deneb) (v2.0, 2026-09-08) | MIT, certified | Vega/Vega-Lite: zo maken power users eigen IBCS-grafieken | ECharts custom series vervult die rol |
| [HTML Content](https://github.com/dm-p/powerbi-visuals-html-content) | MIT | measures die HTML of SVG teruggeven (KPI-tegels, sparklines) | Vue-componenten |
| Charticulator ([repo](https://github.com/microsoft/charticulator), gearchiveerd 2024-01-09) | | les: bouw niet op een tool zonder eigenaar | |

**Core** ([overzicht](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview), 2026-01-28). Nieuwe [card](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-card) (GA november 2025, 2026-07-22): reference labels met variance en % van doel, SVG-sparkline. [Button slicer](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-button-slicer) GA, [list slicer](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-list-slicer) in preview, [visual calculations](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-visual-calculations-overview) (running sum, % of parent, versus previous). De Q&A-visual verdwijnt in december 2026.

Samengevat bestaat de finance-look uit zeven dingen: IBCS-notatie, geïntegreerde afwijking, small multiples met gedeelde schaal, Top N + Overig, omkeren voor kosten, annotaties op datapunten, en cards met reference labels en een sparkline.

## 3. Opties: auteur en lezer in Power BI, en wat wij doen

Status: **heeft** = bestaat bij ons; **gat** = nog niet, wel zinvol; **bewust niet** = met reden weggelaten.

**Opmaak (auteur)**

| Power BI | Wij | Status |
|---|---|---|
| Titel, subtitel, divider, dynamisch via `fx` ([format pane](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-format-pane-overview), 2026-04-24) | titel + uitkomstzin als subtitel, eenheid en periode erin | heeft |
| Header-iconen aan/uit | vaste set: ⓘ, uitleg, tabel, CSV, focus, meer opties | heeft (vast) |
| Alt text | aria-label per band en per visual, tabeltweeling | heeft |
| Data labels, total labels ([format visual](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-format-visual), 2026-09-01) | selectief: maximum, laatste afgesloten, lopende maand | heeft |
| Kleur per serie | kleur volgt de reeksrol; de lezer kiest een kleurset | heeft (vereenvoudigd) |
| Conditional formatting: rules, data bars, icons ([link](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-conditional-table-formatting), 2025-12-01) | databalken in de matrix, polariteit naar impact; geen gradiënten | heeft (vereenvoudigd) |
| Small multiples ([link](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-small-multiples)) | niet | gat: sterk voor marge per entiteit of team, ECharts `grid`-array met gedeelde schaal |
| Reference lines (constant, gemiddelde, percentiel) ([analytics pane](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-analytics-pane)) | run-rate als gestippelde lijn, doelstreep in bullets | heeft (vereenvoudigd) |
| Trend, forecast, anomalies, error bars | niet | bewust niet: FC komt uit planning, trend misleidt bij seizoen |
| Zoom slider | niet | bewust niet tot er lange tijdreeksen zijn |
| Visual calculations | backend levert vergelijkingen | heeft (in de API) |
| Edit interactions (filter/highlight/none) ([link](https://learn.microsoft.com/en-us/power-bi/create-reports/service-reports-visual-interactions), 2026-04-21) | maandklik filtert KPI's, brug, klanten en assistent; klant-nadruk dimt de rest | heeft (vast) |

**Lezen en verkennen (lezer)**

| Power BI | Wij | Status |
|---|---|---|
| Show as table, export ([export](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-export-data), 2026-08-18) | tabeltweeling en CSV (puntkomma, decimale komma, BOM) | heeft |
| Focus mode ([link](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-report-view)) | focusmodus als dialoog | heeft |
| Sort in een visual | matrix sorteert; tabeltweeling niet | gat (klein) |
| Spotlight | niet | bewust niet: focusmodus volstaat |
| Drill up/down in een hiërarchie ([link](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-drill)) | matrix-groepen open/dicht | heeft (vereenvoudigd) |
| Drillthrough met Back ([link](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough), 2026-03-02) | opbouwpaneel achter elk getal, staat in de URL | heeft (Overzicht); gat op de andere finance-pagina's |
| Report page tooltip ([link](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-tooltips)) | HTML-tooltip op hover en focus | bewust niet als mini-pagina: zwaar en niet leesbaar voor schermlezers |
| Personalize visuals: type, velden, aggregatie, legenda ([lezer](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-personalize-visuals)) | "Meer opties": type en reeksen uit een toegestane set, kleuren, arcering, "Standaard herstellen" | heeft (vereenvoudigd); velden en aggregatie bewust niet |
| Field parameters ([link](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-field-parameters), 2026-06-09) | "Maat" (Omzet/Brutomarge) op Winstgevendheid, "Niveau" | heeft (deels) |
| Slicers: button, list met zoeken, relatieve datum, sync ([link](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-slicers), 2026-08-24) | periodetegels, vergelijking, entiteit; één filterbalk per pagina in de URL | heeft (vereenvoudigd) |
| Persistent filters, Reset to default | filters in de URL; weergave in localStorage met "Standaard herstellen" | heeft |
| Report en personal bookmarks ([link](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-bookmarks), 2026-08-05; max 20 per rapport, verlopen na 6 maanden) | de URL is de bookmark: delen = link kopiëren | heeft (vereenvoudigd); benoemde weergaven bewust niet |
| Comments op een visual | niet | gat (later): annotatie per datapunt of periode |
| Copilot summary | assistent naast de cijfers, met bronnen en getallencontrole | heeft (eigen merk, zie `assistent-patroon.md`) |
| Q&A-visual | niet | bewust niet: Microsoft stopt ermee |

**Toetsenbord** ([consumer accessibility](https://learn.microsoft.com/en-us/power-bi/explore-reports/desktop-accessibility-consuming-tools), 2025-12-01). Power BI: Ctrl+Rechts de visual in, Tab tussen plot, as en legenda, Alt+Shift+F10 voor de header, Alt+Shift+F11 voor een toegankelijke tabel; report page tooltips en de list slicer zijn gaten. Wij: header-knoppen zitten gewoon in de tabvolgorde, één roving-band per grafiek, pijltjes/Home/End, dezelfde tooltip op focus als op hover, een echte `<table>` als tabeltweeling.

## 4. Volgorde voor de gaten

1. Doorklikken op Winstgevendheid, Commissie, Uren, Betalingen, Partnerfacturen en Mijn beloning (zelfde patroon: nieuwe `soort`, `@kies`, `?opbouw=`).
2. Small multiples voor marge per entiteit of team (gedeelde schaal, hooguit 6).
3. Sorteren in de tabeltweeling, en de vluchtige keuzes (Uren, weekmarge, groeperen) in de URL.
4. Annotaties per periode, als Robin ze vraagt.
