---
name: powerbi
description: Power BI-stijl rapporten en dashboards in eigen web-apps (Vue + ECharts, of pure SVG met een visual builder engine), zonder Power BI te embedden; finance, ATS-analytics en de assistent naast de cijfers. Gebruik bij "Power BI-stijl", "ms-visuals" of "meer visuals", "visual builder", tegelbord, widgetcatalogus of dashboardbouwer, funnel- of pipeline-visuals, een React-ontwerp (easyui, magicui) naar Vue porten, KPI-kaarten, brug of IBCS-afwijking, matrix met databalken, slicers en rapportmenu, ECharts custom series in Vue, doorklikken naar de opbouw achter een getal, aanpasopties per visual, de keuze of herkomst van een chartbibliotheek, rust in lijsten en panelen (herhaalde knoppen, kleur, knopplaatsing), en demo-data voor dashboards. Niet voor een losse vormvraag zonder huisstijl (dataviz) en niet voor Power BI-licenties, DAX of .pbix.
user-invocable: true
---

# /powerbi: rapporten die lezen als een goed Power BI-rapport

De look van een goed Power BI-rapport in 2026 is geen visualgalerij maar discipline: Fluent 2-neutralen, een vast datapalet, 3-30-300-indeling, IBCS-notatie voor scenario's en afwijkingen, en per visual één vraag. Hier is die look gebouwd als eigen Vue 3-app met ECharts 6 custom series op de SVG-renderer: geen Power BI-embed, geen Power BI custom visuals. Deze skill is de huisstijl- en systeemlaag. Kleurvalidatie en basis-vormkeuze komen uit de skill `dataviz` (draai `validate_palette.js`, niet op het oog).

De naam "powerbi" is alleen de naam van deze skill. In de producten zelf: geen Power BI- of Microsoft-merk, geen Copilot-logo, -naam, -gradiënt of #464FEB. De assistent draagt het eigen merk van de app, nooit een orb, sterretje of toverstaf.

Vier woorden sturen alles hieronder:
- **Verbeteren, nooit slopen.** Bestaande pagina's, nav-items, routes en features blijven; je maakt ze beter.
- **Ruilen, niet stapelen.** Een nieuwe visual vervangt een zwakkere lijst, tegel of notitie.
- **Verteller, geen rekenmachine.** De backend rekent elk getal; het taalmodel vertelt alleen.
- **Toetsenbord = hover.** Wat een muis ziet, ziet een toetsenbord ook, en elke grafiek heeft een tabeltweeling.

Verdieping per onderwerp staat in `references/` naast dit bestand (zie onderaan).

## Procedure (in deze volgorde)

1. **Vraag en data per pagina.** Schrijf de 3-5 vragen op die de lezer met deze pagina beantwoordt, en per vraag welke scenario's de API levert (realisatie AC, plan PL, prognose FC, vorig jaar PY) en of de periode open of afgesloten is. Klaar als: elke geplande visual een vraag in één zin heeft en een ontbrekende vergelijking ontworpen is als "geen vergelijking, met reden", nooit als 0. Een visual zonder vraag gaat er niet op.
2. **Indeling 3-30-300** (SQLBI): linksboven in 3 seconden de KPI-rij, midden in 30 seconden de verkennende visuals, rechtsonder in 300 seconden detail (matrix, tabel). Slicers in één vaste rij bovenaan, nooit in de KPI-zone. Huisregel: zes tot acht datavisuals per pagina.
3. **KPI-rij, standaard 4-5 kaarten** (begin met 4; meer mag als elke kaart een eigen vraag heeft). Per kaart: label, waarde, vergelijking (vorige periode, vorig jaar, forecast of plan), afwijking met teken en pijl, optioneel een trendlijn onder de waarde. Alleen de afwijking krijgt kleur, nooit de waarde zelf. Geen lege kaarten: ontbreekt een bron, dan de reden in een ⓘ, niet "Nog geen data".
4. **Vorm per vraag** (tabel hieronder). Eén y-as. Tijd horizontaal, structuur (klanten, P&L-regels) verticaal.
5. **Ruilen, niet stapelen.** Tel kaarten voor en na; nooit meer dan één erbij zonder reden. Klaar als: bij elke nieuwe visual staat welke oude hij vervangt.
6. **Kleur en tokens.** Categorieën in vaste volgorde uit de kleurset, kleur volgt de entiteit (klant-ID, reeks), nooit de rang. Sequentieel = één tint licht naar donker. Afwijking naar business-impact (hogere kosten = ongunstig). Nieuw palet of nieuw oppervlak? Eerst de `dataviz`-validator, licht en donker, uitvoer in de kopcomment van de code.
7. **Bouwen met de primitieven** (implementatiekaart hieronder). Elke grafiek: een pure optiebouwer, tabeltweeling, toetsenbord = hover, legenda bij 2+ reeksen, directe labels selectief, tekst in tekstkleuren. Laad eerst de design-skills uit `references/mooi-ontwerpen.md` (sectie 1) en geef ze een subagent expliciet mee.
7b. **Doorklikken en aanpassen.** Elk getal opent zijn opbouw in het zijpaneel (`?opbouw=<soort>:<sleutel>`), met een totaal uit dezelfde backendfunctie als de visual. Een optie per visual alleen als ze een vraag beter beantwoordt; wat je ziet staat in de URL, hoe je het ziet in localStorage. Klaar als: elk klikbaar getal een opbouw opent waarvan het totaal gelijk is aan het aangeklikte getal en de regels er op de cent op tellen (`references/aanpassingen-per-visual.md`).
8. **Realistische demo-data.** Een mooie visual met lelijke data wordt afgekeurd. Vul elke bucket, spreid bedragen, meerdere klanten, korte natuurlijke titels (`references/demo-data.md`).
9. **Render en kijk.** Echte app, licht 1440, donker 1440, telefoon 375, met één login per run. Schrijf vooraf op wat je verwacht, lees dan de PNG. 0 consolefouten, geen horizontale scroll, geen labelbotsing. Loop daarna de rustkeuring af (`references/mooi-ontwerpen.md`, sectie 4: herhaling, kleur, plaatsing, getallen, doorklikken, labels, toetsenbord).
10. **Bewijs.** Volledige unit-tests en typecheck, e2e voor de UI-wijziging, en een onafhankelijke keurder voor je "klaar" zegt (checklist onderaan).

## Vorm per vraag

De kolom "Liever niet" is een standaard, geen verbod: kies het toch als de vraag of de gebruiker erom vraagt, en zet de reden in één regel in de kopcomment van de component. Meer vormen per vraag staan onder de tabel.

| Vraag | Visual | Liever niet |
|---|---|---|
| Liggen we op koers? | KPI-kaart met ΔPL/ΔPY, teken en pijl | gauge, snelheidsmeter |
| Hoe ontwikkelt het zich per maand? | dunne kolommen (AC massief, lopende maand lichter, FC gearceerd, PL omlijnd) | 3D, dubbele as |
| Waar komt het verschil vandaan? | waterval/brug (van A naar B in stappen, label met teken), liggend als labels niet passen | gestapelde kolommen |
| Welke regel of klant veroorzaakt het? | IBCS-tabel of matrix met afwijkingsbalk en %-pin | getal-dump |
| Forecast vs actual per item | dumbbell (ring = forecast, stip = actual), op afwijking gesorteerd, top 8 tot 15 + Overig | twee losse balken |
| Hoe afhankelijk zijn we van weinig klanten? | gesorteerde balken top 8 + Overig, streepje voor vorige periode, cumulatief % als tekst | taart met 12 delen |
| Hoe oud zijn de openstaande posten? | één 100%-staaf met een vlak per bucket, warme reeks (later = donkerder), tabeltweeling | vijf rijen met € 0 |
| Hoeveel loopt er achter en hoe erg? | lateness-staaf per bucket + compacte tabel met databalk "te laat" en tekst | gekleurde stip + ⚠ op elke rij |
| Wat is het tempo nu? | weekkolommen + run-rate als gestippelde referentielijn over de weken die hij middelt | dubbele as met lijn |
| Wat valt er weg als contracten stoppen? | trap van resterende run-rate, gearceerd, label "contractueel, vóór verlengingen" | prognose zonder voorbehoud |
| Van forecast naar netto (winstgevendheid) | brug: forecast, top-afwijkingen +/-, actual, commissie en bonus, netto | scatter uren × marge/uur |
| Capaciteit tegen doel | bullet (balk, doelstreep, grijze banden) | gauge |
| ATS: waar verliezen we kandidaten? | gecentreerde funnel met verliesbruggen en "−n%"-chip per overgang (easyui-port) of stage-conversiebalken met aantallen en % | Sankey bij meer dan 2 stromen |
| ATS: waar blijven ze hangen? | time-in-stage: mediaan, p90, doelstreep per fase | gemiddelde alleen |
| ATS: welke vacatures stallen? | vacatureveroudering gesorteerd met doelstreep en actieve kandidaten | leaderboard per recruiter |

Donut standaard bij 2-3 delen zonder negatieve waarden. Ranglijsten van mensen: standaard neutraal (op naam of alfabetisch); een gesorteerde ranglijst alleen op uitdrukkelijk verzoek en nooit met kandidaatgegevens.

### Varianten per vraag (kies wat de data en de ruimte dragen)

| Vraag | Varianten |
|---|---|
| Op koers? | KPI-kaart met delta · KPI met sparklijn · KPI met mini-bullet (doelstreep) · KPI met 2 vergelijkingen (PL en PY) · hero-getal met uitsplitsing eronder · stat-card met trend-chip (easyui `stat-card`, `money-card`) |
| Per maand / week | dunne kolommen · gestapelde kolommen (max 3 reeksen) · area met band tussen forecast en realisatie (gesplitst waar ze kruisen) · lijn met run-rate-referentie · small multiples per entiteit · kalender-heatmap per dag (easyui `activity-heatmap`) · live lijn voor realtime (Liveline, easyui `live-line-chart`) |
| Verschil verklaren | brug staand of liggend · gestapelde brug per categorie · afwijkingsbalk met %-pin · dumbbell · bar-in-bar (overlay, plan als host, realisatie erin) |
| Verdeling / aandeel | 100%-staaf · gesorteerde balken + Overig · treemap bij veel posten met hiërarchie · donut 2-3 delen (easyui `donut-chart`) · waffle 10×10 voor één aandeel |
| Doorstroom / conversie | gecentreerde funnel met bruggen · conversiebalken links uitgelijnd met ghost van de vorige fase · stage-tijden (mediaan + p90) · Sankey alleen bij 2 duidelijke stromen (bron naar fase) · cohort-matrix per instroommaand |
| Capaciteit / doel | bullet · voortgangsbalk met doelstreep · vulgraad-raster (cellen) · gauge alleen op uitdrukkelijk verzoek, dan halve boog met één doelstreep |
| Detail | matrix met databalken · tabel met inline sparklijn · tabel met heatmap-cellen · uitklapbare groepen |

Combineer gerust twee vormen in één visual (KPI + sparklijn, balk + ghost, kolom + referentielijn) zolang er één vraag blijft.

## Regels: een harde kern, de rest standaard

Hard (geen uitzondering): het taalmodel rekent geen getallen; geen kandidaat- of diversiteitsdata in een AI-payload; null toont een reden, nooit 0; bestaande pagina's, nav-items en features niet weghalen; tekstcontrast minstens 4,5:1 en lijnen 3:1.

Al het andere hieronder is de standaard. Wijk af als de vraag, de data of de gebruiker erom vraagt, en zet de reden in één regel in de kopcomment. Twijfel je: bouw de standaard en noem de variant in de oplevering.

Standaard:
- Eén periodebasis per pagina, met "data t/m" en open of afgesloten periode zichtbaar.
- Afwijking altijd met +/- en ▲/▼ (kleurenblind: rood en groen vallen samen bij deuteranopie, ΔE 117,7 naar 10,4).
- Bedragen `font-variant-numeric: tabular-nums`, rechts uitgelijnd, Nederlandse notatie (€ 1,23 mln, 35,8%, +1,3 pp).
- Lijsten beginnen met 5 rijen en "Toon meer" (stap 10; een matrix mag met 10 beginnen). Labels op één regel; afkappen alleen als laatste redmiddel, met de volle tekst in een title-tooltip en in de tabel.
- Uitleg achter een ⓘ (InfoTip), nooit gestapelde notities onder elkaar.
- Null uit de API toont de reden, nooit een 0.
- Filterstaat in de URL, zodat een link dezelfde weergave opent.
- Donker is een gekozen set stappen, gevalideerd op het donkere oppervlak, nooit een automatische omkering.
- Labels botsen nooit: label selectief (maximum, laatste afgesloten, lopende periode), de eenheid in de subtitel, en een test die overlappende labelvakken vangt.
- Brug met afwijkingen als stappen (forecast naar netto, IBCS): bij en af als vulling in de goed- en slecht-token (tekstinkt-tinten ogen bruin als balk). Een kosten/omzetbrug houdt de reekskleuren. Een vaste aftrek (commissie en bonus) is neutraal grijs met een eigen legendaregel.
- Rust in lijsten en panelen: de rij is de ingang; acties van een rij bij hover of focus (op touch altijd), een actie voor alle rijen als één bulkactie. Kleur alleen voor de uitzondering. Paneelkop = titel + sluiten; acties in de voet rechts, primair uiterst rechts, navigatie links. Details en bronnen: `references/mooi-ontwerpen.md`.

Vermijd tenzij met reden:
- Gauges, donuts met meer dan 3 delen, 3D, zware schaduwen, dubbele y-as (liever twee grafieken of een geïndexeerde as).
- Lege tegels, "100 knoppen", afgekapte zoekvelden, bookmark-achtige paginatoggles, dezelfde knop of pil op elke rij, twee getallen die elkaar tegenspreken. Een tegelbord mag (zie de visual builder engine), zolang elke tegel een vraag heeft.
- #D9B300 of #1AAB40 als lijn of tekst (contrast onder 3:1); pastelstatuskleuren alleen als celvulling.
- Animatie die data verbergt tot ze klaar is (groeien vanaf nul): rust in de standaardstand op volle breedte, animeer alleen wijzigingen.

Zie `references/ats-analytics.md` voor privacy in recruitment-cijfers.

## Wat feedback leerde

- Verbeter bestaande pagina's; voeg ze niet samen tot een hub en haal geen nav-items weg.
- Geen tegelraster zonder vraag per tegel; aanpasbaarheid hoort in de app, per visual.
- Geen stippen, waarschuwingsdriehoeken of dezelfde knop op elke rij.
- Een scatter zonder vraag verliest van een brug.
- Mooie visuals met onrealistische demo-data worden afgekeurd.
- Goed ontvangen: grijs rapportcanvas, witte kaarten met 1px rand, titel + ⓘ, hover-iconen, KPI-strook met vergelijking, brug, dumbbell, matrix met databalken, slicer-tegels, weekmarge met run-rate, aansluitingsregel grootboek tegen operationeel.

Alle lessen: `references/lessen-uit-feedback.md`.

## Tokens (kort; volledig in `references/tokens-en-typografie.md`)

- Datapalet (gevalideerd, web): #118DFF omzet, #3B4FD8 kosten, #E66C37 marge, #9B3FB0 netto, vaste rol per reeks. Licht: alle checks door op #ffffff. Donker: indigo haalt geen 3:1 op #16141f en #161c2b (validator) en op Fluent #1F1F1F/#292929 ook paars niet (nagerekend), dus zichtbare labels of tabelweergave verplicht. Het originele Power BI-palet faalt de lichtheidsband (#12239E en #6B007B te donker).
- Fluent 2 licht: pagina #FAFAFA, wallpaper #E6E6E6, kaart #FFFFFF met 1px #E6E6E6, radius 8px, tekst #242424, secundair #616161, gridlines #F0F0F0. Donker: kaart #292929, rand #3D3D3D, tekst #FFFFFF/#D6D6D6, as #ADADAD. Houd binnen één product één hoekmaat.
- Statustekst: #0E700E (goed), #BC4B09 (let op), #B10E1C (slecht). Pastel #9FD89F/#FDCFB4/#EEACB2 alleen als vulling met #242424 erop.
- Typografie Fluent 2 (px): labels 14, visualtitel 20, subtitel 16, card-waarde 28 semibold. Fontstack Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif.
- Marks: kolommen hooguit 24px breed, 4px afronding aan de data-kant, 2px tussenruimte, lijnen 2px, markers minimaal 8px met 2px ring.

## Assistent naast de cijfers (Copilot-patroon, eigen merk)

Details en bronnen in `references/assistent-patroon.md`.

- Merk: het eigen assistentmerk van de app, nooit een orb, sterretje, toverstaf of Copilot-merk. De Fluent-sparkle (MIT) is juridisch vrij, maar zegt niets over jouw app.
- Ingang: knop met het merk in een getint rondje van 28px en tekstlabel "Assistent", zachte pil, rechts op de titelrij. Plus "Leg deze grafiek uit" met het merk op 14px in de hover-header van elke visual.
- Paneel rechts in een eigen kolom die het canvas opzij schuift (340-420px), telefoon: sheet met grijper, max 85vh. Opent nooit vanzelf, Esc sluit. Kop: merk, "Assistent", scopechip (pagina · periode · entiteit).
- Leeg: welkom met het merk op 44px ("Waar wil je meer over weten?", "Ik gebruik alleen de cijfers op dit scherm."), 3-4 korte startvragen als kaarten; verdwijnen na het eerste bericht, terug via "Voorbeeldvragen".
- "Wat de assistent ontvangt · n visuals, n filters": inklapbaar, exact gelijk aan wat verstuurd wordt (één model voor tekst en weergave).
- Antwoorden met genummerde bronnen [n] die naar de visual scrollen en oplichten; getallencontrole markeert elk getal dat niet in de context staat; vaste regel "AI-antwoorden kunnen fouten bevatten. Controleer cijfers via de bronverwijzing."
- De backend rekent elk getal; het model vertelt alleen. Payload server-side met de rechten van de gebruiker.

## Implementatiekaart (Vue 3 + ECharts 6 + vue-echarts 8)

Recepten met code: `references/echarts-vue-implementatie.md`. Bibliotheken met versie, licentie en herkomst: `references/bibliotheken-en-herkomst.md`.
- Eén ECharts-opzet met alleen `SVGRenderer`, `CustomChart` en `GridComponent`. Elke grafiek is een custom series met renderItem; tooltip en legenda zijn HTML.
- CSS-tokens via een proefelement, met lichte terugval en donkere set. Weergave per kaart in localStorage (try/catch).
- Bouwstenen: rapportpagina (canvas, titel, slicerband, 12-koloms grid, zijpaneel), visualkaart (ⓘ en hover-iconen), KPI-strook op gemeten breedte, sparkline, matrix, slicertegels, InfoTip, "Toon meer", tabeltweeling met CSV.
- Grafieken: maandkolommen, weekmarge (run-rate, trap), 100%-staaf, brug (staand of liggend), klantstaven, dumbbell, divergerende balk.
- Menu en secties uit één config.
- Databronnen via provide/inject, zodat tests nep-bronnen injecteren in plaats van modules te mocken.
- Backend: alleen opgeslagen data, nooit een live extern systeem bij het laden; elke null met reden. Een opbouw-endpoint levert de regels achter een getal.
- Scoped CSS: schrijf `html[data-theme-mode="dark"] .x`, nooit `:global(html[...]) .x` (dat compileert tot kaal `html[...]` en kleurt de pagina).

## Visual builder engine (Vue 3, pure SVG, zonder chartbibliotheek)

Volledig in `references/visual-builder-engine.md`.
- Chart kit: canvas met assen en grid, kleur live uit tokens (elk thema), pure geometrie-helpers, dunne visuals, gedeelde tooltip en legenda, detailvenster met ruwe data en CSV.
- Layout: vormfactoren in plaats van pixels (breedte compact/standard/wide/full, hoogte short/standard/tall/grand, `measured` of `banded`, contract met `preferred` en `min`).
- Catalogus: één definitie per widget, gedeelde databron, één opgeloste reeks per tegel.
- Borden: configureerbaar (secties, slepen, resize) of vast (een view = lijst widget-id's).
- Externe ontwerpen (easyui, magicui, aceternity): geometrie porten, tokens in plaats van Tailwind, CSS in plaats van framer-motion, licentie in de kop.

## Verificatie vóór "klaar"

- [ ] Elke visual beantwoordt een opgeschreven vraag; kaarten voor en na geteld.
- [ ] KPI-rij 4 tot 5, elke kaart een eigen vraag, afwijkingen met teken en pijl, alleen de afwijking gekleurd.
- [ ] Eén y-as overal; tabeltweeling werkt; toetsenbord geeft dezelfde tooltip als hover.
- [ ] Palet gevalideerd licht en donker; tekst in tekstkleuren, niet in reekskleur.
- [ ] Demo-data vult elke bucket en ziet eruit als een echt bedrijf.
- [ ] Renders licht 1440, donker 1440, 375 gelezen; 0 fouten, geen horizontale scroll.
- [ ] Unit-tests, typecheck en backend-tests groen.
- [ ] e2e voor de UI-wijziging, zonder geheimen in de test.
- [ ] Onafhankelijke keurder (verse subagent) heeft spec, renders en testuitvoer gezien.
- [ ] Geen bestaande pagina, nav-item of feature verdwenen; open PR's van anderen niet overschreven.

## Verder lezen

Lees het bestand dat bij je taak hoort voordat je bouwt:
- Een finance-pagina of de vraag "welke visual hier": `references/patronen-finance.md` (3-30-300, KPI-anatomie, IBCS, brug, dumbbell, matrix, Pareto, bullet, cash en staffing-KPI's, top-10's).
- Menu, zijbalk, slicers, visual-header, ⓘ, drill-through, lange lijsten: `references/navigatie-en-slicers.md`.
- Wat een gebruiker per visual kan aanpassen of aanklikken, waar die staat bewaard wordt, en het doorklikpatroon: `references/aanpassingen-per-visual.md`.
- Welke Power BI-optie we spiegelen of bewust weglaten, en waar de finance-look vandaan komt (Microsoft-visuals, Zebra BI, Inforiver, Deneb): `references/powerbi-opties.md`.
- Welke bibliotheek, welke versie en licentie, waarom ECharts en wanneer iets anders: `references/bibliotheken-en-herkomst.md`.
- Een scherm mooi en rustig maken, welke design-skill wanneer, en de keuring vóór je iets laat zien: `references/mooi-ontwerpen.md`.
- Assistent, chat of "leg uit" naast cijfers: `references/assistent-patroon.md`.
- Kleur, palet, donker, letters, CSS om te plakken, delen tussen producten: `references/tokens-en-typografie.md`.
- ATS-analytics, privacy in recruitment-cijfers: `references/ats-analytics.md`.
- Een grafiekcomponent bouwen of testen, renders, e2e: `references/echarts-vue-implementatie.md`.
- Een tegelbord, widgetcatalogus of SVG-visual zonder chartbibliotheek, of een React-ontwerp (easyui) naar Vue porten: `references/visual-builder-engine.md`.
- Vóór je iets laat zien of een pagina herontwerpt: `references/lessen-uit-feedback.md`.
- Seeds en fixtures voor een dashboard: `references/demo-data.md`.
- Een bewering natrekken: `references/bronnen.md` (gegroepeerd per onderwerp).
