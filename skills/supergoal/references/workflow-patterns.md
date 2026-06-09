# Workflow-patterns (per fase het beste patroon kiezen)

Bij dispatch wordt dit bestand mee naar `.supergoal/` gekopieerd. De generator leest het per
fase en kiest het werkpatroon dat bij de aard van de fase past, voordat hij de sporen dispatcht
(zie `phase-team.md`).

Een patroon is hoe de generator een fase aanpakt: solo doorbouwen, of de fase opdelen en agents
in een vaste vorm laten samenwerken. Het patroon staat los van de evaluator-gate. Wat de
generator ook kiest, de onafhankelijke evaluator herdraait daarna elke check op het draaiende
artefact. Meer structuur aan de bouwkant koopt geen vertrouwen vooraf.

## Eerst: is deze fase scheidbaar?

Aparte agents met een eigen schone context en een scherp, afgebakend doel zijn de default zodra er
scheidbaar werk ligt. Heeft de fase twee of meer onafhankelijke sporen (frontend, backend, tests,
data, docs, of onafhankelijke items of bestanden), dan draait een specialist per spoor parallel;
het aantal sporen bepaalt de teamgrootte. Solo en sequentieel zijn de uitzondering: alleen bij een
atomaire fase, een onsplitsbaar deliverable waarvan de sporen state delen en niet onafhankelijk
kunnen draaien.

Een werkpatroon kiezen is de tweede vraag, bovenop de fan-out. Een patroon helpt extra wanneer een
fase last heeft van een van deze drie faalvormen van een enkele lange context:

- **Halverwege stoppen.** Een agent verklaart een grote, meervoudige taak klaar na deelwerk (20
  van de 50 punten in een review).
- **Voorkeur voor eigen werk.** Een agent die zijn eigen output beoordeelt vindt hem te makkelijk
  goed.
- **Doel-drift.** Over veel beurten en na compaction lekt het oorspronkelijke doel weg, en
  verdwijnen randvoorwaarden en "doe X niet"-regels.

Dit zijn aanvullende redenen voor structuur, niet de enige trigger; scheidbaar werk fan je sowieso
parallel uit.

## De zes patronen

1. **Classify-and-act.** Een classifier-agent bepaalt het type werk en routeert naar de juiste
   aanpak, agent of model. Ook bruikbaar aan het eind om de output te bepalen. *Wanneer:* de
   juiste aanpak hangt af van het type input, of het werk moet eerst gesorteerd worden. *Hoe:*
   een lichte classifier-agent, dan de gekozen tak.

2. **Fan-out-and-synthesize.** Knip de fase in veel kleine deelstappen, een agent per stap, dan
   een synthese-stap die alle gestructureerde resultaten samenvoegt. De synthese is een barrier:
   hij wacht op alle fan-out-agents. *Wanneer:* veel onafhankelijke deelstappen, of elke stap is
   gebaat bij een eigen schone context zodat ze elkaar niet besmetten. Het aantal sporen bepaalt de
   teamgrootte, niet of je fan-out doet. *Hoe:* subagents of een Workflow-fan-out, dan een
   synthese-agent.

3. **Adversarial verification.** Voor elke geproduceerde uitkomst draait een aparte agent die hem
   juist probeert te weerleggen tegen een rubric of criterium. *Wanneer:* de uitkomst moet hard
   kloppen (security, correctheid, feitelijke claims). *Hoe:* per finding een refuter-agent, een
   meerderheid beslist.

4. **Generate-and-filter.** Genereer veel kandidaten, filter ze op een rubric of door
   verificatie, ontdubbel, en geef alleen de beste terug. *Wanneer:* veel mogelijke opties of
   ideeen, je wilt de sterkste. *Hoe:* generator-agents parallel, dan een filter-stap.

5. **Tournament.** In plaats van het werk te verdelen, laat agents om het beste resultaat
   strijden. N agents pakken dezelfde taak met een andere aanpak, judge-agents vergelijken
   paarsgewijs tot er een winnaar is. *Wanneer:* smaak- of keuzewerk (ontwerp, naamgeving), of
   sorteren op een kwalitatieve maat. *Hoe:* N pogingen, dan een bracket van paarsgewijze judges.

6. **Loop until done.** Bij werk van onbekende omvang: blijf agents spawnen tot een stopconditie
   (niks nieuws meer, geen errors meer in de logs) in plaats van een vast aantal rondes.
   *Wanneer:* discovery met een open eind (audit, bugs zoeken, edge cases). *Hoe:* een lus die
   spawnt tot K lege rondes, of pair met `/loop` voor doorlopend werk.

Patronen mogen combineren. Een fase kan fan-out gebruiken om sporen te bouwen en daarna
adversarial verification om elk spoor te toetsen.

## Selectie-heuristiek (signaal in de fase, patroon)

| Signaal in de fase-spec of de gebruikersvraag | Patroon |
|---|---|
| Fase valt in twee of meer onafhankelijke sporen (frontend, backend, tests, data, docs) | een specialist per spoor, parallel (fan-out), default |
| De aanpak hangt af van het type input, of werk moet gesorteerd | classify-and-act |
| Uitkomst moet hard kloppen: security, correctheid, claims | adversarial verification |
| Veel kandidaten of ideeen, beste eruit | generate-and-filter |
| Smaak of keuze, beste van meerdere aanpakken | tournament |
| Onbekende omvang, door tot niks nieuws | loop until done |
| Onsplitsbaar deliverable, sporen delen state | solo, sequentieel |

Wijst meer dan een rij naar een patroon, kies de zwaarste die past, of combineer ze.

## Twijfel: leun naar splitsen

Is de aard niet eenduidig, leun dan naar splitsen zodra je twee of meer onafhankelijke sporen kunt
benoemen, en fan parallel uit. Spawn een lichte classifier-agent alleen als zelfs de spoor-grenzen
onduidelijk zijn (dat is classify-and-act toegepast op de keuze zelf): hij bepaalt de spoor-grenzen
en eventueel het patroon, niet of je een team vormt.

## Kosten

Scheidbare sporen defaulten naar de subagent-tier: een specialist per spoor, parallel, zonder extra
credits. De sequentieel-in-run-rung is de fallback bij een atomaire fase of als er geen dispatch-tool
is. Alleen grote swarms via de Workflow-tool dragen een echte credit-zorg. Een zuinig account knipt
de fan-out smaller (minder sporen per batch, geen Workflow-swarm), maar blijft per scheidbare fase
meerdere specialisten parallel draaien. Het patroon kiest de vorm, de dispatch-modus regelt alleen de
breedte van de zware tier.
