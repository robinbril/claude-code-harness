# Onderhoud

Hoe je deze harness overneemt, bijhoudt, herindeelt, opschoont en uitbreidt. Een harness groeit door toevoegen, want toevoegen voelt veilig en weghalen riskant. Zonder onderhoud betaalt elke sessie voor skills en regels die niemand meer gebruikt. Dit bestand houdt hem licht.

Vier delen: **toevoeging**, **onderhoud**, **herstructureren** en **opschoning**. Elk deel eindigt op een controle.

## Doelen

- Sessiestart licht: de beschrijvingen van automatisch geladen skills samen onder ongeveer 5.000 tokens.
- `CLAUDE.md` onder ongeveer 150 regels. Procedures horen in skills, afdwingbare regels in hooks.
- Een ingang per taak: geen twee skills die op hetzelfde woord reageren.
- Nul dode verwijzingen: elke skill, hook of pad waar een tekst naar wijst, bestaat.

## 1. Toevoeging

### Overnemen in je eigen setup, per onderwerp

Neem deze harness niet in een keer over. Laat Claude Code je per onderwerp interviewen en kies zelf wat blijft. Plak dit in Claude Code, gestart in een clone van deze repo:

```text
Lees ONDERHOUD.md. Neem deze harness per onderwerp met mij door, volgens sectie 1. Eerst alleen lezen; wijzig niets voordat ik per onderwerp heb gekozen.
```

1. **Inventaris, alleen lezen.** Breng je huidige `~/.claude` in kaart: skills, commands, agents, hooks, `CLAUDE.md`. Tel per skill het gebruik (commando in deel 2) en zoek overlap met de skills in deze repo.
2. **Per onderwerp kiezen.** Gebruik `/batch-grill-me` uit deze repo. Een ronde per onderwerp. Per item een genummerde vraag: houden, toevoegen, samenvoegen of archiveren, met een aanbevolen antwoord en een regel bewijs (gebruiksaantal, overlap met welke skill, of waarom kapot). "Ja" accepteert de aanbeveling.

   | # | Onderwerp | Uit deze repo |
   |---|---|---|
   | 1 | Methodiek | `skill-finder`, `systematic-debugging`, `council`, `batch-grill-me`, `projectstructuur`, `rea` |
   | 2 | Kwaliteit en git | `find-bugs`, `code-audit`, `commit-discipline`, `repo-hygiene`, `render-proof` |
   | 3 | Loops en autonoom bouwen | `goal`, `supergoal`, `keten-loop`, `bouw-loop`, `polijst-loop`, `fix-loop`, `speur-loop`, `waak-loop`, `createloopprompt` |
   | 4 | Frontend-design | `design-taste-frontend`, `redesign-existing-projects`, `emil-design-eng`, `make-interfaces-feel-better`, `ux-heuristics`, `frontend-gotchas`, `fixing-accessibility`, `transitions-dev` |
   | 5 | Animatie en beweging | `animate`, `animate-expo`, `animation-vocabulary`, `apple-design`, `ask-sonner`, `find-animation-opportunities`, `improve-animations`, `review-animations`, `mobile-native`, `pick-ui-library`, `prototype` |
   | 6 | E2E-tests | `e2e`, `e2e-rules` |
   | 7 | PolpoHire en TSS | `polpohire-design`, `bi-dashboards`, `theme-selector`, `pre-pr-gates` |
   | 8 | Kwaliteitspoort | `tools/poort`: per repo `node tools/poort/poort.mjs init` |
   | 9 | Documenten en visuals | `office-docs`, `brandkit`, `data-visualization`, `diagram-design` |
   | 10 | Hooks | `guidelines`, `commit-guard`, `verified-claim-guard` |
   | 11 | MCP-servers | `.mcp.example.json`: per server kiezen, zie README |
   | 12 | Werkregels in `guidelines/CLAUDE.md` | Per sectie kiezen |
   | 13 | Externe repo's, optioneel | [mattpocock/skills](https://github.com/mattpocock/skills) (TDD, specs, tickets), [morluto/rea](https://github.com/morluto/rea) (de motor achter skill `rea`; eigen MCP-server optioneel), [robinbril/infinite-agent-memory](https://github.com/robinbril/infinite-agent-memory) (blijvend geheugen) |
   | 14 | Je eigen bestaande harness uitdunnen | Per overlap, ongebruikte skill of migratierest een vraag, volgens deel 4 |

3. **Uitvoeren.** Alleen wat je bevestigde, een onderwerp tegelijk. Back-up voor elke wijziging; diff tonen voor `CLAUDE.md` en `settings.json`. Bestaat een skill al onder dezelfde naam: vergelijken en voorleggen, niet overschrijven.

### Een nieuwe skill aan deze repo toevoegen

- Bestaat het al? Draai eerst `skill-finder`, hier en upstream.
- Een duidelijke trigger die geen bestaande skill overlapt. Overlap: samenvoegen, of een router of "kies er hooguit een", zoals de stijlvarianten.
- Generiek: geen persoonlijke paden, namen, klant- of bedrijfsinhoud. `commit-guard` helpt; zet eigen patronen in `.harness-blocklist`.
- `SKILL.md` onder ongeveer 500 regels. Details naar `references/`, scripts naar `scripts/`.
- Herkomst en licentie in de README of een `LICENSE` naast de skill.
- README-tabel bijwerken en de versie ophogen in `.claude-plugin/plugin.json`.

**Controle:** `name` in elke `SKILL.md` is gelijk aan de mapnaam, de README noemt de skill, en de plugin laadt na `/plugin` zonder fouten.

## 2. Onderhoud

**Maandelijks:**

- Gebruik tellen per skill:
  ```bash
  cd ~/.claude/projects && rg -o -N --no-filename -g '*.jsonl' '"name":"Skill","input":\{"skill":"[^"]*"' . | sed 's/.*"skill":"//; s/"$//' | sort | uniq -c | sort -rn
  ```
- In een nieuwe sessie `/context`: hoeveel kosten de skill-beschrijvingen?
- Dode verwijzingen zoeken: elke skillnaam en elk pad dat in een `SKILL.md`, `CLAUDE.md` of hook staat, bestaat.

**Per release:** versie ophogen in `plugin.json` en `marketplace.json`, beide hooks een keer laten afgaan: een commit met een nep-secret in een wegwerp-worktree (`git worktree add ../hook-test`, daarna `git worktree remove --force ../hook-test`), en een klaar-claim zonder tool-call, en de README bijwerken.

**Controle:** de gebruikstelling staat genoteerd bij de release, en beide hooks blokkeren wat ze horen te blokkeren.

## 3. Herstructureren

- **Een ingang per taak.** Twee skills op hetzelfde woord: samenvoegen of er een archiveren.
- **Families krijgen een ingang.** Een router-skill, of een tabel met "kies er hooguit een".
- **Handmatige skills kosten niets.** Een skill die je alleen zelf typt, krijgt `disable-model-invocation: true` in de frontmatter. Dan telt zijn beschrijving niet mee in elke sessie.
- **Een bron per regel.** Afdwingbaar: een hook. Oordeel: `CLAUDE.md`. Procedure: een skill. Nooit dezelfde regel op twee plekken.
- **Vaste indeling.** `skills/` voor skills, `hooks/` voor hooks plus `hooks.json`, `guidelines/` voor de werkregels (`CLAUDE.md`), `tools/` voor meegeleverde tools zoals poort, `.github/` voor CI. De root bevat alleen README, `ONDERHOUD.md`, licentie, installers en voorbeeldsettings.

**Controle:** na een herindeling verwijst niets meer naar een oude naam of plek (`rg` op de oude naam geeft nul treffers).

## 4. Opschoning

1. **Meet voor je snoeit.** Laag gebruik plus geen unieke waarde: weg.
2. **In je eigen `~/.claude`: archiveren, nooit verwijderen.** Verplaats naar `~/.claude/backups/<datum>/`; terugzetten is een `mv`. In deze repo is de git-geschiedenis het archief: weghalen via een pull request met een regel waarom.
3. **Migratieresten.** Gedupliceerde commands als skill, `.bak`-bestanden, oude model-ID's, paden van een vorige machine of een vorig besturingssysteem.
4. **Regeleinden.** Wisselen tussen Windows en macOS laat elk bestand "gewijzigd" lijken. Een `.gitattributes` met `* text=auto eol=lf` voorkomt die ruis.
5. **Persoonlijk blijft persoonlijk.** Stemprofielen, namen, paden en klantdata horen niet in een gedeelde harness.

**Controle:** `git status` toont alleen bedoelde wijzigingen, `rg` op gearchiveerde namen geeft nul treffers, en `/context` in een nieuwe sessie zit onder het doel.
