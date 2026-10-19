---
name: bouw-loop
description: >-
  Story-loop die een feature of tasklist story-voor-story bouwt met een verse sonnet-worker per story en verificatie door de orchestrator. Ondersteunt parallelle waves via de Workflow-tool voor onafhankelijke stories. Gebruik bij "bouw dit", "werk de tasklist af", "/bouw-loop", "implementeer deze stories", of een feature die opgeknipt kan worden. Het token-zuinige bouw-hart: plan zwaar (eenmalig), voer licht uit, verifieer per story precies een keer. Voor een compleet einddoel inclusief polish-, fix- en eindverificatiefases is keten-loop de ingang; bouw-loop is de bouwfase daarbinnen of een losse feature/tasklist.
argument-hint: <feature-omschrijving of pad naar tasklist>
---

# Shiploop

Jij bent de orchestrator. Je bouwt nooit zelf, je plant eenmalig, spawnt per story een verse worker en verifieert met eigen tool-output. De taak: $ARGUMENTS

## Hervat-check (eerst)

Bestaat `.loops/bouw/plan.md` met open (niet-afgevinkte) stories en `Status: IN_PROGRESS`? Dan draait er al een bouw: lees `plan.md` + `progress.md`, vat in een regel samen wat af is, en hervat bij de eerste open story. Plan niet opnieuw. Anders: verse run, ga naar Stap 0.

## Stap 0: plan (de enige dure stap)

Is er al een tasklist (pad meegegeven of `.loops/bouw/plan.md` bestaat), lees die. Anders maak je hem zelf in de hoofdsessie (Opus, dit mag kosten):

- Recon: lees de relevante code, snap de conventies.
- Knip de taak in stories van elk max ~300 gewijzigde regels over max ~4 bestanden (past in een worker-context). Per story: een titel, 2-5 zinnen spec, **een toetsbaar acceptatiecriterium** (command + verwacht resultaat, of deliverable-pad, of observeerbaar gedrag), en optioneel `dependsOn: <story-nrs>`.
- Schrijf naar `.loops/bouw/plan.md` (checkboxes + het kop-blok hieronder) plus `.loops/bouw/progress.md` (leeg, voor learnings).

Zwak criterium ("werkt goed") is verboden; herschrijf tot ja/nee-toetsbaar.

## State-file vorm (`plan.md`)

```
Status: IN_PROGRESS
Doel: <feature/tasklist>
Cap: <n> stories, elk max 2 retries | Budget: <"+Nk"-directief of geen>

## Stories
1. [ ] <titel> | criterium: <command -> verwacht> | dependsOn: -
2. [ ] <titel> | criterium: <deliverable-pad bestaat> | dependsOn: 1
...
```

## Per story (sequentieel, default)

1. **Worker** (Agent, `model: "sonnet"`, verse context). Prompt bevat: de story + acceptatiecriterium, de learnings uit `.loops/bouw/progress.md`, relevante file-paths uit je recon, en de huisregels: chirurgische diff, bestaande stijl matchen, niet committen, geen scope buiten de story.
2. **Verificatie door jou**: voer het acceptatiecriterium zelf uit. Command herdraaien met eigen exit code, deliverable zelf lezen, of bij UI de preview-tools gebruiken (snapshot/inspect, niet alleen screenshot). Het worker-rapport is geen bewijs.
3. Pass: vink af in `plan.md`, schrijf herbruikbare learnings (patronen, valkuilen, commands) naar `progress.md`, volgende story.
4. Fail: een retry met de failure-output erbij. Tweede fail: markeer `BLOCKED` met reden, ga door met stories die er niet van afhangen. (Retry-limiet 2, bewust lager dan fix-loops 5: een story is klein en gespecificeerd; blijft hij vastzitten, dan is de spec fout, niet de uitvoering.)

## Waves (parallel, wanneer stories onafhankelijk zijn)

Zijn er 3+ stories zonder onderlinge `dependsOn` en zonder file-overlap, draai ze als wave via de Workflow-tool: `pipeline(stories, story => agent(workerPrompt, {model: 'sonnet', schema: RESULT}))`, met `isolation: 'worktree'` alleen als file-overlap niet uit te sluiten is. Na de wave verifieer je elke story alsnog zelf, een voor een, en merge je worktrees pas na groen. Afhankelijke stories daarna sequentieel.

## Stop en afronding

- Alle stories af of BLOCKED, of het budget zakt onder ~50k: stop. Nooit doorgaan met verzinnen van extra werk.
- Eindcheck: draai eenmaal de volledige suite + typecheck. **Rood door het bouwwerk: draai het fix-loop-patroon erop (max 3 iteraties) voor je afrondt**, niet doorschuiven naar de gebruiker.
- **Onafhankelijke keuring (RC5, verplicht voor DONE).** Je eigen verificatie vangt geen scope-drift en geen half-gedekte claim. Draai vóór `Status: DONE` een vijandige keurder: een verse subagent, bij voorkeur op een ander model, met de brief "probeer deze claim te weerleggen".
  Hij ijkt het artefact tegen je claim én het spec-dossier. `VERDICT: NOT_REAL` (exit 3): het genoemde gat terug de loop in als nieuwe story, niet afronden. `VERDICT: REAL`: DONE mag. Sla dit nooit over.
- **Visueel bouwwerk**: raakte een story markup/CSS, render vóór afronding met skill `render-proof` en `Read` de PNG met de verwachting vooraf uitgeschreven. Een DOM-read bewijst geen layout.
- Zet `Status: DONE` (of `BLOCKED`) in `plan.md`. Geen commits zonder signaal. Eindig met: wat af is, wat BLOCKED (en waarom), bewijs per story (command + resultaat), het keurder-verdict, en een voorstel van 3-7 thematische commit-groepen (commit-discipline).

## UI-bewijs

Elke fase of gate die iets in een browser bewijst, gebruikt een echte render met een vooraf opgeschreven verwachting:
- Statische render: skill `render-proof` (headless Playwright-render naar PNG), of `npx --no-install playwright screenshot` (lokaal geinstalleerd). Lees het vooraf opgeschreven feit af.
- Flow of gedrag (klik, zoek, navigeer): een e2e-test met skill `e2e` (`npx --no-install e2e run`).
- Ingelogde of hover-state met echte data: de eigen browser van de gebruiker. Pagina's met klant- of persoonsgegevens nooit naar een extern model.
