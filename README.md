# Claude Code Harness

Een solide, niet-overweldigende harness voor Claude Code. Gebouwd op
[Superpowers](https://github.com/obra/superpowers) van Jesse Vincent (MIT),
getrimd tot de skills die het meeste opleveren, met twee eigen toevoegingen
(`supergoal` en `council`) en een `CLAUDE.md` die gedrag (code-guidelines) en
schrijfstijl (humanizer) standaard goed zet.

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
| `writing-plans` | Een plan dat een junior zonder context kan volgen |
| `test-driven-development` | Echte red/green TDD |
| `systematic-debugging` | Bug reproduceren, isoleren, fixen, verifiëren |
| `verification-before-completion` | Bewijs draaien voor je "klaar" claimt |
| `supergoal` | Een grote taak autonoom plannen en bouwen, met een onafhankelijke check per fase |
| `council` | Een zware, moeilijk omkeerbare keuze laten uitvechten door meerdere adviseurs |
| `using-superpowers` | Orchestrator: zorgt dat de juiste skill automatisch triggert |

Craft, dagelijks bruikbaar, ook zonder code:

| Skill | Wanneer |
|---|---|
| `humanizer` | Elke tekst zonder AI-randje (mail, post, vacaturetekst) |
| `frontend-design` | Een verzorgde, niet-template UI of pagina |
| `landing-page-design` | Pagina's die converteren (campagne, vacature, lead) |
| `office-docs` | PowerPoint, Excel en Word programmatisch maken |

De loop: brainstorm, plan, TDD, debug, verify. `supergoal` draait die hele keten
autonoom voor een grote taak en laat niks "klaar" zijn tot een onafhankelijke
controleur het bewijst. `council` haalt er meerdere adviseurs bij voor een zware
keuze. De craft-skills pakken het zichtbare werk: schrijven, UI en documenten.

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

## Herkomst

De methodologie-basis komt uit Superpowers v5.1.0, MIT-licentie (zie `LICENSE`).
Weggelaten: de dev-zwaardere en multi-step skills (git-worktrees, code-review-flow,
branch-finishing, subagent-driven-development, writing-skills) en de multi-harness
setup (Codex/Cursor/Gemini), om het rustig en Claude-Code-gericht te houden.

`supergoal` en `council` zijn los toegevoegd bovenop Superpowers. `supergoal` plant
en bouwt een taak autonoom met een onafhankelijke evaluator die elke check opnieuw
draait tegen de echte app. `council` laat meerdere adviseurs een zware keuze
uitvechten via blinde peer-review en een synthese. De craft-skills (humanizer,
frontend-design, landing-page-design, office-docs) en beide toevoegingen zijn
generiek, zonder persoonlijke of bedrijfsspecifieke inhoud.
