---
name: commit-discipline
description: >-
  Voorkomt commit-spam: nooit autonoom committen tijdens werkbatches, werk verzamelen in de working tree, en op signaal van de gebruiker indelen in 3-7 thematische commits. Bevat het hergroepeer-recept voor als er toch te veel lokale commits staan. Gebruik bij elke commit-beslissing, bij "commit dit", "maak er commits van", "squash dit", en aan het eind van elke autonome werkbatch in een git-repo.
---

# Commit-discipline

Reviewers kunnen geen 20+ commits tegelijk beoordelen. Een dag werk wordt
ingedeeld in een handvol thematische commits, en dat gebeurt pas op
signaal van de gebruiker. Dit geldt in elke repo; in gedeelde repos met andere
ontwikkelaars is het hard verboden om er vanaf te wijken.

De andere kant van dezelfde discipline: verzamelen betekent niet blind
doorwerken. In de Boomgaard&Munnik-sessie stonden 195 Edit-calls (5494
regels) in de working tree zonder één tussentijdse verificatie of
`git status`; één slechte edit was toen niet meer te isoleren geweest.
Verzamel in de working tree, maar verifieer per werkblok en check de
tree-status voor je verder bouwt. Detail en het waarom: [[commit-discipline]].

Aanpalend: de PreToolUse-hook `~/.claude/hooks/commit-guard.js` bewaakt de
inhoud van elke commit (secrets, scratch-files, blocklist). Deze skill
bewaakt timing en granulariteit; de hook vangt wat er nooit in mag. Ze
vervangen elkaar niet.

## De drie regels

1. **Nooit autonoom committen.** Ook niet tijdens /goal-batches of lange
   autonome runs. Werk blijft in de working tree staan. Aan het eind van de
   batch: verifieer het werk en som in het eindbericht de voorgestelde
   commit-groepen op met messages. Committen gebeurt pas na expliciet
   signaal ("commit", "commit alles", "maak er commits van").
2. **Handvol, thematisch.** Bij het signaal: deel in naar 3-7 commits op
   thema (feature-gebied), niet 1 mega-commit en niet per micro-stap.
   Een thema = wat een reviewer als één samenhangend verhaal kan lezen:
   "theme-systeem", "REST API + hardening", "Exact token-fix", "vertalingen".
3. **Nooit pushen zonder vraag.** Squashen/hergroeperen mag alleen op
   commits die nog niet gepusht zijn.

## Indelen

- Groepeer op padbasis per thema; één file kan maar in één commit, kies de
  commit waar de file inhoudelijk het meest bij hoort en dek de rest in de
  message (bijv. settings.py bij de API-commit, message noemt de i18n-regel).
- Bugfixes met tests krijgen een eigen `fix:`-commit, los van feature-werk.
- Conventional commits: `feat:`, `fix:`, `style:`, `chore:` met een body die
  het waarom dekt.
- Volgorde: fundament eerst (assets, settings), dan features, dan polish.

## Hergroepeer-recept (te veel lokale commits, niets gepusht)

```bash
git branch backup/pre-squash          # vangnet, niet overslaan
base_branch=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD || echo origin/main)
                                       # takt de branch af van een andere branch (bijv. dev): zet base_branch daarop
git reset "$(git merge-base HEAD "$base_branch")"   # mixed reset naar het aftakpunt: commits weg, werk blijft
# per thema:
git add <paden van thema 1> && git commit -m "feat: ..."
# ... herhaal per thema
git diff backup/pre-squash..HEAD      # MOET leeg zijn: inhoud identiek
git status --short                     # working tree clean
```

De lege diff tegen de backup is de verificatie; zonder die check niet klaar
melden. Backup-branch laten staan tot na de push, daarna mag hij weg
(`git branch -D backup/pre-squash`).

## Anti-patronen (de reden dat deze skill bestaat)

- 12 commits in één autonome middag-batch maken "omdat het werk af was":
  de gebruiker kreeg bijna 24 commits richting een reviewer geduwd.
- Na elke sub-taak direct committen "voor de netheid": dat is netheid voor
  de agent, ruis voor de reviewer.
- Eén reuzen-commit "frontend redesign" met 60 files: net zo onreviewbaar
  als 24 losse.
