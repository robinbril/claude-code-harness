---
name: polijst-loop
description: Kwaliteits-loop die een UI, tekst of deliverable iteratief verbetert via score-tegen-rubric, gerichte fixes en een verse judge per ronde, tot de score plateaut. Gebruik bij "maak dit mooier/beter", "polish deze pagina", "/polijst-loop", "haal dit naar niveau", of na een eerste werkende versie die nog niet af voelt. Stopt automatisch bij plateau of 4 rondes; verbrandt geen tokens aan eindeloos rondpoetsen. Verfijnt een REEDS BESTAANDE versie; het eerste ontwerp of de eerste bouw van een UI hoort bij design-taste-frontend of redesign-existing-projects.
argument-hint: >-
  <wat gepolijst moet worden: pagina, component, tekst, deck>
---

# Polishloop

Jij bent de orchestrator. Judges scoren, workers fixen, jij bewaakt het plateau. Het doelobject: $ARGUMENTS

## Hervat-check (eerst)

Bestaat `.loops/polijst/state.md` met `Status: IN_PROGRESS`? Dan draait er al een polish: lees de score-historie en hervat bij de volgende ronde. Anders: verse run, ga naar Stap 0.

## Stap 0: rubric (eenmalig)

Stel 5-7 meetbare assen op, toegespitst op het object, elk 1-10. Anker minstens 3, 5, 7 en 9 met een omschrijving, niet alleen 9+, want zonder ankers onder de top drijft de score op smaak en wordt de plateaugrens onbetrouwbaar. Voorbeelden van assen:

- **UI**: hierarchie/scale-contrast, spacing-ritme, states (hover/focus), responsiveness op 375 en 1440, geen template-look (design-quality regels), performance (geen layout shift).
- **Tekst/comms**: humanizer-tells weg, de eigen stijl-regels van de gebruiker (indien aanwezig), antwoord-eerst, lengte vs doel, concreet detail.
- **Code/API**: leesbaarheid, naamgeving, file-groottes, foutafhandeling, geen dode paden.

Schrijf de rubric (met de ankers) in `.loops/polijst/state.md`, zie de vorm onderaan.

## De loop (max 4 rondes)

1. **Judge** (Agent, verse context per ronde, nooit hergebruiken). `model: "sonnet"` voor mechanische assen; laat het model-parameter weg (hoofdsessie, Opus) als smaak de kern is. De judge observeert het ECHTE artefact: bij UI via preview-tools (snapshot, inspect, screenshot, resize naar mobile), bij tekst de file zelf, bij code de diff plus de files. Verwacht terug: score per as tegen de ankers, totaal, en de **top-3 concreetste fixes** (met file/regel of element). Zijn er meer dan 3 kritieke problemen, noem ze wel maar fix de top-3 deze ronde.
2. **Fix-worker** (Agent, `model: "sonnet"`). Voert alleen die top-3 uit, chirurgisch. Niet "en passant" andere dingen verbouwen.
3. **Re-score** door een verse judge (zelfde rubric + ankers, blind voor de vorige scores). Log de ronde in de state-file.

## Stopcondities (hard)

- Gemiddelde >= 9: klaar.
- **Plateau onder 7** (gaat voor de gewone plateau-stop): blijft de score twee rondes onder 7 hangen, escaleer de judge en fix-worker naar `model: "opus"` voor een ronde voor je opgeeft; een sonnet-plateau is soms een sonnet-plafond.
- Winst < 0.5 punt t.o.v. vorige ronde, met score >= 7 of na die opus-ronde: plateau, stop. Meer rondes zijn dan ruis.
- 4 rondes: stop hoe dan ook.
- Een as die daalt na een fix: draai die fix terug voor je verder gaat.
- Elke stop (klaar, plateau, 4 rondes, opgegeven): zet eerst `Status: DONE` in de state-file, zodat een volgende aanroep niet hervat op een afgeronde run.

## State-file vorm

```
Status: IN_PROGRESS
Object: <wat>
Rubric (ankers): <as>: 3=<...> 5=<...> 7=<...> 9=<...> | ...

## Rondes
r1: <as-scores> | gem <x> | fixes: <top-3>
r2: ...
```

## Guardrails

- Judges observeren, workers wijzigen; nooit dezelfde agent voor beide.
- Bij UI: verifieer met inspect (echte CSS-waarden), niet alleen screenshots.
- Functionele regressie is een instant-fail: draai na elke fixronde de bestaande suite of laad de pagina en check de console.
- Geen commits zonder signaal.

## Eindrapport

Score-verloop per ronde (compact tabelletje), wat de grootste sprongen gaf, wat bewust is blijven liggen en waarom.

## UI-bewijs

Elke fase of gate die iets in een browser bewijst, gebruikt een echte render met een vooraf opgeschreven verwachting:
- Statische render: `node scripts/shoot.js <url|bestand> <out.png> [selector]` uit deze harness, of `npx --no-install playwright screenshot` (lokaal geinstalleerd). Lees het vooraf opgeschreven feit af.
- Flow of gedrag (klik, zoek, navigeer): een e2e-test met skill `e2e` (`npx --no-install e2e run`).
- Ingelogde of hover-state met echte data: de eigen browser van de gebruiker. Pagina's met klant- of persoonsgegevens nooit naar een extern model.
