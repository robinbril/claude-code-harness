---
name: createloopprompt
description: Zet een taakomschrijving om in een volledige, begrensde Autonomous Coding Loop Prompt voor Claude Code, Cursor of Codex. Gebruik bij "maak een loop prompt voor X", "laat een agent X autonoom fixen", of als iemand een agent wil laten itereren zonder rommel of scope creep.
---

# Create Loop Prompt

Genereer uit een taakomschrijving een complete loop-prompt: doel + scope + validatie + stopregels. Een loop is geen lange prompt; het is een gecontroleerde engineeringcyclus. Zonder stopregels is het een gokkast met terminaltoegang.

## Stap 1 - Intake: weiger vage doelen

Check de taakomschrijving op deze drie punten. Faalt er één, stel dan **één gerichte vraag per gat** (max 3) vóór je iets genereert:

1. **Meetbaar eindpunt?** "Maak dit beter", "verbeter alles", "maak het productie-ready": weigeren. Vraag: "Wat is het concrete eindpunt, welke test moet groen, welk gedrag moet veranderen?"
2. **Scope bekend?** Onbekend wat níét aangeraakt mag worden: vraag het.
3. **Validatie mogelijk?** Geen testcommando, build of reproduceerbare check bekend: vraag ernaar. Claims zonder validatie tellen niet.

Als de gebruiker bestanden of repo-context heeft genoemd: lees zelf de relevante bestanden en vul Context aan met echte paden en commando's. Gok nooit testcommando's; check `package.json`/`pyproject.toml`/`Makefile`.

## Stap 2 - Routeer eerst naar de loop-collectie (Claude Code)

In Claude Code bestaat een collectie gespecialiseerde, token-zuinige loop-skills. Die orchestreren verse subagents met ingebouwde state-file, harde caps en per-ronde-verificatie, wat vrijwel altijd beter is dan één agent die een lange monolithische prompt afwerkt. **Match de taak hier eerst tegen.** Genereer pas een losse prompt (stap 3+) als geen skill past, of als het doel Cursor/Codex is (daar bestaan deze skills niet).

| Taak | Route naar | Ingebouwde cap |
|------|-----------|----------------|
| Reproduceerbare failure (test/build/bug) tot groen | **fix-loop** | 5 iteraties |
| Feature of tasklist story-voor-story bouwen | **bouw-loop** | per story |
| Bestaande UI/tekst/deliverable naar niveau polijsten | **polijst-loop** | 4 rondes / plateau |
| Onbekende hoeveelheid vinden (bugs/dead code/audit/claims) | **speur-loop** | 2 droge rondes |
| Wachten op externe state (CI/deploy/DNS/health) + actie bij verandering | **waak-loop** | eindcriterium |
| Einddoel end-to-end shippen (recon → plan → bouw → polijst → fix → verify) | **keten-loop** | per fase |

Past er een: adviseer die skill (`/fix-loop`, `/bouw-loop`, `/polijst-loop`, `/speur-loop`, `/waak-loop`, `/keten-loop`) met één regel waarom, en stop. Genereer dan géén losse prompt, dat zou de agent-orchestratie dupliceren met een zwakkere single-agent-variant. Twijfel tussen twee (bv. bug in een feature): noem beide met de doorslaggevende vraag. Alleen bij geen match, of een expliciet niet-Claude-Code-doel, ga je door naar stap 3.

## Stap 3 - Kies het looptype (fallback: standalone prompt)

Het type bepaalt de vrijheid van de agent. Kies er één en benoem hem in de output:

| Type | Wanneer | Vrijheid |
|------|---------|----------|
| **Bugfix loop** | Reproduceerbare fout | Reproduceer -> root cause -> minimale fix -> gerichte validatie |
| **Refactor loop** | Structuur verbeteren, gedrag identiek | Tests bewijzen gedragsbehoud; geen functionele wijziging |
| **Research loop** | Onbekende codebase begrijpen | Alleen lezen + plan opleveren. **Geen implementatie.** |
| **Feature loop** | Eén duidelijke feature | Bouwen met tests, geen zijpaden |
| **Review loop** | PR/diff controleren | Alleen analyseren: regressies, security, scope creep. **Niet wijzigen.** |

Combineer nooit refactor + feature in één loop; splits dat in twee opeenvolgende loops.

## Stap 4 - Genereer de prompt

Vul het sjabloon in [`templates/loop-prompt.md`](templates/loop-prompt.md) volledig in. Geen placeholder mag blijven staan: alles concreet, of weggelaten met reden. Default max iteraties: **3** (bugfix/review), **5** (feature/refactor). Lever het resultaat als één codeblok, copy-paste klaar. (De standalone prompt is bewust single-agent self-validating: Cursor/Codex hebben de verse-subagent-moat van de loop-skills niet. Voor Claude Code stuurt stap 2 je juist naar die skills.)

## Stap 5 - Lever af met startcheck

Toon na de gegenereerde prompt deze checklist, kruis af wat geborgd is:

- [ ] Doel concreet genoeg om te testen
- [ ] Success criteria meetbaar
- [ ] Vastgelegd wat de agent níét mag wijzigen
- [ ] Echte bestanden + validatiecommando's ingevuld (niet gegokt)
- [ ] Looptype expliciet gekozen
- [ ] Werkgeheugen teruggevoerd per cyclus (last error + past attempts)
- [ ] Max iteraties gezet (3-5)
- [ ] Tweede guardrail naast iteraties (no-progress / diff-grootte)
- [ ] Stopregels compleet

Sluit af met één regel advies passend bij de taak. Voorbeeld: "Eerste keer loops? Start met één failing test, niet met deze hele feature."

## Parallel loops (alleen op verzoek)

Bij expliciete vraag naar parallel werk: elke loop krijgt een eigen rol (research / tests schrijven / minimale fix / review) en eigen bestanden. Nooit twee agents tegelijk op dezelfde bestanden. Human gate verplicht bij: productkeuzes, API-contracten, data-migraties, nieuwe dependencies.
