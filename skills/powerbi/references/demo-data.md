# Demo-data die het verhaal vertelt

Wanneer lezen: vóór je een dashboard laat zien of rendert, en bij elke seed of fixture voor een visual. Een mooie visual met lelijke data wordt afgekeurd, dus geloofwaardige demo-data hoort bij de levering.

## Regels voor elke seed

- **Alleen in de demo-omgeving.** Eigen database en een demo-vlag; geen signalen naar externe systemen, geen echte persoonsgegevens (e-mail op `.example`). Schrijf boekhoudregels als read-only spiegel, zodat geen koppeling afgaat.
- **Idempotent.** Elke run geeft dezelfde wereld: stabiele sleutels (`uuid5` op een vaste naam), `update_or_create`, datums relatief aan een anker zodat ouderdom altijd in de bedoelde bucket valt.
- **Elke null met een reden.** Maak ook de randgevallen die de UI in woorden moet uitleggen (geen forecast, geen tarief, onvolledige vergelijking), maar niet zo veel dat de pagina leeg oogt.
- **Natuurlijke, korte titels.** Geen "DEMO "-voorvoegsel in titels die in een lijst staan; markeer de herkomst in een omschrijving of sleutel.
- **Gespreide bedragen.** Nooit één vast bedrag; centen en ongelijke grootte. Een paar grote en veel kleine posten.
- **Een herkenbaar patroon per visual.** Seizoen, één verliesmaand, een klant die groeit, een klant die stopt.

## Per visual

| Visual | Wat de demo-data moet hebben |
|---|---|
| KPI-strook | Genoeg historie voor vorige periode én vorig jaar; delta's in beide richtingen |
| Maandkolommen | Variatie per maand, een lopende maand, minstens één verliesmaand zodat de as onder nul zakt |
| Resultaatbrug | Elke stap niet nul, sluit op de cent |
| Omzet per klant | Minstens 8 klanten plus "Overig", scheef verdeeld, met vergelijkomzet per klant |
| Debiteuren naar ouderdom | Posten in elke bucket, verschillende bedragen, klanten met meerdere posten, één oude post bij een gestopte klant |
| Taken naar hoe laat | Elke emmer gevuld, gespreide bedragen, wisselende eigenaren, sommige zonder deadline |
| Marge per week | 26 afgesloten weken met variatie; contracten die op verschillende data aflopen |
| Winstgevendheid | Per rij een bevroren forecast én een actual, sommige boven en sommige onder, een paar zonder |
| Matrix uren | Meerdere rijen, zes maanden plus oudere uren in "Eerder", wisselende aantallen |
| Assistent | Context met getallen, zodat startvragen en getallencontrole iets te doen hebben |
| ATS | Cohorten over meerdere maanden, ongelijk verlies per fase, lopende cohorten, kleine groepen onder de drempel |

## Controle vóór je rendert

- De seed draait in de demo-database, het endpoint levert data en een vast totaal blijft gelijk tussen runs.
- Kijk naar de render, niet naar de seed: staat er een bucket op 100%? Zijn alle bedragen gelijk? Is een titel afgekapt? Dan is de data het probleem, niet de visual.
