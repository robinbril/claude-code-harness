# Robins oordeel en de lessen van 2026-10-08

Wanneer lezen: vóór je een pagina herontwerpt, een visual toevoegt of iets aan Robin laat zien. Dit staat in geen enkel bronbestand: het is wat Robin op 7 en 8 oktober 2026 koos, afkeurde en goedkeurde tijdens het bouwen van de finance-analytics in de Reforge-backoffice (branch `feat/analytics-v1`). Citaten zijn zijn woorden; specs staan in `.harness/finance-echarts/spec.md` en `.harness/analytics-v1/spec.md` van die repo.

## 1. De keuze voor de stack

- Opdracht: "use Power BI visuals or similar for all financial dashboarding, pick the best". Vastgelegd als "ECharts voor alle financiële dashboarding" en "start backoffice" (spec finance-echarts, 2026-10-07).
- Gekozen: **ECharts 6 met custom series op de SVG-renderer in Vue**, vormgegeven naar Power BI en Fluent 2. Niet gekozen: Power BI embedden, Power BI custom visuals.
- Daarna (2026-10-08): "analytics sectie die fundamenteel beter is dan de slop", aanpasbaar per grafiek: grafiektype, periode, reeksen aan/uit, kleuren en arcering.
- Tweede ronde (2026-10-08): "mooier menu en ... assistent logo en meer visuals bij finance a la powerbi", onderbouwd met het onderzoeksrapport.

## 2. Afgekeurd

| Wat | Robins woorden of oordeel | De regel die eruit volgt |
|---|---|---|
| Finance-pagina's samenvoegen tot één "Finance hub" met tabs, nav-items weg | "niet alle eerdere analytics eruit slopen; maak de huidige pagina's, features en verhalen beter met die ms-visuals" | **Verbeteren, nooit slopen**: geen pagina, nav-item, route of feature weg |
| Tegelraster, te veel tegels | "extreem lelijk en onoverzichtelijk, teveel tegels" | KPI-strook met vergelijking in plaats van tegels; geen lege tegels |
| Afgekapte zoekvelden en rijen knoppen | "100 knoppen" | Twee of drie slicers in de band; de rest weg of in een filter pane |
| Gestapelde uitlegnotities onder kaarten | | Uitleg achter één ⓘ |
| Alle rijen van een lijst tonen | wil 5 + "Toon meer" | `useToonMeer`: 5, dan per klik 10 |
| Storybook als oplevering | aanpasbaarheid hoort in de app | Weergave per visual: grafiektype, periode, reeksen aan/uit, kleuren en arcering |
| Assistentpaneel op telefoon | **3/10**: lege witte vlakte, suggesties als kale tekstrijen, ruwe ▶-toggle, zware paarse rand om de invoer, geen logo | Welkom met inhoud, startvragen als kaarten, rustige "ontvangt"-rij, lichte invoerrand, het merk in de kop |
| Knop "Vraag het de assistent" met sparkle in een grijze doos | **2/10** | Het eigen assistentmerk met het label "Assistent", zachte pil |
| De SiriOrb als assistentmerk | "lomp logo", "betekenisloze vlek"; PR #443: "geen draaiende gradient-orb meer: die las als een betekenisloze vlek" | De platte "/" (`AssistentMerk.vue`, "begin een opdracht"); nooit orb, sterretje of toverstaf |
| Lijst financiële taken | **2/100**: gekleurde stippen zonder betekenis, ⚠ op elke rij, hoge rijen, afgekapt "DEMO factuur klaarz…" | 100%-balk naar hoe laat plus een compacte matrix met een databalk "te laat" en tekst ("6d 19u"); geen driehoek of stip per rij; titels zonder voorvoegsel |
| Scatter "uren per week x marge per uur" | "shit" | Vervangen door de brug "Van forecast naar netto marge" (forecast, top-afwijkingen, actual, commissie en bonus, netto) |
| Demo-data bij de ouderdom- en takenvisuals | visuals "prachtig", data "lelijk": één factuur = 100% in één bucket, alle bedragen € 1.250 | Realistische demo-data is onderdeel van de levering (`demo-data.md`) |
| Zichtbare zijbalkkopjes "Rapporten"/"Afhandeling" | "heel awkward" | Dunne scheidingslijn in plaats van kopjes; de sectienaam blijft voor schermlezers (in ontwikkeling) |

## 3. Goedgekeurd: de richting

- Power BI-rapportcanvas: grijs canvas, witte visuals met 1px rand, titel met ⓘ, header-iconen bij hover (tabel, export, focus, meer).
- KPI-strook met vergelijking en een trendlijn eronder (bronnen: hooguit 5; code: 4).
- Waterval/brug; dumbbell forecast tegen actual; matrix met databalken; slicer-tegels.
- Pareto-achtige klantbalken met een streepje voor de vorige periode.
- Weekmarge met de run-rate als referentielijn; aflopende marge "contractueel, vóór verlengingen".
- Aansluitingsregel tussen grootboek en operationele marge.
- Ouderdom als één 100%-balk in een sequentiële warme reeks; taken als lateness-balk plus compacte tabel met databalken.
- Zijbalk: actief item met een accentstreep van 3px; secties uit de nav-config (zichtbaar als dunne lijn, zie hierboven).

## 4. De raad van drie (KPI's en visuals)

Advies van een council met drie stemmen, door Robin overgenomen:

- **Ruilen, niet toevoegen.** Elke nieuwe visual vervangt een zwakkere; het aantal kaarten op /finance hooguit één meer dan ervoor (spec R13).
- **Overzicht**: brutomarge als held met de split detachering/werving; run-rate per week; de trap van aflopende contracten; klanten als Pareto; de aansluitingsregel.
- **Winstgevendheid**: realisatie %, netto na commissie, marge per uur (alleen detachering), commissie als % van de brutomarge, dumbbell top 10 tot 15 (code toont er 8 plus Overig), netto-staven per recruiter of team **zonder ranglijst**.
- **Niet toevoegen**: gauges, donuts, sparklines overal, een DSO-trend, budgetlijnen, een cashprognose, leaderboards.
- **Risico's** die de pagina zichtbaar moet maken: twee marges die elkaar tegenspreken (operationeel tegen grootboek: de aansluitingsregel), contractverlengingen (de trap is "vóór verlengingen"), intercompany dubbeltelling (de intercompany-check in `/analytics/operationeel/`).

## 5. Kleur

- Het originele Power BI-palet faalt de lichtheidsband van de validator. Het gevalideerde webpalet is **#118DFF, #3B4FD8, #E66C37, #9B3FB0** (omzet, kosten, marge, netto): licht ALL CHECKS PASS op #ffffff; donker door met een contrast-WARN, dus labels of een tabelweergave zijn verplicht. Details: `tokens-en-typografie.md`.
- Altijd de `dataviz`-validator draaien voor een nieuw palet, en de uitvoer in de kopcomment zetten.

## 6. Merk

- Nooit het Copilot-logo, de naam, de gradiënt of #464FEB. De app gebruikt haar eigen assistentmerk met tekstlabel: in Reforge-apps de "/" (`AssistentMerk.vue`; in rondje `AssistentMerkRond.vue`), ook voor "Leg deze grafiek uit" per visual. Nooit een orb, sterretje of toverstaf.
- De Fluent-sparkle (MIT) blijft in het onderzoek staan als optie voor andere producten, niet in Reforge-apps.
- De skillnaam (eerder "powerbi", nu "bi-dashboards") geeft geen toestemming voor Power BI- of Microsoft-branding in de UI.

## 6b. Twee lessen uit de bouw van 2026-10-08

- **Brugkleuren volgen wat de stappen zijn.** Een brug waarvan de stappen afwijkingen zijn (van forecast naar netto marge) kleurt bij en af als vulling in `--ok` en `--danger`; de `-ink`-tinten ogen als balk bruin. Een kosten/omzetbrug (de resultaatbrug) houdt de reekskleuren. In code: prop `afwijking` op `BrugGrafiek`, tokens `goed`/`slecht` in `useChartTokens`.
- **Labels botsen nooit.** Label selectief (maximum, laatste afgesloten, lopende periode), zet de eenheid in de subtitel, en schrijf een test die overlappende labelvakken vangt.

## 7. Regels voor de assistent

De backend rekent elk getal, het taalmodel vertelt alleen. "Wat de assistent ontvangt" is gelijk aan wat verstuurd wordt. Genummerde citaties scrollen naar de visual. Een getallencontrole markeert getallen die niet in de context staan. Een vaste disclaimerregel. Het paneel opent nooit vanzelf. Startvragen verdwijnen na het eerste bericht. Details: `assistent-patroon.md`.

## 8. Werkwijze die werkte

- Renders van de echte app in licht 1440, donker 1440 en 375, met één login per run (de demo-throttle is 10 per uur). Verwachting eerst opschrijven, dan de PNG lezen.
- Volledige vitest en vue-tsc; backend-tests met `--settings=reforge_backoffice.settings.test`.
- Een onafhankelijke keurder vóór "klaar".
- e2e voor elke UI-wijziging volgens Robins CLAUDE.md: `tests/*.e2e.ts`, één `agent.act` per doel plus een exacte `expect`, `credentials.user()`, na een wijziging één keer `--no-cache`, `.e2e/cache` committen.
- Robin beoordeelt op screenshots met een cijfer. Laat renders zien en verwacht een cijfer terug, geen "ziet er goed uit".
- Committen of pushen alleen op Robins signaal (specs, "Niet in scope").

Commando's en valkuilen: `echarts-vue-implementatie.md`, sectie 12.

## 9. Codehygiëne (Robins hooks)

Geen `as` zonder `// SAFETY:`, geen identifiers met "shape" (de ECharts-sleutel als string `"shape"`), geen anonieme objecttypes als parameter of returntype, geen `vi.mock` van modules (provide/inject-fakes), geen em-dashes in proza. In scoped CSS geen `:global(html[...]) .x` (zie `echarts-vue-implementatie.md`, sectie 11).

## 9b. Oordeel van 2026-10-09: rust en doorklikken

Op 9 oktober beoordeelde Robin de gemergde preview (PR #445 finance, #448 rest van de app) pagina voor pagina op screenshots. Elke klacht ging over herhaling, kleur of plaatsing, niet over een ontbrekende visual.

| Wat | Robins woorden | De regel die eruit volgt |
|---|---|---|
| Mijn beloning: ruwe saldolijst met "Regel 1" t/m "Regel n" | "dit is rommelig" | Vier kerncijfers, één bullet per jaar, twee kaarten; geen ruwe lijst naast dezelfde cijfers |
| Dossiercontrole: "Voorbereiden" x4, "Voorstellen" x6 | "100x dezelfde knop herhalen is lelijke frontend. leer dit af" | De rij is de ingang; acties pas na openklappen, of één bulkactie in de kop |
| Start: rode pil en rode stip op elke te-late regel | "deze visuals zijn lelijk, niet rustig en te repetitief" | Groepeer onder één kop ("Te laat"), per regel alleen het variabele deel als tekst ("11 dagen") |
| Taken en lijsten op elke pagina | "doe op iedere pagina die check kan overal beter" | Rij-acties bij hover of toetsenbordfocus (`.rij-houder`/`.rij-acties` in `styles/lijst.css`, PR #448, op touch altijd zichtbaar); plekhouders als lege cel met sr-only tekst |
| Taakpaneel: Oppakken/Afhandelen groot onder de titel | "veel button placements van menus zijn awkward" | Kop = titel + sluiten; acties in de voet rechts, primair uiterst rechts, navigatie links in de voet |
| Oude Start met pillen en kleur | "te onrustige weergave" | Kleur alleen voor de uitzondering; statuschip neutraal/ok/info als tekst, alleen warn/danger als pil |
| Ingeklapte zijbalk op tablet | "in de cropped ingeklapte view zie je niet alle icons die je verwacht" | De rail toont elke bestemming; de uitklaptip staat rechts naast de rail, nooit over de iconen |
| Start-zin en de chip "te laat" | "tegenstrijdige info hier en deals staat" | Twee getallen die elkaar tegenspreken zijn erger dan één: de zin noemt geen eigen getal als de chip er al staat |
| Visuals op Finance | "bij elke visual moet je door kunnen klikken om meer details in te kunnen zien" | Elk getal op het overzicht opent zijn opbouw (`?opbouw=<soort>:<sleutel>`); het totaal komt uit dezelfde backendfunctie, de regels tellen er op de cent op |

Goedgekeurd zonder opmerking: de forecast-naar-netto-brug met "Commissie en bonus" als neutrale grijze vaste aftrek ("commissie grijs").

Regels voor het ontwerp staan in `mooi-ontwerpen.md`; de klik-door-architectuur in `aanpassingen-per-visual.md`, sectie Doorklikken.

## 10. Uitbreiding

Eerst de backoffice-versie excellent (volgorde Overzicht → Winstgevendheid → Uren → Commissie), daarna Polpo (ATS): Overzicht en Pipeline eerst, de assistent als laatste. Zie `ats-analytics.md`.
