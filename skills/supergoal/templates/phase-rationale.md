# Fase <N> rationale: <naam>

> Broer van `phase-<N>.md`. De spec zegt wat er moet gebeuren; dit bestand zegt waarom.
> De Stage 6 plan-review toont dit zodat de menselijke gate de redenering kan aanvechten,
> niet alleen de opdeling.

## Waarom deze opdeling

<een zin: wat maakt dit een atomaire, onafhankelijk verifieerbare werkeenheid>

## Alternatieven overwogen

<opsomming van wat is afgewezen en waarom. Minimaal een item. Als er werkelijk
geen alternatief was, schrijf "Enige haalbare opdeling omdat <reden>".>

- <alt 1>: afgewezen omdat <reden>
- <alt 2>: afgewezen omdat <reden>

## Afhankelijkheden onderbouwd

Hangt af van fasen: <lijst of "geen">

<een korte paragraaf: waarom precies deze voorgangers en niet andere. Als de fase
nergens van afhangt, onderbouw waarom deze onafhankelijk is van alles ervoor.>

## Fase-specifieke risico's

<opsomming van risico's die uniek zijn voor deze fase. Generieke risico's ("kan falen")
tellen niet. Wees concreet: "Auth-migratie raakt de user-tabel; als deze draait terwijl
fase 3 nieuwe gebruikers schrijft, corrumperen we verse rijen.">

- <risico>: <mitigatie of "geaccepteerd">

## Rollback-doel

Als deze fase state corrumpeert of een regressie introduceert die de final audit
aan deze fase toeschrijft, herstel naar:

- **Fase**: <N-k> (of "baseline" voor de pre-run ref)
- **Baseline ref**: lees uit `STATE.md` -> `Phase baselines:` -> `phase <N-k> pre`
- **Getroffen deliverables**: <welke bestanden of features de rollback raakt>
- **Rollback-commando**: <bijv. `git restore --source=<ref> -- <paths>` of `git reset --hard <ref>` als de hele fase wordt teruggedraaid>

De audit-fix loop leest deze sectie voordat het een fix spec schrijft, zodat het kan
kiezen tussen vooruit patchen en terugdraaien.
