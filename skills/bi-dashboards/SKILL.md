---
name: bi-dashboards
description: Power BI-stijl rapporten en dashboards in eigen web-apps (Vue + ECharts), zonder Power BI te embedden; finance, ATS-analytics (Polpo) en de assistent naast de cijfers. Gebruik bij "Power BI-stijl", "ms-visuals" of "meer visuals", KPI-kaarten, brug of IBCS-afwijking, matrix met databalken, slicers en rapportmenu, ECharts custom series in Vue, doorklikken naar de opbouw achter een getal, aanpasopties per visual, de keuze of herkomst van een chartbibliotheek, rust in lijsten en panelen (herhaalde knoppen, kleur, knopplaatsing), en demo-data voor dashboards. Niet voor een losse vormvraag zonder huisstijl (dataviz) en niet voor Power BI-licenties, DAX of .pbix.
user-invocable: true
---

# /bi-dashboards: rapporten die lezen als een goed Power BI-rapport

De look van een goed Power BI-rapport in 2026 is geen visualgalerij maar discipline: Fluent 2-neutralen, een vast datapalet, 3-30-300-indeling, IBCS-notatie voor scenario's en afwijkingen, en per visual één vraag. Robin koos die look voor alle financiële dashboarding, gebouwd als eigen Vue 3-app met ECharts 6 custom series op de SVG-renderer: geen Power BI-embed, geen Power BI custom visuals. Deze skill is de huisstijl- en systeemlaag. Kleurvalidatie en basis-vormkeuze komen uit de skill `dataviz` (draai `validate_palette.js`, niet op het oog).

De skillnaam is bewust merkvrij. In de producten zelf: geen Power BI- of Microsoft-merk, geen Copilot-logo, -naam, -gradiënt of #464FEB. De assistent draagt het eigen merk van de app (in Reforge-apps de "/"), nooit een orb, sterretje of toverstaf.

Vier woorden sturen alles hieronder:
- **Verbeteren, nooit slopen.** Bestaande pagina's, nav-items, routes en features blijven; je maakt ze beter.
- **Ruilen, niet stapelen.** Een nieuwe visual vervangt een zwakkere lijst, tegel of notitie.
- **Verteller, geen rekenmachine.** De backend rekent elk getal; het taalmodel vertelt alleen.
- **Toetsenbord = hover.** Wat een muis ziet, ziet een toetsenbord ook, en elke grafiek heeft een tabeltweeling.

Volledig onderzoek met 171 bronnen: `~/Desktop/Analytics ontwerp Power BI-stijl/` (LEESMIJ.md eerst). Rapport: `Power BI finance rapportontwerp.md` in die map. Verdieping per onderwerp staat in `references/` naast dit bestand (zie onderaan).

## Procedure (in deze volgorde)

1. **Vraag en data per pagina.** Schrijf de 3-5 vragen op die de lezer met deze pagina beantwoordt, en per vraag welke scenario's de API levert (realisatie AC, plan PL, prognose FC, vorig jaar PY) en of de periode open of afgesloten is. Klaar als: elke geplande visual een vraag in één zin heeft en een ontbrekende vergelijking ontworpen is als "geen vergelijking, met reden", nooit als 0. Een visual zonder vraag gaat er niet op.
2. **Indeling 3-30-300** (SQLBI): linksboven in 3 seconden de KPI-rij, midden in 30 seconden de verkennende visuals, rechtsonder in 300 seconden detail (matrix, tabel). Slicers in één vaste rij bovenaan, nooit in de KPI-zone. Huisregel: zes tot acht datavisuals per pagina.
3. **KPI-rij, maximaal 5 kaarten** (KpiStrip in de backoffice: 4). Per kaart: label, waarde, vergelijking (vorige periode, vorig jaar, forecast of plan), afwijking met teken en pijl, optioneel een trendlijn onder de waarde. Alleen de afwijking krijgt kleur, nooit de waarde zelf. Geen lege kaarten: ontbreekt een bron, dan de reden in een ⓘ, niet "Nog geen data".
4. **Vorm per vraag** (tabel hieronder). Eén y-as. Tijd horizontaal, structuur (klanten, P&L-regels) verticaal.
5. **Ruilen, niet stapelen.** Tel kaarten voor en na; nooit meer dan één erbij zonder reden. Klaar als: bij elke nieuwe visual staat welke oude hij vervangt.
6. **Kleur en tokens.** Categorieën in vaste volgorde uit de kleurset, kleur volgt de entiteit (klant-ID, reeks), nooit de rang. Sequentieel = één tint licht naar donker. Afwijking naar business-impact (hogere kosten = ongunstig). Nieuw palet of nieuw oppervlak? Eerst de `dataviz`-validator, licht en donker, uitvoer in de kopcomment van de code.
7. **Bouwen met de primitieven** (implementatiekaart hieronder). Elke grafiek: een pure optiebouwer, tabeltweeling, toetsenbord = hover, legenda bij 2+ reeksen, directe labels selectief, tekst in tekstkleuren. Laad eerst de design-skills uit `references/mooi-ontwerpen.md` (sectie 1) en geef ze een subagent expliciet mee.
7b. **Doorklikken en aanpassen.** Elk getal opent zijn opbouw in het zijpaneel (`?opbouw=<soort>:<sleutel>`), met een totaal uit dezelfde backendfunctie als de visual. Een optie per visual alleen als ze een vraag beter beantwoordt; wat je ziet staat in de URL, hoe je het ziet in localStorage. Klaar als: elk klikbaar getal een opbouw opent waarvan het totaal gelijk is aan het aangeklikte getal en de regels er op de cent op tellen (`references/aanpassingen-per-visual.md`).
8. **Realistische demo-data.** Een mooie visual met lelijke data wordt afgekeurd. Vul elke bucket, spreid bedragen, meerdere klanten, korte natuurlijke titels (`references/demo-data.md`).
9. **Render en kijk.** Echte app, licht 1440, donker 1440, telefoon 375, met één login per run (de demo-throttle is 10 per uur). Schrijf vooraf op wat je verwacht, lees dan de PNG. 0 consolefouten, geen horizontale scroll, geen labelbotsing. Loop daarna de rustkeuring af (`references/mooi-ontwerpen.md`, sectie 4: herhaling, kleur, plaatsing, getallen, doorklikken, labels, toetsenbord).
10. **Bewijs.** Volledige unit-tests en typecheck, e2e voor de UI-wijziging, en een onafhankelijke keurder voor je "klaar" zegt (checklist onderaan).

## Vorm per vraag

| Vraag | Visual | Niet |
|---|---|---|
| Liggen we op koers? | KPI-kaart met ΔPL/ΔPY, teken en pijl | gauge, snelheidsmeter |
| Hoe ontwikkelt het zich per maand? | dunne kolommen (AC massief, lopende maand lichter, FC gearceerd, PL omlijnd) | 3D, dubbele as |
| Waar komt het verschil vandaan? | waterval/brug (van A naar B in stappen, label met teken), liggend als labels niet passen | gestapelde kolommen |
| Welke regel of klant veroorzaakt het? | IBCS-tabel of matrix met afwijkingsbalk en %-pin | getal-dump |
| Forecast vs actual per item | dumbbell (ring = forecast, stip = actual), op afwijking gesorteerd, top 8 (code) tot 15 (raad: 10-15) + Overig | twee losse balken |
| Hoe afhankelijk zijn we van weinig klanten? | gesorteerde balken top 8 + Overig, streepje voor vorige periode, cumulatief % als tekst | taart met 12 delen |
| Hoe oud zijn de openstaande posten? | één 100%-staaf met een vlak per bucket, warme reeks (later = donkerder), tabeltweeling | vijf rijen met € 0 |
| Hoeveel loopt er achter en hoe erg? | lateness-staaf per bucket + compacte tabel met databalk "te laat" en tekst | gekleurde stip + ⚠ op elke rij |
| Wat is het tempo nu? | weekkolommen + run-rate als gestippelde referentielijn over de weken die hij middelt | dubbele as met lijn |
| Wat valt er weg als contracten stoppen? | trap van resterende run-rate, gearceerd, label "contractueel, vóór verlengingen" | prognose zonder voorbehoud |
| Van forecast naar netto (winstgevendheid) | brug: forecast, top-afwijkingen +/-, actual, commissie en bonus, netto | scatter uren × marge/uur (afgekeurd) |
| Capaciteit tegen doel | bullet (balk, doelstreep, grijze banden) | gauge |
| ATS: waar verliezen we kandidaten? | stage-conversiebalken op aanmelddatum met aantallen en % | funnel-trechter, Sankey |
| ATS: waar blijven ze hangen? | time-in-stage: mediaan, p90, doelstreep per fase | gemiddelde alleen |
| ATS: welke vacatures stallen? | vacatureveroudering gesorteerd met doelstreep en actieve kandidaten | leaderboard per recruiter |

Donut alleen bij 2-3 delen zonder negatieve waarden. Geen leaderboards of ranglijsten van mensen; recruiter- en teamvergelijkingen neutraal benoemen (op naam of alfabetisch).

## Harde regels

Doen:
- Eén periodebasis per pagina, met "data t/m" en open of afgesloten periode zichtbaar.
- Afwijking altijd met +/- en ▲/▼ (kleurenblind: rood en groen vallen samen bij deuteranopie, ΔE 117,7 naar 10,4).
- Bedragen `font-variant-numeric: tabular-nums`, rechts uitgelijnd, Nederlandse notatie (€ 1,23 mln, 35,8%, +1,3 pp).
- Lijsten beginnen met 5 rijen en "Toon meer" (stap 10; een matrix mag met 10 beginnen). Labels op één regel; afkappen alleen als laatste redmiddel, met de volle tekst in een title-tooltip en in de tabel.
- Uitleg achter een ⓘ (InfoTip), nooit gestapelde notities onder elkaar.
- Null uit de API toont de reden, nooit een 0.
- Filterstaat in de URL, zodat een link dezelfde weergave opent.
- Donker is een gekozen set stappen, gevalideerd op het donkere oppervlak, nooit een automatische omkering.
- Labels botsen nooit: label selectief (maximum, laatste afgesloten, lopende periode), de eenheid in de subtitel, en een test die overlappende labelvakken vangt.
- Brug met afwijkingen als stappen (forecast naar netto, IBCS): bij en af als vulling in `--ok` en `--danger` (de `-ink`-tinten ogen bruin als balk). Een kosten/omzetbrug houdt de reekskleuren. Een vaste aftrek (commissie en bonus) is neutraal grijs met een eigen legendaregel.
- Rust in lijsten en panelen: de rij is de ingang; acties van een rij bij hover of focus (op touch altijd), een actie voor alle rijen als één bulkactie. Kleur alleen voor de uitzondering. Paneelkop = titel + sluiten; acties in de voet rechts, primair uiterst rechts, navigatie links. Details en bronnen: `references/mooi-ontwerpen.md`.

Nooit:
- Gauges, donuts met meer dan 3 delen, 3D, zware schaduwen, dubbele y-as.
- Tegelrasters, lege tegels, "100 knoppen", afgekapte zoekvelden, bookmark-achtige paginatoggles, dezelfde knop of pil op elke rij, twee getallen die elkaar tegenspreken.
- Bestaande pagina's, nav-items of features weghalen om "op te ruimen". Verbeter wat er is.
- #D9B300 of #1AAB40 als lijn of tekst (contrast onder 3:1); pastelstatuskleuren alleen als celvulling.
- Het taalmodel laten rekenen of getallen tonen die niet in de payload staan.
- Kandidaatgegevens of diversiteitsdata in een AI-payload (`references/ats-analytics.md`).

## Robins oordeel (2026-10-08, Reforge backoffice)

- Finance-hub met tabs die pagina's en nav-items verving: afgewezen ("niet alle eerdere analytics eruit slopen, maak de huidige pagina's beter met die ms-visuals").
- Tegelraster en te veel tegels: "extreem lelijk en onoverzichtelijk". Storybook als oplevering: nee, aanpasbaarheid hoort in de app (per visual Weergave: type, periode, reeksen, kleuren en arcering).
- Assistentpaneel op telefoon 3/10 (witte leegte, kale tekstrijen, ruwe ▶-toggle, zware paarse rand, geen logo). Knop "Vraag het de assistent" met sparkle in grijze doos 2/10.
- De SiriOrb als assistentmerk: afgekeurd als "lomp logo" en "betekenisloze vlek". PR #443 (feat/start-overzicht) vervangt hem app-breed door een platte "/" (`AssistentMerk.vue`: "begin een opdracht").
- Takenlijst 2/100: stippen zonder betekenis, ⚠ op elke rij, hoge rijen, afgekapte titels ("DEMO factuur klaarz…").
- Scatter "uren per week × marge per uur": "shit". Vervangen door de brug van forecast naar netto marge.
- Ouderdom- en lateness-visuals "prachtig", maar demo-data "lelijk" (één factuur = 100% in één bucket, alle bedragen € 1.250).
- Zijbalk-kopjes "Rapporten"/"Afhandeling" voelden "heel awkward": dunne scheidingslijn in plaats van kopjes. Het actieve item met een accentstreep van 3px blijft.
- Goedgekeurd: grijs rapportcanvas, witte kaarten met 1px rand, titel + ⓘ, hover-iconen (tabel, export, focus, ...), KPI-strook met vergelijking, brug, dumbbell, matrix met databalken, slicer-tegels, klantbalken met vorige-periode-streepje, weekmarge met run-rate, aansluitingsregel grootboek tegen operationeel.
- Raad van drie (overgenomen): ruilen, niet toevoegen; brutomarge als held met split detachering/werving; geen gauges, donuts, sparklines overal, DSO-trend, budgetlijnen, cashprognose of leaderboards. Risico's om zichtbaar te maken: twee marges die elkaar tegenspreken, contractverlengingen, intercompany dubbeltelling.

- 2026-10-09, op de gemergde preview: "dit is rommelig", "100x dezelfde knop herhalen is lelijke frontend. leer dit af", "niet rustig en te repetitief", "button placements van menus zijn awkward", "te onrustige weergave", "tegenstrijdige info", en "bij elke visual moet je door kunnen klikken om meer details in te kunnen zien". Opgelost met de rustregels en de opbouw achter elk getal (PR #445 en #448).

Volledige lijst met redenen en de regel die eruit volgt: `references/oordeel-robin-2026-10-08.md` (sectie 9b voor 2026-10-09).

## Tokens (kort; volledig in `references/tokens-en-typografie.md`)

- Datapalet (gevalideerd, web): #118DFF omzet, #3B4FD8 kosten, #E66C37 marge, #9B3FB0 netto, vaste rol per reeks. Licht: alle checks door op #ffffff. Donker: indigo haalt geen 3:1 op de backoffice-oppervlakken (validator) en op Fluent #1F1F1F/#292929 ook paars niet (nagerekend), dus zichtbare labels of tabelweergave verplicht. Het originele Power BI-palet faalt de lichtheidsband (#12239E en #6B007B te donker).
- Fluent 2 licht: pagina #FAFAFA, wallpaper #E6E6E6, kaart #FFFFFF met 1px #E6E6E6, radius 8px, tekst #242424, secundair #616161, gridlines #F0F0F0. Donker: kaart #292929, rand #3D3D3D, tekst #FFFFFF/#D6D6D6, as #ADADAD. De backoffice houdt eigen maten binnen dat systeem: 4px hoeken (`--rp-hoek`), visualtitel 14px/600.
- Statustekst: #0E700E (goed), #BC4B09 (let op), #B10E1C (slecht). Pastel #9FD89F/#FDCFB4/#EEACB2 alleen als vulling met #242424 erop.
- Typografie Fluent 2 (px): labels 14, visualtitel 20, subtitel 16, card-waarde 28 semibold. Fontstack Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif.
- Marks: kolommen hooguit 24px breed, 4px afronding aan de data-kant, 2px tussenruimte, lijnen 2px, markers minimaal 8px met 2px ring.

## Assistent naast de cijfers (Copilot-patroon, eigen merk)

In ontwikkeling (2026-10-08); details en bronnen in `references/assistent-patroon.md`.

- Merk: het eigen assistentmerk van de app, in Reforge-apps de "/" (`components/ui/AssistentMerk.vue`), nooit een orb, sterretje, toverstaf of Copilot-merk. De Fluent-sparkle (MIT) is alleen een optie voor andere producten, niet in Reforge-apps.
- Ingang: knop met `AssistentMerkRond` (de "/" in een getint rondje van 28px) en tekstlabel "Assistent", zachte pil, rechts op de titelrij (`AssistentKnop.vue`; `FinanceView` toont nog de oude sparkle-knop). Plus "Leg deze grafiek uit" als `AssistentMerk` van 14px in de hover-header van elke visual.
- Paneel rechts in een eigen kolom die het canvas opzij schuift (backoffice 340px; onderzoek 360-420px), telefoon: sheet met grijper, max 85vh. Opent nooit vanzelf, Esc sluit. Kop: merk (`AssistentMerkRond` 28px), "Assistent", scopechip (pagina · periode · entiteit). Bezig: `<AssistentMerk live />`.
- Leeg: welkom met het merk op 44px ("Waar wil je meer over weten?", "Ik gebruik alleen de cijfers op dit scherm."), 3-4 korte startvragen als kaarten met een Lucide-betekenisicoon (nooit sterretje of toverstaf); verdwijnen na het eerste bericht, terug via "Voorbeeldvragen".
- "Wat de assistent ontvangt · n visuals, n filters": inklapbaar, exact gelijk aan wat verstuurd wordt (één model voor tekst en weergave).
- Antwoorden met genummerde bronnen [n] die naar de visual scrollen en oplichten; getallencontrole markeert elk getal dat niet in de context staat; vaste regel "AI-antwoorden kunnen fouten bevatten. Controleer cijfers via de bronverwijzing."
- De backend rekent elk getal; het model vertelt alleen. Payload server-side met de rechten van de gebruiker.

## Implementatiekaart (Reforge backoffice, Vue 3 + ECharts 6 + vue-echarts 8)

Repo `reforge-backoffice`, PR #445 (branch `feat/finance-visuals`, worktree `reforge-backoffice-finance-pr`; de rust-PR buiten finance is #448, worktree `reforge-backoffice-dossiercontrole`), map `frontend-app/src`. Andere sessies werken in die bestanden: lezen, niet vanuit deze skill schrijven. Recepten met code: `references/echarts-vue-implementatie.md`. Bibliotheken met versie, licentie en herkomst: `references/bibliotheken-en-herkomst.md`.
- `lib/echarts.ts`: één ECharts-opzet, alleen `SVGRenderer`, `CustomChart` en `GridComponent`. Elke grafiek is een custom series met renderItem; tooltip en legenda zijn HTML (geen TooltipComponent of LegendComponent). Schrijf de ECharts-sleutel als string `"shape"`.
- `composables/useChartTokens.ts`: CSS-tokens via een probe-element, lichte terugval, donker. `composables/useGrafiekWeergave.ts`: Weergave per kaart in localStorage (try/catch).
- `components/dashboard/`: RapportPagina (canvas, titel, slicerband, 12-koloms grid, zijpaneel), DashboardKaart (visual met ⓘ en hover-iconen, `visualId`), KpiStrip + kpiRaster (gemeten 4 / 2×2 / 1), Sparklijn, MatrixVisual + matrix.ts, SlicerTegels, SlicerVeld, InfoTip, RapportBanner, ToonMeer + useToonMeer, DashboardTabel + tabel.ts (tabeltweeling en CSV), WeergavePaneel, grafiekBasis.ts (maten, schone as), grafiek.css (knoppenlaag), renderProef.ts (testhulp).
- `components/finance/charts/`: MaandKolommen + maandKolommenOptie.ts, WeekMarge + weekMargeOptie.ts (run-rate, trap), VerdelingBalk (100%-staaf), kleursets.ts (palet + validatoruitvoer in de kop, arcering).
- `components/analytics/charts/`: BrugGrafiek + brugOptie.ts (`brugMoetLiggend()`; prop `afwijking` kleurt stappen met de tokens `goed`/`slecht`), KlantenGrafiek + klantenOptie.ts.
- `components/profitability/`: AfwijkingGrafiek (dumbbell) + afwijkingOptie.ts, AfwijkingMeter (divergerende balk), forecastBrug.ts (in ontwikkeling).
- `components/analytics/`: AssistentKnop, AssistentMerkRond, AssistentPaneel, AssistentAntwoord, analyticsContext.ts, getalControle.ts, bronnen.ts, assistentAanvraag.ts, assistentGesprek.ts (in ontwikkeling). `components/ui/AssistentMerk.vue`: de "/".
- `components/shell/nav.ts` + `AppSidebar.vue`: menu en secties uit één config.
- Databronnen via provide/inject (`financeDatabron.ts`, `assistentGesprek.ts`), zodat tests nep-bronnen injecteren in plaats van `vi.mock`.
- Backend: `GET /api/v1/analytics/resultaat/` en `/analytics/operationeel/`, alleen opgeslagen data, nooit live Exact, elke null met reden. `GET /api/v1/analytics/opbouw/?soort=&sleutel=` (`api/analytics_opbouw.py`) levert de regels achter een getal; debiteuren via dezelfde `fetch_exact_receivables`-weg als de tegels.
- Doorklikken: `views/FinanceView.vue` (`parseOpbouw`, `openDrill`), `components/finance/FinanceOpbouwPaneel.vue` (tegel of drill, kolom Aantal alleen als er aantallen zijn), `@kies` op BrugGrafiek (`klikbaar`), KlantenGrafiek, VerdelingBalk, BalkenLijst (`klikbaar`) en WeekMarge (alleen "terug").
- Rust: `components/finance/StatusChip.vue` (alleen warn/danger als pil; in #445); `styles/lijst.css` (`.rij-houder`/`.rij-acties`) en `components/ui/InspectorPanel.vue` (slot `actions` in de voet rechts, `footer` links) zitten in #448.
- Lint (Robins hooks): geen `as` zonder `// SAFETY:`, geen "shape" in namen, geen anonieme objecttypes als parameter of return, geen `vi.mock`, geen em-dashes.
- Scoped CSS: schrijf `html[data-theme-mode="dark"] .x`, nooit `:global(html[...]) .x` (dat compileert tot kaal `html[...]` en kleurt de pagina).

## Verificatie vóór "klaar"

- [ ] Elke visual beantwoordt een opgeschreven vraag; kaarten voor en na geteld.
- [ ] KPI-rij hooguit 5 (backoffice 4), afwijkingen met teken en pijl, alleen de afwijking gekleurd.
- [ ] Eén y-as overal; tabeltweeling werkt; toetsenbord geeft dezelfde tooltip als hover.
- [ ] Palet gevalideerd licht en donker; tekst in tekstkleuren, niet in reekskleur.
- [ ] Demo-data vult elke bucket en ziet eruit als een echt bedrijf.
- [ ] Renders licht 1440, donker 1440, 375 gelezen; 0 fouten, geen horizontale scroll.
- [ ] `npx vitest run` en `npm run typecheck` groen; backend-tests met `--settings=reforge_backoffice.settings.test`.
- [ ] e2e voor de UI-wijziging: `tests/*.e2e.ts`, één `agent.act` per doel + exacte `expect`, `credentials.user()`, één keer `--no-cache`, `.e2e/cache` gecommit.
- [ ] Onafhankelijke keurder (verse subagent) heeft spec, renders en testuitvoer gezien.
- [ ] Geen bestaande pagina, nav-item of feature verdwenen; open PR's van anderen niet overschreven.

## Verder lezen

Lees het bestand dat bij je taak hoort voordat je bouwt:
- Een finance-pagina of de vraag "welke visual hier": `references/patronen-finance.md` (3-30-300, KPI-anatomie, IBCS, brug, dumbbell, matrix, Pareto, bullet, cash en staffing-KPI's, top-10's, wat elke backoffice-pagina nu toont).
- Menu, zijbalk, slicers, visual-header, ⓘ, drill-through, lange lijsten: `references/navigatie-en-slicers.md`.
- Wat een gebruiker per visual kan aanpassen of aanklikken, waar die staat bewaard wordt, en het doorklikpatroon: `references/aanpassingen-per-visual.md`.
- Welke Power BI-optie we spiegelen of bewust weglaten, en waar de finance-look vandaan komt (Microsoft-visuals, Zebra BI, Inforiver, Deneb): `references/powerbi-opties.md`.
- Welke bibliotheek, welke versie en licentie, waarom ECharts en wanneer iets anders: `references/bibliotheken-en-herkomst.md`.
- Een scherm mooi en rustig maken, welke design-skill wanneer, en de keuring vóór je iets laat zien: `references/mooi-ontwerpen.md`.
- Assistent, chat of "leg uit" naast cijfers: `references/assistent-patroon.md`.
- Kleur, palet, donker, letters, CSS om te plakken, delen met Polpo: `references/tokens-en-typografie.md`.
- ATS of Polpo-analytics, privacy in recruitment-cijfers: `references/ats-analytics.md`.
- Een grafiekcomponent bouwen of testen, renders, demo-stack, e2e: `references/echarts-vue-implementatie.md`.
- Vóór je iets aan Robin laat zien of een pagina herontwerpt: `references/oordeel-robin-2026-10-08.md`.
- Seeds en fixtures voor een dashboard: `references/demo-data.md`.
- Een bewering natrekken: `references/bronnen.md` (171 bronnen, gegroepeerd).
- Originelen: `~/Desktop/Analytics ontwerp Power BI-stijl/` (rapport, bronnotities, design-tokens.md, ats-analytics.md, voor-andere-projecten.md).
