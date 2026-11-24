# Mooi ontwerpen: skill-stapel, huisregels en wat de bronnen zeggen

Wanneer lezen: vóór je een pagina, lijst, paneel of visual ontwerpt of opknapt, en vóór je iets aan Robin laat zien. Rustig is hier de leidende eigenschap: een scherm is rustig als het oog in één blik ziet wat normaal is en wat aandacht vraagt. Bijna elke afkeuring van Robin (2026-10-08 en -09) ging over onrust: herhaling, kleur op elke regel, knoppen op wisselende plekken, notities en tegels. Zie `oordeel-robin-2026-10-08.md`, secties 2 en 9b.

## 1. Welke skill wanneer

Laad ze in deze volgorde; geef een frontend-designer-subagent deze lijst expliciet mee (zo deed de specialist van 2026-10-08 het; zonder lijst laadt hij ze niet).

| Moment | Skill | Waarvoor |
|---|---|---|
| Vorm en kleur van elke grafiek | `dataviz` (meegeleverd, `scripts/validate_palette.js`) | vorm per vraag, kleur per taak, validator licht én donker, markmaten, hover, toegankelijkheid |
| Welk grafiektype bij welke datarelatie | `data-visualization` | keuzegids (trend, samenstelling, rang, stroom, verschil) en anti-patronen |
| Een bestaande pagina mooier maken | `redesign-existing-projects` | audit eerst, niets slopen; dit is de ingang voor de backoffice en Polpo |
| Een nieuw scherm of nieuwe richting | `design-taste-frontend` | anti-slop richting, echte designsystemen, pre-flight check |
| Details: randen, schaduw, typografie, hover | `make-interfaces-feel-better` | surfaces, typography, animations, performance |
| Componentpolish en animatiebeslissingen | `emil-design-eng` | wanneer wel/niet animeren, onzichtbare details; draai hem op elke diff met `transition`/`animation` |
| Beweging toevoegen | `transitions-dev` | kant-en-klare CSS-transities (panelen, tooltips, getallen) |
| Bestaande beweging afstellen | `emil-design-eng` | duur, afstand, easing, open/dicht-asymmetrie |
| Bruikbaarheid toetsen | `ux-heuristics` | Nielsen, Krug, cognitive walkthrough |
| Toegankelijkheid | `fixing-accessibility` | ARIA, toetsenbord, focus, contrast |
| Merk Reforge (kleur, logo, UI-thema) | `brandbook` | de canonieke huisstijl; niet `reforgedesign`, dat is de slides-stijl |
| Polpo-schermen | `polpohire-design` | frontend-v4-taal van PolpoHire |
| Een bibliotheek kiezen | `references/bibliotheken-en-herkomst.md` | herkomst, licentie en keuze per bibliotheek |
| Vite, proxy, CSS-overrides, hangende previews | `frontend-gotchas` | bewezen valkuilen op deze machine |

Externe gidsen om naast te leggen (bestaan, gecontroleerd 2026-10-09; inhoud deels niet gelezen): Anthropic `frontend-design` ([github.com/anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design)), Vercel Web Interface Guidelines ([vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines): "URL as state", "Deep-link everything", "Confirm destructive actions"), Rauno Freiberg ([raunofreiberg/interfaces](https://github.com/raunofreiberg/interfaces)), Emil Kowalski ([emilkowalski/skills](https://github.com/emilkowalski/skills)), Taste-Skill ([Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)), Impeccable ([pbakaus/impeccable](https://github.com/pbakaus/impeccable)).

## 2. Huisregels voor rust (Robin, bevestigd door de bronnen hieronder)

**Lijsten**
- De rij is de ingang: klik op de rij (of een echte link in de eerste cel) opent het detail. In rust toont een rij naam en status als tekst.
- Nooit dezelfde knop, pil, stip of plekhouder op elke rij. Acties van één rij verschijnen bij hover of `:focus-within` (backoffice: `.rij-houder` + `.rij-acties` in `styles/lijst.css`, sinds PR #448; op touch altijd zichtbaar) of na openklappen; een actie voor alle rijen is één bulkactie in de kop.
- Hooguit één statusindicator per rij, en alleen als de status afwijkt. Groepeer gelijke uitzonderingen onder één kop ("Te laat") en zet per rij alleen het variabele deel ("11 dagen").
- Een plekhouder ("Niet opgegeven", "Geen datum") is een lege cel met sr-only tekst.
- Begin met 5 rijen en "Toon meer".
- Toets vóór de render: staat dezelfde knoptekst of dezelfde pil er meer dan één keer? Ontwerp opnieuw.

**Kleur**
- Neutraal is normaal; kleur betekent uitzondering die actie vraagt. Statuschip: neutraal, ok en info als tekst, alleen warn en danger als zachte pil.
- Elke reeks dashboard-breed een vaste kleur uit tokens; tekst altijd in tekstkleuren.
- Kleur nooit als enige drager: teken, pijl, woord of patroon erbij.

**Panelen, dialogen, menu's**
- Kop: context en titel links, sluiten rechts. Geen actieknoppen in de kop.
- Acties in de vaste voet, rechts uitgelijnd, secundair eerst en primair uiterst rechts; DOM-volgorde = zichtbare volgorde. Navigatie ("Open dossier", "Betaaltaken") links in de voet.
- Eén primaire knop per paneel, met een werkwoordlabel. Destructief nooit als default of primair rechts: gevaar-variant, apart, met bevestiging of undo.
- Detail en bewerken in een niet-modaal zijpaneel (InspectorPanel); een modal alleen voor onomkeerbare bevestiging.

**Pagina**
- 3-5 KPI's met vergelijking in plaats van een tegelraster; uitleg achter één ⓘ, nooit gestapelde notities.
- Twee getallen die elkaar tegenspreken (een kop-aantal naast een zin met een ander aantal) zijn erger dan geen: laat er één staan.
- Elk getal is doorklikbaar naar wat het optelt (`aanpassingen-per-visual.md`, sectie 4); de staat staat in de URL en Terug herstelt hem.
- Labels op één regel; eerst herformuleren of wrappen, afkappen alleen met minimaal 4 zichtbare tekens plus title-tooltip, nooit in kolomkoppen, navigatie of bedragen.

**Navigatie**
- Ingeklapte rail toont elke bestemming als icoon met tooltip; tooltips rechts naast de rail, nooit over de iconen. Dunne lijn in plaats van zichtbare sectiekoppen.

## 3. Wat de bronnen zeggen (onderzoek 2026-10-09)

Geverifieerd = pagina zelf gelezen; UNVERIFIED = via zoekindex of mirror.

**Kleur en ruis**
- Few, *Common Pitfalls in Dashboard Design* (2006, [pdf](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf), geverifieerd): 13 valkuilen, o.a. te weinig context, te veel precisie, betekenisloze variatie, decoratie, kleur misbruiken: "When overused, color loses its power to highlight what's most important."
- NN/g, *Dashboards: Making Charts and Graphs Easier to Understand* (2017, [link](https://www.nngroup.com/articles/dashboards-preattentive/), geverifieerd): lengte en positie voor hoeveelheid, kleur niet voor grootte; geen gauges, donuts of 3D.
- NN/g, *Indicators, Validations, and Notifications* (2024, [link](https://www.nngroup.com/articles/indicators-validations-notifications/), geverifieerd): indicatoren kunnen ruis worden.
- Datawrapper Academy (2024, [link](https://www.datawrapper.de/academy/what-to-consider-when-choosing-colors-for-data-visualization), geverifieerd): grijs is de belangrijkste kleur; highlight alleen voor kritieke waarden; dezelfde variabele overal dezelfde kleur.
- UK Analysis Function, kleuren (palet bijgewerkt 2026-02-12, [link](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-colours-in-charts/), geverifieerd): alleen kleurverschil met betekenis, hooguit 4 categorieën, focusgrafiek met één sterke kleur en de rest grijs.
- Office Add-ins dataviz-richtlijnen (Microsoft, 2025-10-29, [link](https://learn.microsoft.com/en-us/office/dev/add-ins/design/data-visualization-guidelines), geverifieerd): data-ink centraal, geen schaduw of 3D, dunne lichte gridlines, legenda links boven de plot. Fluent 2 zelf publiceert geen dataviz-richtlijn.
- Carbon, dashboards ([link](https://carbondesignsystem.com/data-visualization/dashboards/), geverifieerd): belangrijkste data grootst en linksboven, alleen essentiële metrics, "Always use consistent colors for each data set within a dashboard"; gekoppelde grafieken volgen elkaars filters.
- Assen: staaf- en kolomassen op nul (Carbon [assen](https://carbondesignsystem.com/data-visualization/axes-and-labels/), UK Analysis Function [charts](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/), FT [Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md); alle geverifieerd); gaten in data labelen, niet opvullen (Carbon, GitLab Pajamas [charts](https://design.gitlab.com/data-visualization/charts), bijgewerkt 2026-07-15).

**Rij-acties**
- NN/g, *Data Tables: Four Major User Tasks* (2022, [link](https://www.nngroup.com/articles/data-tables/), geverifieerd): inline acties werken bij 1-2 opties; meer wordt onleesbaar of onvindbaar; bulk via selectie plus acties boven of onder de tabel.
- Carbon Data table ([link](https://carbondesignsystem.com/components/data-table/usage/), geverifieerd): één overflow-menu per rij, optioneel alleen bij hover en focus, op touch altijd; na selectie een batchbalk; toolbar hooguit 5 acties.
- Atlassian Dynamic table ([link](https://atlassian.design/components/dynamic-table/usage), geverifieerd): meerdere acties in een "more actions"-menu, elk label uniek per rij, geen knoppen in tabelkoppen.
- NN/g, *Contextual Menus* (2019, [link](https://www.nngroup.com/articles/contextual-menus/), geverifieerd): ellipsis als cue; dezelfde acties ook elders bereikbaar.
- WCAG 2.2 SC 1.4.13 ([link](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html), geverifieerd): inhoud op hover of focus moet wegklikbaar, aanwijsbaar en blijvend zijn. Elke hover-actie dus ook via toetsenbord en in het detailpaneel.

**Knopplaatsing**
- NN/g, *OK-Cancel or Cancel-OK?* (2008, [link](https://www.nngroup.com/articles/ok-cancel-or-cancel-ok/), geverifieerd): "Following platform conventions is more important than optimizing an individual dialog box." In een web-app is de conventie van je eigen product het platform: overal dezelfde volgorde.
- Carbon Button ([link](https://carbondesignsystem.com/components/button/usage/), geverifieerd): in modals rechts uitgelijnd, primair rechts; danger-knoppen altijd met tekst.
- Fluent 2 Dialog ([link](https://fluent2.microsoft.design/components/web/react/core/dialog/usage), geverifieerd): hooguit 3 acties in de voet; destructieve bevestiging als alert dialog.
- Windows command buttons ([link](https://learn.microsoft.com/en-us/windows/win32/uxguide/ctrl-command-buttons), geverifieerd): destructief nooit default zonder undo; specifieke werkwoordlabels.
- NN/g, *Modal & Nonmodal Dialogs* (2017, [link](https://www.nngroup.com/articles/modal-nonmodal-dialog/), geverifieerd): een modal onderbreekt en verbergt context.

**Doorklikken**
- Microsoft, *Use report page drillthrough* ([link](https://learn.microsoft.com/en-us/power-bi/guidance/report-drillthrough), geverifieerd): bekijken, kiezen, doorklikken, analyseren, terug; detail in hetzelfde thema, geen lege visuals, een terugweg, vindbaar via een hint.
- NN/g, *Breadcrumbs* (herzien 2026-09-01, [link](https://www.nngroup.com/articles/breadcrumbs/), geverifieerd): toont de hiërarchie, niet de sessiegeschiedenis. Een aparte detailpagina krijgt een breadcrumb; het zijpaneel niet.
- Keuze in de backoffice: tooltip voor de exacte waarde, zijpaneel voor de regels achter het getal, aparte pagina alleen voor een volledige analyse.

**Getallen (nl-NL)**
- Tabellen: exacte bedragen, rechts uitgelijnd, `tabular-nums`, gelijke decimalen, eenheid in de kop (UK Analysis Function [tabellen](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-tables/), geverifieerd).
- KPI's en assen compact: `€ 1,1 mln`, `€ 399k`. Pas op met `Intl.NumberFormat("nl-NL", {notation:"compact"})`: die geeft `€ 1,2K` en zet het minteken vóór het euroteken (`-€ 1,1 mln.`), terwijl de standaardnotatie `€ -1.234.567,89` geeft (lokaal getest, Node 24.21). Gebruik één eigen formatter met een eigen suffix.
- Bekend gat in de backoffice: compacte labels tonen `-€ 714k`, `Money` toont `€ -198.699`. Het minteken hoort overal op dezelfde plek; kies één notatie als je eraan werkt.
- Truncatie: eerst wrappen of herformuleren; als het moet hooguit afkappen met minimaal 4 tekens en een tooltip, nooit in kolomkoppen of navigatie (Carbon data table, geverifieerd; PatternFly [truncation](https://www.patternfly.org/ux-writing/truncation), UNVERIFIED).

Niet gevonden: een dataviz-richtlijn van Material 3 of Fluent 2, een primaire NL-bron voor de notatie van negatieve bedragen, en een NN/g-artikel over hover-acties in tabellen.

## 4. Keuring vóór je het laat zien

Loop dit af op de render (licht 1440, donker 1440, 390), niet op de code:
1. **Herhaling**: geen knoptekst, pil, stip of icoon die op elke rij terugkomt.
2. **Kleur**: tel de gekleurde elementen; elk ervan is een uitzondering of een vaste reekskleur.
3. **Plaatsing**: elke actie staat in de voet rechts, elke kop heeft alleen titel en sluiten.
4. **Getallen**: geen twee getallen die elkaar tegenspreken; hetzelfde minteken overal; eenheden in koppen.
5. **Doorklikken**: elk getal opent zijn opbouw, het totaal klopt met het aangeklikte getal, Esc en Terug werken.
6. **Labels**: niets afgekapt dat je moet lezen om te beslissen.
7. **Toetsenbord**: alles wat hover laat zien, laat focus ook zien.

Robin beoordeelt op screenshots met een cijfer; laat de render zien en vraag geen "ziet er goed uit?".
