# Aanpassen en doorklikken: wat de gebruiker per visual en per pagina kan

Wanneer lezen: vóór je een visual een optie, een klik of een paneel geeft.

Vuistregel: **aanpassen hoort in de app, bij de visual zelf**. Bied alleen een optie die een echte vraag beter beantwoordt. Elke optie wordt bewaard of is bewust vluchtig (sectie 6).

## 1. Paneel per visual: "Meer opties" (…)

Vier groepen in een popover vanuit de visual-header:
- **Grafiektype**: radio's, alleen de vormen die bij de vraag passen.
- **Reeksen**: vinkjes; uitgeschakeld als de reeks vast ligt, niet past bij het type of de laatste gekozen reeks is. Bij het maximum gaan alleen de niet-gekozen vinkjes uit, zodat je kunt wisselen. Met een uitlegregel.
- **Kleuren**: radio's met kleurstalen, naam en omschrijving, uit gevalideerde sets.
- **Arcering**: schakelaar, voor kleurenblindheid en print.
- Plus "Standaard herstellen".

Opslag: localStorage per visual, meteen bij elke wijziging, bij het laden gevalideerd met een schema; zonder opslag geldt de keuze voor de sessie (try/catch).

| Kaart | Grafiektypen | Reeksen | Arcering |
|---|---|---|---|
| Maandgrafiek | gestapeld, naast elkaar, lijn, vlak | omzet, kosten, marge, netto. Gestapeld: kosten + marge vast. Vlak 1-2, naast 1-4, lijn 1-4 | niet bij lijn |
| Resultaatbrug | staand, liggend | geen | altijd |
| Omzet per klant | staven, tabel | vergelijking (streepje), alleen bij staven | alleen bij staven |

Eén kleurset stuurt de hele pagina, zodat een keuze consistent blijft. Nieuwe set? Eerst de `dataviz`-validator, licht en donker.

Bewust niet in het paneel: een periode per visual. Periode is één pagina-filter.

## 2. Visual-header (hover of toetsenbordfocus; op touch altijd)

`role="toolbar"`, aria-label "Opties voor {titel}"; iconen blijven staan zolang een knop open is.

| Icoon | Doet |
|---|---|
| ⓘ | InfoTip op hover, focus of klik (klik zet vast), Esc sluit |
| Assistentmerk | opent de assistent met scope op deze visual |
| Tabel | tabeltweeling uit hetzelfde model als de grafiek |
| Export | CSV: puntkomma, decimale komma, geen duizendtallen, CRLF, BOM, formule-injectie geneutraliseerd |
| Focus | `role=dialog`, Tab blijft binnen, Esc sluit, focus terug naar de knop |
| Meer | paneel uit sectie 1 |

## 3. Pagina: filters, nadruk, lijsten

- **Filterrij**: periode als slicertegels, vergelijking (vorig jaar, vorige periode, geen), entiteit alleen bij meer dan twee keuzes.
- **URL**: periode en vergelijking expliciet; `van`/`tot` alleen geldig als van ≤ tot; `router.replace`. Is vorig jaar onvolledig, kies eenmalig een terugval en zeg dat.
- **Cross-filter**: klik of Enter op een maand filtert KPI's, brug, klanten en assistent, niet de maandgrafiek zelf. Een chip heft het op. Esc wint niet van een open select, popover, dialoog of invoerveld.
- **KPI-nadruk**: elke KPI-kaart is een knop met `aria-pressed`; zet nadruk op de reeks en opent waar mogelijk de opbouw.
- **Toon meer**: eerst 5, dan per 10, focus naar de eerste nieuwe rij. Uitzonderingen: waardebalken 8, matrix 10.
- **Matrix**: groepen met ⊞/⊟, pijltjes, Home/End, sorteerbare koppen met `aria-sort`.

## 4. Doorklikken: opbouw achter elk getal

Eén detailpaneel rechts (Power BI's drill-through zonder paginawissel), één endpoint, één URL-sleutel.

- **URL**: `?opbouw=<soort>:<sleutel>`. Splits op de eerste `:`. Onbekend of kapot geeft geen paneel en geen fout. Dezelfde keuze nog eens sluit.
- **Endpoint**: zelfde filters als de pagina; antwoord met `titel`, `subtitel`, `formule`, `totaal`, `bron`, `status`, `regels[{label, bedrag, aantal, detail}]`.
- **Invariant**: het totaal komt uit dezelfde functie als het getal op het scherm en optelbare regels tellen er op de cent op. Toets dat per soort in de backend en met een klikronde.

| Klikbaar | Regels in het paneel |
|---|---|
| Staaf van de resultaatbrug | grootboekrekeningen |
| KPI omzet, marge, netto | per maand |
| Klant | boekstukken met datum |
| Vlak van de ouderdomsbalk | facturen, "vervallen op … · n dagen te laat" |
| Week in de weekmarge | marge per opdracht met uren |

Tekst is voor mensen: titel gelijk aan het aangeklikte label, "1 dag te laat", nooit een URL-pad of modelnaam in de formule. Esc sluit eerst het paneel. Een percentage, mediaan of p90 telt niet op uit regels: toon bij een percentage teller, noemer en n, bij een mediaan of p90 de gesorteerde waarden (of hun verdeling) met n en de gebruikte methode. Niet doorklikbaar: voorspellingen (geen boeking).

## 5. Interactie in de grafiek

- Eén toetsenbordmodel: één band per grafiek in de tabvolgorde (roving), pijltjes, Home, End. Tooltips zijn HTML op hover én focus.
- Legenda klikbaar om een reeks naar voren te halen.
- Een brug valt bij te weinig ruimte terug op liggend en zegt waarom.
- Ouderdomsbalk: elk vlak een knop; de gekozen bucket blijft vol, de rest dimt.

## 6. Waar staat de staat

| Soort keuze | Waar | Voorbeeld |
|---|---|---|
| Wat je ziet (filter, periode, entiteit, rij, opbouw) | URL, `router.replace` | `periode`, `van/tot`, `opbouw`, `rij` |
| Hoe je het ziet (type, reeksen, kleuren, arcering) | localStorage per visual, schema-gevalideerd | weergave per kaart |
| Moment-nadruk (hover, vastgezette klant) | component-state, vluchtig | `nadruk` |

Wat Power BI per visual biedt en wat je daarvan spiegelt: `powerbi-opties.md`.
