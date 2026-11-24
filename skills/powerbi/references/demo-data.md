# Demo-data die het verhaal vertelt

Wanneer lezen: vóór je een dashboard laat zien of rendert, en bij elke seed of fixture voor een visual. Robin (2026-10-08) noemde de ouderdom- en takenvisuals "prachtig" en de demo-data "lelijk": één factuur vulde 100% van één bucket en alle bedragen waren € 1.250. Een mooie visual met lelijke data wordt afgekeurd, dus geloofwaardige demo-data hoort bij de levering.

## Regels voor elke seed

- **Alleen in de demo-omgeving.** DEMO_MODE en de eigen `backoffice_demo`-db; geen signals naar Exact of andere externe systemen, geen echte persoonsgegevens (e-mail op `.example`). De backoffice-seeds schrijven grootboekregels als read-only spiegeltabellen en maken geen `Client` aan, juist om geen Exact-signal te raken (`modules/core/demo/volume_exact.py`).
- **Idempotent.** Elke run geeft dezelfde wereld: stabiele sleutels (`uuid5` op een vaste naam, een vaste `source_key` per producer), `update_or_create`, datums relatief aan een anker of de seed-dag zodat ouderdom altijd in de bedoelde bucket valt.
- **Elke null met een reden.** Laat de seed ook de randgevallen maken die de UI in woorden moet uitleggen (geen forecast, geen tarief, een onvolledige vergelijking), maar niet zo veel dat de pagina leeg oogt.
- **Natuurlijke, korte titels.** Geen "DEMO "-voorvoegsel in titels die in een lijst staan: dat kapte "DEMO factuur klaarz…" af. Markeer demo-herkomst in een omschrijving of producer-sleutel. Klantnamen mogen "DEMO " dragen als ze kort blijven.
- **Gespreide bedragen.** Nooit één vast bedrag; centen en ongelijke grootte ("€ 18.640,50", "€ 7.986,50"). Een paar grote en veel kleine posten, zoals een echt bureau.
- **Een herkenbaar patroon per visual.** Seizoen (stille zomer en december), één verliesmaand, een klant die groeit, een klant die stopt. Een grafiek zonder patroon toont niets.

## Per visual

| Visual | Wat de demo-data moet hebben | Backoffice-voorbeeld |
|---|---|---|
| KPI-strook | Genoeg historie voor een vergelijking met vorige periode én vorig jaar; delta's in beide richtingen | 18 maanden grootboek, telt over de SSOT-grens heen (Moneybird-historie vóór, Exact erna) |
| Maandkolommen | Variatie per maand, een lopende maand, minstens één verliesmaand zodat de as onder nul zakt | `_SEIZOEN` (juli 0,86, augustus 0,82, december 0,80) en `_VERLIESMAAND = 7` (kantoorverhuizing plus herstructureringsadvies) |
| Resultaatbrug | Elke stap niet nul (directe kosten, personeel, overig, rente/overig), sluit op de cent | Spec R4: brutomarge − personeel − overig + rente/overig = netto |
| Omzet per klant | Minstens 8 klanten plus "Overig", scheef verdeeld maar zonder één klant op 100%, met vergelijkomzet per klant | `_RELATIES`: 12 relaties met gewichten van 22 tot 3, twee omzetrekeningen (detachering, zzp-tussenkomst), een paar met kortere historie en één die stopte (Brakwater) |
| Debiteuren naar ouderdom | Posten in elke bucket, verschillende bedragen, een paar klanten met meerdere posten, één oude post bij een gestopte klant | `_DEBITEUREN`: 28 open facturen; ruim een derde vervallen, verspreid over 1-7, 8-30, 31-60 en 60+ dagen, bij zes klanten, met € 11.890 op 74 dagen bij de gestopte klant |
| Financiële taken | Elke lateness-emmer gevuld (op tijd, <1 dag, 1-3, 3-7, 7+), gespreide bedragen, wisselende eigenaren en prioriteiten, sommige zonder deadline | `_FINANCE_TAKEN` in `volume_tasks.py`. Let op: de 80 operationele volumetaken gebruiken nog één vast bedrag (`Decimal("1250.00")`) |
| Marge per week | 26 afgesloten weken met variatie, contracten die de komende 8 tot 13 weken op verschillende data aflopen | Acht actieve detacheringsplaatsingen in een vast cohort (`volume_hours.py`), klanten rouleren zodat niet acht keer dezelfde opdrachtgever verschijnt |
| Winstgevendheid | Per plaatsing een bevroren forecast én een actual, sommige boven en sommige onder, commissie en bonus, een paar zonder forecast of actual | `volume_profitability.py` bevriest de forecast via de echte `freeze_placement_forecast`, geen losse berekening |
| Matrix uren | Meerdere plaatsingen, zes maanden plus oudere uren in "Eerder", wisselende aantallen | `volume_hours.py`: WorkEvents en tarieven |
| Assistent | Context met echte getallen, zodat startvragen en de getallencontrole iets te doen hebben | Komt vanzelf uit de seeds hierboven |
| ATS (Polpo) | Cohorten over meerdere maanden, verlies per fase dat niet monotoon gelijk is, lopende cohorten, kleine groepen onder de drempel | Nog niet gebouwd |

## Controle vóór je rendert

- Spec-acceptatie (analytics-v1): de seed draait in de demo-db, het endpoint geeft `heeft_data=true` met minstens 8 klanten, en de 12-maandsomzet in de demo blijft **2.162.990,79** zodat bestaande tests en renders vergelijkbaar blijven.
- Kijk naar de render, niet naar de seed: staat er een bucket op 100%? Zijn alle bedragen gelijk? Is een titel afgekapt? Dan is de data het probleem, niet de visual.
- Het demo-account en de demo-stack: `echarts-vue-implementatie.md`, sectie 12.
