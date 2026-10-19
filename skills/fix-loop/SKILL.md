---
name: fix-loop
description: >-
  Autonome fix-loop die een falende test, build of bug repareert tot het doelcommand groen is, met verse diagnose-workers per iteratie en een harde stop na 5 pogingen. Gebruik bij "fix deze bug", "maak de build groen", "deze test faalt", "/fix-loop", of elke failure met een herhaalbaar verificatiecommand. Token-zuinig alternatief voor een handmatige debug-sessie: de orchestrator implementeert nooit zelf en herdraait elke check met eigen exit code. Bedoeld voor failures met een herhaalbaar verificatiecommando die meerdere pogingen kunnen vergen; een losstaande ad-hoc bug zonder orchestratiebehoefte lost de hoofdsessie direct op met systematic-debugging.
argument-hint: <failing command, foutmelding of bug-omschrijving>
---

# Fixloop

Jij bent de orchestrator. Je implementeert nooit zelf, je spawnt workers en herdraait checks. De taak: $ARGUMENTS

## Hervat-check (eerst)

Bestaat `.loops/fix/state.md` met `Status: IN_PROGRESS`? Dan draait er al een fix: lees hem, vat in een regel samen bij welke poging hij stond en wat al sneuvelde, en hervat vanaf de volgende iteratie. Plan niet opnieuw en herdraai de baseline niet. Anders: verse run, ga naar Stap 0.

## Principe

Klaar = het doelcommand geeft exit 0 in JOUW terminal, niet in het rapport van een worker. Elke iteratie krijgt een verse worker-context; geheugen leeft op disk.

## Stap 0: baseline (eenmalig)

1. Bepaal het **doelcommand**: het exacte command dat nu faalt (test, build, typecheck, repro-script). Gaf de gebruiker alleen een symptoom, detecteer de stack en schrijf desnoods eerst een minimale repro-test (die is dan het doelcommand).
2. Draai het zelf. Leg vast: exact command, exit code, de relevante failure-output (max 50 regels; filter op de eerste error plus de stacktrace-top, niet de ruis eromheen).
3. Schrijf `.loops/fix/state.md` (projectmap-relatief; geen projectmap, dan de scratchpad). Zie de vorm hieronder.

Geen baseline die faalt = niks te fixen, meld dat en stop.

## State-file vorm

```
Status: IN_PROGRESS
Doel: <doelcommand> -> exit 0
Cap: 5 iteraties | Budget: <"+Nk"-directief of geen>
Baseline: <exit code + kern-failure, max 50 regels>

## Pogingen
1. hypothese: <...> | fix: <...> | uitkomst: <exit code + veranderde/identieke failure>
2. ...
```

## De loop (max 5 iteraties)

Per iteratie:

1. **Diagnose-worker** (Agent, `model: "sonnet"`, verse context). Prompt bevat uitsluitend: de failure-output, het doelcommand, de pogingen-sectie uit de state-file, en de instructie zelf de relevante code te lezen. Verwacht terug: hypothese, bewijs (welke regel, welke waarde), minimaal fix-plan, te wijzigen files. Geen fix zonder bewijs uit de code.
2. **Fix-worker** (Agent, `model: "sonnet"`). Voert alleen het fix-plan uit, chirurgisch, minimale diff. Committet niet. Rapporteert de diff.
3. **Verificatie door jou**: draai het doelcommand opnieuw. Eigen exit code, negeer wat de worker beweert. Log de poging in de state-file (hypothese, fix, uitkomst).
   - Exit 0: door naar afronding.
   - Faalt anders dan eerst: vooruitgang, volgende iteratie.
   - Faalt identiek: tel de identieke failures.

## Escalatie en stop

- Escaleer de diagnose-worker naar `model: "opus"` (of laat de model-parameter weg zodat hij Fable erft) zodra **een** van deze geldt: 2x identieke failure, of 3 iteraties zonder een enkele groene stap. Geef expliciet mee welke hypotheses al sneuvelden, zodat opus niet hetzelfde pad herhaalt. Een failure die elke keer net anders is telt niet als vooruitgang die de escalatie uitstelt.
- Kreeg je een "+Nk"-token-directief: stop met nieuwe workers zodra het budget onder ~50k zakt, rond af en rapporteer de reststand.
- 5 iteraties zonder groen: STOP. Zet `Status: BLOCKED`, rapporteer de pogingen, de beste hypothese en wat een mens moet aanleveren. Eindeloos branden is verboden.

## Guardrails

- Nooit een test aanpassen of skippen om groen te krijgen. Is de test zelf aantoonbaar fout, meld dat expliciet met bewijs en vraag om een beslissing.
- **Regressie-check verplicht** bij exit 0: draai eenmaal de bredere suite (of typecheck + lint). Nieuw rood door de fix = terug de loop in met dat als doelcommand. Sla dit nooit over.
- **Onafhankelijke keuring (RC5, verplicht voor DONE).** Groen doelcommando bewijst niet dat de fix het echte probleem raakt zonder iets anders stuk te maken of buiten scope te gaan. Draai vóór `Status: DONE` een vijandige keurder: een verse subagent, bij voorkeur op een ander model, met de brief "probeer deze claim te weerleggen".
  `VERDICT: NOT_REAL` (exit 3): het gat terug de loop in als nieuw doelcommand, niet afronden. `VERDICT: REAL`: DONE mag.
- Raakte de fix markup/CSS: render met `node scripts/shoot.js <bestand> <out.png> [selector]` en `Read` de PNG (verwachting vooraf) voor je groen claimt.
- Geen commits; werk blijft in de working tree (commit-discipline). Zet `Status: DONE` in de state-file bij groen.

## Eindrapport

Antwoord-eerst: wat de fout was, wat de fix is (1-2 zinnen), welke files geraakt, bewijs (command + exit 0). Daarna eventueel een commit-groep-voorstel.
