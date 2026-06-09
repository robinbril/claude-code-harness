# Council direction gate (per fase, alleen na een evaluator-ACCEPT)

Bij dispatch wordt dit bestand gekopieerd naar `.supergoal/council-gate.md`. De generator
draait deze pass op elke fasegrens, maar **alleen nadat de onafhankelijke evaluator de fase op
correctheid heeft goedgekeurd** (`SUPERGOAL_EVAL_VERDICT ... ACCEPT`). Op een REJECT draait de
council niet.

De council bewaakt **richting**, niet correctheid. De evaluator bewijst dat de fase doet wat de
spec zegt (klopt het, werkt het). De council kijkt naar iets anders: stuurt het resultaat de
juiste kant op, of moet de gebruiker de richting bijsturen. De council oordeelt nooit of de code
werkt en kan een ACCEPT niet terugdraaien.

## Input (anti-anchoring)

De council-pass krijgt: de fase-spec (`phase-N.md`), het evaluator-verdict, en een compacte diff
plus de empirische observaties (`repo-state.sh added-lines` tegen de baseline). **Niet** het hele
gesprek, zodat de luidste framing uit de chat de richtingsbeoordeling niet kleurt.

## De triage: AUTO-APPROVE of ESCALATE

Dit is een lichte triage-pass, een enkele go/escaleer-beslissing, geen volledige council-convocatie.
Stel een vraag: legt deze fase een richting vast die de gebruiker zou willen bevestigen of bijsturen?

**Escaleer ALLEEN als alle drie tegelijk waar zijn:**

1. **Moeilijk omkeerbaar** (one-way-door): stack, datamodel, architectuur, een vendor-binding, een
   publieke API-vorm. Duur of onmogelijk om later terug te draaien.
2. **Meerdere geloofwaardige paden**: er is geen duidelijke winnaar.
3. **Buiten de bevestigde scope**: de gebruiker heeft deze keuze niet al in Stage 1 (intake) of
   Stage 6 (plan review) expliciet vastgelegd.

Mist er een, dan **AUTO-APPROVE** en door, zonder de gebruiker te storen. Twijfel of de code werkt
is nooit een council-zaak; dat is de evaluator. In een gezonde run is het overgrote deel van de
fasen AUTO-APPROVE en ziet de gebruiker niets.

### AUTO-APPROVE

Print `SUPERGOAL_COUNCIL_VERDICT phase=<N>` met `decision=AUTO-APPROVE` en een eenregelige reden.
Ga door naar memory writeback en de volgende fase.

### ESCALATE

Pas hier convoceer je de **volledige council-skill** (`council`): onafhankelijke adviseurs met
eigen methodes, parallel, blinde peer-review, een chairman-verdict met de sterkste tegenstem
zichtbaar. Die levert de aanbeveling, de alternatieven en de bronnen. Right-size zoals de
council-skill voorschrijft: voor een goedkoop-omkeerbare keuze convoceer je niet.

Print `SUPERGOAL_COUNCIL_ESCALATE phase=<N>` met:

- de richtingsvraag in een zin ("Fase N legde X vast; dit stuurt de volgende fasen"),
- **Aanbeveling A**: de council-aanbeveling, eerst, met een halve regel waarom (de chairman-synthese),
- **Alternatieven B en C**: elk een halve regel met de belangrijkste trade-off,
- **Bronnen**: 1-3 links of `file:line`-verwijzingen waarop de keuze rust, vers opgehaald.

Presenteer via `AskUserQuestion` (header bijvoorbeeld "Council: richting fase N"), opties in deze
volgorde: **"go" (volg de council, optie A)**, **"B"**, **"C"**.

## De antwoorden

- **go**: volg de council, optie A. Geen spec-wijziging. De loop hervat, de volgende fase start.
- **B of C**: stuur bij. Herschrijf de geraakte **toekomstige** fase-specs in-place naar het
  gekozen pad, **en werk de overeenkomstige fase-blokken in `ROADMAP.md` mee bij** (anders toetst
  de final audit straks tegen het verlaten pad en draait hij eindeloos "fixen"). Herdraai
  `validate-phase.sh` op de gewijzigde specs. Log de afwijking onder `STATE.md` -> `Council
  decisions`. Hervat dan.

De net-geaccepteerde fase N blijft staan zoals de evaluator hem bewees; bijsturen verandert het
plan **vooruit**, niet het al-bewezen werk. Elke daardoor gewijzigde latere fase wordt op zijn
beurt opnieuw door de evaluator bewezen, dus de moat blijft intact.

## Default bij geen live input (niet babysitten)

Een autonome `/goal` run mag niet eindeloos stilstaan op een onbeantwoorde escalatie. Is er geen
levende gebruiker die binnen de natuurlijke flow van de run `go/B/C` geeft, **volg dan automatisch
de council-aanbeveling A**, log het onder `STATE.md` -> `Council decisions` als
`fase <N>: auto-A (geen live input), council raadde A aan`, en ga door. De escalatie staat in het
transcript, dus een meekijkende gebruiker kan op de volgende fasegrens alsnog bijsturen. Zo blijft
"ik wil dit niet babysitten" waar, terwijl de stuurmomenten die de gebruiker vroeg er wel zijn.

## Grens

De council draait alleen na een evaluator-ACCEPT, oordeelt nooit over correctheid, kan een ACCEPT
niet overrulen en heropent een geaccepteerde fase niet. Meer richtingsbewaking koopt geen
vertrouwen vooraf; de evaluator herdraait alles onafhankelijk. Evaluator = klopt het. Council =
welke kant op.
