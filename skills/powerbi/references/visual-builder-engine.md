# Visual builder engine (Vue 3, pure SVG)

Wanneer lezen: je bouwt of verbetert een dashboard, een tegelbord of een nieuwe visual zonder chartbibliotheek. Bestandsnamen hieronder zijn voorbeelden; volg de namen van je eigen repo.

De engine bestaat uit vier lagen. Elke laag is los te gebruiken.

## 1. Chart kit (geen chartbibliotheek)

| Onderdeel | Rol |
|---|---|
| Basiscanvas | SVG met vaste viewBox, plot-rect via slot, gridlijnen en basislijn uit tokens, assen 11px in de tertiaire tekstkleur, categorieën 12px/600 in de secundaire, toegankelijk label of groep |
| Themahaak | leest kleuren live uit de CSS-tokens; een MutationObserver op het thema-attribuut, dus elk thema werkt zonder eigen palet |
| Markanatomie | kolom max 24px, 4px rond alleen aan het data-eind, 2px oppervlak tussen buren, projectie = arcering toon-op-toon (45°/135°) |
| Schaal | pure tick-wiskunde, één categorie-naar-pixel-mapping voor labels, data, hit-test en annotaties |
| Balkgeometrie | layout grouped / stacked / overlay (bar-in-bar op ongeveer 67% van de host) |
| Bandgebieden | gebied tussen twee lijnen, gesplitst waar ze kruisen (forecast boven of onder realisatie) |
| Visuals | staaf, lijn, area, gestapeld, gesplitst, bullet, brug, maandkolommen, celkolommen, mini-KPI-balken, funnel; dun, alle geometrie in de helpers |
| Tooltip en legenda | gedeeld door alle visuals |
| Detailvenster | de uitklap van elke visual: ruwe data als zoekbare, sorteerbare tabel, kopiëren en CSV, rij-link naar het record |

Regel van de kit: geometrie in pure `.ts` (unit-testbaar zonder Vue), de `.vue` tekent alleen. Een nieuwe visual = een geometriebestand met tests + een dunne component.

## 2. Vormfactoren

Een tegel declareert wat hij **is**, nooit pixels of kolommen:

- Breedte: `compact` (ongeveer 1/4, één KPI), `standard` (1/3, KPI + uitsplitsing), `wide` (2/3, trend), `full` (rij, funnel, tabel of analyse). Een rij componeert asymmetrisch (25/75, 33/67, 25/25/50) en loopt nooit over.
- Hoogte: `short` 128, `standard` 200, `tall` 320, `grand` 560 px.
- `flow`: `measured` (inhoud bepaalt de hoogte, de band is een vloer) of `banded` (grafiek met vaste aspect).
- Contract per tegel: `{ complexity, preferred[], min, flow }`. `preferred[0]` is de standaard; een opgeslagen maat wordt in dit bereik gekwantiseerd (gelijkstand rondt naar beneden); onder `min` herschikt de engine in plaats van te krimpen.
- Een contract afgeleid uit de complexiteit (low, medium, high, very-high) geeft een nieuwe widget een zinnige plek zonder eigen instellingen.

## 3. Widgetcatalogus

- Eén definitie per widget: `id`, titel- en beschrijvingssleutel, optioneel een methodieksleutel (de ⓘ), het contract, categorie, databron en extra bronnen.
- De databron is een gedeelde dataset: de pagina haalt alleen op wat de actieve layout gebruikt.
- Nieuwe widget = één regel in de catalogus + één render-tak.
- Layout = bord met benoemde secties, elk met eigen volgorde en optioneel een eigen periode. De gebruiker sleept tussen en binnen secties.
- Eén opgeloste reeks per tegel, gedeeld door grafiek en detailtabel; de as volgt de selectie (een week is een week, geen maand met elf nullen).

## 4. Borden

- Configureerbaar bord: picker, secties, slepen, resize, opslaan per gebruiker.
- Vast bord: een view geeft alleen een lijst widget-id's; resize staat aan, geen picker of drag. De periode is bordbreed, niet per tegel.
- Elke tegel: overflow-menu, "Toon meer" en doorklikken naar de detailtabel.

## Een visual toevoegen of vervangen (recept)

1. Vraag in één zin, en welke databron hem voedt.
2. Bestaande visual vervangen? Houd props en emits gelijk, dan verandert de render-tak niet.
3. Geometrie in `.ts` met vitest; component dun; kleuren uit tokens.
4. Meerdere instanties op één pagina: elke SVG-`id` (gradient, clipPath, pattern) uniek via `useId()`.
5. Contract kiezen: `preferred` en `min` per vormfactor, `flow` measured of banded.
6. Vertalingen in elke taal van de app.
7. Render op 1440, 768, 390, licht en donker; console leeg.

## Externe ontwerpen porten

React-registries zoals easyui (MIT, `npx shadcn add Surajmaurya1/easyui/<naam>`), magicui of aceternity zijn ontwerpbron, geen dependency: neem de geometrie over (vorm, verhoudingen, interactie), vervang framer-motion door CSS-transities of `@starting-style`, Tailwind door tokens, en zet de licentie plus bron in de kopcomment. Voorbeeld: een gecentreerde funnel met gebogen verliesbruggen in een 0..100-viewBox met `preserveAspectRatio="none"`, een chip "−n%" per overgang en een samenvatting met totale conversie.
