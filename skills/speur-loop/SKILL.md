---
name: speur-loop
description: >-
  Loop-until-dry vind-loop voor onbekende hoeveelheden: bugs, dead code, inconsistenties of research-claims (security-vondsten horen bij security-audit; deze loop kan die skill als lens draaien). Rondes van parallelle finders met verschillende lenzen, dedup, adversarial verificatie, en stoppen na 2 droge rondes. Gebruik bij "audit dit", "vind alle bugs", "check de hele codebase op X", "/speur-loop", of research waar een keer zoeken de staart mist. Vindt en bewijst; fixt zelf niks (handoff naar /fix-loop of /bouw-loop).
argument-hint: >-
  <wat te vinden: bugs, security, dead code, claims, ...>
---

# Sweeploop

Jij bent de orchestrator van een vind-loop. Doel: $ARGUMENTS

## Hervat-check (eerst)

Bestaat `.loops/speur/state.md` met `Status: IN_PROGRESS`? Dan draait er al een speurtocht: lees de `seen`- en confirmed-lijst en ga verder met de volgende ronde (de finders krijgen de bestaande `seen`-keys mee). Anders: verse run, ga naar Setup.

## Principe

Onbekende-hoeveelheid-discovery stopt niet bij een teller maar bij droogte: pas als 2 opeenvolgende rondes niks nieuws opleveren is de put leeg. Elke finding overleeft alleen adversarial verificatie.

## Setup (eenmalig)

- Bepaal 3-4 **lenzen** passend bij het doel. Code-audit: correctness, security, performance, consistency. Grote repo: per-directory of per-subsystem. Research: per bron-type (docs, code, issues, web). Noteer expliciet welke lenzen je NIET draait, dat is je bekende blinde vlek.
- Maak `.loops/speur/state.md`: doel, lenzen (gedraaid + overgeslagen), lege `seen`-lijst, lege confirmed-lijst. Zie de vorm onderaan.
- `seen`-key = een **claim-hash** (genormaliseerde omschrijving + symbool/functienaam), niet `file:line`; regels schuiven, de bug niet. Zo tel je dezelfde bug op een verschoven regel niet dubbel.

## De ronde (via de Workflow-tool)

Deze skill-invocatie is je opt-in voor Workflow. Per ronde:

1. **Finders parallel**: een agent per lens (`model: "sonnet"`, schema-output met per finding: key, omschrijving, bewijs-locatie, severity). Elke finder krijgt het doel, zijn lens, en de keys uit `seen` met de opdracht die over te slaan.
2. **Dedup in plain code**: filter alles wat al in `seen` zit (op claim-hash). Fresh findings gaan `seen` in (ook als ze straks sneuvelen, anders convergeert de loop nooit).
3. **Adversarial verify**: per fresh finding een skeptic-agent (`model: "sonnet"`, verse context) met de opdracht de finding te WEERLEGGEN tegen de echte code/bron. Twijfel = refuted. High-severity findings krijgen een tweede stem (`model: "opus"`); alleen unaniem overleeft. CONFIRMED gaat de confirmed-lijst in met bewijs.
4. Log de ronde: gevonden, fresh, confirmed, droogte-teller.

## Stopcondities (hard)

- 2 opeenvolgende rondes met 0 fresh findings: droog, klaar. **Droogte gaat voor de ronde-cap**: op een grote repo die nog fresh oplevert stop je niet op een teller met de put nog vol.
- De ronde-cap is een vangnet tegen niet-convergeren, geen doel: zonder budget-directief max 5 rondes (niet 3, dat sneed grote repos te vroeg af); met een "+Nk"-budget `while (budget.remaining() > 50_000)`. Stop je op de cap terwijl de laatste ronde nog fresh gaf: meld expliciet dat de put nog niet droog was.
- Meld altijd wat NIET gedekt is (lens niet gedraaid, directory geskipt); stille truncatie is verboden.

## State-file vorm

```
Status: IN_PROGRESS
Doel: <wat vinden>
Lenzen: gedraaid=<...> | overgeslagen=<...>
Droogte-teller: <0-2>

## seen (claim-hashes)
- <hash>: <korte omschrijving>
## confirmed
- [sev] <wat> @ <file:line> | bewijs: <...>
```

## Eindrapport

Gerankte confirmed-lijst (severity eerst) met per item: wat, waar (`file:line`), bewijs, en de aanbevolen vervolg-loop (/fix-loop voor bugs, /bouw-loop voor structureel werk). Gesneuvelde plausibele-maar-weerlegde findings in een aparte korte sectie, zodat niemand ze opnieuw aandraagt. Plus de bekende blinde vlek (niet-gedraaide lenzen).
