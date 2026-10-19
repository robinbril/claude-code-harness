<p align="center"><img src="assets/banner.svg" alt="Dev Harness voor Claude Code: werkregels, skills, bewakers en poort" width="100%"></p>

<p align="center">
<img src="https://img.shields.io/badge/versie-1.10.0-5B50E6" alt="versie 1.10.0">
<img src="https://img.shields.io/badge/skills-50-111827" alt="50 skills">
<img src="https://img.shields.io/badge/bewakers-3-111827" alt="3 bewakers">
<img src="https://img.shields.io/badge/licentie-MIT-2ea44f" alt="licentie MIT">
<a href="https://github.com/robinbril/claude-code-harness/actions/workflows/ci.yml"><img src="https://github.com/robinbril/claude-code-harness/actions/workflows/ci.yml/badge.svg" alt="automatische controle"></a>
</p>

## Het probleem

AI-codeerhulpen zijn snel, maar maken steeds dezelfde vier fouten:

- Ze **gokken** wat je bedoelt en gaan daar zonder te vragen mee door.
- Ze maken het **te ingewikkeld**: extra lagen, opties en code waar niemand om vroeg.
- Ze **veranderen dingen die niet hoefden**, zodat je wijziging moeilijk na te kijken is.
- Ze zeggen **"klaar"** zonder het geprobeerd te hebben.

Dit pakket pakt alle vier aan. Je installeert het in twee minuten, daarna werkt het vanzelf:

| Onderdeel | Wat je ervan merkt |
|---|---|
| **Werkregels** | Claude denkt eerst na, houdt het simpel, raakt alleen aan wat nodig is en zegt pas "klaar" met bewijs |
| **50 skills** | Kant-en-klare werkwijzen voor veelvoorkomende klussen. Claude pakt ze zelf als ze passen, of jij typt `/naam` |
| **3 bewakers** | Houden wachtwoorden uit je code en houden Claude tegen als het "klaar" zegt zonder bewijs |
| **poort** | Een controle in je eigen project, voor je code met anderen deelt |

## Zo werkt het

<img src="assets/zo-werkt-het.svg" alt="Jij vraagt, de werkregels sturen, een skill pakt de klus op, de bewakers controleren, jij krijgt bewijs" width="100%">

## Installeren

**Als plugin** (de makkelijkste route, Claude Code 2.1.275 of nieuwer). Typ in Claude Code:

```
/plugin install dev-harness --marketplace robinbril/claude-code-harness
```

**Of met het installatiescript**, als je de bestanden zelf wilt zien:

```bash
git clone https://github.com/robinbril/claude-code-harness.git
cd claude-code-harness
bash install.sh
```

Op Windows: `powershell -ExecutionPolicy Bypass -File .\install.ps1`. Het script bewaart eerst een kopie van alles wat het vervangt. Herstart Claude Code daarna.

| | Plugin | Script |
|---|---|---|
| Skills | Gaan vanzelf mee | Naar `~/.claude/skills/` |
| Werkregels | Laden bij elke start | Worden je `~/.claude/CLAUDE.md` |
| Bewakers | Staan meteen aan | Voeg `settings.example.json` toe aan je `~/.claude/settings.json` |

## Uitgelicht: `/rea`

**Uitzoeken hoe iets gebouwd is.** Geef `/rea` een website, een app of een programma, en Claude zoekt met [REA](https://github.com/morluto/rea) van morluto (MIT) uit hoe het werkt. Je krijgt bevindingen met bewijs en een bouwplan om het na te maken, geen gokwerk.

<img src="assets/rea.svg" alt="Doel, inventaris, bewijs, blauwdruk" width="100%">

| Je typt | Je krijgt |
|---|---|
| `/rea https://voorbeeld.nl` | Alle pagina's, kleuren, lettertypes, plaatjes, gedrag op telefoon en desktop, en wat formulieren doen. Plus wat onbekend blijft |
| `/rea ./MijnApp.app` | Hoe de app is opgebouwd, en wat er tussen twee versies veranderde |
| `/rea firmware.bin` of een Android-app | Wat er in het programma zit en wat het aanroept |

- **Werkt meteen.** Alleen Node.js nodig; REA wordt per keer opgehaald, er hoeft niets vast geïnstalleerd te worden.
- **Netjes.** Verstuurt nooit formulieren of berichten om iets uit te proberen. Gezien, afgeleid en onbekend blijven gescheiden.
- **Sneller.** Zet REA aan als vast gereedschap, zie [Extra gereedschap](#extra-gereedschap-mcp-servers).

## Werkregels

Staan in `guidelines/CLAUDE.md` en gelden in elk gesprek:

1. **Eerst nadenken.** Aannames hardop zeggen; bij twijfel vragen.
2. **Simpel.** Zo min mogelijk code die het probleem oplost.
3. **Precies.** Alleen aanraken wat de klus vraagt.
4. **Doelgericht.** Elke taak wordt een doel dat je kunt controleren.
5. **Bewijzen.** Pas "klaar" met de echte uitkomst (`VERIFIED:`), anders eerlijk `UNVERIFIED:`.
6. **Opzoeken.** Namen, bestanden en gewoontes eerst lezen, niet gokken.
7. **Ordelijk.** Bestanden van 200 tot 400 regels, nooit boven de 800.
8. **Het juiste model.** Opus beslist, Sonnet bouwt, Haiku zoekt.
9. **Voorzichtig.** Eerst zeggen wat er mis kan gaan (`BLAST RADIUS`); nooit zelf iets vastleggen of versturen.
10. **Samenvatten.** Wat bewaard blijft als een gesprek te lang wordt.

## Hoe je merkt dat het werkt

- Claude stelt eerst een vraag in plaats van te gokken.
- Wijzigingen zijn kleiner en raken alleen wat je vroeg.
- Elk "klaar" komt met een `VERIFIED:`-regel die zegt wat er echt gedraaid is.
- Een commit met een wachtwoord erin wordt tegengehouden voor hij in git staat.

**De afweging:** de regels maken Claude voorzichtiger dan snel. Bij een kleine klus, zoals een typfout, mag Claude zelf oordelen. Bij werk dat blijft staan, wint zorgvuldigheid.

## Skills

Een skill is een vaste werkwijze voor een soort klus. Claude kiest er zelf een als je vraag erbij past. Je kunt er ook een starten met `/naam`; via de plugin heet dat `/dev-harness:naam`.

### Nadenken en beslissen

| Skill | Waarvoor |
|---|---|
| `rea` | Uitzoeken hoe een website, app of programma in elkaar zit, met bewijs |
| `skill-finder` | Kijken of er al een skill is, voor je zelf iets bouwt |
| `systematic-debugging` | Een fout stap voor stap oplossen: nadoen, insluiten, repareren, controleren |
| `council` | Een lastige keuze voorleggen aan meerdere adviseurs die elkaar ook beoordelen |
| `batch-grill-me` | Een plan laten doorvragen tot elke keuze gemaakt is, alle vragen per ronde tegelijk |
| `projectstructuur` | Mappen en bestanden van een project logisch indelen en zo houden |

### Controleren en opleveren

| Skill | Waarvoor |
|---|---|
| `find-bugs` | Fouten en beveiligingslekken zoeken in wat je veranderd hebt |
| `code-audit` | Een volledige codecontrole. Vraagt het gratis hulpprogramma `ocr`: `npm install -g @alibaba-group/open-code-review` |
| `commit-discipline` | Je werk in een paar logische stappen opslaan, niet in tientallen kleine |
| `repo-hygiene` | Gezondheidscheck van je project zonder iets te veranderen: oude takken, conflicten, open verzoeken, mislukte controles |
| `render-proof` | Een pagina als afbeelding laten maken en nakijken of hij er echt goed uitziet |

### Zelfstandig doorwerken

<img src="assets/loops.svg" alt="Verkennen, plannen, bouwen, verbeteren, repareren, eindcontrole" width="100%">

`keten-loop` doet alle stappen achter elkaar. Elke stap werkt ook los.

| Skill | Waarvoor |
|---|---|
| `/goal` | Geef een einddoel; Claude werkt er zelf naartoe en laat per stap bewijs zien |
| `supergoal` | Grote klussen in fasen, met een onafhankelijke controle na elke fase |
| `keten-loop` | Van begin tot eind: verkennen, plannen, bouwen, verbeteren, repareren, eindcontrole |
| `bouw-loop` | Een lijst taken een voor een afwerken |
| `polijst-loop` | Iets bestaands steeds beter maken, tot het niet beter meer wordt |
| `fix-loop` | Een mislukte test laten slagen zonder de test aan te passen |
| `speur-loop` | Fouten zoeken in rondes, tot er niets nieuws meer opduikt |
| `waak-loop` | Wachten tot iets klaar is (een controle, een website, een domeinwijziging) en dan verder |
| `createloopprompt` | Een klus omzetten in een opdracht met duidelijke grenzen, voor Claude Code, Codex of Cursor |

### Mooie schermen bouwen

| Skill | Waarvoor |
|---|---|
| `design-taste-frontend` | Een nieuw ontwerp met een eigen gezicht, niet het standaard AI-uiterlijk |
| `redesign-existing-projects` | Een bestaand ontwerp opknappen zonder dat er iets stukgaat |
| `emil-design-eng` | De kleine details die een scherm af laten voelen |
| `make-interfaces-feel-better` | Schaduwen, letters en kleine reacties op klikken die het verschil maken |
| `ux-heuristics` | Nakijken of een scherm makkelijk te gebruiken is, met bekende vuistregels |
| `frontend-gotchas` | Veelgemaakte fouten in schermen voorkomen |
| `fixing-accessibility` | Schermen bruikbaar maken voor iedereen: toetsenbord, voorleessoftware, contrast |
| `transitions-dev` | Kant-en-klare overgangen voor menu's, pop-ups, meldingen en tabbladen |

### Animatie en beweging, van Emil Kowalski

| Skill | Waarvoor |
|---|---|
| `animate` | Een animatie vanaf nul: moet hij er zijn, waarvoor, hoe snel, hoe vloeiend |
| `animate-expo` | Hetzelfde voor telefoon-apps in React Native en Expo |
| `animation-vocabulary` | Een vage beschrijving van beweging omzetten in het juiste vakwoord |
| `apple-design` | Vloeiende, natuurlijke beweging zoals bij Apple, vertaald naar het web |
| `ask-sonner` | Meldingen in beeld met de React-bibliotheek Sonner |
| `find-animation-opportunities` | Plekken vinden waar beweging helpt, en zeggen waar niet |
| `improve-animations` | Alle animaties nalopen en een verbeterlijst maken |
| `review-animations` | Animaties streng beoordelen |
| `mobile-native` | Een website op een telefoon laten voelen als een echte app |
| `pick-ui-library` | De juiste bouwstenen-bibliotheek kiezen voor een klus (alleen als je erom vraagt) |
| `prototype` | Een paar echt verschillende versies naast elkaar bouwen en de beste kiezen (alleen als je erom vraagt) |

### Testen alsof je een gebruiker bent

| Skill | Waarvoor |
|---|---|
| `e2e` | Tests die je app gebruiken zoals een mens: klikken, typen, nakijken. Met [e2e](https://github.com/tester-army/e2e) |
| `e2e-rules` | Wanneer zo'n test nodig is, hoe hij heet en wanneer hij af is |

### Documenten en beeld

| Skill | Waarvoor |
|---|---|
| `office-docs` | PowerPoint, Excel en Word laten maken |
| `brandkit` | Een merk vastleggen: kleuren, letters, toon |
| `data-visualization` | De juiste grafiek kiezen bij je cijfers |
| `diagram-design` | Schema's en stroomdiagrammen tekenen |
| `readme-design` | Een README die in tien seconden uitlegt wat iets is, met eigen afbeeldingen voor licht en donker. Deze pagina is ermee gemaakt |

### PolpoHire en The Staffing Society

| Skill | Waarvoor |
|---|---|
| `polpohire-design` | Een PolpoHire-scherm bouwen in de huidige huisstijl |
| `bi-dashboards` | Rapporten en dashboards zoals in Power BI, maar in een eigen Vue-app |
| `theme-selector` | De themakiezer van PolpoHire en TSS nabouwen: kleuren, letters, dichtheid |
| `pre-pr-gates` | Vaste controles voor je werk deelt: verkeerde versies, verzwegen databasefouten, ontbrekende tests, verouderde beschrijving |

## Wat je het vaakst typt

Via de plugin zet je `dev-harness:` ervoor, dus `/dev-harness:rea` in plaats van `/rea`.

| Typ | Wat er gebeurt |
|---|---|
| `/rea <doel>` | Uitzoeken hoe een website, app of programma werkt, met bewijs en een bouwplan |
| `/goal <uitkomst>` | Claude werkt zelf naar je doel toe; `ga door` gaat verder waar het was |
| `/supergoal` | Hetzelfde voor grote klussen, met een controle per fase |
| `/keten-loop` | Alles van verkennen tot eindcontrole, zuinig met rekenkracht |
| `/batch-grill-me` | Doorvragen tot elke keuze in je plan gemaakt is |
| `/council` | Meerdere adviseurs, die elkaar blind beoordelen, en een eindoordeel |
| `/find-bugs` | Fouten en lekken in wat je veranderd hebt |
| `/code-audit` | Volledige codecontrole van het hele project |
| `/repo-hygiene` | Gezondheid van je project, zonder iets te veranderen |
| `/pre-pr-gates` | De vaste controles, voor je je werk deelt |

## Bewakers

Kleine scripts die op vaste momenten meekijken (in Claude Code heten ze *hooks*). Ze hebben Node.js nodig.

| Bewaker | Wanneer | Wat |
|---|---|---|
| `guidelines` | Bij het opstarten | Laadt de werkregels (alleen bij de plugin) |
| `commit-guard` | Als Claude iets opslaat in git | Houdt wachtwoorden, sleutels en tijdelijke bestanden tegen; waarschuwt bij e-mailadressen. Eigen woorden blokkeren kan in `.harness-blocklist` |
| `verified-claim-guard` | Als Claude zegt dat het klaar is | Houdt "klaar" tegen als er niets gecontroleerd is. Eerlijk `UNVERIFIED:` mag altijd |

Twee instellingen die toestemmingsvragen overslaan (`defaultMode: auto` en `remoteControlAtStartup`) staan er bewust niet in. Die zet je zelf aan als je dat wilt.

## Extra gereedschap (MCP-servers)

MCP-servers geven Claude extra gereedschap, zoals een eigen browser. Ze zitten niet in de plugin: je kiest zelf welke je aanzet. Kopieer [`.mcp.example.json`](.mcp.example.json) naar `.mcp.json` in je project, of voeg ze een voor een toe:

| Gereedschap | Waarvoor | Aanzetten |
|---|---|---|
| `chrome-devtools` | Een pagina doorlichten: fouten, netwerk, snelheid | `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@1.11.0 --isolated` |
| `playwright` | Een browser besturen om iets door te klikken | `claude mcp add playwright -- npx -y @playwright/mcp@0.0.83` |
| `e2e` | Je app live gebruiken en er tests van maken | `claude mcp add e2e -- npx -y e2e@0.21.2 mcp` |
| `terminal` | Programma's bedienen die om invoer vragen | `claude mcp add terminal -- npx -y mcp-interactive-terminal@1.0.9` |
| `rea` | Uitzoekwerk van `/rea` als vast gereedschap | `claude mcp add rea -- npx -y rea-agents@6.4.0 --mcp` |
| `supabase` | Je Supabase-database, opslag en documentatie | `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=JOUW_PROJECT_REF&features=database,storage,docs"` |

De versies staan vast, zodat er niets ongemerkt verandert. Los hiervan: Claude in Chrome werkt in je eigen ingelogde browser, en koppelingen met Gmail of Outlook zet je aan in je claude.ai-account.

## poort

`tools/poort/` is een kwaliteitscontrole voor je eigen projecten, zonder extra installaties (versie 0.4.0):

<img src="assets/poort.svg" alt="Bij elke commit, bij elke push, bij een PR, op GitHub" width="100%">

Zet hem in een project met `node <pad-naar-deze-map>/tools/poort/poort.mjs init`. Daarna:

| Typ | Wat er gebeurt |
|---|---|
| `node .poort/poort.mjs doctor` | Laat zien wat er nog ontbreekt |
| `node .poort/poort.mjs run push` | Alle controles; wat niet veranderde wordt overgeslagen |
| `node .poort/poort.mjs verify` | Controleert na je commit of elke controle al bewijs heeft voor precies die versie; `run push` maakt dat bewijs |
| `node .poort/poort.mjs e2e --record` | Neemt de klikproeven opnieuw op na een bewuste schermwijziging |

poort laat de klikproeven via je eigen Claude-abonnement lopen, zonder aparte sleutels. Uitleg per controle: [`tools/poort/README.md`](tools/poort/README.md).

## Onderhoud

Overnemen, bijhouden en opruimen, per onderwerp: [`ONDERHOUD.md`](ONDERHOUD.md).

Bij elke wijziging controleert GitHub automatisch of alles klopt: elke skill staat in deze pagina en in `ONDERHOUD.md`, versies en bewakers kloppen, er staan geen persoonlijke paden in, de scripts zijn foutloos en de tests van poort en `repo-hygiene` slagen.

## Statusbalk (optioneel)

Zie onderaan Claude Code hoe vol het gesprek zit en waar Claude mee bezig is, met [claude-hud](https://github.com/jarrodwatts/claude-hud) van Jarrod Watts:

```
/plugin install claude-hud
/claude-hud:setup
```

## Herkomst en licenties

| Onderdeel | Bron | Licentie |
|---|---|---|
| Basis van de werkwijze | [Superpowers](https://github.com/obra/superpowers) v5.1.0 van Jesse Vincent | MIT (zie `LICENSE`) |
| `find-bugs` | [getsentry/skills](https://github.com/getsentry/skills) | Apache-2.0 |
| `make-interfaces-feel-better` | [jakubkrehel](https://github.com/jakubkrehel/make-interfaces-feel-better) | MIT |
| `e2e` | [tester-army/e2e](https://github.com/tester-army/e2e) | Apache-2.0, met NOTICE |
| `fixing-accessibility` | [ibelick/ui-skills](https://github.com/ibelick/ui-skills) | MIT |
| `transitions-dev` | [Jakubantalik/transitions-dev](https://github.com/Jakubantalik/transitions-dev) | MIT |
| `emil-design-eng` en de animatieskills | Emil Kowalski | MIT |
| `batch-grill-me` | gebaseerd op grilling uit [mattpocock/skills](https://github.com/mattpocock/skills) | MIT |
| `code-audit` | gebaseerd op open-code-review-delegate uit [alibaba/open-code-review](https://github.com/alibaba/open-code-review), aangepast (zie `NOTICE`) | Apache-2.0 |
| `rea` | eigen skill rond [morluto/rea](https://github.com/morluto/rea) 6.4.0, met de originele instructies in `references/upstream/` | MIT |
| `readme-design` | eigen skill; de opbouw (probleem, hoe je merkt dat het werkt, afweging) volgt [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) | MIT |
| `tools/poort/` | Reforge Recruitment | Niet MIT: alle rechten voorbehouden. Inzien mag, hergebruik alleen met toestemming |

Overgenomen skills hebben hun licentie in hun eigen map. De meeste skills zijn algemeen bruikbaar; `polpohire-design`, `bi-dashboards`, `theme-selector` en `pre-pr-gates` zijn gemaakt voor PolpoHire en The Staffing Society.
