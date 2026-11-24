# Navigatie, slicers, visual headers en detail op aanvraag

Wanneer lezen: bij het rapportmenu of de zijbalk, bij slicers en filters, bij de kop van een visual (iconen, ⓘ, focus, tabel) en bij drill-through of tooltips. Externe claims met bron; **[eigen keuze]** is een ontwerpbeslissing zonder externe bron.

## 1. Menu uit één route-config

- Power BI's page navigator synchroniseert automatisch: labels volgen de paginanamen, volgorde de paginavolgorde, de geselecteerde knop hoort bij de huidige pagina; toevoegen, verwijderen of hernoemen werkt het menu vanzelf bij. Aparte "Selected"-stijl ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/button-navigators)). Knoppen hebben vijf states: default, hover, pressed, disabled, loading ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-buttons)).
- Zijnavigatie voor "one cohesive data story", een header met navigatie als het rapport meerdere doelgroepen bedient ([endjin](https://endjin.com/blog/2024/03/how-to-build-navigation-in-power-bi)). Power BI-apps hebben secties die standaard ingeklapt zijn ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-create-distribute-apps)). Hiërarchie van overzicht naar gefilterde views naar detail ([SQLBI](https://www.sqlbi.com/articles/introducing-the-3-30-300-rule-for-better-reports/)). Geen bron noemt een maximum aantal pagina's.
- Toetsenbord zoals Power BI: Ctrl+F6 wisselt tussen paginatabs en canvas, pijltjes of Tab verplaatsen de focus, de schermlezer zegt titel en selectiestatus, Enter of spatie opent; "Skip to main content" bij de eerste Tab ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/explore-reports/desktop-accessibility-consuming-tools)). In Vue: een tablist met roving tabindex.

**Backoffice** (`components/shell/nav.ts`, `AppSidebar.vue`, in ontwikkeling 2026-10-08):
- De Finance-groep is één samenhangend verhaal: rapporten (Overzicht, Winstgevendheid, Commissie, Uren) en afhandelwerk (Mijn beloning, Begunstigden, Betalingen, Partnerfacturen). Secties staan in dezelfde nav-config als de items (`secties` met `routes`), zodat command-palette, inklapstand en actief item één bron houden. Geen item of route weg.
- Robin vond zichtbare tussenkoppen "Rapporten"/"Afhandeling" "heel awkward": de sectie wordt een dunne scheidingslijn; de naam blijft voor schermlezers.
- Actief item in Fluent 2-stijl: rijen van 34px, afgeronde accentstreep van 3px links, lichte accenttint, halfvet label; focus 2px outline.
- Drill-through- en detailviews zijn verborgen child-routes die nooit in het menu staan.

## 2. Bookmarks: alleen voor opgeslagen weergaven

- Een bookmark legt de hele paginastaat vast; valkuilen: een later toegevoegde slicer wordt gewist, posities worden niet hersteld, met meerdere bookmark-navigators kan de actieve staat onjuist zijn ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-bookmarks); [Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/button-navigators)). Explicit Measures, mei 2026: bookmarks voor UI zijn "incredibly hard to manage"; liever het filter pane dan een verborgen fly-out ([powerbi.tips](https://powerbi.tips/2026/05/08/explicit-measures-podcast-episode-526/)).
- In Vue: een wissel grafiek/tabel of grafiektype is componentstate per visual (`DashboardKaart` tabel-knop, `WeergavePaneel`). De legitieme bookmark is een benoemde filterstaat in de URL of database. Robin wil geen paginatoggles en geen hub met tabs die pagina's vervangt.

## 3. Slicers

**Bronnen.**
- Button slicer (GA): tegels met callout-waarden en conditional formatting; valkuil bij geforceerde selectie: als een ander filter de gekozen waarde verbergt, oogt de slicer leeg terwijl hij nog filtert ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-button-slicer)). List slicer (preview): hiërarchie, zoeken, gum om te wissen ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-list-slicer)).
- Date picker met ankers Today, First date en **Last date** ("useful when your data isn't current"); kies Months (Calendar) zodat een halve lopende maand niet tegen volle maanden staat; relatieve weken beginnen in Power BI altijd op zondag ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/desktop-slicer-filter-date-range)). Een Nederlandse app doet het beter met ISO-weken en eigen boekperiodes.
- Slicers op elke pagina op dezelfde plek ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)), nooit linksboven in de KPI-zone ([SQLBI](https://www.sqlbi.com/articles/introducing-the-3-30-300-rule-for-better-reports/)), bovenaan richting rechts; niet-essentiële slicers naar het filter pane ([SSW Rules](https://www.ssw.com.au/rules/do-you-place-your-slicers-consistently)).
- Filter pane: toegepaste en beschikbare filterkaarten in een andere kleur, technische filters vergrendeld of verborgen, en bij hover op een visual een alleen-lezen lijst van de filters die hem raken ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-report-filter)); "Clear all slicers" ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-buttons)); "data t/m [datum]" naast de periodeslicer ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/desktop-slicer-filter-date-range)).

**Backoffice.**
- `RapportPagina` zet de slicers als één witte band boven de visuals (`.rp__slicers`), met `role="group"` en een naam voor schermlezers.
- `SlicerTegels.vue`: bijschrift boven ("Periode", "Niveau") en aaneengesloten tegels; gekozen tegel gevuld; een echte radiogroep (Tab landt op de gekozen tegel, pijltjes en Home/End kiezen meteen); extra attributen per optie blijven op de knop (`data-periode`). Ook bruikbaar als weergavewissel in een kaartkop (Marge per week: terug/vooruit).
- `SlicerVeld.vue`: bijschrift plus een compacte keuzelijst (32px, 4px hoeken) uit de bestaande `Select`; ⓘ naast het bijschrift, niet als losse regel.
- Filterstaat in de URL (`?periode=6m&vergelijk=...&entiteit=5`), dus een link opent dezelfde weergave. Een klik op een maandkolom filtert de hele pagina en zet een chip "Gefilterd op ..." die het opheft (cross-filter) [eigen keuze: filter in plaats van highlight, omdat highlight-geesten als waarden gelezen worden].
- Robin keurde af: afgekapte zoekvelden en rijen vol knoppen ("100 knoppen"). Liever twee of drie slicers in de band en de rest weg of in een filter pane.

## 4. Visual header

- Power BI: compacte header binnen de visual, rechts op de titelregel; per icoon aan of uit: drill (alleen bij hiërarchie), filter, focusmodus, more options (sorteren, exporteren, tonen als tabel), help-tooltip ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-format-pane-overview); [Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-visual-elements-for-reports)). Alt+Shift+F10 springt naar de header; de "Show data" uit de header is **niet** screenreader-vriendelijk ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/explore-reports/desktop-accessibility-consuming-tools)): hier wint een web-app met een echte `<table>`.
- Titel met subtitel (eenheid, periode) vervangt losse tekstvakken ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-format-pane-overview)).

**Backoffice `DashboardKaart.vue`**: titel (h2) met ⓘ ernaast, hooguit één gedempte regel uitkomst als subtitel, rechtsboven alleen iconen die verschijnen bij hover of `focus-within` (op aanraakschermen altijd): Uitleg (het assistentmerk "/" op 14px, "Leg deze grafiek uit", alleen met assistent en `visualId`; nooit een sparkle), Tabel ("Toon als tabel", `aria-pressed`), Export (CSV), Focusmodus (bijna schermvullend, Esc of "Terug naar rapport", focus gevangen en daarna terug op de knop), Meer (… met de Weergave-keuzes). Een ingedrukte of open knop houdt de rij zichtbaar. Geen kaart-in-kaart: de grafiek rendert direct op het kaartvlak. Verversen dimt de vorige weergave in plaats van een skelet te flitsen.

## 5. Toelichting, tooltips en drill-through

- Tooltip-pagina's: standaard 320x240 px, niet interactief, altijd verborgen; voor een ander perspectief, extra detail of uitleg ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/guidance/report-page-tooltips)). Harde regel: "Don't use tooltips to convey important information" ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)).
- Drill-through voor diepte of bredere context; behoud de terugknop en help de gebruiker het te ontdekken ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/guidance/report-drillthrough)). In Vue: verborgen child-route met breadcrumb, terugknop en de drillcontext in de titel.
- **Robin**: geen gestapelde notities onder een kaart. Toelichting zit achter één rustige ⓘ (`InfoTip.vue`): echte knop met `aria-describedby`, opent op hover (120ms vertraging), focus en tik, Esc sluit, de tekst staat altijd in het DOM (dicht visueel verborgen, open via Teleport). `toon="let-op"` maakt er een waarschuwingsdriehoek van voor een onvolledige vergelijking, zonder extra regel tekst.
- Eén rustige melding per pagina (`RapportBanner.vue`): wat je rol hier wel en niet mag, uitleg achter de ⓘ, nooit per visual herhaald.

## 6. Dichtheid en lange lijsten

- Microsoft: zo weinig visuals als nodig, detail naar drill-through en tooltips ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/guidance/power-bi-optimization)); squint-test voor data labels ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-accessibility-creating-reports)).
- Huisregel zes tot acht datavisuals per pagina **[eigen keuze]**; Robin: ruilen, niet stapelen.
- Lijsten beginnen klein: `useToonMeer` toont 5 rijen en zet er per klik 10 bij, met de focus op de eerste nieuwe rij; `ToonMeer.vue` is één rustige knop "Toon meer (n)" die verdwijnt als alles getoond is. Matrix standaard 10 rijen, `WaardeBalken` 8. Robin wil niet alle rijen tegelijk.
- Labels op één regel; afkappen alleen als laatste redmiddel, met de volle tekst in `title`, aria-label en tabel. Een afgekapte titel ("DEMO factuur klaarz…") kostte de takenlijst punten; de oorzaak (het voorvoegsel "DEMO ") is uit de demo-data gehaald.
