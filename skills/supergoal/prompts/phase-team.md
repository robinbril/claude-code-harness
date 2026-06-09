# Phase team prompt (per-fase swarm, onderdeel van de generator)

Bij dispatch wordt dit bestand gekopieerd naar `.supergoal/phase-team.md`. De generator
leest het per fase. Een fase met twee of meer niet-overlappende sporen draait als team: een
specialist-subagent per spoor, parallel. Solo is de uitzondering, alleen voor een atomaire fase.

Je bent de **lead** (de "bedrijfseigenaar") van een fase. Je mag de fase bouwen met een
team van specialisten in plaats van alleen. Het team is en blijft de generator: het levert
werk plus ruw bewijs op, het velt **nooit** een eigen oordeel over slagen of falen. Daarna
herdraait de onafhankelijke evaluator alles. Het team is voor doorzet en gespecialiseerde
vaardigheid, niet voor goedkeuring.

## Team is de default, solo de uitzondering

Scheidbaarheid bepaalt de vorm, niet de kosten.

- **Team (default)**: kun je de fase in Stap 1 in twee of meer niet-overlappende sporen knippen
  (bijvoorbeeld frontend, backend, tests, data, docs), dan is het een team: een specialist per
  spoor, parallel. Het aantal sporen bepaalt de teamgrootte. Grote fasen kunnen meerdere teams
  naast elkaar draaien. Ontbrekende vaardigheden zijn een extra reden voor meer specialisten,
  niet de enige trigger.
- **Solo (uitzondering)**: alleen als de fase atomair is, de wijzigingen raken hetzelfde bestand
  of dezelfde functie met een strikte volgorde-afhankelijkheid, zodat splitsen geen zin heeft.

## Stap 0: kies het werkpatroon

Voor je de fase in sporen knipt, kies het patroon dat bij de aard van de fase past. Volg de
selectie-heuristiek in `.supergoal/workflow-patterns.md`: lees de fase-spec, match het signaal op
een patroon, en val terug op geen patroon alleen als de fase atomair is. Is de fase scheidbaar in
twee of meer onafhankelijke sporen, dan fan je sowieso parallel uit (een specialist per spoor);
het patroon kiest daarbovenop de vorm.

Is de aard niet eenduidig uit de spec te lezen, spawn dan de lichte classifier-agent uit dat
bestand. Het gekozen patroon stuurt de volgende stappen: fan-out-and-synthesize knipt in veel
parallelle sporen met een synthese-barrier, tournament zet N pogingen op dezelfde taak met
paarsgewijze judges, loop-until-done spawnt tot er niks nieuws komt, adversarial verification
hangt een refuter aan elk spoor. Het patroon staat los van de evaluator-gate; die herdraait
sowieso.

## Stap 1: knip de fase in sporen

Elk spoor is het werk van een specialist: een duidelijke deelopgave, een eigen deliverable,
en welk deel van de acceptatiecriteria het dekt. Sporen overlappen niet in bestanden waar
mogelijk, zodat ze veilig parallel kunnen.

## Stap 2: los de skills op (skill-finder-logica)

Per spoor bepaal je welke vaardigheid de specialist nodig heeft. Volg de drie passes van de
skill-finder skill:

1. **Match installed skills eerst.** Inventariseer de beschikbare skills en kies de een of
   twee die het spoor het beste dekken. Past er een, gebruik die.
2. **Zoek en hergebruik (alleen als niks past).** Zoek een bewezen aanpak voor je zelf gaat
   bouwen: de skills.sh registry (Vercel), `gh search repos` / `gh search code`, npm/PyPI,
   en de primaire docs. Installeer een passende skill met `npx skills add <owner/repo>`.
3. **Schrijf een nieuwe skill (alleen als het terugkeert en niks dekt).** Volg de
   skill-finder structuur (`SKILL.md` < 100 regels, scherpe description met triggers, generiek,
   geen persoonlijke naam). Bewaar hem zodat een volgende run hem matcht in pass 1.

Log per benodigde skill een regel: `installed:<naam>` | `acquired:<owner/repo via skills.sh>`
| `written:<naam>` | `none:<reden>`. Een spoor zonder oplosbare skill val je terug op een
generalist, en je noteert dat.

## Stap 3: dispatch de specialisten (match de vorm op het werk)

Drie manieren. De vorm volgt uit het werk, niet uit je budget.

1. **Subagents (Task), de default bij twee of meer sporen.** Een specialist-subagent per spoor,
   parallel. Dit kost geen extra credits. Zodra Stap 1 twee of meer niet-overlappende sporen
   oplevert, is dit de juiste vorm.
2. **Sequentieel in de `/goal` run (fallback).** Alleen voor een atomaire fase (een spoor), of
   als er geen dispatch-tool is. Geen default, een terugval.
3. **Workflow-tool (alleen voor grote fan-outs met credits).** Een ongewoon groot aantal
   parallelle sporen tegelijk. Alleen als je account de credits heeft. Verbrandt veel tokens,
   dus voorbehouden aan echt brede swarms.

Geef elke specialist mee: zijn spoor en deliverable, de skill(s) die hij gebruikt, het deel
van de acceptatiecriteria dat hij dekt, en de opdracht om werk plus ruw bewijs terug te geven
(commando-output, gewijzigde bestanden, observaties), zonder eigen pass/fail-oordeel.

Zonder dispatch-tool (bijvoorbeeld Codex): val terug op sequentieel binnen de run. Dat is een
fallback, geen default. Een specialist per spoor geeft skill-dekking en parallellisme die een
enkele agent niet heeft, dat is waarom het team-pad bestaat.

De `Dispatch:`-regel in `.supergoal/STATE.md` begrenst alleen de zware Workflow-tier. Parallelle
subagents zet je altijd in voor een fase met twee of meer sporen, tenzij de gebruiker subagents
expliciet uitzette. Het is geen vloer die parallellisme blokkeert.

## Stap 4: voeg samen

De lead voegt de sporen samen tot de deliverable van de fase en tot een enkel
`SUPERGOAL_PHASE_EVIDENCE` blok. Botsen twee sporen, dan los je dat hier op voor je doorgeeft.
De evaluator ziet een fase, niet een verzameling losse agents.

## Output: het team-blok

Print voor het bouwen:

```
SUPERGOAL_PHASE_TEAM phase=<N>
Pattern: <geen | classify-and-act | fan-out-and-synthesize | adversarial-verification | generate-and-filter | tournament | loop-until-done>
Tracks:
- <spoor 1>: <deliverable> | skill: <installed|acquired|written|none + naam/bron> | criteria: <welke>
- <spoor 2>: ...
Specialisten parallel: <N, minimaal 2; bij 1 is het geen team, draai solo>
Teams parallel: <1 of meer naast elkaar draaiende teams>
Dispatch: <subagents (Task) | workflow-tool | sequentieel in /goal>
```

Bij twee of meer Tracks hoort hier `subagents` of `workflow-tool`, nooit `sequentieel`. Een
team-blok met een spoor of met `Specialisten parallel: 1` is geen team: schrap het blok en draai
de fase solo.

## Grens

Het team verandert niks aan de gate. Wie bouwt keurt nooit zichzelf, ook een team niet. Na
`SUPERGOAL_PHASE_EVIDENCE` herdraait de onafhankelijke evaluator elke check op het draaiende
artefact. Meer agents betekent meer bouwkracht, niet meer vertrouwen vooraf.

Een team met een agent bestaat niet, dat is een solo-fase met overhead. Een Workflow die maar
een agent spawnt is verboden: de Workflow-tool en een team zijn er voor twee of meer sporen die
tegelijk draaien. Bij precies een spoor draai je solo (inline of een enkele subagent), nooit als
Workflow of team. Een `SUPERGOAL_PHASE_TEAM` met twee of meer Tracks maar `Dispatch: sequentieel`
is fout en moet je overdoen als parallelle subagents.
