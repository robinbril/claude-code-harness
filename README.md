# Claude Code Harness

Een solide harness voor Claude Code. Gebouwd op
[Superpowers](https://github.com/obra/superpowers) van Jesse Vincent (MIT),
uitgebreid met eigen toevoegingen (`supergoal` en `council`) en een `CLAUDE.md`
die gedrag (code-guidelines) en schrijfstijl (humanizer) standaard goed zet. De
methodologie-skills hieronder zijn de kern en bewust klein gehouden; het
frontend-taste-cluster is een los, groter verzamelbakje met overlappende
opties, zie de aparte tabel daarvoor.

## Wat erin zit

**`CLAUDE.md`** is twee lagen, standaard aan:
- **Code-guidelines** (Karpathy-stijl): denk voor je codeert, simpel houden,
  chirurgische changes, doelgericht met verifieerbare success criteria.
- **Humanizer**: alle tekst zonder AI-randje. Geen em-dashes, geen sycophantische
  openers, geen slop-woorden, antwoord-eerst.

**`skills/`** is methodologie (hoe je werkt) plus craft (wat je maakt).

Methodologie, triggert vanzelf zodra je bouwt:

| Skill | Wanneer |
|---|---|
| `brainstorming` | Voor je iets bouwt: scope en spec scherp krijgen |
| `grill` | Een plan of design stuk voor stuk uitvragen tot het scherp is |
| `skill-finder` | Eerst checken of er al een skill bestaat voor je iets bouwt |
| `writing-plans` | Een plan dat een junior zonder context kan volgen |
| `test-driven-development` | Echte red/green TDD |
| `systematic-debugging` | Bug reproduceren, isoleren, fixen, verifiëren |
| `verification-before-completion` | Bewijs draaien voor je "klaar" claimt |
| `supergoal` | Een grote taak autonoom plannen en bouwen, met een onafhankelijke check per fase |
| `council` | Een zware, moeilijk omkeerbare keuze laten uitvechten door meerdere adviseurs |
| `karpathy-guidelines` | De Karpathy-regels tegen veelgemaakte LLM-coding-fouten, als losse skill |
| `using-superpowers` | Orchestrator: zorgt dat de juiste skill automatisch triggert |

Craft, dagelijks bruikbaar, ook zonder code:

| Skill | Wanneer |
|---|---|
| `humanizer` | Elke tekst zonder AI-randje (mail, post, vacaturetekst) |
| `frontend-design` | Een verzorgde, niet-template UI of pagina |
| `designing-beautiful-websites` | UX-strategie, IA, wireframes en visueel design van begin tot eind |
| `design-an-interface` | Meerdere radicaal verschillende interface-opties genereren via parallelle agents |
| `landing-page-design` | Pagina's die converteren (campagne, vacature, lead) |
| `vercel-react-best-practices` | React/Next.js performance-regels van Vercel Engineering |
| `vercel-react-view-transitions` | Vloeiende route- en element-animaties met de View Transition API |
| `office-docs` | PowerPoint, Excel en Word programmatisch maken |

De loop: brainstorm, plan, TDD, debug, verify. `grill` vraagt je plan eerst stuk
voor stuk uit, `skill-finder` checkt of er al een skill voor bestaat. `supergoal`
draait die hele keten autonoom voor een grote taak en laat niks "klaar" zijn tot
een onafhankelijke controleur het bewijst. `council` haalt er meerdere adviseurs
bij voor een zware keuze, en `teacher` leert je een sessie of codebase echt
begrijpen met quizvragen tot je het kunt navertellen. De craft-skills pakken het
zichtbare werk: schrijven, UI en documenten.

### Frontend-taste skills (los cluster, overlappend met opzet)

Naast `frontend-design` en `designing-beautiful-websites` hierboven zit er een
los cluster taste-skills in `skills/` die allemaal varianten zijn op hetzelfde
doel: "maak een niet-generieke, premium frontend-UI". Ze zijn niet
samengevoegd omdat ze uit verschillende bronnen komen en licht andere aannames
maken (stack, agency-stijl, generator-specifiek). Kies er hooguit één per
project; de trigger-omschrijvingen overlappen bewust.

| Skill | Insteek |
|---|---|
| `design-taste-frontend` | Anti-slop v2 (huidige default): audit-first, eigen design-systeem per brief |
| `design-taste-frontend-v1` | Legacy v1 van bovenstaande, alleen voor exacte backward-compatibility |
| `high-end-visual-design` | Vaste agency-regels: fonts, spacing, shadows, card-structuren |
| `gpt-taste` | GSAP-motion-zwaar: AIDA-structuur, bento-grids, scroll-triggers |
| `minimalist-ui` | Stijl-preset: warm monochrome, editorial, geen gradients |
| `industrial-brutalist-ui` | Stijl-preset: Swiss/military terminal-look, rigide grids |
| `redesign-existing-projects` | Specifiek voor het opwaarderen van een bestaand project, niet from-scratch |
| `stitch-design-taste` | Genereert `DESIGN.md` voor Google Stitch, geen directe code |
| `image-to-code` | Codex-specifiek: eerst designbeelden genereren, dan matchend implementeren |
| `imagegen-frontend-web` | Genereert alleen referentiebeelden per sectie, geen code |
| `imagegen-frontend-mobile` | Genereert alleen app-schermconcepten, geen code |
| `brandkit` | Merkidentiteit en brand-guidelines-boards, geen UI-code |
| `full-output-enforcement` | Geen designstijl: dwingt volledige, onafgekapte code-output af |

## Installeren (Claude Code)

Clone de repo:

```bash
git clone https://github.com/robinbril/claude-code-harness.git
cd claude-code-harness
```

**Windows**, in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**macOS / Linux:**

```bash
bash install.sh
```

Het script plaatst de skills in `~/.claude/skills/` en de `CLAUDE.md` in
`~/.claude/`. Het raakt je bestaande skills niet aan en maakt back-ups van wat het
vervangt. Herstart Claude Code daarna.

De skills triggeren vanzelf zodra je begint te bouwen, of typ `/` om er een te
kiezen. Je hoeft niks te onthouden.

> Auto-trigger bij sessiestart loopt via `hooks/hooks.json` (de Superpowers
> SessionStart-hook). Dat is optioneel: ook zonder de hook werken de skills via
> het `/`-menu en de Skill-tool.

## Hooks

De guard-hooks zitten in `hooks/`. Als plugin laden ze vanzelf via
`hooks/hooks.json`. Bij de `install.sh`-route wijs je ze handmatig aan in je
`~/.claude/settings.json` (zie onder). Alle hooks hebben `node` nodig.

- **`humanizer-guard`** scant elke Write/Edit van een prosebestand (`.md`, `.txt`,
  `.html`) en blokkeert harde AI-tells (em-dash, sycophantische openers, slop-woorden)
  voor ze landen. Zachte tells (robuust, leverage, naadloos) komen als waarschuwing.
  Code en inline-code zijn uitgezonderd.
- **`commit-guard`** draait op elke `git commit` en blokkeert wat niet de repo in
  mag: secrets en API-keys, en temp/scratch-bestanden (`.env`, `*.tmp`, `*.bak`,
  `__pycache__`). Emails en em-dashes komen als waarschuwing. Zet eigen patronen (een
  naam, bedrijf, hostname) in `.harness-blocklist` in de repo-root, één regex per regel.

### Betrouwbaarheids-gates

Vier gates die grote, complexe taken eerlijk houden. Ze bewijzen werk in plaats van het te geloven, en staan een "klaar" pas toe als het onderbouwd is.

- **`verified-claim-guard`** (Stop) blokkeert een klaar-claim ("done", "fixed", "deployed") na een muterende beurt tenzij die beurt ook een echte tool-OBSERVATIE bevat (test, curl, render, query, read). Een getypte `VERIFIED:` zonder tool-call telt niet; `UNVERIFIED:` mag altijd als eerlijke afsluiting.
- **`spec-gate`** (Stop) blokkeert substantieel bouwwerk zonder een `.harness/<taak>/spec.md` (eisen + toetsbare acceptatie), met een `SPEC:`/`UNSPEC:`-escape. `scripts/spec-init.js` maakt het dossier goedkoop aan.
- **`env-assert-guard`** (PreToolUse Bash) blokkeert push/deploy/migratie als de branch of host niet matcht met het `env`-blok van de meest recente spec. Alleen bij een concrete waarde; een `<placeholder>` laat door.
- **`stop-render-audit`** (Stop) blokkeert een beurt die markup/CSS wijzigde zonder daarna een render te bekijken. Accepteert een Playwright-render (`scripts/shoot.js` + een `Read` van de PNG) als bewijs, en vraagt om een vooraf uitgeschreven `EXPECT:`/`VERWACHT:`-verwachting.

`scripts/shoot.js` is de bijbehorende render (headless Chromium via Playwright): `node scripts/shoot.js <url|bestand> <out.png> [selector]`.

Na de `install.sh` / `install.ps1`-route staan de hooks in
`~/.claude/claude-code-harness/hooks/`. Merge dan `settings.example.json` in je
`~/.claude/settings.json` om ze aan te zetten. `defaultMode: auto` en
`remoteControlAtStartup` staan er expres niet in: die slaan permissie-prompts
over en zijn een bewuste, losse keuze, geen default om klakkeloos mee te
mergen.

## Statusline (optioneel)

Wil je context-gebruik, actieve tools, agents en todo-voortgang in je
terminal-statusbar, gebruik dan
[claude-hud](https://github.com/jarrodwatts/claude-hud) van Jarrod Watts. Het
draait op Claude Code's eigen statusline-API, geen apart venster of tmux nodig:

```
/plugin install claude-hud
/claude-hud:setup
```

Kleuren en layout pas je aan in `~/.claude/plugins/claude-hud/config.json`.

## Herkomst

De methodologie-basis komt uit Superpowers v5.1.0, MIT-licentie (zie `LICENSE`).
Weggelaten: de dev-zwaardere en multi-step skills (git-worktrees, code-review-flow,
branch-finishing, subagent-driven-development, writing-skills) en de multi-harness
setup (Codex/Cursor/Gemini), om het rustig en Claude-Code-gericht te houden.

`supergoal` en `council` zijn los toegevoegd bovenop Superpowers. `supergoal` plant
en bouwt een taak autonoom met een onafhankelijke evaluator die elke check opnieuw
draait tegen de echte app. `council` laat meerdere adviseurs een zware keuze
uitvechten via blinde peer-review en een synthese. Verder toegevoegd: `grill`,
`teacher`, `skill-finder` en `karpathy-guidelines` (de Karpathy-md tegen
LLM-coding-fouten, MIT), plus twee guard-hooks (humanizer en commit). De
craft-skills en alle toevoegingen zijn generiek, zonder persoonlijke of
bedrijfsspecifieke inhoud.
