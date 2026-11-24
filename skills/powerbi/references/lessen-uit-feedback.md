# Lessen uit feedback op echte rapporten

Wanneer lezen: vóór je een pagina herontwerpt, een visual toevoegt of een render laat zien. Elke regel komt uit een afkeuring of goedkeuring van een gebruiker op een werkend finance-rapport.

## 1. Afgekeurd, en de regel die eruit volgt

| Wat | Waarom het werd afgekeurd | Regel |
|---|---|---|
| Pagina's samenvoegen tot één hub met tabs, nav-items weg | Bestaande analyses verdwenen | Verbeteren, nooit slopen |
| Tegelraster met veel tegels | Onoverzichtelijk | KPI-strook met vergelijking; geen lege tegels; elke tegel een vraag |
| Afgekapte zoekvelden en rijen knoppen | Te veel knoppen | Twee of drie slicers in de band, de rest in een filter pane |
| Gestapelde uitlegnotities onder kaarten | Ruis | Uitleg achter één ⓘ |
| Alle rijen van een lijst tegelijk | Te lang | 5 rijen en "Toon meer" |
| Componentencatalogus als oplevering | Aanpasbaarheid hoort in de app | Weergave per visual: type, periode, reeksen, kleuren, arcering |
| Assistentpaneel op telefoon met witte leegte, kale tekstrijen en een zware rand | Oogt onaf | Welkom met inhoud, startvragen als kaarten, rustige rijen, lichte invoerrand |
| Orb, sterretje of toverstaf als assistentmerk | Betekenisloos | Het eigen, platte assistentmerk van de app met tekstlabel |
| Takenlijst met stip en waarschuwingsdriehoek op elke rij | Niets valt meer op | 100%-balk naar hoe laat plus compacte matrix met databalk en tekst |
| Scatter van uren tegen marge per uur | Beantwoordt geen vraag | Brug van forecast naar netto marge |
| Demo-data met één bucket op 100% en gelijke bedragen | De visual was goed, de data lelijk | Realistische demo-data hoort bij de levering (`demo-data.md`) |
| Zichtbare sectiekoppen in de zijbalk | Druk | Dunne scheidingslijn; de sectienaam blijft voor schermlezers |
| Dezelfde knop op elke rij | Herhaling | De rij is de ingang; acties na openklappen of één bulkactie in de kop |
| Rode pil en rode stip op elke te late regel | Herhaling | Groepeer onder één kop, per regel alleen het variabele deel ("11 dagen") |
| Actieknoppen groot onder de paneeltitel | Wisselende plekken | Kop = titel en sluiten; acties in de voet rechts |
| Een zin en een chip met een ander aantal | Tegenstrijdig | Eén van de twee weg |
| Getallen zonder doorklik | Niet te controleren | Elk getal opent zijn opbouw, op de cent kloppend |

## 2. Goedgekeurd

- Grijs rapportcanvas, witte visuals met 1px rand, titel met ⓘ, header-iconen bij hover.
- KPI-strook met vergelijking en trendlijn; waterval; dumbbell forecast tegen realisatie; matrix met databalken; slicertegels.
- Klantbalken met een streepje voor de vorige periode.
- Weekmarge met run-rate als referentielijn; aflopende marge als trap, gelabeld "contractueel, vóór verlengingen".
- Aansluitingsregel tussen grootboek en operationele marge.
- Ouderdom als één 100%-balk in een sequentiële warme reeks.
- Commissie en bonus in de brug als neutrale grijze vaste aftrek.

## 3. Ruilen, niet toevoegen

- Elke nieuwe visual vervangt een zwakkere; hooguit één kaart meer dan ervoor.
- Zelden nuttig: gauges, donuts, sparklines overal, DSO-trend, budgetlijnen, cashprognose, leaderboards. Voeg ze alleen toe met een opgeschreven vraag.
- Maak risico's zichtbaar: twee marges die elkaar tegenspreken, contractverlengingen, dubbeltelling tussen entiteiten.

## 4. Twee bouwlessen

- **Brugkleuren volgen wat de stappen zijn.** Afwijkingsstappen kleuren als vulling in de goed- en slecht-token; tekstinkt-tinten ogen als balk bruin. Een kosten/omzetbrug houdt de reekskleuren.
- **Labels botsen nooit.** Label selectief, zet de eenheid in de subtitel en schrijf een test die overlappende labelvakken vangt.

## 5. Werkwijze

- Render de echte app in licht 1440, donker 1440 en telefoon 375. Schrijf eerst de verwachting op, lees dan de PNG.
- Vraag om een cijfer bij de render, niet om "ziet er goed uit".
- Een onafhankelijke keurder krijgt spec, renders en testuitvoer vóór je "klaar" zegt.
