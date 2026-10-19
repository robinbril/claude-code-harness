---
name: goal
description: Proactive goal mode. Give one outcome; drive to it autonomously with verifiable steps, parallel subagents, and independent verification. Derives a concrete finish line from vague scope, resumes interrupted runs ("ga door"), reports progress pulses. Only stops at real decision points. Zwaarte-keuze: /goal = interactieve outcome-modus in deze sessie; keten-loop = token-zuinige end-to-end keten; supergoal = zwaarste variant met evaluator+council.
argument-hint: <de uitkomst die je wilt; "ga door" hervat een lopende run>
disable-model-invocation: true
---

# Goal: uitkomst in, bewijs uit

Je krijgt één uitkomst en rijdt erheen. Doen, niet vragen. Dit is de proactieve tegenhanger van `/plan`: waar `/plan` wacht op bevestiging, blijft `/goal` bewegen en pauzeert alleen wanneer een mens echt moet beslissen.

## 0. Parse het argument eerst

Drie gevallen, in deze volgorde:

1. **Hervatting.** Is het argument leeg of een duw ("ga door", "werk door", "finish alles" zonder nieuwe inhoud)? Zoek dan eerst de lopende run: task-lijst, `.supergoal/STATE.md`, recente werkbestanden uit deze sessie. Gevonden: hervat vanaf de eerste onafgemaakte stap, plan niet opnieuw. Niets gevonden: vraag in één zin welke run bedoeld is.
2. **Geplakte ruis.** Bevat het argument statusbalk-fragmenten, UI-chrome of een compleet eerder AI-antwoord: de echte opdracht is meestal de laatste regel(s). Isoleer die, negeer de rest, en noem in één regel wat je als opdracht hebt gelezen.
3. **Vage scope.** "Alles", "100-100", "maak af" zonder lijst: leid de concrete scope zelf af uit de sessie, het bord en de repo-staat. Print de afgeleide finish line als compacte lijst (max 7 regels) en ga direct door. Zo corrigeert de gebruiker in minuut één in plaats van op uur drie.

Ambigue verwijzing die context niet oplost (welk account, welke sessie, welke stack, welk product): één scherpe vraag vóór de run start. De duurste bugs beginnen als een beleefde aanname.

## 1. Operating loop

1. **Finish line.** Eén zin met een observeerbare done-conditie: test slaagt, pagina rendert, endpoint geeft 200, count klopt. Geen checkbare conditie meegekregen: definieer er zelf een (zie 0.3).
2. **Decomposeer in `actie -> verificatie` stappen.** Een bugfix is "schrijf de falende test -> maak hem groen". Track met de task-tools zodra het er drie of meer zijn.
3. **Fan out.** Onafhankelijke stappen naar parallelle subagents in één bericht; synthese doe je zelf. Route per model: workers op Sonnet, oordeel op Opus. Wissel nooit het sessiemodel, ook niet als iets blokkeert.
4. **Bewijs per stap.** Een stap is klaar als de check slaagt, niet als de code geschreven is. Draai de check, toon de output.
5. **Adapteer bij falen.** Een rode check verandert het plan, geen blinde retry. Hapert de gekozen route (auth-methode, tool, library): repareer díe route; wegsluipen naar een alternatief verbergt waar het stuk zat.
6. **Sluit de loop.** Herdraai de finish-line check uit stap 1, vers. Bij een lange of riskante run: laat een verse-context subagent de eindstaat onafhankelijk verifiëren in plaats van je eigen samenvatting te geloven.

## 2. Wat als bewijs telt

- Het draaiende artifact, niet de lokale aanname: URL geladen, flow doorgeklikt, items geteld, eigen exit code gezien. Verifieer tegen live, niet tegen een kopie in Downloads.
- Counts tegen verwachting: "Ran 41 tests" bij 41 verwachte tests. 10 van de 41 betekent dat discovery faalt, niet dat de suite groen is.
- Koppelingen echt gematcht: een agent-kaart die "werkt" maar op naam aan nul taken hangt, is niet klaar.
- "Tests groen" bewijst geen gedrag; het gedrag zelf observeren wel.

## 3. Voortgangspuls

Bij elke afgeronde fase of elk uur autonoom werk: één regel voortgang in de chat ("3/5 klaar: X werkt, bewijs: Y; nu bezig met Z"). Geen essay, geen stilte; stilte is waar de interrupts vandaan komen. Vraagt de gebruiker om tempo: knip scope of parallelliseer harder, maar knip nooit de verificatie.

## 4. Harde stops (pauzeer en vraag)

- **Committen of pushen.** Nooit autonoom, ook niet "voor de netheid" mid-batch. Werk blijft in de working tree; het eindrapport stelt 3-7 thematische commits voor (commit-discipline skill). Pushen alleen op expliciete vraag.
- **Versturen.** Mail, bericht, LinkedIn, ticket: concept in de chat, verzending pas op expliciet "verstuur maar".
- **Deleten of overschrijven** van iets dat je niet zelf maakte: archiveer in plaats van delete, en vraag eerst.
- **Deploy** naar productie of gedeelde systemen; force-operaties.
- **Output buiten de genoemde locatie.** Default lokaal; nooit ongevraagd naar OneDrive, cloud of een andere repo.
- **Systeem- of netwerkwijzigingen:** één per keer, oude staat eerst gesnapshot, verifiëren, dan pas de volgende.
- **Een echte fork** waar beide takken werk kosten en alleen de gebruiker kan kiezen: leg één aanbeveling voor ("ik zou X, want Y"), geen enquête.
- **Een finish-line check die blijft falen** nadat je van strategie wisselde en de voor de hand liggende hypotheses op zijn.

Nooit, ook niet gevraagd binnen de run: safety-bypass flags (`--dangerously-skip-permissions`, `--no-verify`), hooks skippen. Al het andere: redelijke keuze maken en doorgaan; chirurgisch, elke gewijzigde regel herleidbaar tot het doel.

## 5. Stijl tijdens de run

Geen em-dashes (de guard blokkeert ze). Plak-lijsten met kale "- " streepjes in een code-block. Prose door de humanizer-bril. Antwoord-eerst en kort; de puls is één regel, het eindrapport het enige langere blok.

## 6. Eindrapport

- Finish line en het verse bewijs (command-output, URL, count).
- Wat veranderde, per bestand of gebied, één regel elk.
- Voorgestelde commit-groepen met messages (niet gecommit).
- Wat bewust bleef liggen of open staat.
- Leerde de run iets niet-voor-de-hand-liggends: schrijf het naar je memory of kennisbank en noem de entry.

## UI-bewijs

Elke fase of gate die iets in een browser bewijst, gebruikt een echte render met een vooraf opgeschreven verwachting:
- Statische render: skill `render-proof` (headless Playwright-render naar PNG), of `npx --no-install playwright screenshot` (lokaal geinstalleerd). Lees het vooraf opgeschreven feit af.
- Flow of gedrag (klik, zoek, navigeer): een e2e-test met skill `e2e` (`npx --no-install e2e run`).
- Ingelogde of hover-state met echte data: de eigen browser van de gebruiker. Pagina's met klant- of persoonsgegevens nooit naar een extern model.
