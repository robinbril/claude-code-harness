---
name: dicht-loop
description: >-
  Security-gaten dichten in bestaande code zonder dat normaal gedrag verandert, door bestaande harness-skills op volgorde te draaien: e2e legt het huidige gedrag vast, speur-loop vindt en bewijst de kwetsbaarheden, fix-loop dicht ze een voor een met een aanvalstest, find-bugs keurt de diff. Fixes die gewone gebruikers merken (CSRF-tokens, escaping, wachtwoord-hashing, sessie-cookies, autorisatie) gaan naar een beslislijst, nooit automatisch. Gebruik bij "haal de kwetsbaarheden eruit", "maak deze legacy-code veilig", "security fixen zonder functionaliteit te veranderen", "/dicht-loop", of na een versie-migratie. Alleen vinden: speur-loop. Alleen een branch-diff reviewen: find-bugs.
argument-hint: >-
  <hoe de app lokaal draait en de belangrijkste flows>
---

# Dichtloop

Jij bent de orchestrator. Deze skill voegt geen eigen methode toe: hij rijgt bestaande skills aan elkaar en bewaakt één regel. Doel: $ARGUMENTS

## Hervat-check (eerst)

Bestaat `.loops/dicht/state.md` met `Status: IN_PROGRESS`? Lees hem en hervat bij de eerste onafgemaakte stap. Baseline en speurtocht niet opnieuw draaien. Anders: verse run, stap 1.

## De regel

Een security-fix verandert altijd iets: een aanval moet daarna mislukken. Daarom twee toetsen, allebei machinaal:

- **Normale invoer:** de baseline uit stap 1 blijft groen.
- **Aanvalsinvoer:** de aanvalstest per vondst, eerst rood, daarna groen.

Een fix die de baseline rood maakt, is geen fix maar een beslissing voor een mens.

## De keten

1. **Baseline met `e2e`.** Leg het huidige gedrag van de belangrijkste flows vast in tests met exacte expects, op testdata, nooit productiedata. Geen web-app: characterization-tests in het testframework van het project. Draai ze: ze moeten nu groen zijn. Leg het commando vast als **baseline-commando**. Geen groene baseline: stop en meld het.
2. **Vinden met `speur-loop`.** Lenzen: injection, auth en sessies, secrets, input-validatie. Staat er een taint-scanner in het project (Psalm voor PHP, Semgrep), laat een finder die draaien. Alleen vinden en bewijzen; elke bevestigde vondst heeft een pad van invoer naar sink.
3. **Sorteren.** Per bevestigde vondst een klasse:
   - **A, stil te fixen:** alleen een aanvaller merkt de fix. Prepared statements, `escapeshellarg`, pad-checks bij includes en downloads, `unserialize` met `allowed_classes => false`.
   - **B, beslissing van een mens:** gewone gebruikers merken het. CSRF-tokens, escaping van tekst die nu als HTML wordt getoond, wachtwoord-hashing, sessie-cookie-flags, autorisatiechecks, strengere validatie.
   - **C, buiten de code:** secrets roteren, serverconfig.

   Twijfel tussen A en B is B. B en C fix je niet.
4. **Fixen met `fix-loop`, per A-vondst een run.** Laat eerst een test schrijven die de aanval uitvoert en eist dat hij geblokkeerd wordt; die is nu rood. Doelcommand van fix-loop: die aanvalstest plus het baseline-commando. Wordt de baseline rood en lukt groen niet zonder hem te veranderen: wijziging terugdraaien, vondst naar B met de diff als bewijs.
5. **Eindcheck.** Draai zelf het baseline-commando en alle aanvalstests. Daarna `find-bugs` op de totale diff; een nieuwe vondst gaat terug naar stap 3. Stel met `commit-discipline` een commit per vondst voor; niet zelf committen.

## State-file vorm

```
Status: IN_PROGRESS
Doel: <...>
Stap: <1-5>
Baseline-commando: <...>

## Vondsten
- [sev][A|B|C] <wat> @ <file:line> | aanvalstest: <pad of -> | status: open|gefixt|naar-B|weerlegd
```

Zet `Status: DONE` bij de afronding.

## Eindrapport

1. **Gefixt (A):** wat, waar, de aanvalstest.
2. **Beslislijst (B):** het risico, de fix en wat er voor gebruikers verandert.
3. **Buiten de code (C):** wat er moet gebeuren.
4. **Niet gedekt:** lenzen of flows die niet draaiden. Geen vondsten betekent niet veilig.

Sluit af met `VERIFIED:` en het baseline-commando plus de aanvalstests die jij zelf draaide, met hun uitkomst.
