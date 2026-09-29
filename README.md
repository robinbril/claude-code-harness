# Claude Code Harness

Een compacte harness voor Claude Code. Gebouwd op
[Superpowers](https://github.com/obra/superpowers) van Jesse Vincent (MIT),
uitgebreid met `supergoal` en `council`, een set frontend-design skills en een
`CLAUDE.md` met code-guidelines. Alleen skills die echt gebruikt worden zitten
erin.

## Wat erin zit

**`CLAUDE.md`**: Karpathy-stijl code-guidelines, standaard aan. Denk voor je
codeert, simpel houden, chirurgische changes, doelgericht met verifieerbare
success criteria.

**`skills/`**, methodologie:

| Skill | Wanneer |
|---|---|
| `skill-finder` | Eerst checken of er al een skill bestaat voor je iets bouwt |
| `systematic-debugging` | Bug reproduceren, isoleren, fixen, verifiëren |
| `supergoal` | Een grote taak autonoom plannen en bouwen, met een onafhankelijke check per fase |
| `council` | Een zware, moeilijk omkeerbare keuze laten uitvechten door meerdere adviseurs |
| `office-docs` | PowerPoint, Excel en Word programmatisch maken |
| `brandkit` | Merkidentiteit en brand-guidelines-boards, geen UI-code |

### Frontend-design skills

Bouwen en beoordelen van UI. Kern:

| Skill | Insteek |
|---|---|
| `design-taste-frontend` | Anti-slop v2 (default): audit-first, eigen design-systeem per brief |
| `redesign-existing-projects` | Een bestaand project opwaarderen zonder functionaliteit te breken |
| `frontend-design` | Een verzorgde, niet-template UI of pagina |
| `designing-beautiful-websites` | UX-strategie, IA, wireframes en visueel design van begin tot eind |
| `landing-page-design` | Pagina's die converteren (campagne, vacature, lead) |
| `emil-design-eng` | UI-polish, animatiekeuzes en de onzichtbare details |
| `ux-heuristics` | Usability-audit: Nielsen, Krug, cognitive walkthrough |
| `frontend-gotchas` | Terugkerende frontend-valkuilen voor je ze inbouwt |
| `data-visualization` | Grafiektype kiezen uit de data-relatie voor je een chart bouwt |
| `diagram-design` | Architectuur-, flow- en andere diagrammen als HTML/SVG |

Stijl-varianten (kies hooguit een per project, de triggers overlappen bewust):
`design-taste-frontend-v1`, `high-end-visual-design`, `gpt-taste`,
`minimalist-ui`, `industrial-brutalist-ui`, `stitch-design-taste`,
`image-to-code`, `imagegen-frontend-web`, `imagegen-frontend-mobile`.

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

## Hooks

Twee hooks in `hooks/`. Als plugin laden ze vanzelf via `hooks/hooks.json`. Bij de
`install.sh`-route merge je `settings.example.json` in je `~/.claude/settings.json`.
Beide hebben `node` nodig.

- **`commit-guard`** draait op elke `git commit` en blokkeert wat niet de repo in
  mag: secrets en API-keys, en temp/scratch-bestanden (`.env`, `*.tmp`, `*.bak`,
  `__pycache__`). Emails en em-dashes komen als waarschuwing. Zet eigen patronen (een
  naam, bedrijf, hostname) in `.harness-blocklist` in de repo-root, één regex per regel.
- **`verified-claim-guard`** (Stop) blokkeert een klaar-claim ("done", "fixed",
  "deployed") na een muterende beurt tenzij die beurt ook een echte tool-observatie
  bevat (test, curl, render, query, read). Een getypte `VERIFIED:` zonder tool-call
  telt niet; `UNVERIFIED:` mag altijd als eerlijke afsluiting.

`scripts/shoot.js` rendert een pagina headless (Playwright) voor visuele
verificatie: `node scripts/shoot.js <url|bestand> <out.png> [selector]`.

`defaultMode: auto` en `remoteControlAtStartup` staan er expres niet in
`settings.example.json`: die slaan permissie-prompts over en zijn een bewuste,
losse keuze.

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
uitvechten via blinde peer-review en een synthese. Alle skills zijn generiek, zonder
persoonlijke of bedrijfsspecifieke inhoud.
