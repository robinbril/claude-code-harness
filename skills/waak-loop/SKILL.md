---
name: waak-loop
description: >-
  Babysit-loop voor externe state die de harness niet zelf trackt: een CI-run, deploy, DNS-propagatie, URL-health, mailbox of kanban-kolom. Pollt cache-bewust via ScheduleWakeup, voert bij verandering een vooraf afgesproken actie uit en stopt bij het eindcriterium. Gebruik bij "hou de deploy in de gaten", "wacht tot de CI groen is en ga dan door", "check elk kwartier of X", "/waak-loop", of elke wacht-op-extern situatie. Verbrandt per wake precies een check, geen context. Waak-loop = wachten op een EINDCRITERIUM met automatische stop en actie-bij-verandering; herhaling zonder eindcriterium is /loop.
argument-hint: <wat bewaken + wat te doen bij verandering>
---

# Watchloop

Jij bewaakt externe state en handelt bij verandering. Opdracht: $ARGUMENTS

## Hervat-check (eerst)

Bestaat `.loops/waak/state.md` met `Status: IN_PROGRESS`? Dan liep er al een wacht die de sessie niet overleefde (de wake-keten is weg bij een herstart). Lees het contract en de laatste stand, doe direct een check, en plan van daaruit de volgende wake. Herbouw het contract niet. Anders: verse run, ga naar Stap 0.

## Stap 0: contract (eenmalig, voor de eerste slaap)

Leg vier dingen vast in `.loops/waak/state.md`:

1. **De check**: een zo goedkoop mogelijke enkele call (gh run view, curl -s, een MCP-tool, een grep op een logfile). Geen browser, geen screenshots als een API-call bestaat.
2. **De trigger**: welke waarde-verandering telt (status != in_progress, HTTP 200, record zichtbaar).
3. **De actie**: wat er bij de trigger gebeurt. Omkeerbaar en vooraf door de gebruiker benoemd: direct uitvoeren. Onomkeerbaar (deploy, send, delete) en niet expliciet vooraf geautoriseerd: rapporteren en wachten.
4. **Het einde**: wanneer de loop klaar is (trigger afgehandeld, deadline, of max aantal wakes, default 20).

Ontbreekt een van de vier in de opdracht, vul het minst riskante in en meld je aanname in een regel.

## State-file vorm

```
Status: IN_PROGRESS
Check: <exact command/tool>
Trigger: <welke verandering>
Actie: <wat, + omkeerbaar/geautoriseerd?>
Einde: <trigger | deadline | max wakes> | wakes gedaan: <n>

## Log
- <ts>: <waarde> -> <geen verandering | trigger>
```

## De wake-cyclus

Per wake:

1. Voer de check uit (een call). Log een regel (timestamp, waarde) in de state-file en hoog de wake-teller op.
2. Geen verandering: plan de volgende wake.
3. Trigger: voer de actie uit, verifieer het resultaat met een echte tool-call, rapporteer antwoord-eerst, zet `Status: DONE`, en stop (of loop door als de opdracht doorlopend is).
4. Check faalt zelf (tool-error): een retry direct; faalt die ook, meld het en plan een langere wake in plaats van blind doorpollen. Faalt de actie (niet de check): retry de actie eenmaal, dan rapporteren en wachten, niet stil doorslapen.

## Pacing (cache-bewust, denk in cache-windows)

Kies de ScheduleWakeup-delay op wat je bewaakt, nooit op een rond getal:

- Snel-veranderend (CI-run van ~10 min, deploy): **270s**, blijft binnen de prompt-cache-TTL.
- Traag (DNS, mailbox, dagelijkse job): **1200-1800s**.
- Nooit 300s (cache-miss zonder de wachttijd te benutten). Geef in de `prompt`-parameter dezelfde /waak-loop-opdracht verbatim terug en zet in `reason` concreet wat je bewaakt.
- Trage propagatie die de horizon dreigt te overschrijden (DNS die uren kan duren): verleng adaptief. Zit je op de helft van de max-wakes zonder verandering en is de bron traag, verdubbel de delay i.p.v. de wakes opmaken.
- Geen ScheduleWakeup beschikbaar: val terug op een korte `sleep` binnen de turn voor snelle checks, of meld dat doorlopend bewaken hier niet kan en geef de handmatige check-regel mee.

## Guardrails

- Een check per wake; geen "nu ik toch wakker ben"-extra werk.
- De state-file is het geheugen; de conversatie niet.
- Max-wakes bereikt zonder trigger: stop met een eerlijke laatste stand, niet stilletjes doorslapen.
- Elke eindstop (trigger afgehandeld, deadline, max-wakes): zet eerst `Status: DONE` in de state-file, zodat een volgende aanroep niet hervat op een afgeronde run.

## UI-bewijs

Elke fase of gate die iets in een browser bewijst, gebruikt een echte render met een vooraf opgeschreven verwachting:
- Statische render: `node scripts/shoot.js <url|bestand> <out.png> [selector]` uit deze harness, of `npx --no-install playwright screenshot` (lokaal geinstalleerd). Lees het vooraf opgeschreven feit af.
- Flow of gedrag (klik, zoek, navigeer): een e2e-test met skill `e2e` (`npx --no-install e2e run`).
- Ingelogde of hover-state met echte data: de eigen browser van de gebruiker. Pagina's met klant- of persoonsgegevens nooit naar een extern model.
