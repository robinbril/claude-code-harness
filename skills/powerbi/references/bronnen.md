# Bronnen

Wanneer lezen: als je een bewering moet onderbouwen, de leeftijd of betrouwbaarheid van een bron wilt weten, of een claim in deze skill wilt natrekken. Kopie van `~/Desktop/Analytics ontwerp Power BI-stijl/bronnen.md` (onderzoek van 2026-10-08), ongewijzigd onder deze alinea. De bestanden waarnaar hij verwijst (het rapport, de bronnotities en `ats-analytics.md`) staan in die map; hun inhoud is in deze skill verwerkt in `patronen-finance.md`, `navigatie-en-slicers.md`, `assistent-patroon.md`, `tokens-en-typografie.md` en `ats-analytics.md`.

Alle bron-URL's uit het rapport (`Power BI finance rapportontwerp.md`) en de vier bronnotities, ontdubbeld en per onderwerp gegroepeerd. Groep 6 bevat de nieuwe bronnen uit `ats-analytics.md`. Er zijn geen URL's toegevoegd die niet in die bestanden staan.

Legenda: een datum is de paginadatum (`ms.date` bij Microsoft Learn) of publicatiedatum zoals de notities hem geven. **ouder** = de notities markeren de bron als ouder dan de onderzoeksperiode. **snippet** = alleen via een zoekresultaat gezien, pagina niet (volledig) opgehaald. **secundair** = geen primaire bron, lagere betrouwbaarheid. Geen datum = de notities geven er geen.

Aantallen: 150 unieke URL's uit rapport en notities (groep 1 t/m 5), plus 21 nieuwe ATS-bronnen (groep 6). Groep 7 t/m 9 komen uit het onderzoek van 2026-10-09 (rust en design, Power BI-ecosysteem, bibliotheken) en staan niet in de Desktop-map.

## 1. Finance-visuals, IBCS en KPI-cards (41)

- [Microsoft Learn: What are Power BI samples](https://learn.microsoft.com/en-us/power-bi/create-reports/sample-datasets): samples-refresh 2026 (Fluent 2, nieuwe card, button slicers, minder vormen en tekstvakken). 2026-09-03
- [Microsoft Learn: Corporate Spend sample](https://learn.microsoft.com/en-us/power-bi/create-reports/sample-corporate-spend): plan vs realisatie, Var Plan-grafiek boven %-tabel, decomposition tree, tooltip-pagina. 2025-09-11 (beschrijft de versie vóór de refresh)
- [Microsoft Learn: Customer Profitability sample](https://learn.microsoft.com/en-us/power-bi/create-reports/sample-customer-profitability): bubble chart afwijking vs budget, GM% en omzet als belgrootte; scorecard per manager. 2025-09-11 (sample zelf ouder, data rond 2014)
- [Microsoft Learn: Tips for designing a great dashboard](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips): hoogste niveau linksboven, max 3-4 cijfers per getal, geen tijdvakken mengen; gemengd oordeel over gauges. 2025-10-01
- [Microsoft Learn: Visualizations overview](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview): wanneer matrix, waterfall, decomposition tree, small multiples; kolommen vs liggende balken; Q&A-deprecatie december 2026.
- [Microsoft Learn: Card visual](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-card): nieuwe card (GA november 2025), callout, afbeelding, reference labels, SVG-sparkline. 2026-07-22
- [Microsoft Learn: Key influencers](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-influencers): minimaal 100 observaties per state; wanneer key influencers zinloos zijn. 2026-08-24
- [Power BI blog: first DataViz World Champion](https://powerbi.microsoft.com/blog/congratulations-to-jon-sandmann-the-first-power-bi-dataviz-world-champion): bewijs dat contestwinnaars niet over finance gingen. snippet
- [SQLBI: Introducing the 3-30-300 rule](https://www.sqlbi.com/articles/introducing-the-3-30-300-rule-for-better-reports/): de layoutregel (overzicht, filteren, detail), slicers niet linksboven, paginahiërarchie. 2024-06-03
- [SQLBI: Actuals and forecasts in the same chart](https://www.sqlbi.com/articles/showing-actuals-and-forecasts-in-the-same-chart-with-power-bi/): cutoff, per periode óf AC óf FC, doorgetrokken vs gestippeld. 2020-12-21, ouder
- [SQLBI: Using scatterplots to find details](https://www.sqlbi.com/articles/using-scatterplots-to-find-details-in-reports/): kwadranten, belgrootte, uitschieters, cross-filter naar detailtabel. 2024-04-03
- [SQLBI: Using pie charts is not the end of the world](https://www.sqlbi.com/articles/using-pie-charts-is-not-the-end-of-the-world/): taart alleen bij 3 of minder delen; lengte leest beter dan hoek. 2025-02-10
- [SQLBI: Building bullet charts](https://www.sqlbi.com/articles/building-bullet-charts-in-power-bi-reports/): bullet als gauge-vervanger, banden alleen bij overeenstemming. bijgewerkt 2025-03-17
- [SQLBI: Visuals reference (A3 pdf)](https://www.sqlbi.com/wp-content/uploads/visuals-reference-sep2018-A3.pdf): alternatieven voor gauges. september 2018, ouder, snippet
- [IBCS Working Group: mandatory vs optional](https://www.ibcs.com/wp-content/uploads/2018/12/IBCSWorkingGroup-Mandatory-vs-optional_2018-12-13_jf.pdf): scenario's via vulpatronen, afwijkingen rood/groen, pins. 2018-12-13, ouder, snippet
- [IBCS: Top and bottom 5](https://www.ibcs.com/resource/top-and-bottom-5-of-international-business-communication-standards/): scenarionotatie, consistente schaal, kritiek op taart, radar en sparklines. 2018-11-15, ouder
- [IBCS: UN 3.2 More scenarios (pdf)](https://www.ibcs.com/wp-content/uploads/2018/01/UN-3.2_More-scenarios_2018-01-23_rh.pdf): regelfamilie Unify. 2018-01-23, ouder, alleen titel
- [IBCS: Table template 02](https://www.ibcs.com/resource/table-template-02/): P&L-tabel met PY, PL, AC, ΔPY/ΔPL-balken en ΔPL%-pins. versie 1.8, 2018-03-02, ouder
- [IBCS: Vertical waterfall chart C06](https://www.ibcs.com/resource/chart-template-06/): AC/PL/PY-balken plus verticale waterfall van afwijkingen, tot 25 elementen. versie 2.0, 2025-07-14
- [IBCS Standards, pagina 3](https://www.ibcs.com/standards/page/3/): regel EX 1.1 (pins rood/groen); variance-kleuren naar impact (zoekresultaat-samenvatting).
- [IBCS Standards v1.2 (pdf)](https://www.ibcs.com/wp-content/uploads/2026/06/IBCS_v1-2_2024-05-16.pdf): de actuele standaard; te groot om te verwerken, regelnummers niet geverifieerd. 2024-05-16, gehost 2026-06
- [Zebra BI: IBCS](https://zebrabi.com/ibcs/): samenvatting scenariovullingen, kleur naar impact, tijd horizontaal en structuur verticaal, geen taart of snelheidsmeter.
- [Zebra BI: Advanced waterfall charts](https://zebrabi.com/creating-advanced-power-bi-waterfall-charts/): IBCS-gecertificeerde visuals, meerdere afwijkingen in één grafiek. snippet
- [Zebra BI: Income Statement template](https://zebrabi.com/template/income-statement-dashboard-in-power-bi/): P&L-pagina's, bridges, small multiples per BU, working capital en cashbridge.
- [Zebra BI KB: Displaying forecasts in charts and tables](https://help.zebrabi.com/displaying-forecasts-in-charts-and-tables): maand/YTD AC vs PL, jaar FC vs PL, plus-minus-kolommen.
- [Zebra BI KB: Simple variance report with a forecast](https://help.zebrabi.com/kb/power-bi/simple-variance-report-with-a-forecast/): FC verdwijnt zodra er AC is. snippet
- [Zebra BI KB: Multiple forecasts and plans](https://help.zebrabi.com/support-multiple-forecasts-and-multiple-plans): meerdere plan- en prognoseversies via patroonvariaties. snippet
- [Zebra BI webinar: Correct chart type](https://zebrabi.com/webinar/correct-chart-type-power-bi-webinar/): geen taarten en treemaps. snippet
- [Zebra BI webinar: 7 worst dashboard mistakes](https://zebrabi.com/webinar/power-bi-dashboard-mistakes-webinar/): waarom dashboards falen. snippet
- [Zebra BI webinar: Financial reports](https://zebrabi.com/webinar/financial-reports-webinar/): kritiek op 3D en snelheidsmeters. snippet
- [Inforiver: Variance analysis with Inforiver charts](https://inforiver.com/blog/general/variance-analysis-powerbi-inforiver-charts/): integrated variance, pin/lollipop, trellis, IBCS-templates C04/C05/C12.
- [Inforiver: Analytics+ variance analysis](https://inforiver.com/blog/inforiver-analytics-plus/variance-analysis-powerbi-inforiver-analytics-plus/): AC-balk met afwijking als segment of marker. snippet
- [Inforiver community: Set Version](https://community.inforiver.com/tips-tricks/post/how-to-instantly-calculate-variance-columns-using-set-version-mG2EfL89FXMKY7B): afwijkingskolommen zonder DAX. snippet
- [VitaraCharts: Mapping IBCS scenarios](https://docs.vitaracharts.com/ibcs-user-guide/ibcs/mapping-ibcs-scenarios): AC/FC/PL/PY en Delta als stijltokens.
- [R-bloggers: Condense with IBCS](https://r-bloggers.com/2024/08/condense-enhancing-reporting-efficiency-through-ibcs-standards): SUCCESS-regels, small multiples met gelijke schaal. 2024-08, snippet
- [SQLBits 2026: From KPI to Clarity](https://sqlbits.com/sessions/event2026/From_KPI_to_Clarity_Design_Powerful_Power_BI_Card_Visuals1): card-context via accentbalken, reference labels, tooltip-pagina's. 2026
- [Stephen Few: Bullet Graph Design Specification](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf): bullet-anatomie, 2-5 grijze banden, varianten voor kosten en negatief. rev. 2013-10-10, ouder
- [Stephen Few: Save the Pies for Dessert](https://www.perceptualedge.com/articles/visual_business_intelligence/save_the_pies_for_dessert.pdf): waarom hoeken en oppervlakken slecht vergelijken. 2007, ouder
- [DAX Patterns: ABC classification](https://www.daxpatterns.com/?p=2381): Pareto/ABC op omzet en marge. snippet
- [Tabular Editor: KPI card best practices](https://tabulareditor.com/blog/kpi-card-best-practices-dashboard-design): gap is het belangrijkste element, max 5 KPI's, geen gauges, blauw/oranje als kleurenblind-alternatief. 2026-03-10, bijgewerkt 2026-08-26
- [ScaleXP help: adverse as red](https://www.help.scalexp.com/report-faqs/how-to-change-the-variance-column-format-to-show-adverse-as-red-how-to-take-out-coloured-variances): kostenstijging is ongunstig, dus rood. secundair

## 2. Navigatie, filters en visual headers (34)

- [Microsoft Learn: Page and bookmark navigators](https://learn.microsoft.com/en-us/power-bi/create-reports/button-navigators): page navigator synchroniseert automatisch; valkuilen van meerdere bookmark-navigators. 2026-02-05, bijgewerkt 2026-07-23
- [Microsoft Learn: Buttons](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-buttons): vijf knopstates, Clear all slicers, navigators in plaats van losse knoppen. 2025-12-01
- [Microsoft Learn: Report bookmarks](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-bookmarks): wat een bookmark vastlegt en waar het misgaat. 2025-12-01
- [Microsoft Learn: Publish a workspace app](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-create-distribute-apps): app-navigatie met standaard ingeklapte secties, 25 doelgroepen, app-Copilot. 2026-09-24
- [Microsoft Learn: Consume reports with accessibility tools](https://learn.microsoft.com/en-us/power-bi/explore-reports/desktop-accessibility-consuming-tools): Ctrl+F6, Alt+Shift+F10/F11, skip link, header-tabel niet screenreader-vriendelijk. 2025-12-01
- [Microsoft Learn: Button slicer](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-button-slicer): GA, highlight labels, valkuil van geforceerde selectie. 2026-04-09
- [Microsoft Learn: List slicer (preview)](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-list-slicer): hiërarchie, zoeken, gum-icoon. 2026-04-09
- [Microsoft Learn: Relative date slicer / date picker](https://learn.microsoft.com/en-us/power-bi/visuals/desktop-slicer-filter-date-range): ankers Today/Last date, Months (Calendar), zondagweken als beperking, "laatste waarde met datum". 2025-12-01, bijgewerkt 2026-08-20
- [Microsoft Learn: Format filters in reports](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-report-filter): filter pane, applied vs available kaarten, vergrendelen, filters per visual bij hover. 2025-11-01
- [Microsoft Learn: Optimization guide](https://learn.microsoft.com/en-us/power-bi/guidance/power-bi-optimization): beperk visuals per pagina, Top N als restrictieve default. 2024-12-30
- [Microsoft Learn: Format pane General tab](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-format-pane-overview): visual header-iconen, titel met heading-niveau, subtitel. 2026-04-24, bijgewerkt 2026-09-29
- [Microsoft Learn: Use visual elements](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-visual-elements-for-reports): header binnen de visual, uitgelijnd op de titel. 2025-11-01
- [Microsoft Learn: Show data](https://learn.microsoft.com/en-us/power-bi/visuals/service-reports-show-data): "Show as a table" via het menu. zoekresultaat-tekst
- [Microsoft Learn: Report page tooltips](https://learn.microsoft.com/en-us/power-bi/guidance/report-page-tooltips): 320×240 px, niet interactief, altijd verborgen. 2024-12-30, bijgewerkt 2026-06-22
- [Microsoft Learn: Report page drillthrough](https://learn.microsoft.com/en-us/power-bi/guidance/report-drillthrough): diepte of bredere context, terugknop behouden, vindbaarheid. 2024-12-30
- [Microsoft Learn: Change how visuals interact](https://learn.microsoft.com/en-us/power-bi/create-reports/service-reports-visual-interactions): cross-filter vs cross-highlight, bekende matrixfout. 2026-04-21
- [Power BI blog: Updates to the new look](https://powerbi.microsoft.com/blog/updates-to-the-new-look-experience-and-release-plan): pages pane links of tabs onder. ouder (circa 2020), 403, snippet
- [Power BI blog: Custom navigation for apps](https://powerbi.microsoft.com/blog/designing-custom-navigation-for-power-bi-apps-is-now-available/): app-navigatie met secties. ouder
- [Power BI July 2026 Feature Summary](https://community.fabric.microsoft.com/blog/fbc_pbiupdatesblog/power-bi-july-2026-feature-summary/5303533): verbeteringen paginatabs. juli 2026, 403, snippet
- [Fabric community: Field parameters with bookmarks](https://community.fabric.microsoft.com/t5/Issues/Field-Parameters-not-working-with-bookmarks-and-shared-links/idc-p/2778697): field parameters plus bookmarks gedragen zich slecht.
- [endjin: How to build navigation in Power BI](https://endjin.com/blog/2024/03/how-to-build-navigation-in-power-bi): zijnavigatie voor één verhaal, header voor meerdere doelgroepen, één basisknop. 2024-03-13, bijgewerkt 2026-01-08
- [powerbi.tips: Explicit Measures ep. 526 "Stop Using Bookmarks"](https://powerbi.tips/2026/05/08/explicit-measures-podcast-episode-526/): bookmarks voor UI afgeraden, filter pane boven fly-out. 2026-05-08
- [powerbi.tips: Bookmarks tips and tricks](https://powerbi.tips/2021/06/22/power-bi-bookmarks-tips/): Selected visuals, objecten benoemen. 2021, ouder
- [team400.ai: Bookmarks without making a mess](https://team400.ai/blog/2026-06-power-bi-bookmarks-save-share-insights): tien bookmarks = tien kopieën van elke slicer. 2026-06, secundair
- [SSW Rules: Place your slicers consistently](https://www.ssw.com.au/rules/do-you-place-your-slicers-consistently): slicers bovenaan richting rechts, rest naar het filter pane. bijgewerkt 2026-10-08
- [phData: Page navigation in Power BI](https://www.phdata.io/blog/page-navigation-in-power-bi/): paginatabs in Desktop vs service. secundair
- [thebricks: Page navigation](https://www.thebricks.com/resources/guide-what-is-page-navigation-in-power-bi): navigatie op elke pagina op dezelfde plek, Home-pagina. secundair
- [thebricks: Toggle button](https://www.thebricks.com/resources/guide-how-to-use-toggle-button-in-power-bi): field parameters als alternatief voor bookmark-toggles. secundair
- [thebricks: Slicer panel](https://www.thebricks.com/resources/guide-how-to-create-slicer-panel-in-power-bi): inklapbare slicerpanelen als communitypatroon. secundair
- [collab365: Single-date picker June 2026](https://spaces.collab365.com/posts/power-bi-adds-single-date-picker-in-june-2026-prev-NkKLwM): enkele datum in de date picker. juni 2026, secundair
- [hubsite365: New date picker complaint](https://www.hubsite365.com/en-ww/crm-pages/power-bis-new-date-picker-relative-date-slicer-is-here-and-one-complaint.htm): geen eigen boekjaren. secundair
- [Wise Owl: Filter default interaction](https://wiseowl.co.uk/power-bi/tips/visuals/filter-default-interaction): rapportbreed cross-filter als default. secundair
- [Versich: Drill down in Power BI](https://versich.com/blog/understanding-and-using-drill-down-in-power-bi/): drill-down via hiërarchie. secundair
- [Zebra BI: Top 10 Power BI dashboard tips](https://zebrabi.com/top-power-bi-dashboard-tips-webinar/): bookmarks, smart tooltips, drill down vs drill through. 2020, ouder

## 3. AI-assistent, Copilot en HAX (36)

- [Microsoft Learn: Summarize a report with Copilot](https://learn.microsoft.com/en-us/power-bi/explore-reports/copilot-pane-summarize-content): lintknop, rechter paneel, startprompts, voetnoot-citaties naar visuals, limieten, feedbackdialoog. 2026-09-30
- [Microsoft Learn: Copilot for Power BI overview](https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-introduction): paneel GA, standalone in preview, clear chat, verified answers. 2026-08-24
- [Microsoft Learn: Standalone Copilot](https://learn.microsoft.com/en-us/power-bi/explore-reports/copilot-chat-with-data-standalone): ingangen, "approved for Copilot"-waarschuwing met "View answer". 2026-07-06
- [Microsoft Learn: Ask data questions with Copilot and Fabric IQ](https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-ask-data-question): "How Copilot arrived at this", DAX tonen, slicers worden niet toegepast, terugval op algemene kennis. 2026-09-10
- [Microsoft Learn: Privacy and responsible use for Copilot in Power BI](https://learn.microsoft.com/en-us/fabric/get-started/copilot-power-bi-privacy-security): geen opslag na sessie, mitigaties. 2026-05-26
- [Microsoft Learn: UX guidance for generative AI applications (ISV)](https://learn.microsoft.com/en-us/microsoft-cloud/dev/copilot/isv/ux-guidance): assistive/embedded/immersive, labels, geen vermenselijking, disclaimer en frictie. 2024-09-16, ouder, bijgewerkt 2026-08-10
- [Power BI blog: Improvements to the report Copilot](https://powerbi.microsoft.com/blog/introducing-improvements-to-the-report-copilot-in-power-bi): herontwerp van het paneel. 403, niet gelezen
- [SumProduct: Copilot pane fresh update](https://sumproduct.com/blog/power-bi-blog-copilot-pane-fresh-update-2/): paneel gelijkgetrokken met standalone, kopiëren naast feedback. secundair
- [Microsoft Trademark and Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks): logo's en iconen nooit zonder licentie.
- [Microsoft Trademark Guidelines: General](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general): geen Microsoft-merk in eigen productnaam ("Contoso OneDrive"), compatibiliteitsclaim mag.
- [FY27 Microsoft 365 trademark guidelines (pdf)](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/mscle/documents/presentations/FY27_Microsoft_365_trademark_guidelines.pdf): Copilot-app-icoon vereist licentie; in-product merkkleur #464FEB.
- [FY26 Microsoft 365 trademark guidelines (pdf)](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/mscle/documents/presentations/FY26_Microsoft_365_trademark_guidelines.pdf): vorige versie ter vergelijking.
- [Fluent UI System Icons: LICENSE](https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE): MIT-licentie voor de iconen.
- [Fluent UI System Icons: icons_regular.md](https://github.com/microsoft/fluentui-system-icons/blob/main/icons_regular.md): lijst sparkle-varianten (`sparkle`, `chat_sparkle`, `data_usage_sparkle`). gecontroleerd 2026-10-08
- [Fluent 2: Design, get started](https://fluent2.microsoft.design/get-started/design): Copilot UI Kits; licentie voor derden niet vermeld.
- [npm: @fluentui-copilot/react-copilot-chat](https://www.npmjs.com/package/@fluentui-copilot/react-copilot-chat): MIT Fluent AI-componenten (chat, prompt starters, citaties, feedback), alle onder 1.0. gecontroleerd 2026-10-08
- [jsDelivr: @fluentui-copilot/react-copilot-chat](https://www.jsdelivr.com/package/npm/@fluentui-copilot/react-copilot-chat): pakketpagina, versies.
- [Genesys Spark: AI Iconography](https://spark.genesys.com/latest/foundations/ai-foundations/ai-iconography-eHo6ir4h-eHo6ir4h): enige expliciete sparkle-regel gevonden (geen Microsoft-bron).
- [MC1181766 via mc.merill.net](https://mc.merill.net/message/MC1181766): beheerbare AI-disclaimer met "heightened awareness". eind 2025
- [MC1181766 via Handsontek](https://m365admin.handsontek.net/?p=17408): mirror van hetzelfde bericht. eind 2025
- [Filibuster Blog: Copilot removes default alert](https://thefilibusterblog.com/microsoft-365-copilot-removes-default-alert-ai-can-make-mistakes/): disclaimer standaard uit omdat hij afleidde. secundair
- [itelio: MC1181766 mirror](https://www.itelio.com/en/microsoft-message-center/MC1181766): idem, standaardwaarde onbevestigd. secundair
- [Microsoft HAX Toolkit: Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/): de 18 richtlijnen. CHI 2019, ouder maar canoniek
- [Microsoft HAX Design Library](https://www.microsoft.com/en-us/haxtoolkit/library/): G1-G18 met omschrijving.
- [Tableau Help: Ask questions in Tableau Pulse](https://help.tableau.com/current/online/en-us/pulse_ask_discover_qa.htm): citatielinks per inzicht, "Metric Sources", expliciete hallucinatiewaarschuwing.
- [Tableau Help: Try Pulse Enhanced Q&A](https://help.tableau.com/current/online/en-us/tableau_gai_trial.htm): Tableau Agent in Pulse als premium feature.
- [Tableau blog: Pulse enhanced Q&A](https://www.tableau.com/de-de/blog/tableau-pulse-enhanced-qa): aankondiging Tableau Agent in Pulse. 2026-06-24, 403, niet gelezen
- [Salesforce AI Research blog: Tableau](https://blog.salesforceairesearch.com/tag/tableau): Pulse insight summaries GA sinds begin 2024. ouder
- [Trailhead: AI-powered insights in Pulse](https://trailhead.salesforce.com/content/learn/modules/business-metrics-insights-with-tableau-pulse/work-with-ai-powered-insights): feedback per inzicht.
- [Google Cloud blog: Looker Conversational Analytics](https://cloud.google.com/blog/products/business-intelligence/a-closer-look-at-looker-conversational-analytics/): "How was this calculated?" in bullets, LookML als semantische laag. 2025-04-30, ouder
- [Looker docs: Conversational Analytics overview (2606)](https://docs.cloud.google.com/looker/docs/2606/conversational-analytics-overview): overzicht van de functie.
- [Looker docs: Converse with Looker data (2602)](https://docs.cloud.google.com/looker/docs/2602/conversational-analytics-looker-data?hl=en): ingangen via Explores en dashboard-agents.
- [ThoughtSpot docs: Getting started with Spotter](https://docs.thoughtspot.com/cloud/latest/spotter-getting-started): zichtbare en bewerkbare zoektokens, "Double check response", hover-ingang per visual.
- [ThoughtSpot Trust Center: enterprise-grade AI](https://www.thoughtspot.com/trust/enterprise-grade-ai): tokens als transparantie over wat de AI krijgt.
- [Sigma: AI product page](https://www.sigmacomputing.com/product/ai): logica, formules en filters zichtbaar; antwoord wordt workbook.
- [AIM Media House: Sigma assumes AI is always wrong](https://aimmediahouse.com/market-industry/sigmas-ai-strategy-starts-with-a-simple-assumption-that-ai-is-always-wrong): alleen titel bekend, niet gelezen

## 4. Thema, Fluent 2 en toegankelijkheid (28)

- [Microsoft Learn: Visual defaults in Power BI reports](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-reports-visual-defaults): drie basisthema's, Fluent 2 standaard voor nieuwe rapporten. 2026-08-31
- [Microsoft Learn: Create custom report themes](https://learn.microsoft.com/en-us/power-bi/create-reports/report-themes-create-custom): theme-JSON-structuur, tekstklassen en klassieke waarden. 2026-08-31
- [Microsoft Learn: Use report themes](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-report-themes): kleurtoewijzing op volgorde van verschijnen, kleurenblind-thema. 2026-08-31
- [Microsoft Learn: Design reports for accessibility](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports): 4,5:1, kleur nooit enig signaal, te vermijden kleurparen, alt text, geen beslisinfo in tooltips, slicers op vaste plek. 2026-08-31
- [Power BI blog: Deep dive into modern visual defaults](https://powerbi.microsoft.com/blog/deep-dive-into-modern-visual-defaults-and-customizing-theme-improvements-preview): Fluent 2-defaults, canvas 1920×1080. 403, snippet
- [databear: Power BI Fluent 2 theme](https://databear.com/power-bi-fluent-2-fluent-theme/): Fluent 2 als preview in april 2026. 2026-05-05
- [Fluent2-CY26SU08.json (microsoft/fabric-toolbox)](https://github.com/microsoft/fabric-toolbox/blob/main/monitoring/query-capacity-correlation/Template/Query%20Capacity%20Correlation.Report/StaticResources/SharedResources/BaseThemes/Fluent2-CY26SU08.json): exacte Fluent 2-themawaarden (kleuren, padding, radius, fonts). commit 2026-09-10
- [CY24SU10.json (microsoft/unified-data-foundation-with-fabric-solution-accelerator)](https://github.com/microsoft/unified-data-foundation-with-fabric-solution-accelerator/blob/main/fabric_workspace/reports/sales_dashboard.Report/StaticResources/SharedResources/BaseThemes/CY24SU10.json): exact klassiek thema, 41 datakleuren, sentimentkleuren.
- [Report Theme JSON Schema (microsoft/powerbi-desktop-samples)](https://github.com/microsoft/powerbi-desktop-samples/tree/main/Report%20Theme%20JSON%20Schema): geversioneerd schema, laatste 2.157. gezien 2026-10-08
- [data-goblin/power-bi-agentic-development](https://github.com/data-goblin/power-bi-agentic-development): interne bestandsnamen van basisthema's in PBIP.
- [Fluent lightColor.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/alias/lightColor.ts): lichte neutralen, strokes, schaduwkleuren. master, gelezen 2026-10-08
- [Fluent darkColor.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/alias/darkColor.ts): donkere neutralen, strokes, schaduwkleuren. master, gelezen 2026-10-08
- [Fluent lightColorPalette.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/alias/lightColorPalette.ts): statustokens licht (Background1/2, Foreground1). master
- [Fluent darkColorPalette.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/alias/darkColorPalette.ts): statustokens donker (Foreground3 = tint40). master
- [Fluent colors.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/colors.ts): grijsramp en kleurramps (green, orange, cranberry). master
- [Fluent brandColors.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/brandColors.ts): brandramp, brand 80 = #0F6CBD. master
- [Fluent borderRadius.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/borderRadius.ts): radii 2 t/m 40 px. master
- [Fluent shadows.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/utils/shadows.ts): tweelaagse schaduwen shadow2 t/m shadow64. master
- [Fluent spacings.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/spacings.ts): spacing 2 t/m 32 px. master
- [Fluent strokeWidths.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/strokeWidths.ts): lijndiktes 1 t/m 4 px. master
- [Fluent statusColorMapping.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/statusColorMapping.ts): success = green, warning = orange, danger = cranberry. master
- [Fluent fonts.ts](https://github.com/microsoft/fluentui/blob/master/packages/tokens/src/global/fonts.ts): fontstacks en typeschaal in px. master
- [Fluent 2: Color](https://fluent2.microsoft.design/color): semantische kleur alleen voor status, kleur nooit enig signaal.
- [W3C: Understanding 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html): 4,5:1 voor tekst, luminantieformule.
- [W3C: Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html): 3:1 voor grafische objecten en focusindicatoren.
- [W3C: CSS Values 3, absolute lengths](https://www.w3.org/TR/css-values-3/#absolute-lengths): 1 pt = 1,333 px.
- [Machado et al.: CVD simulation](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html): methode voor de kleurenblindheidssimulatie. 2009, ouder (methode)
- [Wise Owl: Accessibility themes](https://www.wiseowl.co.uk/blog/s3069/accessibility-themes.htm): vijf toegankelijke thema's in Power BI. 2023-02-28, ouder

## 5. Staffing-KPI's, cash en debiteuren (11)

- [Forwardly: Staffing agency KPIs](https://www.forwardly.com/blog/staffing-agency-kpis-every-finance-team-should-track): DSO wekelijks, ouderdomsbuckets, payroll funding gap, 40%-concentratiedrempel, margebenchmarks. 2026-07-15
- [Beancount: Staffing agency accounting guide](https://beancount.io/blog/2026/05/18/staffing-agency-accounting-bill-rate-vs-pay-rate-burdened-costs-gross-margin-placement-type-invoice-factoring-payroll-funding-guide): spread, brutowinst per uur, opslag vs marge, factoring als opex. 2026-05-18
- [Beancount: Consulting utilization rates](https://beancount.io/blog/2026/09/17/consulting-utilization-rates-falling-benchmark-billable-margins-guide): bezettingsgraad bij adviesbureaus. 2026-09-17, snippet
- [SPI Research: The truth about billable utilization](https://spiresearch.com/the-truth-about-billable-utilization/): 66% bezetting 2025, geldt voor consultancy, niet staffing. snippet
- [Staffing Industry Analysts: Gross margin and bill rate trends 2025](https://www.staffingindustry.com/research/research-reports/americas/gross-margin-and-bill-rate-trends-2025-update): benchmark achter betaalmuur.
- [StaffingHub: 2026 State of Staffing](https://staffinghub.com/reports/2026-state-of-staffing-benchmarking-report/): 231 respondenten, waarden niet openbaar. 2026
- [Bullhorn: What is redeployment](https://www.bullhorn.com/blog/what-is-redeployment/): redeployment als goedkoopste omzet. snippet
- [Bullhorn: Reporting and analytics](https://www.bullhorn.com/products/reporting-analytics/): ATS-data plus pay/bill-data (marge, fill rates, pipeline) in één plek. snippet
- [Crelate: Redeployment rate](https://www.crelate.com/?p=28279): formule redeployment rate, vendorclaim 10-30%. snippet, vendor
- [Sigma: Accounts receivable dashboard](https://www.sigmacomputing.com/blog/accounts-receivable-dashboard): ouderdomsbuckets, DSO samen met CEI en oninbaar. snippet
- [Cleverence: Sage receivables aging dashboard](https://www.cleverence.com/articles/sage-documentation/about-receivables-aging-on-the-dashboard-sage-5279/): ouderdomsdashboard als voorbeeld. snippet

## 6. ATS-analytics (nieuw onderzoek, 2026-10-08) (21)

Bronnen van `ats-analytics.md`. Opgehaald op 8 oktober 2026 tenzij anders vermeld.

- [Ashby: Analytics features](https://ashbyhq.com/platform/recruiting/analytics): standaard job-dashboards, report builder, calculated fields, drill-down naar onderliggende datapunten, alerts, geplande levering, toegangsbeheer, DEI-tracking (ook "infer").
- [Ashby: Analytics](https://ashbyhq.com/analytics): out-of-the-box rapporten, o.a. offer acceptance per team. snippet
- [Ashby: Default job dashboard](https://www.ashbyhq.com/blog/product/new-feature-default-job-dashboard): drie standaard dashboards (Summary, Interviews & Feedback, Source Details). snippet
- [Ashby: Recruiting planner visualizations and forecasting](https://www.ashbyhq.com/product-updates/recruiting-planner-visualizations-forecasting): Stage Progress, Plan Progress met verwachte hires en tekort, rood/geel/groen-drempels. 2023-12-08, ouder
- [Ashby docs: Recruiting Planner](https://docs.ashbyhq.com/recruiting-planner): passthrough rates uit de laatste 6 maanden, weekpace, forecast door extrapolatie.
- [Greenhouse Support: Which report should I use](https://support.greenhouse.io/hc/en-us/articles/8837686136987-Which-report-should-I-use): rapportcatalogus geordend per vraag (pipeline, time in stage, bron, offers, activiteit, demografie, surveys). 2026-01-30
- [Greenhouse Support: Pipeline by demographic report](https://support.greenhouse.io/hc/en-us/articles/360007254531): minder dan vijf antwoorden toont "< 5"; alleen Job Admin en hoger met recht. 2026-03-02
- [Greenhouse Support: Comparing cohort, activity, and snapshot reports](https://support.greenhouse.io/hc/en-us/articles/213332286): alleen cohortrapporten tonen de vernauwende funnel; snapshot = één dag. 2026-09-03
- [Greenhouse blog: Report dashboards and Report Builder](https://www.greenhouse.com/blog/drive-efficiency-and-improve-accountability-with-the-new-greenhouse-report-dashboards): templatebibliotheek, gelaagde filters, "custom trend and pipeline charts". 2020-10-27, bijgewerkt 2026-06-04
- [Greenhouse glossary: What are recruiting dashboards](https://www.greenhouse.com/resources/glossary/what-are-recruiting-dashboards): dashboards per afdeling, kantoor, rol en periode; KPI-lijst. snippet
- [Lever Help: Visual Insights Pipeline dashboard](https://help.lever.co/hc/en-us/articles/20087349143581): grafieken Conversions, Average time to hire, Average time in stage. snippet (pagina laadde niet)
- [Lever Help: Visual Insights Recruiter Operations dashboard](https://help.lever.co/hc/en-us/articles/20087373604765): apart dashboard voor recruiter-operatie. alleen titel bekend
- [Teamtailor Support: Analytics](https://support.teamtailor.com/en/articles/227739-analytics): analytics-pagina met KPI's. snippet
- [Metabase: Time to hire](https://www.metabase.com/metrics/time-to-hire): mediaan en p90 omdat doorlooptijd scheef verdeeld is; time to hire vs time to fill; open sollicitaties niet negeren.
- [Storytelling with Data: What is a Sankey diagram](https://www.storytellingwithdata.com/blog/what-is-a-sankey-diagram): breedtes slecht te vergelijken, te veel knopen overweldigt, geen Sankey zonder echte stroom. Simon Rowe, 15 september (jaar niet vermeld)
- [Oracle Analytics community: Sankey early termination nodes](https://community.oracle.com/products/oracleanalytics/discussion/29325/enhance-sankey-charts-to-support-early-termination-nodes): afgehaakte stromen lopen in Sankey-implementaties door tot de laatste kolom. snippet
- [Workable: Recruiting costs FAQ](https://resources.workable.com/tutorial/faq-recruitment-budget-metrics): SHRM/ANSI-formule cost per hire, interne vs externe kosten. 2017-09-15, gewijzigd 2023-09-26, ouder
- [gdpr-info.eu: Article 9 GDPR](https://gdpr-info.eu/art-9-gdpr/): verbod op bijzondere persoonsgegevens (etnische afkomst, gezondheid, enz.) en uitzonderingen.
- [artificialintelligenceact.eu: Annex III](https://artificialintelligenceact.eu/annex/3/): AI voor werving en selectie (vacatures targeten, sollicitaties analyseren en filteren, kandidaten beoordelen) is hoog-risico.
- [AIHR: A practical guide to candidate NPS](https://www.aihr.com/blog/candidate-nps/): cNPS-formule, segmenteren per fase, ook afgewezen kandidaten bevragen. snippet
- [Gem: Conversion rate benchmarks infographic](https://lp.gem.com/rs/972-IVV-330/images/Conversion_Rate_Benchmarks_Infographic.pdf): Amerikaanse tech-benchmarks voor stage-conversie. snippet, niet als norm gebruiken

## 7. Rust, rij-acties, knopplaatsing en getallen (onderzoek 2026-10-09)

Bronnen achter `mooi-ontwerpen.md`. "geverifieerd" = pagina zelf gelezen.

- [Stephen Few: Common Pitfalls in Dashboard Design (pdf)](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf): 13 valkuilen, kleur verliest bij overgebruik zijn signaal. 2006, geverifieerd
- [NN/g: Dashboards, preattentive attributes](https://www.nngroup.com/articles/dashboards-preattentive/): lengte en positie voor hoeveelheid, kleur niet voor grootte. 2017-06-18, geverifieerd
- [NN/g: Indicators, Validations, and Notifications](https://www.nngroup.com/articles/indicators-validations-notifications/): indicatoren kunnen ruis worden. 2024-01-17, geverifieerd
- [NN/g: Data Tables, Four Major User Tasks](https://www.nngroup.com/articles/data-tables/): inline acties bij 1-2 opties, bulk via selectie. 2022-04-03, geverifieerd
- [NN/g: Contextual Menus](https://www.nngroup.com/articles/contextual-menus/): ellipsis als cue, acties ook elders bereikbaar. 2019-03-17, geverifieerd
- [NN/g: OK-Cancel or Cancel-OK?](https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/): conventie boven optimalisatie per dialoog. 2008-05-26, geverifieerd
- [NN/g: Modal & Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/): een modal verbergt context. 2017-04-23, geverifieerd
- [NN/g: Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/): hiërarchie, niet sessiegeschiedenis. herzien 2026-09-01, geverifieerd
- [Carbon: Dashboards](https://carbondesignsystem.com/data-visualization/dashboards/): belangrijkste data grootst, vaste kleur per dataset, gekoppelde filters. geverifieerd
- [Carbon: Axes and labels](https://carbondesignsystem.com/data-visualization/axes-and-labels/): staafas op nul, gaten labelen. geverifieerd
- [Carbon: Data table](https://carbondesignsystem.com/components/data-table/usage/): overflow-menu per rij, hover/focus optioneel, batchbalk, toolbar max 5. geverifieerd
- [Carbon: Button](https://carbondesignsystem.com/components/button/usage/): modal-acties rechts, primair rechts, danger met tekst. geverifieerd
- [Atlassian: Dynamic table](https://atlassian.design/components/dynamic-table/usage): "more actions"-menu, geen knoppen in koppen. geverifieerd
- [Fluent 2: Dialog](https://fluent2.microsoft.design/components/web/react/core/dialog/usage): max 3 voetacties, alert dialog voor destructief. geverifieerd
- [Microsoft: Win32 command buttons](https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-command-buttons): destructief nooit default zonder undo. 2022-01-11, geverifieerd
- [Microsoft: Office Add-ins data visualization guidelines](https://learn.microsoft.com/en-us/office/dev/add-ins/design/data-visualization-guidelines): data-ink, dunne gridlines, legenda links boven. 2025-10-29, geverifieerd
- [W3C: WCAG 2.2 SC 1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html): wegklikbaar, aanwijsbaar, blijvend. geverifieerd
- [UK Analysis Function: Charts](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/): as op nul, directe labels, lichte gridlines. 2022-05-19, geverifieerd
- [UK Analysis Function: Colours](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-colours-in-charts/): kleur alleen met betekenis, max 4 categorieën. palet 2026-02-12, geverifieerd
- [UK Analysis Function: Tables](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-tables/): getallen rechts, gelijke decimalen, eenheid in kop. 2022-05-19, geverifieerd
- [Datawrapper: Choosing colors](https://www.datawrapper.de/academy/what-to-consider-when-choosing-colors-for-data-visualization): grijs als belangrijkste kleur. 2024-09-17, geverifieerd
- [FT Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md): vorm per relatie, kolommen op nul. geverifieerd
- [GitLab Pajamas: Charts](https://design.gitlab.com/data-visualization/charts): legenda vanaf 2 reeksen, gaten gestippeld. 2026-07-15, geverifieerd
- [Vercel: Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines): URL als state, deep-link alles, bevestig destructief. geverifieerd
- [PatternFly: Truncation](https://www.patternfly.org/ux-writing/truncation): min. 4 tekens, tooltip, niet in koppen. UNVERIFIED
- [Anthropic skills: frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design), [Rauno Freiberg: interfaces](https://github.com/raunofreiberg/interfaces), [Emil Kowalski: skills](https://github.com/emilkowalski/skills), [Taste-Skill](https://github.com/Leonxlnx/taste-skill), [Impeccable](https://github.com/pbakaus/impeccable): repo's bestaan (gh api, 2026-10-09), inhoud deels niet gelezen

## 8. Power BI-ecosysteem en opties (onderzoek 2026-10-09)

Bronnen achter `powerbi-opties.md`.

- [Microsoft Learn: Main sources of custom visuals](https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals): core, AppSource, .pbiviz. 2025-12-15
- [Microsoft Learn: Custom visuals FAQ](https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals-faq): certificering, export alleen certified. 2023-12-29
- [Microsoft Learn: Visual system integration](https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-visuals-concept): `update(options)`, dataView, IVisualHost. 2025-12-15
- [Microsoft Learn: Environment setup](https://learn.microsoft.com/en-us/power-bi/developer/visuals/environment-setup): pbiviz-toolchain. 2025-12-15
- [microsoft/PowerBI-visuals-tools](https://github.com/microsoft/PowerBI-visuals-tools): 7.2.2, 2026-09-23, MIT
- [microsoft/powerbi-visuals-api](https://github.com/microsoft/powerbi-visuals-api): 5.11.1, 2026-07-20, MIT
- [Power BI blog: custom visuals sandbox](https://asia.powerbi.microsoft.com/en-au/blog/custom-visuals-sandbox): iframe zonder origin. 2016, ouder
- Microsoft-visuals (MIT): [bulletchart](https://github.com/microsoft/powerbi-visuals-bulletchart), [Tornado](https://github.com/microsoft/PowerBI-visuals-Tornado), [PowerKPI](https://github.com/microsoft/PowerBI-visuals-PowerKPI), [PowerKPIMatrix](https://github.com/microsoft/PowerBI-visuals-PowerKPIMatrix), [MultiKPI](https://github.com/microsoft/PowerBI-visuals-MultiKPI), [mekkochart](https://github.com/microsoft/powerbi-visuals-mekkochart), [sankey](https://github.com/microsoft/powerbi-visuals-sankey), [heatmap](https://github.com/microsoft/powerbi-visuals-heatmap), [ChicletSlicer](https://github.com/microsoft/PowerBI-visuals-ChicletSlicer), [timeline](https://github.com/microsoft/powerbi-visuals-timeline): pushes 2026
- [microsoft/charticulator](https://github.com/microsoft/charticulator): gearchiveerd 2024-01-09
- [Zebra BI: pricing plans](https://help.zebrabi.com/kb/power-bi/pricing-plans/): 2026-09-14; [Top N + Others](https://help.zebrabi.com/using-top-n-others-in-zebra-bi); [Invert](https://help.zebrabi.com/kb/power-bi/how-to-invert-and-rename-groups-in-your-tables/)
- [Inforiver Analytics+](https://inforiver.com/analytics-plus/), [pricing](https://inforiver.com/analytics-plus/pricing/)
- [xViz op AppSource](https://appsource.microsoft.com/en-us/product/power-bi-visuals/WA200000933), [ValQ driver-based planning](https://docs.valq.com/plan/driver-based-planning), [Acterys Matrix Gen2](https://appsource.microsoft.com/en-us/product/power-bi-visuals/managility.acterysmatrixgen2)
- [Deneb](https://github.com/deneb-viz/deneb): v2.0.0.0, 2026-09-08, MIT; [HTML Content](https://github.com/dm-p/powerbi-visuals-html-content): MIT
- [Microsoft Learn: Visualizations overview](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview): 2026-01-28
- [Microsoft Learn: Format pane](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-format-pane-overview): 2026-04-24; [Format visual](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-format-visual): 2026-09-01
- [Microsoft Learn: Conditional table formatting](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-conditional-table-formatting): 2025-12-01; [Small multiples](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-small-multiples): 2025-12-01; [Analytics pane](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-analytics-pane): 2025-02-26
- [Microsoft Learn: Visual calculations](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-visual-calculations-overview): 2026-08-31
- [Microsoft Learn: Reading view](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-reading-view): 2026-08-31; [Report view / focus mode](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-report-view): 2026-01-14; [Spotlight](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-spotlight): 2025-10-01; [Drill](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-drill): 2026-06-18
- [Microsoft Learn: Drillthrough](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough): 2026-03-02; [Tooltips](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-tooltips): 2026-03-03
- [Microsoft Learn: Personalize visuals (auteur)](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-personalize-visuals) en [(lezer)](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-personalize-visuals): 2025-12-01
- [Microsoft Learn: Field parameters](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-field-parameters): 2026-06-09; [Bookmarks](https://learn.microsoft.com/en-us/power-bi/explore-reports/end-user-bookmarks): 2026-08-05; [Slicers](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-slicers): 2026-08-24; [Export data](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-export-data): 2026-08-18

## 9. Chartbibliotheken (onderzoek 2026-10-09)

Bronnen achter `bibliotheken-en-herkomst.md`. Versies uit de npm-registry en repo-activiteit uit de GitHub API, opgevraagd 2026-10-09; bundelgroottes eigen meting (esbuild + gzip -9). Het volledige onderzoeksbestand met 134 URL's, de meetopzet en de open punten: `onderzoek/bibliotheken-2026-10-09.md`. De kern staat hier.

- [ECharts changelog](https://echarts.apache.org/en/changelog.html): 6.0.0 op 2025-07-30, 6.1.0 op 2026-05-18/19
- [ECharts release 6.1.0](https://github.com/apache/echarts/releases/tag/6.1.0): dataMin/dataMax, containShape, matrix triggerEvent, XSS-fix lines-tooltip
- [ECharts v6 features](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/) en [upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/): nieuw thema, setTheme/darkMode, matrix, custom-series-registry, axis breaks
- [apache/echarts-custom-series](https://github.com/apache/echarts-custom-series): acht `@echarts-x/custom-*`-pakketten, geen waterfall, bullet of brug
- [ECharts handbook: aria](https://echarts.apache.org/handbook/en/best-practices/aria/): role img + label, decal, geen toetsenbord
- [ECharts handbook: canvas vs SVG](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/), [SSR](https://echarts.apache.org/handbook/en/how-to/cross-platform/server/)
- [ECharts typings 6.1.0](https://unpkg.com/echarts@6.1.0/types/dist/shared.d.ts): registerCustomSeries, setTheme, axis.breaks, decal
- [vue-echarts](https://github.com/ecomfe/vue-echarts): 8.3.2, props, events, slots `#tooltip`, `#dataView`, `#graphic`
- [WAI-ARIA 1.2: img](https://www.w3.org/TR/wai-aria-1.2/#img): kinderen van role img zijn presentational
- [Highcharts shop](https://shop.highcharts.com/) en [accessibility module](https://www.highcharts.com/docs/accessibility/accessibility-module); [highcharts-vue](https://www.npmjs.com/package/highcharts-vue)
- [AG Charts pricing](https://www.ag-grid.com/charts/license-pricing/), [community vs enterprise](https://www.ag-grid.com/charts/javascript/community-vs-enterprise/), [accessibility](https://www.ag-grid.com/charts/javascript/accessibility/)
- [Chart.js accessibility](https://www.chartjs.org/docs/latest/general/accessibility.html), [vue-chartjs](https://www.npmjs.com/package/vue-chartjs)
- [ApexCharts LICENSE](https://github.com/apexcharts/apexcharts.js/blob/main/LICENSE) en [pricing](https://apexcharts.com/pricing): gratis alleen onder 2 mln USD omzet
- [Plotly.js](https://www.npmjs.com/package/plotly.js), [Vega-Lite](https://www.npmjs.com/package/vega-lite), [Observable Plot](https://www.npmjs.com/package/@observablehq/plot), [D3](https://www.npmjs.com/package/d3)
- [Unovis](https://github.com/f5/unovis) en [@unovis/vue](https://www.npmjs.com/package/@unovis/vue); [amCharts 5 accessibility](https://www.amcharts.com/docs/v5/concepts/accessibility/) en [LICENSE](https://github.com/amcharts/amcharts5/blob/master/LICENSE)
- [Syncfusion community license](https://www.syncfusion.com/products/communitylicense), [DevExtreme buy](https://js.devexpress.com/Buy/), [Kendo purchase](https://www.telerik.com/purchase/kendo-ui)
- [Recharts accessibility](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility), [Vercel acquires Tremor](https://vercel.com/blog/vercel-acquires-tremor), [visx](https://github.com/airbnb/visx), [Nivo](https://github.com/plouc/nivo), [LayerChart](https://github.com/techniq/layerchart)
- [IBCS: ISO 24896 persbericht](https://www.ibcs.com/iso-24896-press-release/), [graphomate](https://www.ibcs.com/software/graphomate/), [npm search ibcs](https://www.npmjs.com/search?q=ibcs), [ibcs-react](https://www.npmjs.com/package/ibcs-react)
- [NumberFlow voor Vue](https://number-flow.barvian.me/vue), [@lucide/vue](https://www.npmjs.com/package/@lucide/vue), [lucide-vue-next (deprecated)](https://www.npmjs.com/package/lucide-vue-next), [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons), [motion-vue](https://github.com/motiondivision/motion-vue)
- [@tanstack/vue-table](https://www.npmjs.com/package/@tanstack/vue-table) (9.x, nieuwe API), [@tanstack/vue-virtual](https://www.npmjs.com/package/@tanstack/vue-virtual), [AG Grid community vs enterprise](https://www.ag-grid.com/vue-data-grid/community-vs-enterprise/)
