# Supergoal execution protocol

Dit bestand wordt gelezen door de uitvoerende agent aan het begin van de enkele `/goal`
sessie en de hele run gevolgd. Het is de operating manual voor de autonome run.

De kern: **de generator bouwt, een onafhankelijke evaluator bewijst, en een council bewaakt de
richting.** De generator velt nooit zijn eigen pass/fail-oordeel. De evaluator gate-t op
correctheid (ACCEPT/REJECT) en is de enige die een fase sluit. De council draait alleen na een
evaluator-ACCEPT, oordeelt nooit over correctheid, en bepaalt of de gebruiker nodig is om de
richting te houden. De evaluator-instructie staat in `.supergoal/evaluator.md`, de
council-instructie in `.supergoal/council-gate.md`.

## De loop

Herhaal tot `SUPERGOAL_RUN_COMPLETE` is geprint:

1. Lees `.supergoal/STATE.md`. Vind `Current phase: N`.
2. Lees `.supergoal/phases/phase-N.md`. Dit is de volledige werk-spec.
3. **Snapshot de pre-fase baseline.** Voeg aan `STATE.md` onder `Phase baselines:` een
   regel toe: `phase N pre: <git rev-parse HEAD 2>/dev/null || git stash create || echo no-git>`.
   Dit is het rollback-anker waar `phase-N-rationale.md` naar verwijst.
4. Print `SUPERGOAL_PHASE_START` met de spec-metadata (fasenummer, naam, taak, mandatory
   commands, criteria-telling, vereist bewijs, afhankelijkheden, validatieklassen).
5. **Generator (team by default, solo alleen bij een atomaire fase).** Kies eerst het werkpatroon
   dat bij de fase past (zie `.supergoal/workflow-patterns.md`): default geen patroon, anders
   classify-and-act, fan-out-and-synthesize, adversarial verification, generate-and-filter,
   tournament of loop-until-done naar het signaal in de spec. Knip de fase eerst in onafhankelijke
   sporen (verschillende bestanden of modules, eigen criteria, geen onderlinge afhankelijkheid
   binnen de fase); bij onduidelijke scheidbaarheid splits je in kandidaat-sporen, een classifier
   bepaalt hooguit de spoor-grenzen, niet of je een team vormt. Bij twee of meer sporen is het een
   team: dispatch een specialist-subagent per spoor parallel via `.supergoal/phase-team.md`, en los
   per spoor de skill op (match installed; anders `npx skills add <owner/repo>` van skills.sh;
   anders schrijf een skill). Sequentieel of inline is alleen de juiste vorm bij precies een spoor
   (atomaire fase) of als er geen subagent-tool is; de Workflow-tool is voorbehouden aan grote
   swarms met credits. Een team met een agent, of een `Dispatch: sequentieel` bij twee of meer
   sporen, is fout. Print eerst `SUPERGOAL_PHASE_TEAM` (patroon, sporen, specialisten parallel,
   opgeloste skills, dispatch-modus). Doe dan
   het werk uit de spec, draai de mandatory commands, en stuur voor elk `[empirical]`
   criterium het draaiende artefact aan en leg de observatie vast (screenshot-pad,
   HTTP-respons, CLI-output). Print `SUPERGOAL_PHASE_EVIDENCE`: ruwe command-output
   (laatste ~10 regels + exit code), gewijzigde bestanden, en de artefact-observaties.
   **Geen pass/fail-oordeel**, ook het team niet. Je rapporteert wat je deed en zag, niet
   of het slaagde.
6. **Evaluator.** Draai de onafhankelijke evaluator uit `.supergoal/evaluator.md`.
   - **Claude Code** (Task/Agent tool aanwezig): spawn de evaluator als subagent met een
     verse context. Geef hem het pad naar `phase-N.md`, `evaluator.md`, de `Baseline ref`,
     en de ruwe artefacten. Hij leest het generator-oordeel niet.
   - **Codex** (geen subagent): draai de evaluator als aparte pass met de expliciete
     instructie het generator-relaas te negeren en alles vanaf ground-truth te herleiden.
   De evaluator herdraait elke check zelf (commands opnieuw, `repo-state.sh` voor
   deliverables, het artefact zelf observeren voor `empirical`, blind oordeel voor
   `llm-judge`, her-grep voor `self-consistency`) en print `SUPERGOAL_EVAL_VERDICT phase=N`
   met per-criterium pass/fail/inconclusive + bewijs, en `Verdict: ACCEPT | REJECT`.
7. **Cleanliness-check** (onderdeel van de evaluatie). De evaluator draait
   `bash .supergoal/repo-state.sh added-lines <Baseline ref>` en grept de toegevoegde
   regels op stack-specifieke debug-patronen: `console.log`/`console.error` (JS/TS),
   `print(`/`pprint(` (Python), `print(`/`dump(` (Swift), `fmt.Println`/`log.Println`
   (Go), plus TODO/FIXME en dode imports toegevoegd deze fase. Een non-zero telling telt
   als fail, tenzij de spec een `Cleanliness override:` regel draagt. Strategie:
   `references/repo-state-comparison.md`.
8. **Correctheids-gate (evaluator).**
   - **REJECT**: ga naar Failure recovery. Niet doorgaan.
   - **ACCEPT**: ga door naar stap 8b.
8b. **Council-gate (richting, alleen op ACCEPT).** Draai de council-pass uit
   `.supergoal/council-gate.md`. Hij krijgt `phase-N.md`, het `SUPERGOAL_EVAL_VERDICT` en een
   compacte diff (`repo-state.sh added-lines` vs `Baseline ref`) plus de observaties, niet het hele
   transcript. Hij beoordeelt alleen richting, niet correctheid. Print
   `SUPERGOAL_COUNCIL_VERDICT phase=N` met `decision=AUTO-APPROVE` of `ESCALATE` en een reden.
   - **AUTO-APPROVE** (default): door naar stap 9.
   - **ESCALATE** (alleen bij een one-way-door met meerdere paden buiten de bevestigde scope):
     convoceer de `council`-skill, print `SUPERGOAL_COUNCIL_ESCALATE` (aanbeveling A, alternatieven
     B/C, bronnen), pauzeer en wacht op `go/B/C`. Verwerk het antwoord (`go` = A volgen; `B/C` = de
     geraakte toekomstige fase-specs en de bijbehorende `ROADMAP.md`-blokken in-place herschrijven,
     `validate-phase.sh` herdraaien), log onder `STATE.md` Council decisions, ga dan naar stap 9. Is
     er geen levende gebruiker, volg dan A en log het als `auto-A`. De council kan de fase niet
     sluiten zonder de ACCEPT en niet heropenen.
9. **Memory writeback check.** Iets niet-voor-de-hand-liggends geleerd? Zo ja, schrijf een
   memory-bestand onder MEM_DIR (frontmatter: `name`, `description`, `metadata.type`),
   link vanuit `MEMORY.md`. Print `MEMORY_SAVED: <name>` of `MEMORY_SAVED: none`.
10. Print `SUPERGOAL_PHASE_DONE`. Update `STATE.md`: markeer fase N completed; zet
    `Current phase: N+1`; bump `Last update`; append een event-regel.
11. **User-interrupt check.** Is er een gebruikersbericht sinds de laatste beurt, pauzeer,
    adresseer het, vraag voor hervatting.
12. N < total: ga door met fase N+1 (terug naar stap 1).
13. N == total: print `SUPERGOAL_RUN_COMPLETE` nog **niet**. Draai de Final audit. Pas na
    `AUDIT_COMPLETE`, print `SUPERGOAL_RUN_COMPLETE` met een 5-regelige samenvatting.

## Final audit (na de laatste fase, voor voltooiing)

De per-fase verdicts zijn al onafhankelijk, maar een latere fase kan een eerdere stilletjes
breken. De audit hervalideert tegen de **oorspronkelijke** `ROADMAP.md`, gedraaid door de
evaluator, niet de generator. Max 3 rondes; faalt ronde 3, dan `AUDIT_HANDOFF`.

### Auditstappen (een ronde)

1. Print `AUDIT_START` (rondenummer, fase-telling, criteria-telling, gededupliceerde
   mandatory commands om te herdraaien).
2. Herlees `.supergoal/ROADMAP.md`, trek elk acceptatiecriterium vers uit het origineel.
3. **Fase-compleetheid:** scan het transcript op een ACCEPT-verdict plus een
   `SUPERGOAL_PHASE_DONE` per fase 1..N. Ontbreekt er een, dan een `AUDIT_GAP`.
4. **Herdraai de geaggregeerde mandatory commands** elk een keer (de gededupliceerde union
   van alle fasen). Surface laatste ~10 regels + exit code. Non-zero exit = `AUDIT_GAP`.
5. **Her-observeer het artefact end-to-end** voor de `empirical` criteria over alle fasen,
   niet alleen per fase. Een UI-flow die fase 2 opleverde en fase 5 brak, valt hier.
   Leg de observaties vast (screenshots, responses). Een gebroken observatie = `AUDIT_GAP`.
6. **Deliverable-check:** voor elk fase-blok in `ROADMAP.md`, parse de `**Deliverables:**`
   bullets. Voor elke bullet met een pad of glob: lees `Baseline ref:` uit `STATE.md` en
   draai `bash .supergoal/repo-state.sh deliverable <baseline-ref> "<path>"`. `missing`
   (exit 1) = `AUDIT_GAP`. Dit is repository ground-truth, niet transcript-zelfrapport.
7. Print `AUDIT_VERIFY`: per fase de status, per command de exit, per criterium
   pass/fail/inconclusive + bewijs, en een `Deliverables:` blok.

### Bij gaten

1. Print `AUDIT_GAPS` met de lijst.
2. Als een gat een regressie is die aan fase N is toe te schrijven: lees het rollback-doel
   uit `phase-N-rationale.md` en reverteer de getroffen deliverables naar de pre-fase
   baseline (`git restore --source=<ref> -- <paths>`) voor je vooruit patcht.
3. Schrijf `.supergoal/phases/audit-fix-<round>.md`, een gerichte fix spec die alleen de
   falende criteria target. Geen scope creep. De evaluator-criteria zijn de success-gate.
4. Voer de fix spec inline uit (generator bouwt, evaluator herbeoordeelt).
5. Bij fix-succes: loop terug naar stap 1 van de audit (round + 1).
6. Bij falen van ronde 3: print `AUDIT_HANDOFF` (volledige gap-historie, volgende stap),
   zet `STATE.md` op `BLOCKED`, stop. Print `SUPERGOAL_RUN_COMPLETE` niet.

### Bij nul gaten

1. Bereken `audit coverage`: `re_verified / (re_verified + inconclusive)` als percentage.
   `re_verified` = criteria met `pass` plus deliverables `present`. `inconclusive` =
   criteria die de evaluator niet kon herdraaien.
2. Print `AUDIT_COMPLETE` (rondes, fasen herverifieerd, commands schoon hergedraaid,
   criteria pass/inconclusive, deliverables present/missing, coverage %).
3. Print `SUPERGOAL_RUN_COMPLETE` met de 5-regelige samenvatting. Is `inconclusive /
   (re_verified + inconclusive)` > 30%, prepend een eerlijkheidsbanner: `Audit coverage:
   <re_verified> herverifieerd, <inconclusive> inconclusive (<pct>%). Check de open punten
   handmatig voor merge.`

## Failure recovery (3-strike, op REJECT van de evaluator)

### 1e REJECT van een criterium

1. Print `FAILURE_PROBE` (fase, afgekeurd criterium, wat de evaluator citeerde als gap,
   root-cause hypothese).
2. Append de probe aan de `STATE.md` failure log.
3. **Auto-retry de fase een keer.** Injecteer de probe als "Vorige poging afgekeurd omdat:
   ..." preamble. Niet doorgaan. De evaluator herbeoordeelt na de retry.

### 2e REJECT (auto-retry ook afgekeurd)

1. Print `FAILURE_ESCALATE`.
2. Schrijf een gerichte fix spec op `.supergoal/phases/phase-N.fix.md`: alleen het falende
   criterium, geen scope creep, met het evaluator-criterium als success-gate.
3. Voer de fix spec inline uit (generator bouwt, evaluator herbeoordeelt).
4. Bij ACCEPT: ga naar N+1.
5. Bij REJECT: ga naar derde-faal afhandeling.

### 3e REJECT (fix spec ook afgekeurd)

1. **Overweeg rollback.** Is het criterium gebroken door regressie in deze fase, reverteer
   naar de pre-fase baseline uit `phase-N-rationale.md` voor je opgeeft.
2. Print `FAILURE_HANDOFF`: falend criterium, volledige probe-historie (drie pogingen),
   volgende stap.
3. Zet `STATE.md` op `BLOCKED`. Stop. De `/goal` conditie blijft onvervuld; toon de handoff
   duidelijk zodat host-evaluator en gebruiker het beide zien.

## Mid-run interruption

Bij een gebruikersbericht tijdens de run: pauzeer op de fasegrens (na
`SUPERGOAL_PHASE_DONE`, voor de volgende spec), adresseer het, vraag of je hervat, de
volgende spec herziet, of stopt.

Een `SUPERGOAL_COUNCIL_ESCALATE` is zelf een geplande pauze op de fasegrens (na de
evaluator-ACCEPT): behandel het `go/B/C`-antwoord als richtingsbeslissing, niet als een gewone
mid-run onderbreking, en hervat daarna de loop bij stap 9. Komt er geen antwoord, volg A en ga door.

## Memory writeback rules

Zie de `Memory writeback` sectie in SKILL.md. Kort:

- Sla iets niet-voor-de-hand-liggends op dat een toekomstige run zou helpen.
- Frontmatter: `name`, `description`, `metadata.type` (feedback / project / reference / user).
- Link vanuit `MEMORY.md`. De laatste fase schrijft altijd een `project_<slug>.md`.
- Sla nooit secrets, transiente taakdetails of efemere state op.

## Vereiste transcript-blokken

Zie `references/goal-format.md` voor het exacte formaat van:
- `SUPERGOAL_PHASE_START`
- `SUPERGOAL_PHASE_TEAM` (generator, alleen als de fase een team draait)
- `SUPERGOAL_PHASE_EVIDENCE` (generator, ruw, geen oordeel)
- `SUPERGOAL_EVAL_VERDICT` (evaluator, ACCEPT/REJECT)
- `SUPERGOAL_COUNCIL_VERDICT` (council, na een ACCEPT, AUTO-APPROVE of ESCALATE)
- `SUPERGOAL_COUNCIL_ESCALATE` (council, alleen bij ESCALATE: aanbeveling A, alternatieven B/C, bronnen, wacht op go/B/C)
- `MEMORY_SAVED`
- `SUPERGOAL_PHASE_DONE`
- `AUDIT_START` / `AUDIT_VERIFY` / `AUDIT_GAPS` / `AUDIT_COMPLETE` / `AUDIT_HANDOFF`
- `SUPERGOAL_RUN_COMPLETE`
- `FAILURE_PROBE` / `FAILURE_ESCALATE` / `FAILURE_HANDOFF`
