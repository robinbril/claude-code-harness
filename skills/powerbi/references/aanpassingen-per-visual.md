# Aanpassen en doorklikken: wat de gebruiker per visual en per pagina kan

Wanneer lezen: vóór je een visual een optie, een klik of een paneel geeft, of als Robin vraagt "kan ik dit aanpassen", "kan ik hier doorklikken" of "waarom kan dat niet". Stand van de Reforge-backoffice op branch `feat/finance-visuals` (PR #445, head `620b1bce`, 2026-10-09). Elke regel is gecontroleerd in de code; paden relatief aan `frontend-app/src`.

Vuistregel: **aanpassen hoort in de app, bij de visual zelf** (Robin, 2026-10-08: "ik wil alleen de visuals een aanpassingsmogelijkheid", niet Storybook). Bied alleen een optie die een echte vraag beter beantwoordt; elke optie die je toevoegt, moet ergens bewaard of bewust vluchtig zijn (tabel onderaan).

## 1. Paneel per visual: "Meer opties" (…)

Het paneel heet in de code `WeergavePaneel`; de knop in de visual-header is het icoon `more` met tooltip "Meer opties" (testid `kaart-weergave`), een popover in `components/dashboard/DashboardKaart.vue`. In de focusmodus staat dezelfde knop nog een keer.

Vier groepen (`components/dashboard/WeergavePaneel.vue`):
- **Grafiektype**: radio's.
- **Reeksen**: vinkjes; een reeks is uitgeschakeld als hij vast ligt, niet past bij het type, de laatste is of het maximum bereikt is, met een uitlegregel eronder.
- **Kleuren**: radio's met kleurstalen, naam en omschrijving.
- **Arcering**: schakelaar, "Schuine lijnen op vlakken, voor kleurenblindheid en print"; bij een lijn: "Een lijn heeft geen vlak om te arceren".
- Plus "Standaard herstellen".

Opslag: localStorage `reforge_analytics_weergave_v1_<maand|brug|klanten>` (`composables/useGrafiekWeergave.ts`), meteen bij elke wijziging, bij het laden gevalideerd met zod; zonder opslag geldt de keuze alleen voor de sessie (try/catch).

| Kaart (visualId) | Grafiektypen | Reeksen | Standaard | Arcering |
|---|---|---|---|---|
| `fin-trend` maandgrafiek | Kolommen gestapeld, Kolommen naast elkaar, Lijn, Vlak | Omzet, Directe kosten, Brutomarge, Nettoresultaat. Gestapeld: kosten + marge vast. Vlak 1-2, Naast 1-4, Lijn 1-4 | gestapeld, kosten + marge, kleurset Power BI, arcering uit | niet bij Lijn |
| `fin-brug` resultaatbrug | Verticale brug, Horizontale brug | geen | verticaal | altijd |
| `fin-klanten` omzet per klant | Staven, Tabel | "Vergelijking (streepje)", alleen bij Staven | staven met vergelijking | alleen bij Staven |

De kleurset van de maandkaart stuurt ook de KPI-accenten en de weekmarge, zodat één keuze de hele pagina consistent houdt.

**Kleursets** (`components/finance/charts/kleursets.ts`, volgorde marge / kosten / omzet / netto):

| id, label | omschrijving | licht | donker |
|---|---|---|---|
| `powerbi`, "Power BI" (standaard) | blauw, indigo, oranje, paars | #e66c37 #3b4fd8 #118dff #9b3fb0 | gelijk |
| `standaard`, "Backoffice" | violet en teal van de backoffice | #5b50e6 #229c98 #d46b01 #ac1377 | #7a70f0 #2ea8a3 #db7213 #d0126f |
| `contrast`, "Contrastrijk" | maximaal uit elkaar, ook bij kleurenblindheid | #2063b0 #a87600 #176325 #c51f5d | #4682cc #bb881a #047745 #cd4787 |
| `ingetogen`, "Ingetogen" | gedempt, voor rustige rapporten | #505ba7 #aa7d25 #1e6321 #c467a4 | #6673c1 #b48630 #297623 #c24976 |

Arcering is een ECharts-decal: lijn toon-op-toon (licht 38% naar zwart, donker 45% naar wit), vaste hoek per reeks (omzet en marge 45°, kosten en netto 135°). Nieuwe kleurset? Eerst de `dataviz`-validator, licht en donker, uitvoer in de kopcomment van `kleursets.ts`.

Bewust niet in het paneel: een periode per visual. Periode is één pagina-filter (één periodebasis per pagina).

## 2. Visual-header (hover of toetsenbordfocus; op touch altijd)

`role="toolbar"`, aria-label "Opties voor {titel}"; iconen blijven staan zolang een knop ingedrukt of uitgeklapt is.

| Icoon | Doet | Voorwaarde |
|---|---|---|
| ⓘ "Toelichting bij {titel}" | InfoTip; hover, focus of klik (klik zet vast), Esc sluit | slot `#info` of prop `info` |
| "/" "Leg deze grafiek uit" | opent de assistent met scope op deze visual; tijdens een antwoord `aria-disabled` | assistent-aanvraag + `visualId` (nu alleen Finance) |
| `table` "Toon als tabel" / "Toon grafiek" | tabeltweeling uit hetzelfde `TabelModel` | prop `tabel` |
| `download` "Gegevens exporteren (CSV)" | puntkomma, decimale komma, geen duizendtallen, CRLF, BOM, formule-injectie geneutraliseerd (`tabel.ts`) | prop `tabel` |
| `maximize` "Focusmodus" | teleport naar body, `role=dialog`, focus op "Terug naar rapport", Tab blijft binnen, Esc of achtergrondklik sluit, focus terug naar de knop | `focusbaar` (standaard aan) |
| `more` "Meer opties" | paneel uit sectie 1 | slot `#weergave` |

De tabel kent geen klikbare sorteerkoppen; de matrix wel.

## 3. Pagina: filters, nadruk, lijsten

- **FilterRij** (`components/analytics/FilterRij.vue`): Periode als slicertegels 3m, 6m, 12m, 24m, Dit jaar; Vergelijking (Vorig jaar, Vorige periode, Geen vergelijking) met ⓘ; Entiteit alleen bij meer dan twee keuzes.
- **URL** (`components/analytics/filters.ts`): `periode` en `vergelijk` altijd expliciet, `entiteit`, `van`/`tot` (YYYY-MM, alleen geldig als van ≤ tot en niet na de lopende maand); `router.replace`. Zonder expliciete filters en met een onvolledig vorig jaar kiest de pagina eenmalig een terugval (12m, 6m of 3m tegen vorige periode) en zegt dat.
- **Maandfilter (cross-filter)**: klik of Enter op een maand zet `van=tot=maand`, nog een klik heft het op; geldt voor KPI's, brug, klanten en assistent, niet voor de maandgrafiek zelf. Chip "Gefilterd op {maand}" met "Maandfilter opheffen (Esc)". Esc wint niet van een open select, popover, dialoog, invoerveld, opbouwpaneel of focusmodus.
- **KPI-nadruk**: elke KPI-kaart is een knop met `aria-pressed`; een klik zet nadruk op de reeks in de maandgrafiek en scrollt erheen (smooth, of direct bij reduced motion), en opent bij omzet, brutomarge en netto de opbouw. Marge % geeft alleen nadruk. Niet in de URL.
- **Toon meer** (`useToonMeer`): eerst 5, dan per 10, focus naar de eerste nieuwe rij. Uitzonderingen: waardebalken 8, matrix 10.
- **Matrix** (`MatrixVisual.vue`, Commissie en Uren): groepen met ⊞/⊟, pijltjes, Home/End, sorteerbare koppen met `aria-sort`.

## 4. Doorklikken: opbouw achter elk getal

Robin, 2026-10-09: "bij elke visual moet je door kunnen klikken om meer details in te kunnen zien". De oplossing is één detailpaneel rechts (Power BI's drill-through, maar zonder paginawissel), één endpoint en één URL-sleutel.

- **URL**: `?opbouw=` is een tegelsleutel (`openstaand_debiteuren`, `overdue`, `crediteuren_te_betalen`, `brutomarge`, `forecast_ytd`, `actual_ytd`) of `<soort>:<sleutel>` met soort `stap|kpi|klant|bucket|vervallen|week` (`views/FinanceView.vue`, `parseOpbouw`). Splits op de eerste `:` (een klantsleutel kan `naam:...` zijn). Onbekend of kapot geeft geen paneel en geen fout. Dezelfde keuze nog eens sluit.
- **Endpoint**: `GET /api/v1/analytics/opbouw/?soort=&sleutel=` met dezelfde filters als `analytics/resultaat` (periode, entiteit_id, van, tot) (`reforge_backoffice/api/analytics_opbouw.py`). Antwoord: `titel`, `subtitel`, `formule`, `totaal`, `bron`, `status`, `regels[{label, bedrag, aantal, detail}]`.
- **Invariant**: het totaal komt uit dezelfde functie als het getal op het scherm, en de regels tellen er op de cent op. Toets dat per soort in de backend-tests en live met een klikronde die het API-antwoord vergelijkt met het aangeklikte getal (`Money` is NumberFlow in shadow DOM: lees bedragen uit het API-antwoord, niet uit de tekst).

| Klikbaar | Sleutel | Regels in het paneel | Vervolglink |
|---|---|---|---|
| Staaf van de resultaatbrug | `stap:<omzet\|directe_kosten\|brutomarge\|personeel\|overig\|rente_overig\|netto>` | grootboekrekeningen | geen |
| KPI Omzet, Brutomarge, Nettoresultaat | `kpi:<omzet\|marge\|netto>` | per maand | geen |
| Klant in "Omzet per klant" | `klant:<id>` of `klant:naam:<naam>` | boekstukken met datum | geen |
| Vlak van de ouderdomsbalk | `bucket:<not_due\|d1_7\|d8_30\|d31_60\|d60_plus\|unknown>` | facturen, "vervallen op … · n dagen te laat" | Betaaltaken |
| Rij "Meeste vervallen" | `vervallen:<klant>` | facturen van die klant | Betaaltaken |
| Week in "Marge per week" (alleen Afgelopen 26 weken) | `week:<YYYY-Www>` | marge per plaatsing, "36 uur" | Naar uren |
| Rij in Posities | tegelsleutel | zoals de tegel | per tegel |

Tekst in het paneel is voor mensen: titel gelijk aan het label waarop geklikt werd ("Op tijd", niet "Niet vervallen"), week als "Marge week 39" met "21 t/m 27 sep 2026", uren met komma zonder nullen, "1 dag te laat", nooit een URL-pad of modelnaam in de formule. De kolom Aantal verschijnt alleen als een regel een aantal heeft. Esc sluit eerst het paneel en laat een maandfilter staan.

Niet doorklikbaar, met reden: Marge % (een percentage heeft geen regels), "Komende 13 weken" (voorspelling, geen boeking).

## 5. Interactie in de grafiek zelf

- Eén toetsenbordmodel (`useGrafiekOmgeving.ts`): één band per grafiek in de tabvolgorde (roving), pijltjes, Home, End. Tooltips zijn HTML-overlays op hover én focus; ECharts heeft geen tooltip- of legendacomponent geregistreerd.
- Maandgrafiek: elke maand een knop met volledig aria-label; legenda klikbaar om een reeks naar voren te halen; "Lichter: lopende maand".
- Marge per week: slicer "Afgelopen 26 weken" / "Komende 13 weken"; CSV-naam en tabel wisselen mee.
- Resultaatbrug: valt bij te weinig ruimte vanzelf terug op liggend en zegt waarom; onder 132 px korte namen.
- Omzet per klant: hover en focus geven nadruk, klik zet vast en opent de opbouw.
- Ouderdomsbalk (`VerdelingBalk`): elk vlak een knop met tooltip; de gekozen bucket blijft vol, de rest dimt.
- Financiële taken: een vlak van de lateness-balk filtert de lijst (chip "Filter … opheffen"); een taak opent het taakpaneel.

## 6. Andere finance-pagina's

| Pagina | Opties | In de URL |
|---|---|---|
| Winstgevendheid | Zoeken, Niveau (Plaatsing, Recruiter, Team, Entiteit), Entiteit, Maat (Omzet, Brutomarge), sorteren (13 opties + kolomkoppen), rij kiezen | `q`, `niveau`, `entiteit`, `maat`, `sort`, `dir`, `rij` |
| Commissie | Entiteit, Jaar, matrix sorteren en uitklappen, "Alle medewerkers uit/inklappen", "Toon eerdere berekeningen", regel opent opbouw | `entiteit`, `jaar` |
| Uren | Plaatsing, Aantal weken (8, 16, 26, 52) | nee |
| Betalingen | standaard visual-header | n.v.t. |
| Partnerfacturen | Groeperen op Status of Partner; klik op statusbalk filtert | `status`, `q`, `factuur` |
| Mijn beloning | standaard visual-header | n.v.t. |
| Assistent (alleen Finance) | "Wat de assistent ontvangt" met per visual "Toon {titel}", Afbakening, volledige tekst; startvragen (max 4); bronknoppen [n]; Opnieuw | nee |

## 7. Waar staat de staat: beslisregel

| Soort keuze | Waar | Voorbeeld |
|---|---|---|
| Wat je ziet (filter, periode, entiteit, gekozen rij, opbouw) | URL, `router.replace` | `periode`, `van/tot`, `opbouw`, `rij` |
| Hoe je het ziet (type, reeksen, kleuren, arcering) | localStorage per visual, zod-gevalideerd, try/catch | `reforge_analytics_weergave_v1_maand` |
| Moment-nadruk (hover, vastgezette klant, KPI-nadruk, taakfilter) | component-state, vluchtig | `vast`, `nadruk` |

Bekende gaten (nog niet bewaard, zet ze in de URL als Robin ze deelbaar wil): Uren (plaatsing, weken), weekmarge terug/vooruit, Partnerfacturen-groep, Commissie-sortering, KPI-nadruk. Doorklikken bestaat nu alleen op het Overzicht; Winstgevendheid, Commissie, Uren, Betalingen, Partnerfacturen en Mijn beloning volgen met hetzelfde patroon (nieuwe `soort` in het endpoint, `@kies` op de visual, dezelfde `?opbouw=`-sleutel).

## 8. Vergelijking met Power BI

Wat Power BI auteurs en lezers per visual laat doen, en welke deel wij spiegelen: zie `powerbi-opties.md` (onderzoek 2026-10-09).
