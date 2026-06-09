---
name: supergoal
description: Plan and autonomously build a software task end-to-end, with verification the executor cannot fake. Triggered by `/supergoal`, "plan and ship X", "supercharged plan", "autonomous build", "plan it out and don't stop until it's done", "I don't want to babysit this", or any non-trivial feature/refactor/redesign the user wants driven to completion. What makes it more than a plain plan or the native loop is that it decomposes the task into independently verifiable phases, then gates every phase with an independent evaluator in a separate context that re-runs each check against repository ground truth and the running artifact, blind to the executor's self-report. Nothing is marked done until something independent proves it against the original spec. Recons the codebase, applies preloaded memory, researches best practices with available tools, gets one confirmation, then hands off a single ready-to-paste `/goal` that drives the whole chain with retry, rollback, per-phase memory writeback, and a final audit. Works on Claude Code and Codex.
argument-hint: <beschrijf wat je wilt bouwen, fixen of verschepen>
---

# Supergoal

Je draait de Supergoal workflow. De taak van de gebruiker is:

$ARGUMENTS

**Het principe waar alles omheen gebouwd is: niks is klaar tot iets onafhankelijks het bewijst, tegen de oorspronkelijke opdracht, door de app echt te draaien.** Claude Code stopt standaard zodra de agent zegt dat hij klaar is. Supergoal stopt pas als een controleur die het werk niet zelf maakte het bewijst. Dat ene verschil is de reden dat deze skill bestaat; al het andere staat daarvoor in dienst.

## De drie rollen: generator, evaluator en council

Dit is de ruggengraat. Houd ze strikt gescheiden.

- **Generator** (de bouwer). Doet het werk van een fase. Levert het resultaat op plus een ruwe bewijslijst: welke commands hij draaide met hun output en exit codes, welke bestanden veranderden, en wat hij zag toen hij de app liet draaien. De generator zegt zelf **niet** of het geslaagd is, en gaat nooit op eigen houtje door.
- **Evaluator** (de onafhankelijke controleur). Een aparte agent met een schone lei. Leest de eisen van de fase en kijkt naar wat er echt in de repo staat, niet naar het eigen oordeel van de generator. Hij **doet elke check zelf opnieuw**: commands opnieuw draaien, kijken wat er echt veranderde in de bestanden, de app zelf aansturen en bekijken, en de oordeel-eisen onbevooroordeeld beoordelen. Hij geeft per eis een uitslag, plus ACCEPT of REJECT voor de hele fase.

Een fase is pas klaar bij het oordeel van de evaluator, niet bij het rapport van de generator. REJECT start het herstel (drie pogingen, zie onder); pas bij ACCEPT sluit de fase.

**Waarom dit beter is dan de standaard:** de grootste valkuil van autonome agents is dat ze zichzelf "klaar" verklaren terwijl het niet klopt. Een controleur met een schone lei, die alles zelf opnieuw doet, kan dat zelfbedrog niet overnemen.

**De derde rol: council (de richtings-gate).** Op elke fasegrens, maar alleen nadat de evaluator de fase op correctheid heeft goedgekeurd, draait een lichte council-pass. De evaluator bewijst dat de fase doet wat de spec zegt (klopt het, werkt het); de council kijkt naar iets anders: stuurt het resultaat de juiste kant op, of moet de gebruiker de richting bijsturen. Default is AUTO-APPROVE en doorgaan zonder de gebruiker te storen. Alleen bij een keuze die moeilijk omkeerbaar is, meerdere geloofwaardige paden heeft, en buiten de bevestigde scope valt, escaleert de council: dan convoceert hij de volledige `council`-skill voor een aanbeveling (A), alternatieven (B/C) en bronnen, en presenteert die zodat jij `go`, `B` of `C` zegt. De council oordeelt nooit over correctheid en kan een ACCEPT niet terugdraaien, dus de evaluator-moat blijft intact. Volledige instructie in `prompts/council-gate.md`.

**Isolatie per host:**
- **Claude Code** (Task/Agent tool aanwezig): spawn de evaluator als subagent met een verse context. Echte isolatie.
- **Codex** (geen subagent): draai de evaluator als losse stap, met de duidelijke opdracht het verhaal van de generator te negeren en alles opnieuw vast te stellen vanaf wat er echt in de repo staat. De scheiding is minder strikt, maar de checks die hij overdoet (commands, bestanden, de app bekijken) hangen niet van die context af, dus het meeste blijft overeind.

### Model-routing per rol

Een lange run valt niet om door kosten maar door rate limits en door een te zwakke judge. Route daarom op rol, waar de host model-keuze per subagent toelaat (Claude Code's Task tool). Is er maar een model beschikbaar, gebruik dat overal; routing is een optimalisatie, geen vereiste.

| Rol | Tier | Waarom |
|---|---|---|
| Retrieval-workers, cleanliness-greps, mechanische recon | goedkoop en snel (haiku) | hoog volume en mechanisch; hier verbrand je anders je limiet |
| Query rewriter, synthese, decompose, spec-schrijven | het sessiemodel | redeneerwerk op middenniveau |
| Sufficient-context judge + adversarial prober | sterk | dit is de context-gate; een zwakke judge laat gaten door |
| Generator (executor) | het sessiemodel | bouwt het echte werk |
| Evaluator | sterk, bij voorkeur opus | het hele voordeel hangt op een scherpe, onafhankelijke beoordelaar, dus nooit goedkoop |
| Council (richtings-triage, en convocatie bij escalatie) | sessiemodel voor de triage, sterk voor een volle convocatie | de per-fase triage is een goedkope go/escaleer-call; een echte richtingskeuze verdient sterke onafhankelijke adviseurs |

## Wat "klaar" vereist

Geen vibes. Vertaal de lat van de gebruiker naar criteria die een onafhankelijke partij kan natrekken:

- **Elk criterium is met ja of nee te toetsen.** Een harde uitkomst, niet "werkt" of "goed".
- **Elk criterium krijgt een label dat zegt hoe je het toetst** (een validatieklasse), zodat de evaluator weet hoe hij het overdoet.
- **Elke fase die gedrag oplevert, draagt minstens een `empirical` criterium.** "Tests groen" is geen bewijs dat de feature werkt; het draaiende artefact observeren wel.

| Klasse | Wat het bewijst | Hoe de evaluator het zelf herdraait |
|---|---|---|
| `tool-output` | Build, typecheck, lint, test, schema | Hij draait het command opnieuw, checkt exit code + patroon. Hij vertrouwt de gerapporteerde exit code niet, hij produceert een eigen. |
| `deliverable` | Bestand of feature bestaat echt | `bash .supergoal/repo-state.sh deliverable <baseline> "<path>"` tegen de working tree. |
| `empirical` | Geobserveerd gedrag van het echte artefact | Hij stuurt het artefact zelf aan: preview MCP screenshot + DOM-assert (web), curl/httpie op het endpoint (API), de binary draaien (CLI), een usage-script uitvoeren (library), of /e2e voor flows. Pass = de observatie matcht het criterium. |
| `llm-judge` | Subjectieve kwaliteit (UX, copy, error-afhandeling) | Hij beoordeelt blind voor het generator-rapport, met bewijs-citaties. |
| `self-consistency` | Spreekt deze fase eerdere fasen tegen? | Hij her-grept de criteria van eerdere fasen op conflicten. |

Markeer elk criterium met zijn klasse, bijv. `- [tool-output] Alle tests slagen.` `- [empirical] /login rendert en accepteert een geldige inlog (screenshot).`

## Hoe de run verloopt

Het gewone plannen en uitvoeren leunt op wat Claude Code al kan (plan mode, /goal, subagents). Supergoal voegt toe wat daar standaard ontbreekt:

0. **Context**: memory inladen; kijken of er subagents zijn (voor een geisoleerde controleur) en welk gereedschap er is om de app echt te draaien (preview MCP, /e2e, /run, curl); een lopende run hervatten.
1. **Intake**: indelen, dan de beslisboom aflopen door te blijven doorvragen, een scherpe vraag per keer met een aanbeveling (en bij zware keuzes bronnen en scenario's erbij), codebase-eerst, tot je samen helder hebt wat je bouwt.
2. **Uitzoeken en context verzamelen**: info uit vier bronnen ophalen, met een check of er genoeg is plus een tweede check die juist een gat zoekt, voordat de planner begint.
3. **Synthese**: de grootste risico's en afhankelijkheden uit de verzamelde info halen.
4. **Decompose**: het juiste aantal onafhankelijk verifieerbare fasen, elk met empirisch bewijs waar gedrag ontstaat.
5. **Specs**: per fase een werk-spec met geklasseerde criteria plus een rationale met rollback-doel.
6. **Plan review**: een menselijke gate, met self-critique en een HTML-overzicht.
7. **Dispatch**: een kant-en-klare `/goal`. Daarna draait de generator/evaluator/council-loop autonoom tot de final audit het geheel tegen de oorspronkelijke spec bewijst. Per fase: de generator bouwt, de evaluator bewijst correctheid (ACCEPT/REJECT), en op ACCEPT keurt de council de richting goed of escaleert hij naar jou.

Twee vaste menselijke gates (verduidelijkingsvragen in Stage 1, plan review in Stage 6), plus een dynamische gate die de council bepaalt: hij pauzeert de run alleen wanneer alleen jij de richting kunt kiezen. Bij geen live input volgt hij zijn eigen aanbeveling en gaat door, zodat je niets hoeft te babysitten.

## Lokaliseer de skill-directory

```bash
SUPERGOAL_DIR=$(dirname "$(ls -1 \
  "$HOME/.claude/skills/supergoal/SKILL.md" \
  "$PWD/.claude/skills/supergoal/SKILL.md" \
  2>/dev/null | head -n1)")
export SUPERGOAL_DIR
export SUPERGOAL_ROOT="${SUPERGOAL_ROOT:-.supergoal}"
mkdir -p "$SUPERGOAL_ROOT/goals"
echo "SUPERGOAL_DIR=$SUPERGOAL_DIR"
echo "SUPERGOAL_ROOT=$SUPERGOAL_ROOT"
```

Alle artefacten leven onder `$SUPERGOAL_ROOT`. Skill-assets leven onder `$SUPERGOAL_DIR`.

---

## Stage 0 - Context (memory + tools)

Detecteer wat er deze sessie beschikbaar is. Dit bepaalt of de evaluator echt geisoleerd kan draaien en hoe het empirisch bewijs eruitziet.

### Memory preload

```bash
MEM_DIR=""
for cand in \
  "$HOME/.claude/projects/-Users-$(whoami)/memory" \
  "$HOME/.claude/memory" \
  "$PWD/.claude/memory" \
  "$SUPERGOAL_ROOT/memory"; do
  [[ -d "$cand" ]] && MEM_DIR="$cand" && break
done
echo "MEM_DIR=$MEM_DIR"

if [[ -n "$MEM_DIR" && -f "$MEM_DIR/MEMORY.md" ]]; then
  echo "--- MEMORY INDEX ---"
  cat "$MEM_DIR/MEMORY.md"
fi
```

Lees de index, lees dan selectief de memory-bestanden die bij de taak passen. Leg toepasselijke hits vast in `$SUPERGOAL_ROOT/applied-memories.md` en toon ze in Stage 1 als "Toegepast uit memory: ...".

### Tool discovery

Schrijf het resultaat naar `$SUPERGOAL_ROOT/tools.md`. Detecteer specifiek:

- **Evaluator-isolatie**: is er een Task/Agent dispatch tool? Zo ja, de evaluator wordt een subagent. Zo nee, aparte-pass fallback (zie de twee rollen hierboven).
- **Model-tiers**: welke modellen kan de host per subagent kiezen (haiku/sonnet/opus)? Bepaalt de model-routing per rol. Is er maar een, gebruik dat overal.
- **Empirisch gereedschap**: preview MCP, chrome-devtools MCP, een `/e2e` of `/run` skill, of gewoon curl/de shell. Dit bepaalt hoe `empirical` criteria bewezen worden. Noteer per surface-type wat beschikbaar is.
- **Docs**: Context7, WebSearch, WebFetch. Zo niet aanwezig, val terug op training-cutoff kennis en log dat als aanname.
- **Project skills**: domein-relevante skills in `$SUPERGOAL_ROOT/applied-skills.md`.
- **Team-dispatch**: heeft een fase scheidbare sporen en is er een Task/Agent tool, dan is parallelle fan-out (een specialist per spoor) de default, geen extra credits. Sequentieel is alleen voor een atomaire fase of als er geen subagent-tool is. De Workflow-tool is een aparte, hogere tier voor grote swarms, alleen met credits, en staat los van de gratis subagents.
- **Dispatch-primitieven**: detecteer wat er is, `/goal` (altijd), de Workflow-tool, `/loop`, scheduled-tasks. Stage 6.6 kiest hiermee de uitvoeringsvorm op basis van de vraag en het budget.
- **Skill-bronnen**: is `npx` aanwezig plus de skill-finder skill? Dan los je per spoor ontbrekende skills op: eerst matchen, anders `npx skills add <owner/repo>` van de skills.sh registry, anders zelf een skill schrijven.
- **Eerdere state**: bestaat `$SUPERGOAL_ROOT/STATE.md` van een vorige run, hervat in plaats van opnieuw te beginnen.

### Hervat-detectie

Toont `STATE.md` `Status: IN_PROGRESS` met een openstaande fase, plan dan niet opnieuw. Print "Supergoal hervatten vanaf fase N" en spring naar Stage 6, of naar Stage 7 als de gebruiker hervatting bevestigt.

---

## Stage 1 - Intake: gril tot gedeeld begrip

Echo de taak terug in een zin. Classificeer (tags kunnen combineren):

| Tag | Trigger |
|---|---|
| `new-project` | Verzoek impliceert een nieuw project; cwd heeft geen `.git/` of lege tree |
| `existing-repo` | Wijziging in een bestaande repo |
| `bugfix` | Noemt "bug", "broken", "fails", "regression" |
| `refactor` | Noemt "refactor", "clean up", "restructure" |
| `ui` | Noemt "design", "polish", "UI", "UX", "responsive", "redesign" |

Stel geen rits vragen tegelijk; werk de beslisboom af door te blijven doorvragen. Een scherpe vraag per keer, wacht op het antwoord voordat je doorgaat, want elk antwoord bepaalt de volgende vraag. Stop pas als elke belangrijke beslissing gemaakt is, niet bij een vast aantal.

Regels van het doorvragen:

- **Een vraag per keer, met jouw aanbevolen antwoord erbij.** Geef je beste gok als standaard ("ik zou X doen omdat ..."), zodat de gebruiker alleen hoeft te bevestigen of bij te sturen in plaats van zelf alles te bedenken.
- **Codebase eerst.** Kan recon of memory de vraag beantwoorden, vraag dan niet, zoek het op. Gril de gebruiker alleen over wat alleen hij weet.
- **Scherp vage taal aan.** Bij een overladen term ("account", "gebruiker", "annulering") stel je de precieze canonieke term voor en laat je hem kiezen.
- **Stress-test met concrete scenario's.** Verzin een edge-case die de grens tussen twee concepten forceert ("wat als dezelfde gebruiker tijdens een verlenging dubbel betaalt?") en laat de gebruiker de grens trekken.
- **Confronteer tegenspraken.** Botst een antwoord met de code, een doc of een eerder antwoord, leg het direct naast elkaar: "je zei net X, maar de code doet Y, welke is het?"
- **Leg beslissingen vast terwijl ze vallen, niet achteraf.** Een opgeloste term gaat naar een glossarium (`CONTEXT.md` als het project die conventie al voert, anders een glossarium-sectie in THINKING.md). Een beslissing die hard te keren is, verrassend, en een echte trade-off, krijgt een ADR-achtige notitie in de fase-rationale of in ROADMAP "Alternatives considered".
- **Bij een zware of onbekende keuze: praat de gebruiker eerst bij.** Vraag de keuze niet kaal. Haal 1-3 bronnen op (de Docs-bron, Context7, WebSearch), vat ze in een paar regels samen met de link erbij, en leg een paar concrete scenario's voor met hun voor- en nadelen plus jouw aanbeveling. Zo word je als architect snel wijs in het onderwerp en kies je op inhoud, in plaats van blind de default te volgen.
- **Bij een echt zware, moeilijk omkeerbare keuze met meerdere geloofwaardige paden: roep de `council`-skill aan.** Voor een one-way-door beslissing waar bronnen en scenario's niet volstaan (stack, architectuur, build-vs-buy, een datamodel dat alles vastlegt) convoceer je een council van onafhankelijke adviseurs. Elk redeneert met een eigen methode, de posities komen parallel binnen zonder dat ze elkaar of het gesprek zien, een blinde peer-review weegt ze op inhoud, en een chairman synthetiseert een verdict met de sterkste tegenstem zichtbaar. Vouw dat verdict in de keuze-briefing hieronder, zodat de gebruiker op een gewogen afweging beslist. Right-size het: een goedkoop-omkeerbare keuze verdient geen council, daar volstaat je aanbeveling. Is de `council`-skill niet geinstalleerd, val dan terug op de bronnen-en-scenario's-briefing.

**Vorm van zo'n keuze-briefing** (zet de scenario's als opties in `AskUserQuestion`, de aanbevolen eerst):

- **Onderwerp in 2-3 regels**: wat speelt er en waarom doet de keuze ertoe.
- **Bronnen**: 1-3 links, elk met een halve regel samenvatting, vers opgehaald en niet uit het hoofd.
- **Scenario's**: 2-3 concrete opties, elk met de belangrijkste trade-off (snelheid, kosten, complexiteit, vendor lock-in).
- **Aanbeveling**: welke jij zou kiezen en waarom, in een zin.

Leg het gekozen scenario en de bronnen vast in ROADMAP "Alternatives considered", zodat de afweging later terug te vinden is.

De beslisboom die je afgrilt is de categorielijst. Loop hem langs, sla over wat memory of prompt al dekt (toon als "Toegepast uit memory: ..." of "Uit je prompt: ..."), en gril de rest, te beginnen bij de keuzes die de fasevorm het meest veranderen:

| Categorie | Waarom het het plan beinvloedt |
|---|---|
| Doelplatform / surface | iOS, web, desktop, CLI, multi: andere stacks, andere fasen, andere empirische checks. |
| Stack / framework | Bepaalt elke fase. |
| Design richting | Bepaalt tokens, componentvormen, Polish-inhoud. |
| Integratie-ankers | Auth, database, payments, hosting: legt vendors vast. |
| Scope-grens | MVP nu vs volledige feature; wat buiten scope valt. |
| Use case / doelgroep | Stuurt auth, onboarding, fouttolerantie. |
| Performance / schaal | Alleen vragen als niet-triviaal. |
| Datamodel | Vraag de vorm als de prompt data impliceert en het niet evident is. |

Kalibreer de diepte op de inzet. Een triviale taak hoeft geen grill, zeg dat en ga door. Een lange of onomkeerbare taak (de 8-urige builds) verdient de volle behandeling: elk beslispunt dat je vooraf oplost, hoeft de evaluator later niet af te keuren. Voor een bestaande codebase grilt recon de meeste vragen weg, vaak blijven er 0-2 over (scope-grens, compatibiliteit, welk bestaand patroon uitbreiden); voor een nieuw project is de grill langer, want er is geen code om in te kijken.

Mechaniek: `AskUserQuestion` met een enkele vraag per keer en de aanbevolen optie eerst, of een directe vraag in de chat voor open beslissingen. Niet batchen, de kracht zit in de afhankelijkheid tussen opeenvolgende antwoorden. Wat je verantwoord kunt aannemen gril je niet, dat gaat als aanname naar de Stage 6 plan review.

---

## Stage 2 - Recon & cross-corpus context assembly

Dit is een lus die info verzamelt, beoordeelt of het genoeg is, en de gaten vult voordat de planner begint.

### 2a. Query rewrite

Zet de taak plus de Stage 1 antwoorden om naar gerichte sub-queries, een per open planningsvraag. Decomponeer eerst, fan niet uit op de ruwe taakstring. Schrijf ze naar `$SUPERGOAL_ROOT/queries.md`.

### 2b. Verdeel over vier bronnen

Verdeel de vragen over vier bronnen (corpora). Met een Task tool: een aparte zoek-agent per bron, parallel. Zonder: dezelfde rondes na elkaar in deze sessie. Elke ronde levert fragmenten met bronvermelding, geen rauwe dumps. Prompt-template: `prompts/retrieval-worker.md`.

| Bron | Waar vandaan | Wat ophalen |
|---|---|---|
| Code | recon scripts, grep, glob | Draai de scripts hieronder, beantwoord repo-vragen met `file:line` bewijs. |
| Docs | Context7, WebSearch, WebFetch | Actuele API-docs voor elke SDK die de taak raakt, met versienummer erbij. |
| MCPs | aangesloten servers | Welke data en acties de relevante MCP-tools bieden. |
| Skills | available-skills lijst | Skills die bij de taak passen, naar `applied-skills.md`. |

```bash
mkdir -p "$SUPERGOAL_ROOT/context"
# Existing codebase
bash "$SUPERGOAL_DIR/scripts/detect-stack.sh"   > "$SUPERGOAL_ROOT/context/code-stack.md"
bash "$SUPERGOAL_DIR/scripts/summarize-repo.sh" > "$SUPERGOAL_ROOT/context/code-map.md"
# New project
bash "$SUPERGOAL_DIR/scripts/detect-env.sh"     > "$SUPERGOAL_ROOT/context/code-env.md"
```

### 2c. Sufficient-context judge

Beoordeel de bundel tegen de open vragen: is elke materiele vraag beantwoord of onderbouwd aangenomen, zijn er tegenspraken tussen corpora, rust een hoog-risico gebied nog op een gok? Prompt: `prompts/sufficient-context-judge.md`.

- **SUFFICIENT**: schrijf `$SUPERGOAL_ROOT/context/SUFFICIENT.md`, draai dan 2c-bis.
- **INSUFFICIENT**: schrijf de gaten plus waarom ze ertoe doen, geef ze terug aan 2a als verfijnde queries. Max 3 rondes. Na ronde 3 worden resterende gaten expliciete aannames in THINKING.md.

### 2c-bis. Adversarial prober

De eerste judge zoekt compleetheid en mist daardoor wat er niet is. Spawn een tweede met de omgekeerde opdracht: vind een gat. Prompt: `prompts/adversarial-prober.md`. Een gat dat de eerste judge miste loopt terug naar 2a (telt mee voor de cap). Geen gat na een echte poging: append "Adversarial check passed" aan `SUFFICIENT.md`.

Print daarna een recon-samenvatting van 5 regels: stack, package manager, build/test/lint, opvallende modules, en een statusregel ("context: SUFFICIENT na N ronde(s)").

---

## Stage 3 - Synthese

Stage 2 verzamelde de info, Stage 3 maakt er de basis voor het plan van. Niet opnieuw ophalen, maar samenvatten uit de fragmenten met bronvermelding in `$SUPERGOAL_ROOT/context/`:

- **Top 3 risico's**: meest waarschijnlijk fout, moeilijkst om te keren, makkelijk te missen tot het geshipt is.
- **Niet-voor-de-hand-liggende afhankelijkheden**: wat in een vaste volgorde moet of ander werk blokkeert.
- **Memory-hits** uit `applied-memories.md` bakken in goals, constraints of mitigaties.
- **Docs-feiten** versie-gepind; resterende gaten als expliciete aanname ("verifieer in fase 1").
- **MCP-capabilities** die de taak nodig heeft, inbakken in plaats van zelf bouwen.

Schrijf `$SUPERGOAL_ROOT/THINKING.md` (1-2 pagina's): Goals, Constraints, Risks, Dependencies, Aannames, Memory hits, Tools/skills, Best practices. Lat: zie `references/planning-depth.md`.

---

## Stage 4 - Decompose in fasen

Zoveel fasen als de taak nodig heeft, geen vaste cap. Het juiste aantal valt uit het werk: hoeveel onafhankelijk verifieerbare eenheden tussen de huidige staat en "perfect klaar". Een triviale wijziging 2; een feature 4-6; een full-stack nieuwe app 8-12; een grote migratie 15+. Zie `references/phase-design.md`.

- Elke fase levert iets dat **op zichzelf verifieerbaar** is.
- Fasen hebben **expliciete afhankelijkheden**.
- De **laatste fase is altijd Polish & Harden** (edge cases, error states, security, a11y, copy, perf).
- Voor een bestaande codebase met dunne testdekking: een vroege **safety net** fase met characterization tests.

**Echt bewijs is een ontwerp-eis, geen bijzaak.** Elke fase die gedrag oplevert, krijgt minstens een `empirical` criterium dat de draaiende app bekijkt. Is het enige bewijs van een fase "tests slagen", dan is de fase niet goed ontworpen; voeg de waarneming toe die laat zien dat de feature echt doet wat hij moet.

Elke fase heeft: naam (max 5 woorden, actie-eerst), waarom (1 zin), deliverables, geklasseerde acceptatiecriteria, mandatory commands, vereist bewijs, afhankelijkheden.

---

## Stage 5 - Roadmap en fase-specs

Vier bestanden onder `$SUPERGOAL_ROOT/`:

1. **`ROADMAP.md`** (template `$SUPERGOAL_DIR/templates/ROADMAP.md`). Bevat een `## Alternatives considered` sectie: welke stacks of aanpakken op tafel lagen, waarom deze won, welke afwegingen geaccepteerd zijn, met de bronnen erbij die je tijdens de intake hebt meegestuurd. Geen echte alternatieven? Schrijf "Single viable approach because <reden>".
2. **`STATE.md`** (template `$SUPERGOAL_DIR/templates/STATE.md`), het live voortgangsbestand.
3. **`phases/phase-N.md`** (template `$SUPERGOAL_DIR/templates/phase-goal.txt`), de werk-spec per fase. Elke lengte.
4. **`phases/phase-N-rationale.md`** (template `$SUPERGOAL_DIR/templates/phase-rationale.md`): waarom deze opdeling, alternatieven, afhankelijkheden onderbouwd, fase-risico's, en het **rollback-doel** (naar welke eerdere baseline te reverteren als deze fase state corrumpeert).

Elke spec draagt deze markers zodat generator en evaluator dezelfde ankers hebben:

```
SUPERGOAL_PHASE_START
Phase: <N> of <total> - <name>
Task: <one-line>
Mandatory commands: <list>
Acceptance criteria: <count>
Evidence required: <list>
Depends on phases: <list or "none">
Validation classes: tool-output | deliverable | empirical | llm-judge | self-consistency
Team: <sporen + specialisten (2+ bij scheidbaar werk), of "solo (atomair: <reden>)">
Skills needed: <skills per spoor, of "none">
Rollback target: phase <N-k> baseline ref (see phase-N-rationale.md)

[... volledige werkbeschrijving, geklasseerde criteria, vereist bewijs ...]

[De generator print hier SUPERGOAL_PHASE_EVIDENCE; de evaluator print SUPERGOAL_EVAL_VERDICT en daarna SUPERGOAL_PHASE_DONE]
```

Markeer elk criterium met zijn klasse. Behavior-fasen bevatten minstens een `[empirical]` regel. Valideer elke spec met `bash $SUPERGOAL_DIR/scripts/validate-phase.sh .supergoal/phases/phase-N.md`.

---

## Stage 6 - Plan review & bevestiging (harde gate)

De keten draait onbewaakt zodra hij start, dus dit is het laatste goedkope moment om bij te sturen.

### Stage 6a - Self-critique pass

Voordat je de samenvatting print, een self-critique beurt die exact vier vragen beantwoordt:

1. **Toetsbaarheid:** is elk criterium een ja/nee test? Markeer elk "werkt"/"goed"/"klaar" zonder iets meetbaars erachter.
2. **Fase-atomiciteit:** zit er een fase tussen die stiekem twee eenheden is (namen met "en", deliverables zonder gedeelde verify-gate)?
3. **Zwakste afhankelijkheid:** waar cascadeert een gedeeltelijke fout het ergst?
4. **Empirische dekking:** heeft elke fase die gedrag oplevert minstens een `empirical` criterium? Zo nee, voeg het toe; "tests groen" is geen bewijs van gedrag.

Schoon: noteer `Self-critique: clean.`. Bevindingen: noem 1-3 concrete punten en **herschrijf de betreffende criteria in-place** in de fase-specs en `ROADMAP.md`, herdraai `validate-phase.sh`, toon de herschrijvingen in de samenvatting. Voer hem streng uit; een pass die altijd "clean" zegt voegt niets toe.

### Stage 6b - Render de plan-review HTML

Render `.supergoal/review.html` uit `$SUPERGOAL_DIR/templates/review.html.tmpl`. Self-contained: een HTML-bestand met inline SVG, geen externe assets. Het toont de fasen, afhankelijkheden, alternatieven, risico's, self-critique, per-fase rationale, en de keuzes uit de intake met hun scenario's en bronnen.

```bash
mkdir -p .supergoal
cp "$SUPERGOAL_DIR/templates/review.html.tmpl" .supergoal/review.html
# Vul de placeholders uit ROADMAP.md, THINKING.md, phase-N.md en phase-N-rationale.md.
# {{DECISIONS_HTML}} komt uit de keuze-briefings van de intake: per keuze de scenario's en de bronnen (ook vastgelegd in ROADMAP "Alternatives considered").
# De markdown blijft source-of-truth; review.html is een gegenereerde weergave.
```

Toon het pad in de samenvatting: `Review: .supergoal/review.html (open in browser)`.

### Stage 6c - Samenvatting print

```
Plan klaar voor review. <N> fasen.

Toegepast uit memory:
  - <hit 1>
  (of: "geen, schone run")

Fasen:
  1. <naam> - <eenregelige deliverable> [bewijs: <klassen>]
  ...
  N. Polish & Harden - elk aspect geverifieerd

Stack: <stack> | pkg: <pm> | build/test/lint: <commands>
Evaluator: <subagent-geisoleerd | aparte-pass fallback>
Empirisch bewijs via: <preview MCP | /e2e | curl | ...>
Dispatch: <goal | loop> + fase-intensiteit <sequentieel | subagents | workflow> (zeg het als je zuiniger of zwaarder wilt)

Belangrijke aannames (corrigeer wat fout is):
  - <aanname 1>

Top risico's & mitigaties:
  1. <risico> -> <mitigatie>

Self-critique:
  - <bevinding, of "clean">

Artefacten:
  Roadmap: .supergoal/ROADMAP.md
  Voortgang: .supergoal/STATE.md
  Fase specs: .supergoal/phases/phase-1..N.md
  Review: .supergoal/review.html

Zodra je bevestigt, print ik de kant-en-klare dispatch-regel (meestal /goal).
```

Roep dan `AskUserQuestion` aan, header "Start chain?", met concrete revisiemodi:

- **Start now**: draai pre-flight (Stage 6.5), print dan de `/goal` regel.
- **Adjust an assumption**: kies er een om te wijzigen.
- **Tweak a phase**: criteria, scope of commands van een fase.
- **Restructure phases**: merge, split, voeg toe, verwijder.

Bij een revisie-optie: volg op met een tweede `AskUserQuestion` om precies vast te pinnen wat, pas de wijziging toe, update de bestanden, herdraai `validate-phase.sh`, toon de samenvatting opnieuw. Loop tot "Start now" of de gebruiker afbreekt. Dispatch `/goal` nooit op stilte.

---

## Stage 6.5 - Pre-flight smoke check

Na "Start now" en voor het `/goal` blok: draai de mandatory commands (ontdubbeld) een keer tegen de huidige staat. Dit vangt een startpunt dat al stuk is, zodat het herstel niet zinloos fase 1 probeert te "fixen" terwijl die nooit de oorzaak was.

1. Union alle `Mandatory commands:` regels tot een gededupliceerde set.
2. Draai elk een keer, vang exit code en laatste ~5 regels.
3. **Groen**: append `<DATE> - Pre-flight green: <N> commands clean.` aan `STATE.md`, print `PREFLIGHT_GREEN`, ga naar Stage 7.
4. **Rood**: append `<DATE> - Pre-flight red: <cmd> exited <code>.`, print `PREFLIGHT_RED` met de details, toon de Stage 6 samenvatting opnieuw met een menu van 4: **"Skip pre-flight, dispatch anyway"** (de baseline is misschien bewust stuk, bijv. fase 1 fixt hem) / "Adjust an assumption" / "Tweak a phase" / "Restructure phases". Bij skip: log `<DATE> - Pre-flight bypassed by user.` en ga naar Stage 7.

---

## Stage 6.6 - Kies de uitvoeringsvorm (dispatch)

Niet elke taak verdient dezelfde machinerie, en niet elk account heeft dezelfde credits. Kies on the spot welke vorm je de gebruiker laat plakken, op twee assen: hoe complex de vraag is en hoeveel budget er is. Het budget leid je af uit wat beschikbaar is (geen Workflow-tool, behandel als zuinig) of je vraagt het een keer (zuinig / standaard / max). De keuze stond al in de plan-review, dus de gebruiker kon hem overrulen.

| Vraag-vorm | Zuinig of klein account | Ruim of max account |
|---|---|---|
| Triviaal (1 bestand, < 1 uur) | Geen Supergoal, gewoon doen | idem |
| Standaard feature (enkele fasen) | een `/goal`, parallelle subagents per scheidbaar spoor | een `/goal`, parallelle subagents per scheidbaar spoor |
| Complexe build (veel losse sporen) | een `/goal`, een specialist per spoor parallel (subagents) | een `/goal` plus Workflow-swarms per fase als de credits er zijn |
| Terugkerend of gepland ("elke dag", "blijf X doen") | `/loop` of een scheduled task in plaats van een eenmalige run | idem |

De toplaag is bijna altijd `/goal`: dat is de ruggengraat met de evaluator-gate. Binnen de `/goal` run draait een fase met twee of meer scheidbare sporen als parallelle subagents (een specialist per spoor, gratis), nooit als een enkele sequentiele agent. De Workflow-tool is geen aparte plak; hij wordt per fase ingezet voor ongewoon grote swarms, alleen bij genoeg credits. `/loop` (of een scheduled task) vervangt de hele eenmalige run wanneer de taak in werkelijkheid terugkerend is en niet bouw-tot-klaar.

Leg de keuze vast in `STATE.md` als `Dispatch: <goal | loop> + <subagents | workflow>` (de bovengrens). Dit veld begrenst alleen de zware Workflow-tier; parallelle subagents bij scheidbare sporen staan er los van en draaien altijd, sequentieel is enkel de fallback bij een atomaire fase of zonder tool. Stage 7 print de bijbehorende plak.

---

## Stage 7 - Dispatch (een plak)

Slash commands vuren alleen vanuit gebruikersinput, dus dit is een eerlijke een-plak overdracht. Print de vorm die Stage 6.6 koos. In de meeste gevallen is dat de `/goal` plak hieronder; bij een terugkerende taak print je in plaats daarvan een `/loop` (zie onder). Na "Start now":

1. Update `STATE.md`: `Status: READY_TO_DISPATCH`, `Current phase: 1`, en leg `Baseline ref:` vast op `git rev-parse HEAD 2>/dev/null || echo "no-git"`. Initialiseer `Phase baselines:` (leeg); de generator voegt per fasegrens een entry toe (`phase <N> pre: <ref>`), de rollback-ankers waar `phase-N-rationale.md` naar verwijst.
2. Kopieer `$SUPERGOAL_DIR/templates/PROTOCOL.md` naar `.supergoal/PROTOCOL.md`, `$SUPERGOAL_DIR/prompts/phase-judge.md` naar `.supergoal/evaluator.md` (de evaluator-instructie die de subagent of fallback-pass leest), `$SUPERGOAL_DIR/prompts/phase-team.md` naar `.supergoal/phase-team.md` (de team-instructie voor de generator), `$SUPERGOAL_DIR/references/workflow-patterns.md` naar `.supergoal/workflow-patterns.md` (de patroon-keuze voor de generator), `$SUPERGOAL_DIR/prompts/council-gate.md` naar `.supergoal/council-gate.md` (de richtings-gate die na een evaluator-ACCEPT draait), en `$SUPERGOAL_DIR/scripts/repo-state.sh` naar `.supergoal/repo-state.sh`.
3. Verifieer elke `phase-N.md` en draai `validate-phase.sh` erop.
4. Print het kant-en-klare `/goal` commando:

````
```
/goal "Execute all phases in .supergoal/ROADMAP.md sequentially per .supergoal/PROTOCOL.md. For each phase: read phase-N.md, do the work as the GENERATOR, print SUPERGOAL_PHASE_EVIDENCE (raw commands+output+exit codes, files changed, artifact observations; NO verdict). Then run the INDEPENDENT EVALUATOR per .supergoal/evaluator.md: it re-runs every check itself against repository ground truth and the running artifact, blind to the generator's account, and prints SUPERGOAL_EVAL_VERDICT phase=N with ACCEPT or REJECT. Only on ACCEPT run the COUNCIL DIRECTION GATE per .supergoal/council-gate.md: it judges direction not correctness, prints SUPERGOAL_COUNCIL_VERDICT phase=N with AUTO-APPROVE or ESCALATE; on ESCALATE it convenes the council skill, prints SUPERGOAL_COUNCIL_ESCALATE with recommendation A, alternatives B/C and sources, and either takes the user's go/B/C or, with no live input, follows A and logs it. Then print SUPERGOAL_PHASE_DONE and advance; on REJECT follow the 3-strike recovery in PROTOCOL.md. After the last phase, the evaluator runs the FINAL AUDIT against the original ROADMAP.md and re-observes the artifact; only after AUDIT_COMPLETE print SUPERGOAL_RUN_COMPLETE. Done when SUPERGOAL_RUN_COMPLETE appears with one ACCEPT, one SUPERGOAL_COUNCIL_VERDICT (AUTO-APPROVE or a resolved escalation), and one SUPERGOAL_PHASE_DONE per phase, AUDIT_COMPLETE before it, and no FAILURE_HANDOFF or AUDIT_HANDOFF this run."
```
````

5. Volg met exact deze regel:

> **Plak de `/goal` regel hierboven in je input om de keten te dispatchen.** Daarna draait het autonoom: generator bouwt, onafhankelijke evaluator bewijst, rollback bij regressie, memory writeback per fase, tot `SUPERGOAL_RUN_COMPLETE` verschijnt.

6. **Stop.** Geen verdere output. De plak start de autonome run onder een verse `/goal` sessie die alles van schijf leest.

### Terugkerende taak: `/loop` in plaats van `/goal`

Koos Stage 6.6 voor `/loop` (de taak is terugkerend, niet bouw-tot-klaar), print dan in stap 4 een `/loop` regel in plaats van de `/goal` regel, met hetzelfde interval-idee en dezelfde verwijzing naar `.supergoal/`. Bijvoorbeeld: `/loop <interval> voer de volgende ronde uit volgens .supergoal/PROTOCOL.md`. Voor een vaste tijd gebruik je een scheduled task. De rest van de overdracht is gelijk: een plak, daarna autonoom.

---

## Uitvoering: generator bouwt, evaluator bewijst, council bewaakt de richting

Dit is de loop die binnen de `/goal` sessie draait, herhaald tot `SUPERGOAL_RUN_COMPLETE`. Volledige mechaniek in `.supergoal/PROTOCOL.md`; de kern:

1. Lees `STATE.md` -> huidige fase N. Lees `phase-N.md`. Snapshot de pre-fase baseline naar `STATE.md` `Phase baselines:`.
2. Print `SUPERGOAL_PHASE_START`.
3. **Generator (team by default, solo alleen bij een atomaire fase)**: kies eerst het werkpatroon dat bij de fase past (zie `references/workflow-patterns.md`): default geen patroon, anders classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter, tournament of loop-until-done naar het signaal in de spec. Knip de fase in onafhankelijke sporen; bij twee of meer sporen dispatch je een specialist-subagent per spoor parallel (zie `.supergoal/phase-team.md`), en los per spoor de skill op met de skill-finder-passes (installed matchen; anders zoeken en `npx skills add <owner/repo>` van skills.sh; anders zelf een skill schrijven). Parallelle subagents zijn de default en kosten geen credits; sequentieel is alleen voor een atomaire fase of zonder subagent-tool, de Workflow-tool alleen voor grote swarms met credits. Een fase met twee of meer sporen draait nooit als een enkele agent, en een team met een agent bestaat niet. Print eerst `SUPERGOAL_PHASE_TEAM` (patroon, sporen, specialisten parallel, opgeloste skills). Doe dan het werk, draai mandatory commands, stuur het artefact aan voor de empirische criteria, en print `SUPERGOAL_PHASE_EVIDENCE`: ruwe command-output + exit codes, gewijzigde bestanden, en de observaties. Het team velt geen oordeel; dat blijft de evaluator.
4. **Evaluator** (subagent met verse context, of fallback-pass): leest `phase-N.md` en `.supergoal/evaluator.md`, niet het generator-oordeel. Herdraait elke check per klasse: commands opnieuw, `repo-state.sh` voor deliverables, het artefact zelf aansturen voor `empirical`, blind oordeel voor `llm-judge`, her-grep voor `self-consistency`. Print `SUPERGOAL_EVAL_VERDICT phase=N` met per-criterium pass/fail + bewijs, en ACCEPT of REJECT.
5. **Correctheids-gate** (evaluator): REJECT -> 3-strike recovery (zie onder). ACCEPT -> stap 5b.
5b. **Council (richtings-gate, alleen na een ACCEPT)**: draai de council-pass uit `.supergoal/council-gate.md`. Hij beoordeelt alleen richting, niet correctheid, en krijgt de fase-spec, het evaluator-verdict en een compacte diff, niet het transcript. AUTO-APPROVE (default): print `SUPERGOAL_COUNCIL_VERDICT` en door. ESCALATE (alleen bij een moeilijk omkeerbare keuze met meerdere paden buiten de bevestigde scope): convoceer de `council`-skill, print `SUPERGOAL_COUNCIL_ESCALATE` (aanbeveling A, alternatieven B/C, bronnen), wacht op `go/B/C`, of volg bij geen live input A en log het. Bij `B/C` herschrijf je de geraakte toekomstige fase-specs en de bijbehorende `ROADMAP.md`-blokken, herdraai je `validate-phase.sh`, en log je onder `STATE.md` Council decisions. De council kan een ACCEPT niet overrulen.
6. Memory writeback check, dan `SUPERGOAL_PHASE_DONE`, update `STATE.md`. User-interrupt check op de fasegrens. N < total: volgende fase. N == total: final audit, dan pas `SUPERGOAL_RUN_COMPLETE`.

### Per-fase team (swarm) en dynamische skills

De generator is per fase een team zodra het werk scheidbaar is. Knip de fase in onafhankelijke sporen (eigen deliverable, eigen verify-gate, geen gedeelde mutatie van dezelfde bestanden); spoor-detectie is de verplichte eerste stap per fase. Bij twee of meer sporen draait een specialist-subagent per spoor parallel, elk met een eigen skillset, en bij grote fasen meerdere teams naast elkaar. Volledige instructie in `.supergoal/phase-team.md`. Parallelle subagents zijn de default en kosten geen credits; sequentieel is alleen de fallback bij een atomaire fase of zonder subagent-tool, en de Workflow-tool is voorbehouden aan grote swarms met credits. Een team met een agent bestaat niet, en een fase met twee of meer sporen draait nooit sequentieel als een enkele agent.

Per fase kies je ook het werkpatroon dat bij de aard van de taak past, voor je de sporen knipt: geen patroon als default, anders een van de zes (classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter, tournament, loop-until-done), bij twijfel via een lichte classifier-agent. Het patroon kiest de vorm, de dispatch-modus kiest de zwaarte. Volledige heuristiek in `references/workflow-patterns.md`.

Skills los je dynamisch op met de skill-finder-logica:

1. Match eerst de geinstalleerde skills op wat het spoor nodig heeft.
2. Past er niks, zoek een bewezen aanpak (de skills.sh registry, `gh search`, registries, docs) en installeer met `npx skills add <owner/repo>`.
3. Keert het terug en dekt niks het, schrijf dan een nieuwe, generieke skill in de skill-finder-structuur, zodat een volgende run hem matcht in pass 1.

Dit verandert niks aan de gate: het team is de generator, en de onafhankelijke evaluator herdraait daarna alles. Meer agents is meer bouwkracht, geen extra vertrouwen vooraf.

### Council-gate per fase (richting) en escalatie

Na elke evaluator-ACCEPT draait een council-triage (`.supergoal/council-gate.md`). Hij krijgt de fase-spec, het evaluator-verdict en een compacte diff, niet het volledige gesprek (anti-anchoring). Vraag: legt deze fase een richting vast die de gebruiker zou willen bevestigen of bijsturen?

Escaleer alleen bij alle drie tegelijk: (1) moeilijk of niet omkeerbaar (stack, datamodel, architectuur, vendor-binding), (2) meerdere geloofwaardige paden, (3) buiten wat de gebruiker al in Stage 1 of Stage 6 bevestigde. Mist er een, dan AUTO-APPROVE en door. Correctheids-twijfel hoort hier niet, dat is de evaluator.

Bij escalatie convoceer je de volledige `council`-skill voor een verdict en presenteer je via `AskUserQuestion`: optie A (de aanbeveling, eerst), B en C, met de bronnen erbij. De gebruiker zegt `go` (volg A), of `B`/`C` (stuur bij). Bij `B/C` herschrijf je de geraakte toekomstige fase-specs in-place en de bijbehorende `ROADMAP.md`-blokken, herdraai je `validate-phase.sh`, en log je de afwijking onder `STATE.md` Council decisions. Is er geen levende gebruiker, volg dan automatisch A en log het als `auto-A`, zodat de run niet stilstaat. De geraakte fasen worden later opnieuw door de evaluator bewezen, dus de moat blijft intact.

### Failure recovery (3-strike, op REJECT)

- **1e REJECT**: print `FAILURE_PROBE` (welk criterium, wat de evaluator afkeurde, root-cause hypothese), log het, auto-retry de fase een keer met de probe als feedback. De evaluator herbeoordeelt.
- **2e REJECT**: print `FAILURE_ESCALATE`, schrijf een gerichte fix spec `phase-N.fix.md` (alleen het falende criterium, geen scope creep), voer inline uit, laat de evaluator opnieuw beoordelen.
- **3e REJECT**: print `FAILURE_HANDOFF` (criterium, volledige probe-historie, drie pogingen, volgende stap), zet `STATE.md` op `BLOCKED`, stop.

Voor een regressie die de audit aan fase N toeschrijft: lees het rollback-doel uit `phase-N-rationale.md` en reverteer deliverables naar de pre-fase baseline voor je een fix spec schrijft, in plaats van blind vooruit te patchen.

### Final audit (evaluator-gedreven, voor voltooiing)

De per-fase verdicts zijn al onafhankelijk, maar een latere fase kan een eerdere stilletjes breken. De audit hervalideert tegen de **oorspronkelijke** `ROADMAP.md`, gedraaid door de evaluator, niet de generator. Max 3 rondes; faalt ronde 3, dan `AUDIT_HANDOFF`.

1. Print `AUDIT_START` (ronde, fase-telling, criteria, gededupliceerde commands).
2. Herlees `ROADMAP.md`, trek elke acceptatiecriterium vers uit het origineel.
3. Fase-compleetheid: een ACCEPT-verdict en een `SUPERGOAL_PHASE_DONE` per fase 1..N.
4. Herdraai de geaggregeerde mandatory commands, surface exit codes.
5. Her-observeer het artefact end-to-end voor de `empirical` criteria over alle fasen (niet alleen per fase).
6. Deliverable-check via `repo-state.sh` tegen de baseline.
7. Print `AUDIT_VERIFY`. Gaten -> `AUDIT_GAPS`, schrijf `audit-fix-<round>.md`, voer uit, loop (round + 1). Schoon -> `AUDIT_COMPLETE` met coverage, dan `SUPERGOAL_RUN_COMPLETE`.

### Mid-run onderbreking

Bij een gebruikersbericht tijdens de run: pauzeer op de fasegrens (na `SUPERGOAL_PHASE_DONE`, voor de volgende spec), adresseer het, vraag voor hervatting.

---

## Memory writeback

Memory is dragend: toekomstige runs starten slimmer. Op elke ACCEPT-gate: leerde deze fase iets niet-voor-de-hand-liggends dat een toekomstige run zou helpen?

Waard om op te slaan: een API-eigenaardigheid die niet in de docs stond, een bevestigde gebruikersvoorkeur, een project-feit ("auth leeft in `lib/auth/`"), een faalpatroon plus fix. Schrijf het onder MEM_DIR met `name` / `description` / `metadata.type` frontmatter, link vanuit `MEMORY.md`, print `MEMORY_SAVED: <name>` of `none`. De laatste fase schrijft altijd een `project_<slug>.md`. Sla nooit secrets of efemere state op.

---

## Werkingsprincipes

- **De evaluator beoordeelt nooit zijn eigen werk.** Generator en evaluator zijn strikt gescheiden; het verdict komt van de partij die het werk niet maakte.
- **Evaluator bewijst correctheid, council bewaakt richting.** De evaluator gate-t op klopt-het en sluit de fase; de council gate-t op welke-richting en haalt alleen de mens erbij wanneer alleen die kan beslissen. Ze raken elkaar niet, dus de council vervangt de moat niet en kan een ACCEPT niet overrulen.
- **De council escaleert spaarzaam.** Default is auto-approve en doorgaan. Escaleren mag alleen bij een moeilijk omkeerbare keuze met meerdere paden buiten de bevestigde scope; bij geen live input volgt de council zijn eigen aanbeveling, zodat de run niet stilstaat.
- **Bewijs is empirisch, niet declaratief.** Het draaiende artefact observeren slaat "tests groen" als bewijs van gedrag.
- **Herdraaien boven vertrouwen.** De evaluator produceert eigen exit codes, eigen observaties, eigen tree-diff. Hij neemt geen enkel generator-rapport over.
- **"Perfect" is geen stopconditie, criteria wel.** Elk "perfect" wordt een falsifieerbaar, geklasseerd criterium.
- **Twee vaste gates plus een dynamische.** Grill-intake (Stage 1) en plan review (Stage 6) zijn vast; daarbovenop pauzeert de council de run alleen wanneer alleen jij de richting kunt kiezen. Daartussen autonoom.
- **De loop herstelt zichzelf, dan reverteert hij, dan escaleert hij.** Auto-retry, fix spec, rollback naar baseline, handoff.
- **State leeft op schijf.** Plan, voortgang en baselines overleven context-compaction en laten een run mid-loop hervatten.
- **Plan door te grillen.** Een vraag per keer met aanbeveling, codebase-eerst, tot elke materiele beslissing is opgelost. Een plan op gedeeld begrip hoeft de evaluator later niet af te keuren.
- **Maak de gebruiker architect, geen stempelaar.** Bij een zware keuze stuur je bronnen en scenario's mee, zodat hij snel het onderwerp snapt en op inhoud beslist in plaats van je voorstel af te stempelen.
- **Route op rol, niet op kosten.** Goedkope modellen voor het mechanische volume, een sterk model voor de evaluator, zodat een lange run de limiet overleeft en de judge scherp blijft.
- **Een scheidbare fase is een team, geen enkele agent.** Twee of meer onafhankelijke sporen krijgen twee of meer parallelle specialist-subagents, elk met een eigen skillset; ontbrekende skills haal je erbij (skills.sh) of schrijf je zelf. Een agent per fase is alleen correct bij een atomaire fase. Een sequentieel team bestaat niet, en een Workflow met een agent is verboden. De evaluator blijft er onafhankelijk overheen, dus meer agents kopen geen vertrouwen.
- **Kies het patroon naar de aard van de fase.** Geen patroon als default, anders het beste van de zes (classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter, tournament, loop-until-done), automatisch gekozen op het signaal in de fase. Het patroon is de vorm aan de bouwkant en staat los van de evaluator-gate.
- **Kies de uitvoeringsvorm naar vraag en budget.** `/goal` is de standaard, met parallelle subagents per scheidbaar spoor (gratis); de Workflow-tool alleen voor grote swarms bij genoeg credits; `/loop` of een scheduled task voor terugkerende taken. Zuinig betekent geen onnodige Workflow-credits verbranden, niet zo min mogelijk agents: parallelle subagents bij scheidbaar werk zijn het uitgangspunt.
- **Polish & Harden is verplicht.** Zo wordt "elk aspect is perfect" afgedwongen.

---

## Wanneer afwijken

- **Zeer kleine taak** (< 1 uur, enkel bestand): zeg dat dit geen Supergoal nodig heeft.
- **Gebruiker duwt terug op een fase tijdens intake**: collaps, herplan, door.
- **Mid-run wijziging**: update de fase-spec, draai `validate-phase.sh`, laat de gebruiker hervatten. Niet herstarten bij fase 1.

---

## Referentiebestanden

- `references/planning-depth.md`: wat een plan diep genoeg maakt
- `references/phase-design.md`: hoe fasen op te delen die schoon auto-chainen
- `references/workflow-patterns.md`: de zes workflow-patronen en hoe de generator er per fase automatisch een kiest
- `references/goal-format.md`: `/goal` op Claude Code + Codex, de vereiste transcript-blokken
- `references/repo-state-comparison.md`: hoe de working-tree vergelijking werkt

## Scripts

- `scripts/detect-stack.sh`, `scripts/detect-env.sh`, `scripts/summarize-repo.sh`: recon
- `scripts/validate-phase.sh`: checkt de SUPERGOAL_PHASE_START marker en geklasseerde criteria
- `scripts/repo-state.sh`: complete-working-tree vergelijking voor deliverable- en cleanliness-checks

## Prompts

- `prompts/retrieval-worker.md`: een retrieval-worker per corpus (Stage 2b)
- `prompts/sufficient-context-judge.md`: de eerste context-judge (Stage 2c)
- `prompts/adversarial-prober.md`: de tweede context-judge (Stage 2c-bis)
- `prompts/phase-judge.md`: de onafhankelijke evaluator, gekopieerd naar `.supergoal/evaluator.md` bij dispatch
- `prompts/phase-team.md`: de per-fase team-orchestratie (swarm) plus dynamische skill-resolutie, gekopieerd naar `.supergoal/phase-team.md` bij dispatch
- `prompts/council-gate.md`: de per-fase richtings-gate (council) plus escalatie, gekopieerd naar `.supergoal/council-gate.md` bij dispatch

## Templates

- `templates/ROADMAP.md`, `templates/STATE.md`, `templates/phase-goal.txt`, `templates/phase-rationale.md`
- `templates/PROTOCOL.md`: de uitvoeringsloop, gekopieerd naar `.supergoal/PROTOCOL.md` bij dispatch
- `templates/review.html.tmpl`: self-contained plan-review HTML
