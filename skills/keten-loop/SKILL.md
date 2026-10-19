---
name: keten-loop
description: >-
  Orchestratie-chain die een einddoel end-to-end schipt door de loop-collectie aan elkaar te rijgen: sweep (recon) -> plan -> bouw-loop -> polijst-loop -> fix-loop -> onafhankelijke eind-verificatie. Het token-zuinige supergoal-alternatief: een evaluator-pass per gate in plaats van de volledige evaluator+council-machinerie, sonnet-workers overal waar het kan, alles op Claude-modellen. Gebruik bij "/keten-loop", "ship dit end-to-end maar goedkoper dan supergoal", of een niet-triviale feature die je niet wilt babysitten zonder een volle supergoal-run te betalen.
argument-hint: >-
  <het einddoel: feature, refactor, redesign>
---

# Chainloop

Jij bent de chain-orchestrator. Einddoel: $ARGUMENTS

Zelfde moat als supergoal (niks is klaar tot iets onafhankelijks het bewijst tegen de oorspronkelijke opdracht), maar met een fractie van de tokens: **plan zwaar, voer licht uit, verifieer eenmaal scherp per gate.** Geen council, geen dubbele evaluatie per fase, geen Codex; alles Claude (Opus orchestreert, Sonnet bouwt, Opus keurt het eind).

Wanneer NIET keten maar supergoal: een one-way-door architectuurkeuze, een migratie van 15+ fasen, of een taak waar een verkeerde richting duur is. Dan is de council + dubbele evaluatie de premie waard. Keten is voor de middag-tot-dag klus die je vertrouwt maar niet wilt babysitten.

## Hervat-check (eerst)

Bestaat `.loops/keten/state.md` met `Status: IN_PROGRESS`? Dan draait er al een chain: lees hem, vat in een regel samen welke fasen af zijn en welke de eerste onafgemaakte is, en hervat daar. Plan niet opnieuw. Anders: verse run, ga naar de chain.

## De chain

Elke schakel is een bestaande loop-skill; sla over wat niet van toepassing is en zeg dat je het overslaat.

### 1. SWEEP (alleen bij onbekende codebase of expliciete audit-wens)

Draai het speur-loop-patroon met 2-3 lenzen, max 2 rondes, gericht op: conventies, risico-plekken voor deze taak, herbruikbare bestaande code. Ken je de codebase al uit deze sessie of memory: skip, een regel melden.

### 2. PLAN (Opus, hoofdsessie, de enige dure denk-stap)

Vertaal het einddoel naar 2-6 fasen in `.loops/keten/state.md` (zie de vorm onderaan). Per fase: scope (2-5 zinnen), **een toetsbaar gate-criterium** (command + verwachte uitkomst, deliverable-pad, of observeerbaar gedrag van het draaiende artefact), en de loop die hem uitvoert. Minstens een fase draagt een empirisch criterium (het artefact echt draaien, niet alleen tests groen). Ambigue scope: stel nu een scherpe vraag, niet halverwege. Grote taak (>6 fasen, one-way-doors): stop en adviseer supergoal i.p.v. door te plannen.

### 2b. PRE-FLIGHT (voor de eerste fase)

Draai de mandatory commands van fase 1 eenmaal tegen de huidige staat. Al rood op een baseline die groen hoort te zijn: meld het en vraag of je op een kapotte baseline moet starten, i.p.v. blind de eerste fase in te gaan.

### 3. Per fase: SHIP + GATE

- Voer de fase uit met de loop die het plan voor deze fase noemt: bouw-loop (verse sonnet-workers per story, jij verifieert per story), fix-loop of polijst-loop, elk volgens zijn eigen regels.
- **Gate**: een verse evaluator-agent (laat model-parameter weg, of `model: "opus"` bij een kritieke fase) die alleen krijgt: het gate-criterium en de opdracht alles zelf vast te stellen tegen de repo en het draaiende artefact, blind voor worker-rapporten. Een pass per gate, geen tweede opinie.
- REJECT: een herstelronde via het fix-loop-patroon met de evaluator-bevindingen als input, dan eenmalig opnieuw de gate. Weer REJECT: fase BLOCKED, chain gaat door waar dat kan, eindrapport meldt het hard.
- Na een geslaagde gate: werk de state-file bij (fase afgevinkt) en schrijf een eventuele niet-voor-de-hand-liggende learning naar memory (API-eigenaardigheid, faalpatroon+fix, bevestigde voorkeur).

### 4. POLISH (alleen bij user-facing output)

Polishloop-patroon, max 2 rondes (niet 4; de chain-context maakt lange poets-runs zelden waard).

### 5. FIX (alleen bij rood)

Staat er aan het eind iets rood (suite, typecheck, console-errors), draai het fix-loop-patroon erop, max 3 iteraties.

### 6. Eind-VERIFY (de moat)

Een verse evaluator (`model: "opus"`) toetst het geheel tegen de **oorspronkelijke opdracht**, niet tegen het plan: draait de suite zelf, draait/laadt het artefact zelf (preview-tools, curl, de binary), en geeft per oorspronkelijke eis een uitslag plus ACCEPT/REJECT. REJECT: een herstelronde, dan opnieuw. Tweede REJECT: eerlijk rapporteren, niet mooipraten.

## State-file vorm

```
Status: IN_PROGRESS
Doel: <einddoel, letterlijk>
Cap: <n> fasen | Budget: <"+Nk"-directief of geen>

## Fasen
1. [x] <scope> | gate: <criterium> | loop: bouw | GATE: ACCEPT (<bewijs>)
2. [ ] <scope> | gate: <criterium> | loop: bouw
...

## Learnings / handoff
- <disk-geheugen voor verse agents; bij budget-nood de reststand>
```

## Huisregels

- State en learnings leven in `.loops/keten/state.md`; verse agents lezen disk, niet de conversatie.
- Geen commits zonder signaal; eindig met 3-7 thematische commit-groepen (commit-discipline).
- Budget-nood (context > 80% of expliciete cap): rond de lopende fase af, schrijf een handoff in de state-file, meld de reststand. Nooit stilletjes kwaliteit inleveren.

## Eindrapport

Antwoord-eerst: wat er staat, met per fase het gate-bewijs (command + uitkomst). Dan BLOCKED-items met reden, het commit-voorstel, en wat de eind-evaluator letterlijk vaststelde.

## UI-bewijs

Elke fase of gate die iets in een browser bewijst, gebruikt een echte render met een vooraf opgeschreven verwachting:
- Statische render: `node scripts/shoot.js <url|bestand> <out.png> [selector]` uit deze harness, of `npx --no-install playwright screenshot` (lokaal geinstalleerd). Lees het vooraf opgeschreven feit af.
- Flow of gedrag (klik, zoek, navigeer): een e2e-test met skill `e2e` (`npx --no-install e2e run`).
- Ingelogde of hover-state met echte data: de eigen browser van de gebruiker. Pagina's met klant- of persoonsgegevens nooit naar een extern model.
