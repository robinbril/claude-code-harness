# Patronen voor finance-rapporten

Wanneer lezen: bij elke finance-pagina (overzicht, winstgevendheid, uren, commissie, cash) en bij elke vraag "welke visual past hier". Externe claims staan met bron-URL; **[eigen keuze]** is een ontwerpbeslissing uit het onderzoek of de backoffice zonder externe bron. Volledige lijst: `bronnen.md`. Origineel: `reforge-backoffice-dataviz/.harness/onderzoek/reports/Power BI finance rapportontwerp.md` (ook in `~/Desktop/Analytics ontwerp Power BI-stijl/`).

## Inhoud

1. Grammatica van de pagina: 3-30-300
2. KPI-kaart
3. IBCS-notatie: scenario's en afwijkingen
4. Prognose naast realisatie
5. Waterval en brug
6. Afwijking per rij: dumbbell, pins, divergerende balk
7. Matrix met databalken
8. Klantconcentratie
9. Bullet in plaats van gauge
10. Small multiples
11. Cash, debiteuren en staffing-KPI's
12. Welke visual bij welke vraag
13. Top-10 financieel overzicht en rendement
14. Wat de backoffice nu toont
15. Niet doen

## 1. Grammatica van de pagina: 3-30-300

- **3 seconden**: overzicht linksboven, cards of lijngrafieken met conditional formatting. **30 seconden**: filteren en inzoomen met staafdiagrammen en cross-filtering. **300 seconden**: detail op aanvraag rechtsonder, matrices en drill-through ([SQLBI](https://www.sqlbi.com/articles/introducing-the-3-30-300-rule-for-better-reports/)).
- Hoogste aggregatieniveau linksboven, **niet meer dan drie of vier cijfers per getal** (schaal naar k of mln), geen tijdvakken door elkaar, consistente assen, volgordes en kleuren ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips)).
- Referentiecanvas 1920x1080, de paginagrootte van het Fluent 2-thema ([Fluent2-CY26SU08.json](https://github.com/microsoft/fabric-toolbox/blob/main/monitoring/query-capacity-correlation/Template/Query%20Capacity%20Correlation.Report/StaticResources/SharedResources/BaseThemes/Fluent2-CY26SU08.json)).
- Microsoft noemt geen maximum aantal visuals: "limit the number of visuals… to only what is necessary" ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/guidance/power-bi-optimization)). Huisregel: zes tot acht datavisuals per pagina **[eigen keuze]**.
- Een top-10 is geen tien visuals op één canvas: nummers 1 tot en met 5 op het canvas, de rest subpagina, tooltip of drill-through.

Vue-opbouw: kop met titel en slicerrij, KPI-rij, middenband met een tijdreeks en een afwijkings- of brugvisual, detailmatrix onderaan, op een raster van twaalf kolommen (`RapportPagina`, klassen `rp-4` tot `rp-12`).

## 2. KPI-kaart

**Bronnen.**
- De nieuwe Power BI-card is sinds november 2025 GA, met drie zones: callout, afbeelding en reference labels; Microsofts voorbeeld zet "Revenue variance" met "Revenue % to target" als detail en een SVG-sparkline van zes maanden in het afbeeldingsgebied ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-card)).
- Tabular Editor: vijf onderdelen (waarde, target, gap, trend, label); de gap is "the most important element"; toon de gap absoluut én in procenten; kleur de gap, niet de waarde; altijd een richtingssymbool; hooguit vijf KPI's per pagina; afronden ("518M" in plaats van "517,893,412"); geen gauges ([Tabular Editor](https://tabulareditor.com/blog/kpi-card-best-practices-dashboard-design)).
- Conflict: IBCS noemde sparklines in 2018 een verkeerde visualisatie ([IBCS](https://www.ibcs.com/resource/top-and-bottom-5-of-international-business-communication-standards/)). Middenweg: een mini-trend met een referentielijn en gelabelde eindwaarde, en nooit sparklines overal.

**Anatomie in de backoffice** (`components/dashboard/KpiStrip.vue`, `kpiRaster.ts`, contract `types.ts`):
- Elk cijfer een eigen wit vlak op het canvas, even breed en even hoog. Volgorde op elke kaart: label (12px, 600, `--text-2`), waarde 28px semibold proportionele cijfers, daaronder delta met icoon (`trendUp`, `trendDown`, `minus`) en tekst plus een `sr-only`-zin voluit, dan de vergelijking ("t.o.v. € 2,45 mln vorig jaar"), onderaan op een eigen rij de sparkline (120x26).
- `KpiDelta.toon` (`goed`, `slecht`, `neutraal`) volgt de polariteit van de measure; alleen de delta krijgt kleur (`--ok-ink`, `--danger-ink`).
- Hooguit **vier** in code (`MAX = 4`); bronnen staan vijf toe. Een vijfde vraagt een bewuste wijziging van `KpiStrip.vue` en `kpiRaster.ts`.
- Een cijfer zonder waarde krijgt geen kaart; één gedempte regel zegt welke ontbreken. Nooit "Nog geen data"-kaarten.
- Indeling op de gemeten breedte van de rij, niet van het scherm: alles naast elkaar als elke waarde past (`kaartMinimum` = 32px padding + tekens x 0,5em x 28px, minimaal 160px), anders twee kolommen (bij een oneven aantal neemt de eerste kaart, de held, de hele eerste rij), anders één kolom met compacte regels (label links, waarde 22px rechts, geen sparkline).
- `klikbaar`: elke kaart wordt een knop met `aria-pressed` en emit `kies`; de pagina haalt dan die reeks naar voren in de maandgrafiek.
- Brutomarge als held met de split detachering/werving eronder (`KpiAanvulling` in `FinanceView.vue`), uitleg achter ⓘ.

## 3. IBCS-notatie: scenario's en afwijkingen

- Scenario's via vulling: **realisatie (AC) massief donker, vorig jaar (PY) lichtgrijs, plan (PL) omlijnd, prognose (FC) gearceerd** ([Zebra BI](https://zebrabi.com/ibcs/); [IBCS](https://www.ibcs.com/resource/top-and-bottom-5-of-international-business-communication-standards/)).
- Kleur alleen voor afwijkingen: groen gunstig, rood ongunstig, naar business-impact: "a negative variance is not necessarily a negative number", hogere kosten zijn rood ([Zebra BI](https://zebrabi.com/ibcs/)).
- Absolute afwijkingen als balken, relatieve als dunne pins ([IBCS EX 1.1](https://www.ibcs.com/standards/page/3/)). Tijd horizontaal, structuur (P&L-regels, klanten, units) verticaal ([Zebra BI](https://zebrabi.com/ibcs/)).
- **Table template 02**: kolommen PY, PL, AC, ΔPY, ΔPL, ΔPL%, met balken en pins, hiërarchische P&L-rijen met totalen ([IBCS](https://www.ibcs.com/resource/table-template-02/)). **Chart template C06** (v2.0, juli 2025): gegroepeerde AC/PL/PY-balken plus een verticale waterfall van de absolute afwijkingen, tot 25 elementen, gesorteerd op afwijking tot plan ([IBCS](https://www.ibcs.com/resource/chart-template-06/)).
- Omdat rood en groen voor deuteranopen vrijwel samenvallen (zie `tokens-en-typografie.md`), krijgt elke afwijking ook een teken (+/−), een ▲/▼ of een balkrichting.

In ECharts: omlijnd = transparante vulling met rand; gearceerd = decal (in gebruik via `arcering()` in `kleursets.ts`); pin = heel smalle balk met een cirkel op de top; waterval = zwevende balken met `van` en `tot`.

## 4. Prognose naast realisatie

- Cutoff op de laatste datum met realisatie; per periode **óf** realisatie **óf** prognose, nooit beide; doorgetrokken voor realisatie, gestippeld voor prognose ([SQLBI](https://www.sqlbi.com/articles/showing-actuals-and-forecasts-in-the-same-chart-with-power-bi/), 2020).
- Maand en YTD vergelijken AC met PL, het jaar FC met PL ([Zebra BI](https://help.zebrabi.com/displaying-forecasts-in-charts-and-tables)).
- Backoffice: de lopende maand staat apart (`lopend: true`), telt niet mee in KPI's, brug en klanten, en is gedempt (dekking x 0,55, "lopend" cursief onder de maandnaam, de lijn ernaartoe op 40%). De vooruitblik in `WeekMarge` is gearceerd.

## 5. Waterval en brug

- Waterfall: "show a running total as values are added or subtracted" ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview)); sorteer stappen op absolute afwijking ([IBCS C06](https://www.ibcs.com/resource/chart-template-06/)). Zebra BI en Inforiver bouwen omzet-, marge- en cashbruggen ([Zebra BI](https://zebrabi.com/template/income-statement-dashboard-in-power-bi/); [Inforiver](https://inforiver.com/blog/general/variance-analysis-powerbi-inforiver-charts/)).
- **Resultaatbrug** (Overzicht, `BrugGrafiek.vue` + `brugOptie.ts`): omzet → directe kosten → brutomarge → personeel → overige kosten → rente/overig → nettoresultaat, sluit op de cent (spec R4). Totalen op nul in hun reekskleur, stappen zweven, verbindingslijn 1px, label met teken, liggend als de namen niet passen (`brugMoetLiggend`).
- **"Van forecast naar netto marge"** (Winstgevendheid, `forecastBrug.ts`, in ontwikkeling 2026-10-08): forecast brutomarge op nul, dan de grootste afwijkingen boven de forecast (hooguit drie rijen, `BRUG_TOP = 3`, de rest samen als "Overige"), de grootste eronder, de actual brutomarge als totaal, commissie en bonus als afname, netto marge als totaal. Alleen rijen met forecast, actual en netto marge doen mee, zodat de brug op de euro sluit; de ondertitel zegt hoeveel er ontbreken. Geen rangtaal. Deze brug verving de scatter "uren per week x marge per uur", die Robin afkeurde. Omdat de stappen afwijkingen zijn, kleurt bij en af als vulling in `--ok` en `--danger` (prop `afwijking` op `BrugGrafiek`; de `-ink`-tinten ogen als balk bruin); de resultaatbrug hierboven houdt de reekskleuren.
- Verder bruikbaar: EBITDA-bridge PL → AC, margebridge PY → AC (volume, tarief, loon en werkgeverslasten, mix, perm fees), cashbridge (begin, ontvangsten, loon, overig, eind), MRR-bridge in een SaaS. Allemaal dezelfde brugcomponent.

## 6. Afwijking per rij: dumbbell, pins, divergerende balk

- **Dumbbell** "Waar wijken we af van de forecast?" (`AfwijkingGrafiek.vue` + `afwijkingOptie.ts`): open cirkel = forecast, gevulde stip = actual, de lijn ertussen is de afwijking. Rijen van groot naar klein op afwijking in euro; "Overig" zonder markering, alleen tekst. Kleur volgt de maat (omzet of brutomarge), nooit rang of richting. Naam links, afwijking in euro en procent met pijl en teken rechts. Advies van de raad: top 10 tot 15 rijen.
- **Divergerende databalk** in de tabel (`AfwijkingMeter.vue` + `afwijking.ts`): pijl, verschil met teken en procent, en een staafje vanaf nul naar links (onder forecast) of rechts (erboven), één schaal per niveau. Zonder vergelijking niets zichtbaars; schermlezers horen waarom.
- Een afwijking bestaat alleen als forecast en actual allebei bekend zijn; ontbrekend is niet "0 afwijking" (`afwijking.ts`).
- **Pins** voor relatieve afwijkingen in IBCS-tabellen (sectie 3).

## 7. Matrix met databalken

- Matrices voor exacte waarden en hiërarchieën; conditional formatting met data bars ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview)); in de 300-secondenlaag ([SQLBI](https://www.sqlbi.com/articles/introducing-the-3-30-300-rule-for-better-reports/)). Geen ongefilterde tabel als default, Top N ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/guidance/power-bi-optimization)).
- Backoffice `MatrixVisual.vue` + `matrix.ts`: rijgroepen met ⊞/⊟, subtotaal per groep (de pagina rekent), eindtotaal, getallen rechts in tabelcijfers, databalk achter een bedrag (reekskleur, zacht), schaal per niveau, geen zebra, kop blijft staan als de matrix in zijn kaart scrolt, "Toon meer" (standaard 10 rijen, stap 10), pijltjes, Home en End. Eén groep staat standaard open.
- Uren: rij per plaatsing, kolom per maand (laatste zes, ouder samen in "Eerder"), totaalkolom met databalk, totaalrij; een klik zet de plaatsingslicer (cross-filter). Commissie: per medewerker een groep met subtotaal.

## 8. Klantconcentratie

- Pareto/ABC: gesorteerde balken, cumulatieve %-lijn en 80%-lijn, op omzet én marge ([DAX Patterns](https://www.daxpatterns.com/?p=2381)). Meer dan 40% van de debiteuren bij één klant is concentratierisico ([Forwardly](https://www.forwardly.com/blog/staffing-agency-kpis-every-finance-team-should-track)).
- Backoffice "Omzet per klant" (`KlantenGrafiek.vue` + `klantenOptie.ts`): liggende staven aflopend op omzet, top 8 plus "Overig (n)" onderaan in neutraal (spec R5), één kleur, kleur per klant-ID, een streepje in inkt voor de omzet in de vergelijkperiode. Een cumulatieve lijn staat er (nog) niet in.

## 9. Bullet in plaats van gauge

- Few ontwierp de bullet graph "to replace the meters and gauges": realisatiebalk, target-tick, twee tot vijf grijze banden (bij voorkeur drie), varianten voor negatief en voor kosten ([Perceptual Edge](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf)). Banden alleen als stakeholders het over de grenzen eens zijn ([SQLBI](https://www.sqlbi.com/articles/building-bullet-charts-in-power-bi-reports/)).
- Taart alleen bij drie delen of minder, geen negatieve waarden of realisatie boven 100% ([SQLBI](https://www.sqlbi.com/articles/using-pie-charts-is-not-the-end-of-the-world/)).
- Backoffice: commissie opgebouwd en vrijgegeven per medewerker als bullet, op naam, geen ranglijst (`CommissionView.vue`). Bezettingsgraad per team: bullet in plaats van gauge; omzetmix werving vs detachering: één 100%-balk in plaats van donut.

## 10. Small multiples

Altijd dezelfde schaal in elk paneel ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview); [Zebra BI](https://zebrabi.com/template/income-statement-dashboard-in-power-bi/)). Gebruik ze in plaats van een negende reeks of een tweede as.

## 11. Cash, debiteuren en staffing-KPI's

- Ouderdomsbuckets (lopend, 1-30, 31-60, 61-90, 90+), DSO samen met inningsefficiëntie en oninbaar ([Sigma](https://www.sigmacomputing.com/blog/accounts-receivable-dashboard)). Staffing: DSO wekelijks, bij 61-90 dagen direct navragen, **payroll funding gap** als eigen KPI ([Forwardly](https://www.forwardly.com/blog/staffing-agency-kpis-every-finance-team-should-track)). Factoringkosten als opex, nooit gesaldeerd met omzet ([Beancount](https://beancount.io/blog/2026/05/18/staffing-agency-accounting-bill-rate-vs-pay-rate-burdened-costs-gross-margin-placement-type-invoice-factoring-payroll-funding-guide)).
- **Robin**: debiteuren naar ouderdom als **één 100%-balk** in een sequentiële warme reeks (later = donkerder), niet als gestapelde balken per maand (`VerdelingBalk.vue`); een klik op een vlak toont de opbouw. Taken naar hoe laat ze zijn in dezelfde reeks.
- Brutomarge per plaatsingstype, spread (tarief min loon), brutowinst per uur (tarief min loon min werkgeverslasten). Opslag en marge nooit door elkaar: **50% opslag op $20 loon is 33% marge vóór en 20% marge ná $4 werkgeverslasten per uur** ([Beancount](https://beancount.io/blog/2026/05/18/staffing-agency-accounting-bill-rate-vs-pay-rate-burdened-costs-gross-margin-placement-type-invoice-factoring-payroll-funding-guide)). Benchmarks zijn Amerikaans; gebruik eigen PL en PY als referentie ([SPI Research](https://spiresearch.com/the-truth-about-billable-utilization/)).
- **Weekmarge detachering** (`WeekMarge.vue`): dunne weekkolommen, run-rate als gestippelde referentielijn over precies de vier weken die hij middelt, de vier weken ervoor lichter; vooruit de **aflopende marge "contractueel, vóór verlengingen"** als trap. **Aansluitingsregel** onder de maandgrafiek: operationele marge tegen grootboek, met uitleg achter ⓘ (`aansluiting` in `components/finance/operationeel.ts`). Bedragen in één zin krijgen dezelfde precisie ("€ 18,0k" naast "€ 19,2k", `euroK`).
- Contract-runway: marge die wegvalt als contracten de komende 3 tot 6 maanden niet verlengd worden **[eigen keuze]**; Bullhorn noemt redeployment "the cheapest revenue available" ([Bullhorn](https://www.bullhorn.com/blog/what-is-redeployment/)).

## 12. Welke visual bij welke vraag

| Zakelijke vraag | Visual | Valkuil | Bron |
|---|---|---|---|
| Welke P&L-regel wijkt af, met exacte bedragen? | Matrix met ΔPY/ΔPL-balken en ΔPL%-pins | Hoort in de 300-secondenlaag | [IBCS](https://www.ibcs.com/resource/table-template-02/) |
| Welke klanten zijn groot maar dun? | Scatter met kwadrantlijnen | Robin keurde een scatter uren x marge/uur af: alleen met een vraag die een scatter echt nodig heeft | [SQLBI](https://www.sqlbi.com/articles/using-scatterplots-to-find-details-in-reports/) |
| Hoe geconcentreerd zijn omzet en marge? | Pareto/ABC | Op omzet én marge | [DAX Patterns](https://www.daxpatterns.com/?p=2381) |
| Wie veroorzaakt een afwijking over 2 tot 4 dimensies? | Breadcrumb-drill over gesorteerde afwijkingsbalken | AI-splits zijn Power BI-ML; gebruik vaste drillpaden | [Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/sample-corporate-spend) |
| Wat verklaart de marge per plaatsing? | Key influencers | Minstens 100 observaties per state | [Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-influencers) |
| Vertonen alle units hetzelfde patroon? | Small multiples | Gedeelde schaal | [Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview) |
| Hoe bouwt het resultaat zich op? | Waterval/brug | Sorteer op absolute afwijking | [IBCS](https://www.ibcs.com/resource/chart-template-06/) |
| Vergelijking in de tijd / categorieën met lange namen | Kolommen / liggende balken | | [Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualizations-overview) |

## 13. Top-10 financieel overzicht en rendement

Rangorde is een synthese uit de bronnen; te bouwen hangt af van de data (PL en FC per maand, werkgeverslasten per plaatsing).

**Financieel overzicht**: 1 KPI-rij (omzet YTD, brutomarge € en %, EBITDA, loonfinancieringskloof, DSO, elk met ΔPL en ΔPY) · 2 maandkolommen omzet en marge (AC massief, FC gearceerd, PL omlijnd, ΔPL%-pins) · 3 IBCS-P&L-tabel · 4 EBITDA-bridge PL → AC · 5 debiteurenouderdom · 6 cumulatieve YTD-lijn (tooltip bij 2) · 7 cashbridge (subpagina) · 8 debiteurentabel per klant met 40%-markering (drill-through) · 9 Pareto klantconcentratie · 10 contract-runway.

**Rendement**: 1 KPI-rij (brutomarge% detachering, brutowinst per uur, spread, bezettingsgraad, gemiddelde perm fee) · 2 margebridge PY → AC · 3 klantportfolio-scatter · 4 brutowinst per uur per klant of functie met PL/PY-tick · 5 matrix klant x maand · 6 brutomarge per verdienmodel · 7 small multiples per accountmanager · 8 bezettingsgraad per team als bullet · 9 Pareto op marge · 10 variance-drill op ΔPL.

## 14. Wat de backoffice nu toont (stand 2026-10-08)

Uit de kopcommentaren van de views; visuals gemarkeerd met * zijn **in ontwikkeling (2026-10-08)**.

- **Overzicht** (`views/FinanceView.vue`): slicers periode, vergelijking en entiteit in de URL; KpiStrip (omzet, brutomarge met split detachering/werving*, marge %, netto); maandgrafiek (`rp-7`) met aansluitingsregel*; Marge per week detachering (`rp-5`, terug en vooruit)*; Resultaatbrug en Omzet per klant (`rp-6` naast elkaar); kop "Stand van vandaag" met posities (`rp-4`), debiteuren naar ouderdom als 100%-balk en meeste vervallen per klant; financiële taken; berichten; assistent rechts of als blad*.
- **Winstgevendheid** (`views/ProfitabilityView.vue`): slicers zoeken, niveau als tegels, entiteit; vier kerncijfers (realisatie, brutomarge, netto na commissie, marge per uur detachering)*; band met de brug "Van forecast naar netto marge"* en rechts de marge per uur per klant (plaatsingniveau) of netto na commissie per rij, op naam en zonder rangorde*; dumbbell "waar wijken we af"; tabel van alle rijen met divergerende databalk en detailpaneel, 25 per pagina. Geen matrix met openklappen: de API levert één niveau per aanvraag, het niveau is de tegelslicer.
- **Uren** (`views/HoursView.vue`): slicers plaatsing en venster; wachtende uren als 100%-balk; uren klaar om te factureren per maand; matrix klaar om te factureren; kerncijfers en weekgrafiek van de gekozen plaatsing.
- **Commissie** (`views/CommissionView.vue`): slicers entiteit en jaar; één melding over je rol; cards bruto, opgebouwd, vrijgegeven, vastgelegd; bullet per medewerker op naam; commissie per kwartaalrun; matrix commissieregels per medewerker; beheer onderaan.

Wat de raad van drie stemmen voor de KPI's adviseerde staat in `oordeel-robin-2026-10-08.md`.

## 15. Niet doen

| Niet doen | Waarom | Wel doen |
|---|---|---|
| Gauges, snelheidsmeters | Hoeken lezen slecht, geen negatief of >100% ([Perceptual Edge](https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf)) | Bullet of card met ΔPL |
| Taart of donut met meer dan drie delen | Hoek en oppervlak lezen slechter dan lengte ([SQLBI](https://www.sqlbi.com/articles/using-pie-charts-is-not-the-end-of-the-world/)) | Gesorteerde balken of één 100%-balk |
| 3D, zware schaduwen, decoratie | Lage informatiedichtheid ([Zebra BI](https://zebrabi.com/ibcs/)) | 1px-rand, geen schaduw, titel en subtitel |
| De KPI-waarde kleuren | Het signaal zit in de gap ([Tabular Editor](https://tabulareditor.com/blog/kpi-card-best-practices-dashboard-design)) | Alleen de delta, met teken en pijl |
| Afwijking kleuren naar wiskundig teken | Hogere kosten zijn ongunstig ([Zebra BI](https://zebrabi.com/ibcs/)) | Polariteit per measure |
| Afgeknotte assen, verschillende schalen in small multiples | IBCS eist consistente schaal | Nulbasis, gedeelde schaal |
| Tijdvakken mengen | Misleidend ([Microsoft Learn](https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips)) | Eén periodebasis en "data t/m" |
| Meer dan vijf KPI's, tabellen als data dump | "a sea of numbers" ([SQLBI](https://www.sqlbi.com/articles/introducing-the-3-30-300-rule-for-better-reports/)) | Hooguit 5 (backoffice 4); Top N; drill-through |
| Opslag en marge door elkaar; factoring saldeert met omzet | Marge oogt beter dan ze is ([Beancount](https://beancount.io/blog/2026/05/18/staffing-agency-accounting-bill-rate-vs-pay-rate-burdened-costs-gross-margin-placement-type-invoice-factoring-payroll-funding-guide)) | "Brutomarge %" t.o.v. omzet; factoring als opex |
| Amerikaanse benchmarks als norm | Andere markt ([SPI Research](https://spiresearch.com/the-truth-about-billable-utilization/)) | Eigen PL en PY als referentielijn |
| Gauges, donuts, sparklines overal, DSO-trend, budgetlijnen, cashprognose, leaderboards toevoegen | Raad van drie, 2026-10-08: ruilen, niet stapelen | Zie `oordeel-robin-2026-10-08.md` |
