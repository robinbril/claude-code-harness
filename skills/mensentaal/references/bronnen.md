# Waar dit op staat

## Onderzoek

v = geopend en deels gelezen, z = alleen zoekresultaat of samenvatting.

- Morgenstern e.a. 2026 ([2611.08704](https://arxiv.org/abs/2611.08704), v): een AI-oordeel volgt op een mismatch met de situatie, niet op een vast kenmerk.
- StoryScope 2026 ([2604.03136](https://arxiv.org/abs/2604.03136), v): op verhaalstructuur alleen 93% herkenning; herschrijven haalt daar 1,6 punt af. Fictie.
- Reinhart e.a., PNAS 2025 ([2410.16107](https://arxiv.org/abs/2410.16107), z): instructiemodellen gebruiken meer deelwoordzinnen en naamwoordstijl. Engels.
- Russell e.a., ACL 2025 ([2501.15654](https://arxiv.org/abs/2501.15654), z): mensen die veel met taalmodellen schrijven herkennen AI-tekst goed.
- Wang e.a. 2025 ([2509.14543](https://arxiv.org/abs/2509.14543), z) en PersonalBench 2026 ([2608.19746](https://arxiv.org/abs/2608.19746), v): voorbeelden helpen, maar geen promptmethode overbrugt het gat naar de auteur.
- Chakrabarty e.a. 2025 ([2510.13939](https://arxiv.org/html/2510.13939), v): trainen op één auteur wint ruim van voorbeelden in de prompt. GPT-4o op fictie.
- RealUserSim 2026 ([2605.20204](https://arxiv.org/html/2605.20204), v): instructie plus echt voorbeeld tilt de match van 24,2% naar 45,3%.
- Verbalized Sampling 2025 ([2510.01171](https://arxiv.org/abs/2510.01171), v): varianten met kansen geven 1,6 tot 2,1 keer meer diversiteit, geen stem.
- LAMP 2024 ([2409.14509](https://arxiv.org/html/2409.14509v3), v): bewerking door een schrijver wint van bewerking door een model.
- Bewerken achteraf ([2604.24444](https://arxiv.org/html/2604.24444), v): een mens die zelf bewerkt komt dichter bij de eigen stijl (g = 0,55).
- Keystroke-onderzoek ([2606.15583](https://arxiv.org/html/2606.15583), v): mensen schrappen en vervangen op de zwakste plekken.
- Boland en Queen 2016 ([PLOS ONE](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0149885), v): typfouten kosten ongeveer 0,47 punt op 7.
- Gunraj 2016 en Houghton 2018 (z): een slotpunt in een kort bericht leest als minder oprecht.
- Partikels (z): ruim 20% van de Nederlandse partikels staat in een groepje, 3,7% in het Duits.
- TextPulse (commercieel, v): genoemde eigenschappen schieten door, niet genoemde blijven staan.

Niet gevonden: goede cijfers over Nederlandse AI-tekst en gecontroleerd onderzoek naar schrijven vanuit dictaat.

## Andere skills

| Skill | Commit | Licentie | Idee |
|---|---|---|---|
| [ilien-dev/quiron](https://github.com/ilien-dev/quiron) | 903defd | AGPL-3.0 | meten met onder- en bovengrens; materiaal boven stijl. Geen code of tekst overgenomen |
| [JensHeitmann/humanizer-stack](https://github.com/JensHeitmann/humanizer-stack) | 13f5c02 | MIT | eerst het skelet nakijken |
| [badmuriss/unslop](https://github.com/badmuriss/unslop) | a3f5666 | CC BY-SA 4.0 | taal en register vóór het bewerken |
| [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop) | 000650b | MIT | kleinste ingreep die werkt |
| [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) | 8da1f03 | MIT | bewust niet gevolgd: alle bijwoorden schrappen haalt uit Nederlands de partikels weg |
| [xlambert/slop-sweep](https://github.com/xlambert/slop-sweep) | 17a7c1c | geen | toets of een zin ergens anders kan staan |

Ideeën zijn in eigen woorden opgeschreven; alle code hier is eigen werk.

## Meting en toets

Banden `artikel`, `essay` en `vakblog`: 294 Nederlandse artikelen van voor december 2021 van sargasso, frankwatching, marketingfacts, numrush, recruitmentmatters en retecool. Alleen cijfers zijn bewaard.

Blinde toets van november 2026 met één Nederlandse schrijver. Keurder en schrijver waren hetzelfde model (Claude Opus 5.5).

| Kans op AI | Zonder skill | Met skill | Mens |
|---|---|---|---|
| Appje (23 per soort) | 48% (algemene humanizer met stemprofiel) | 41% | 28% |
| Mail (12 per soort) | 50% | 44% | 18% |
| Artikel (1 tekst per versie) | 74% | 48 tot 62% | 1 tot 4% |

De verschillen bij appje en mail zijn net niet significant. In een eerdere ronde met 24 andere appjes werd het echte bericht naast dat van de skill in 23 van 24 paren herkend. Post, zakelijk en schrijven vanuit dictaat zijn niet getoetst.

**Plafond:** een skill zonder training haalt "minder herkenbaar", niet "niet te onderscheiden". Toets zelf met `scripts/toets.py`.
