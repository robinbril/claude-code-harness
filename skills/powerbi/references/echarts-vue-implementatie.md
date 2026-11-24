# ECharts in Vue: opzet, recepten en tests

Wanneer lezen: zodra je een grafiekcomponent bouwt of wijzigt in een Vue 3-app met ECharts. Alle paden zijn relatief aan `frontend-app/src` in de Reforge-backoffice (`reforge-backoffice-dataviz`, branch `feat/analytics-v1`, stand 2026-10-08). Andere sessies werken in die bestanden: lees ze, schrijf er niet in vanuit deze skill.

Stack: Vue 3.5, ECharts 6.1, vue-echarts 8.3, SVG-renderer, vitest + vue-tsc.

## Inhoud

1. Eén ECharts-opzet
2. Waarom alles een custom series is
3. Anatomie van een grafiekcomponent
4. Tokens: het proefelement
5. Gedeelde maten (grafiekBasis)
6. Recepten: kolom, gestapelde kolom, bandregel, labels zonder botsing, lijn met eindpunt, brug (met afwijkingskleuren), dumbbell, liggende staven met vergelijkstreepje, referentielijn, trap, 100%-balk, matrix met databalken, arcering, sparkline
7. Kleur per entiteit
8. Weergave per visual
9. Tabel-tweeling en CSV
10. Tests zonder vi.mock
11. Codehygiëne (Robins lint-regels) en de scoped-CSS-valkuil
12. Renders, tests en e2e: het bewijs

## 1. Eén ECharts-opzet

`lib/echarts.ts` is de enige plek waar ECharts geregistreerd wordt. Nieuwe vormen registreren hier hun module, zodat er nooit twee opzetten naast elkaar bestaan.

```ts
import { use } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { CustomChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import VChart from "vue-echarts";

use([SVGRenderer, CustomChart, GridComponent]);

export const INIT_OPTIES = { renderer: "svg" } as const;
export { VChart };
```

SVG omdat het scherp is op elk scherm, printbaar, en zonder canvas in jsdom werkt. Alleen `CustomChart` en `GridComponent`: tree-shaking houdt de finance-chunk klein. `lib/echarts.test.ts` tekent een custom series als SVG en faalt als `CustomChart` uit `use()` verdwijnt (mutatiecheck; zrender meet tekst via canvas, dus de test zet `HTMLCanvasElement.prototype.getContext` op null).

## 2. Waarom alles een custom series is

De standaardseries halen de vaste maatvoering niet (bron: kopcomment `maandKolommenOptie.ts`): kolommen hooguit 24px breed, 4px afgerond aan het data-eind en recht op de basislijn, 2px lucht in plaats van een rand, 2px lijnen met een eindpunt met ring. Daarom tekent elke grafiek zijn vormen zelf in `renderItem`. De grafiek is `silent: true` en alleen tekenwerk; hover, focus, tooltip en klik zitten in een HTML-laag erboven.

ECharts eist voor de maten van een element de sleutel `shape`. Robins lint verbiedt "shape" in symboolnamen (`no-shape-in-symbol-names`), dus schrijf hem altijd als string-sleutel en zet dit in de kopcomment:

```ts
// "shape" staat als string-sleutel: de vaste ECharts-sleutel voor de maten van
// een element (extern contract), geen eigen naam.
delen.push({ type: "rect", "shape": staaf, style: { fill: kleur } });
```

## 3. Anatomie van een grafiekcomponent

Elke grafiek bestaat uit vier delen (patroon van `MaandKolommen.vue`, `BrugGrafiek.vue`, `KlantenGrafiek.vue`, `AfwijkingGrafiek.vue`, `WeekMarge.vue`):

1. **Optiebouwer** `*Optie.ts`: een pure functie van een benoemde invoer-interface (`MaandOptieInvoer`, `BrugOptieInvoer`) naar `ComposeOption<CustomSeriesOption | GridComponentOption>`. Geen Vue, geen DOM, dus volledig unit-testbaar. Maten die de HTML-laag ook nodig heeft staan als geëxporteerde constante (`RAND`, `BRUG_RAND`, `KLANT_RIJ`, `AFW_RIJ`).
2. **Tekening**: `<VChart :option :init-options="INIT_OPTIES" :autoresize="kanMeten" aria-hidden="true" />` in `.ag-tekening` (absolute, `pointer-events: none`).
3. **Knoppenlaag** (`grafiek.css`): per maand, staaf of rij een `<button class="ag-band">` als hit-target, met `aria-label` voluit, roving tabindex (één band in de tabvolgorde, pijltjes/Home/End lopen door), `@mouseenter` en `@focus` zetten dezelfde `actief`-index, dus **toetsenbord = hover**. De tooltip `.ag-tip` (`role="status"`) volgt die index en blijft binnen de grafiek via `tipStijl(i, n)`.
4. **Tabel-tweeling**: een `TabelModel` dat `DashboardKaart` als tabel toont en als CSV exporteert.

```vue
<VChart class="ag-tekening" :option="optie" :init-options="INIT_OPTIES" :autoresize="kanMeten" aria-hidden="true" />
<div class="ag-plot" :style="plotStijl">
  <div class="ag-banden" :style="{ '--n': kolommen.length }" role="group" aria-label="Maanden. Pijltjes om te bewegen.">
    <button v-for="(k, i) in kolommen" :key="k.key" type="button" class="ag-band"
      :tabindex="i === rovingIndex ? 0 : -1" :aria-label="ariaLabel(k)"
      @mouseenter="actief = i" @focus="opFocus(i)" @blur="actief = null"
      @keydown="opToets($event, i)" @click="opKlik(k)" />
  </div>
  <div v-if="tipKolom && actief != null" class="ag-tip" :style="tipStijl(actief, kolommen.length)" role="status">...</div>
</div>
```

`useGrafiekOmgeving(wortel)` (`components/dashboard/useGrafiekOmgeving.ts`) levert `smal` (max-width 600px), `beweging` (prefers-reduced-motion), de gemeten `breedte` (ResizeObserver) en `kanMeten`; `volgendeIndex(toets, huidig, aantal)` en `focusBand(wortel, i)` doen het toetsenbord. jsdom kent geen matchMedia of ResizeObserver: dan tekent de grafiek op vaste maat.

## 4. Tokens: het proefelement

ECharts tekent SVG-attributen en kent geen `var()` of `color-mix()`. `composables/useChartTokens.ts` lost elke CSS-token op via een onzichtbaar proefelement:

```ts
export function leesChartTokens(doc: Document = document): ChartTokens {
  const proef = doc.createElement("span");
  proef.setAttribute("aria-hidden", "true");
  proef.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  doc.body.appendChild(proef);
  try {
    const uit = { ...TERUGVAL };
    for (const sleutel of KLEUR_SLEUTELS) {
      proef.style.color = "";
      proef.style.color = KLEUREN[sleutel];          // bv. "var(--chart-marge)"
      const kleur = getComputedStyle(proef).color;    // de browser rekent het uit
      if (kleur && !kleur.includes("var(")) uit[sleutel] = kleur;
    }
    // ...fontgroottes via proef.style.fontSize = `var(--fs-xs)`
    uit.donker = doc.documentElement.getAttribute("data-theme-mode") === "dark";
    return uit;
  } finally {
    proef.remove();
  }
}
```

Naast reeks-, tekst- en rastertokens leest hij `goed` (`var(--ok)`) en `slecht` (`var(--danger)`) voor afwijkingsvullingen. `TERUGVAL` bevat de lichte stappen uit `theme.css`, zodat een test (jsdom) dezelfde kleuren ziet als het lichte thema. `useChartTokens()` leest bij mount en opnieuw via een `MutationObserver` op `data-theme-mode`, `data-theme`, `class` en `style` van `<html>`: een themawissel bouwt de optie opnieuw. Licht en donker hebben elk eigen getoetste stappen; nooit automatisch omkeren. Het veld `donker` kiest de donkere stap van een kleurenset.

## 5. Gedeelde maten (grafiekBasis)

`components/dashboard/grafiekBasis.ts`:

| Naam | Waarde | Waarvoor |
|---|---|---|
| `KOLOM_MAX` | 24 | kolom of staaf nooit dikker |
| `LUCHT` | 2 | lucht tussen vlakken (geen rand) |
| `AFRONDING` | 4 | ronding aan het data-eind |
| `PUNT_R` | 4 | eindpunt van een lijn, met 2px ring in de oppervlaktekleur |
| `INFADEN` | `{ "shape": {}, style: { opacity: 0 } }` | alleen dekking animeren |
| `mooieSchaal(lo, hi, vakken)` | stappen 1, 2, 2,5, 5, 10 | schone as, nul altijd op een gridlijn; met negatieve waarden minstens 5 vakken |
| `kolomBreedte(band, n)` | band x 0,46 (één) of 0,78 (groep) | breedte binnen een band |
| `verticaleStaaf` / `horizontaleStaaf` | rechthoek met r aan het data-eind | positief boven rond, negatief onder rond |
| `tipStijl(i, n)` | links, rechts of gecentreerd | tooltip binnen beeld op een telefoon |
| `metAlfa(hex, a)` | rgba | vlakvulling onder arcering |

Animatie overal: `animation: inv.beweging, animationDuration: 230, animationEasing: "cubicOut", animationDurationUpdate: 160`. Gridlijnen doorgetrokken in `tokens.grid`, aslabels in `tokens.tekst3` op `fs2xs`, geen asstreepjes, geen asnaam.

## 6. Recepten

### Kolom (afgeleid van `maandKolommenOptie.ts`)

```ts
const serie: CustomSeriesOption = {
  type: "custom",
  silent: true,
  clip: false,
  data: kolommen.map((k, i) => [i, k.waarde]),
  encode: { x: 0, y: 1 },
  renderItem: (params, api) => {
    const i = params.dataIndex;
    const k = kolommen[i];
    if (!k) return null;
    const [midden = 0, basis = 0] = api.coord([i, 0]);
    const maat = api.size?.([1, 0]);
    const band = Array.isArray(maat) ? (maat[0] ?? 0) : (maat ?? 0);
    const breedte = Math.min(KOLOM_MAX, band * 0.46);
    const top = api.coord([i, k.waarde])[1] ?? basis;
    return {
      type: "rect",
      "shape": verticaleStaaf(midden - breedte / 2, breedte, basis, top, k.waarde < 0),
      style: { fill: kleuren.omzet, opacity: dekking(i) },
      enterFrom: { "shape": { y: basis, height: 0 } },
    };
  },
};
```

### Gestapelde kolom met 2px lucht

`kolomVlakken(k, midden, basis, band, yVan)` geeft per maand de vlakken kosten (onder, recht) en marge (boven, 4px rond), met `LUCHT / 2` van elk vlak af, zodat er 2px oppervlak tussen zit. Negatieve marge: alleen het kostenvlak plus een omzetstreep in tekstinkt (2px hoog, 8px breder dan de kolom). Waardelabel alleen boven de laatste afgesloten en de lopende maand (`gelabeldeKolommen`). Vormen per weergave: gestapeld (standaard, kosten + marge = omzet), naast elkaar, lijn, vlak; altijd één euro-as.

### Bandregel (dichtheid)

`BAND_VOL = 34`: onder 34px per maand (twaalf maanden op een telefoon) krijgt alleen elke tweede maand een naam (terugtellend vanaf de laatste, dus de lopende maand houdt hem altijd), vervallen de percentages en de waardelabels. Tooltip en tabel houden alles. Het margepercentage staat als rich-text-regel onder de maandnaam, niet als lijn op een tweede as; negatief in `tokens.gevaar`, "lopend" cursief.

### Labels botsen nooit

Les van 2026-10-08: label selectief (het maximum, de laatste afgesloten periode, de lopende periode), zet de eenheid in de subtitel in plaats van achter elk label, en laat de rest aan tooltip en tabel. Elke optiebouwer die labels plaatst krijgt een test die de labelvakken (x, breedte uit de tekstschatting, y, hoogte) onderling op overlap controleert, ook op telefoonbreedte. Voorbeeld: `tredeLabels` in `weekMargeOptie.ts` laat een label vallen dat over een geplaatst label zou komen (grootste daling eerst), getest in `weekMargeOptie.test.ts` ("op een smalle grafiek vallen labels weg die over een ander zouden komen").

### Lijn met eindpunt

Polyline 2px, `lineCap/lineJoin: "round"`, alleen over afgesloten maanden. Het stuk naar de lopende maand op 40% dekking. Eindpunt op de laatste afgesloten maand: cirkel r 4 in de reekskleur met 2px ring in `tokens.oppervlak`. Eindlabel alleen voor de reeks met nadruk of bij één lijn. Vlak: polygoon in `metAlfa(kleur, 0.1)`, hooguit twee vlakken.

### Brug (`components/analytics/charts/brugOptie.ts`)

Elke staaf heeft `van` en `tot`. Totalen staan op nul in hun reekskleur; stappen zweven vanaf het vorige totaal: af in de kostenkleur, bij in de omzetkleur. Een verbindingslijn van 1px in `tokens.basis` loopt van het eind van de ene staaf naar het begin van de volgende. Het label draagt het teken (`brugLabel`: "+€ 12,4k", optioneel "▲ +€ 12,4k"), met arcering aan krijgt bij 45 en af 135 graden: bij en af zijn zonder kleur te onderscheiden.

```ts
export function brugMoetLiggend(inv: BrugStandInvoer): boolean {
  const band = brugBand({ breedte: inv.breedte, smal: inv.smal, staven: inv.staven });
  if (band <= 0) return false;
  if (band < BRUG_BAND_STAAND) return true;                 // 52px
  if (inv.alleLabels && band < BRUG_BAND_LABELS) return true; // 64px
  const kortNamen = inv.smal || band < BRUG_BAND_VOLLE_NAAM;  // 132px
  const namen = inv.staven.map((s) => (kortNamen ? s.kort : s.label));
  const naamBreedte = Math.max(44, band - 8);
  const fontSize = inv.smal ? inv.tokens.fs2xs : inv.tokens.fsXs;
  return geschatteTekstbreedte(langsteWoord(namen), fontSize) > naamBreedte;
}
```

De schatting (tekens x fontgrootte x 0,62) is deterministisch, dus stabiel in jsdom. Liggend staat elk label rechts van de staaf.

**Kleur volgt wat de stappen zijn (les van 2026-10-08).** Een kosten/omzetbrug (de resultaatbrug) houdt de reekskleuren. Een brug waarvan de stappen afwijkingen zijn (van forecast naar netto marge, IBCS) kleurt bij en af als vulling in `--ok` en `--danger`; de `-ink`-tinten ogen als balk bruin. In code: prop `afwijking` op `BrugGrafiek.vue`; `useChartTokens` leest daarvoor `goed: "var(--ok)"` en `slecht: "var(--danger)"`.

```ts
export function brugKleur(s: BrugStaaf, kleuren: ReeksKleuren, afwijking: AfwijkingInkt | null = null): string {
  if (s.soort === "totaal" && s.reeks) return kleuren[s.reeks];
  if (afwijking) return s.richting === "neer" ? afwijking.slecht : afwijking.goed;
  return s.richting === "neer" ? kleuren.kosten : kleuren.omzet;
}
```

Groen en rood blijven nooit het enige signaal: het label draagt het teken.

### Dumbbell (`components/profitability/afwijkingOptie.ts`)

Per rij op één euro-as: lijn van forecast naar actual (2px, 55% dekking), forecast als open cirkel (r 4, gevuld met het oppervlak, 2px rand in de maatkleur), actual als gevulde stip (r 5, 2px ring in het oppervlak; één pixel groter omdat de ring een pixel afsnoept). Nullijn alleen als er iets onder nul staat. Rijen gesorteerd op absolute afwijking in euro; "Overig" krijgt geen markering, alleen tekst. Richting staat in de HTML-laag met pijl, teken en procent.

### Liggende staven met vergelijkstreepje (`components/analytics/charts/klantenOptie.ts`)

Eén reeks, één kleur (omzet) voor elke klant; "Overig (n)" in `tokens.neutraal`. Rijhoogte `KLANT_RIJ = 40`, dikte `min(24, 40 x 0,45)`. De vorige periode is een streepje van 2px in tekstinkt, 8px hoger dan de staaf. Namen en bedragen staan in HTML-kolommen naast de tekening.

### Referentielijn (run-rate, `components/finance/charts/weekMargeOptie.ts`)

```ts
const referentie = (rol: "runrate" | "vergelijk", waarde: number | null, kleur: string, dikte: number): void => {
  const bereik = rolBereik(weken, rol);           // alleen over de weken die hij middelt
  if (waarde == null || !bereik) return;
  const [x0 = 0, y = 0] = api.coord([bereik[0], waarde]);
  const [x1 = x0] = api.coord([bereik[1], waarde]);
  delen.push({
    type: "line",
    "shape": { x1: x0 - band / 2, y1: y, x2: x1 + band / 2, y2: y },
    style: { stroke: kleur, lineWidth: dikte, lineDash: STIPPEL, lineCap: "butt" },   // STIPPEL = [4, 3]
    enterFrom: INFADEN,
  });
};
referentie("vergelijk", inv.vergelijk, tokens.tekst3, 1.5);
referentie("runrate", inv.runRate, tokens.tekst, 2);
```

Referentielijnen in teksttokens, niet in de reekskleur: het zijn referenties, geen reeks. De weekkolommen zijn dun (`weekKolomBreedte`: band x 0,62, altijd 2px lucht).

### Trap (aflopende marge)

Weergave "vooruit" van dezelfde kaart: vanaf de run-rate van nu een trap van wat er per week overblijft als contracten op hun einddatum stoppen, gestippeld en gearceerd (prognose, IBCS). Boven elke trede staat wat er die week wegvalt; een label dat over een ander zou vallen vervalt, grootste daling eerst (`tredeLabels`). Ondertitel: "contractueel, vóór verlengingen".

### 100%-balk (`components/finance/charts/VerdelingBalk.vue`, HTML, geen ECharts)

Eén liggende balk: een totaal over geordende categorieën (debiteuren naar ouderdom, taken naar hoe laat). Vlakken in categorievolgorde, links op tijd, rechts het oudst; kleur aan de categorie, later is donkerder (`--chart-verval-1` tot `-4`, op tijd `--chart-neutraal`). Een categorie buiten de volgorde (zonder vervaldatum) gearceerd. Label boven een vlak alleen als het past. Elk vlak is een knop (roving tabindex, hover = focus, Enter emit "kies").

### Matrix met databalken (`components/dashboard/matrix.ts`)

```ts
export function balkSchaal(rijen: readonly MatrixRij[], kolommen: readonly MatrixKolom[]): BalkSchaal {
  const groep = new Map<number, number>();
  const rij = new Map<number, number>();
  // groepen en losse regels krijgen elk hun eigen maximum per kolom:
  // een subtotaal is groter dan elke regel, dus anders vult geen regel ooit zijn cel
  ...
}
export function balkProcent(waarde: MatrixCel | undefined, max: number | undefined): number
```

Databalk in de reekskleur, zacht, tekst in teksttokens. `eersteRijen` zet een open groepskop zonder rij eronder ook achter "Toon meer". Kolommen met `smal: "weg"` vallen onder 760px weg, `"krap"` onder 520px; de export houdt ze.

### Arcering (`components/finance/charts/kleursets.ts`)

ECharts-decal, alleen 45 en 135 graden (horizontaal en verticaal lezen als rasterlijnen). Toon-op-toon: lijnkleur is `meng(vulling, zwart, 0,38)` in licht en `meng(vulling, wit, 0,45)` in donker, dus geen extra kleur. Vaste hoek per reeks (`REEKS_HOEK`: omzet 45, kosten 135, marge 45, netto 135), zodat buren nooit dezelfde richting hebben. Zacht voor grote vlakken: dunnere lijnen op halve dekking. De decal draait met `patternTransform rotate()` met de klok mee; daarom `rotation: -Math.PI / 4` voor 45 graden.

### Sparkline (`components/dashboard/Sparklijn.vue`, eigen SVG)

2px lijn in `color-mix(var(--text) 30%)`, laatste punt r 3 in de reekskleur met 2px ring in `--surface`. `null` breekt de lijn (geen val naar nul). `aria-hidden`: getal en delta dragen de informatie.

## 7. Kleur per entiteit

```ts
export function klantKleuren(rijen: KlantRij[], kleuren: ReeksKleuren, tokens: ChartTokens): Map<string, string> {
  return new Map(rijen.map((r) => [r.id, klantKleur(r, kleuren, tokens)]));
}
```

Kleur hangt aan de ID (klant, rij) of de reeksrol (omzet, kosten, marge, netto), nooit aan de rang of de richting. Een filter dat rijen weghaalt herkleurt de overblijvers niet; een frontend-test bewijst dat (spec R5).

## 8. Weergave per visual

`composables/useGrafiekWeergave.ts` + `components/dashboard/WeergavePaneel.vue` (achter "Meer opties" in de kaartkop). Een `KaartDefinitie` per kaart kent alleen de vormen die bij zijn vraag passen (`MAAND_KAART`: gestapeld, naast, lijn, vlak; `BRUG_KAART`: verticaal, horizontaal; `KLANTEN_KAART`: staven, tabel), met regels per type (`toegestaan`, `vast`, `min`, `max`, `uitleg` in gewone taal: "Gestapeld toont kosten en marge, samen de omzet."). Kleurenset uit gevalideerde sets, arcering aan/uit. Onthouden per browser in `localStorage`, elke toegang in try/catch, zodat privémodus of een volle opslag de standaard geeft. Dit is Robins alternatief voor Storybook: aanpasbaarheid in de app.

## 9. Tabel-tweeling en CSV (`components/dashboard/tabel.ts`)

Eén `TabelModel { titel, kolommen: TabelKolom[], rijen: TabelRij[] }` voedt `DashboardTabel` (semantische `<table>` met `<caption class="sr-only">`, getallen rechts in tabelcijfers, scrolt binnen de kaart) en de export. `naarCsv`: puntkomma, komma als decimaal, geen duizendtallen, CRLF, BOM (`String.fromCharCode(0xfeff)`) zodat Excel UTF-8 leest; `csvTekst` zet een apostrof voor tekst die met `= + - @` of tab begint (formule-injectie). Wat je exporteert is wat je ziet, alleen onafgerond.

## 10. Tests zonder vi.mock

- **Optiebouwers**: `components/dashboard/renderProef.ts` roept `renderItem` aan met een nep-coördinatenstelsel (`{ band, schaal, liggend }`) en geeft de getekende elementen plat terug. Zo test je vulling, arcering en dekking zonder renderer:

  ```ts
  const delen = renderProef(series({ type: "naast", reeksen: ["omzet", "kosten"] })[0]!, 1, { band: 80, schaal: (v) => 200 - v });
  expect(delen.map((d) => d.type)).toEqual(["rect", "rect"]);
  ```
- **Data**: injecteer een echte interface via provide/inject in plaats van modules te vervangen. `FinanceDatabron` (`components/finance/financeDatabron.ts`), `AssistentGesprek` (`components/analytics/assistentGesprek.ts`), `TAKEN_BRON`. In de test:

  ```ts
  mount(FinanceView, { global: { plugins: [router, [VueQueryPlugin, ...], {
    install(app: App) {
      app.provide(FINANCE_DATABRON, bron);
      app.provide(ASSISTENT_GESPREK, gesprek);
      app.provide(TAKEN_BRON, voorbeeldTakenBron());
    },
  }] } });
  ```
- **Pure modellen** (`kpiRaster.ts`, `matrix.ts`, `operationeel.ts`, `takenLaat.ts`, `getalControle.ts`): elke grens en tekst zonder renderer, tijd als argument (`emmerVan(taak, nu)`).
- `vi.spyOn` op console of canvas mag; `vi.mock` van een module niet.

## 11. Codehygiëne (Robins lint-regels)

Robins anti-slop-lint (`~/.claude/anti-slop-global/oxlint.config.ts`, gedraaid door de hook `anti-slop-guard.js` op elke Write/Edit van .ts/.js) blokkeert onder meer:

- `require-safety-comment-for-type-assertion`: geen `as` zonder `// SAFETY:`-uitleg (`as const` mag).
- `no-shape-in-symbol-names`: geen symboolnaam met "shape"; de ECharts-sleutel als `"shape"`.
- `no-module-mocking`: geen `vi.mock`/`jest.mock`; afhankelijkheden via echte interfaces.
- `no-object-parameters`: geen anonieme objecttypes als parameter; benoem een interface (zoals `BrugOptieInvoer`). Robin wil hetzelfde voor returntypes.
- `no-unknown-returns`, `no-unknown-parameters`, `no-chained-type-assertions`, `no-unsafe-dictionary-type`.

En in proza en commentaar: geen em-dashes (een guard blokkeert ze); gebruik komma's, dubbele punten of haakjes.

**Valkuil in scoped CSS (donker thema).** `:global(html[data-theme-mode="dark"]) .x { }` compileert tot kaal `html[data-theme-mode="dark"] { }`: `.x` valt weg en de regel kleurt de hele pagina. Schrijf een gewone voorouder-selector, die Vue wel goed scopet:

```css
/* fout: wordt  html[data-theme-mode="dark"] { ... } */
:global(html[data-theme-mode="dark"]) .amr { background: ...; }
/* goed: wordt  html[data-theme-mode="dark"] .amr[data-v-xxxx] { ... } */
html[data-theme-mode="dark"] .amr { background: ...; }
```

Nagerekend op 2026-10-08 met `compileStyle` uit `@vue/compiler-sfc` (de versie in `frontend-app/node_modules`). `AssistentMerkRond.vue` zegt het ook in zijn commentaar.

## 12. Renders, tests en e2e: het bewijs

Dit werkte op 2026-10-08; "klaar" betekent dat alles hieronder groen is.

**Demo-stack** (bron: Robins geheugennotitie `backoffice-demo-stack-renders`):
- Vanuit de worktree `docker compose -f docker-compose.demo.yml up -d` (backend :8022, eigen `backoffice_demo`-db, DEMO_MODE), dan `manage.py migrate` en `seed_demo_volume` in demo-web, dan `BACKOFFICE_DEV_BACKEND=http://127.0.0.1:8022 npx vite --port 5182` (de CSRF-origins van `settings.demo` verwachten 5182).
- Het demo-account heeft rol Operations; de inlog staat in `.harness/analytics-v1/demo-login.txt`. Print hem niet en zet hem nooit in een test of skill: e2e gebruikt `credentials.user()`.
- **Valkuil:** de anonieme API-throttle is 10 per uur. Elke SPA-login en elke e2e-setup kost calls op `/api/v1/auth/me/`; bij 429 blijft de loginpagina op de loader staan en lijkt het een codefout ("veld niet gevonden"). Eén login per run, Playwright-`storageState` hergebruiken; teller resetten met `docker compose -f docker-compose.demo.yml restart demo-web`. Een sessie via Django's `/admin/login/` accepteert de SPA niet.
- Donker thema in een render: `localStorage` `reforge_theme_id=reforge-dark` plus `reforge_mode_voorkeur=dark` vóór het laden.

**Renders van de echte app**: licht 1440, donker 1440, telefoon 375. Schrijf per scherm vooraf op wat je verwacht te zien (en wat niet), lees dan de PNG met Read. Controleer: geen labelbotsingen, geen horizontale scroll, 0 consolefouten, aantal kaarten voor en na (hooguit één erbij), tekst in tekstkleuren.

**Tests**:
- `npx vitest run` (volledig) en `npm run typecheck` (`vue-tsc --noEmit`) met exit 0.
- Backend: de finance- en analytics-tests met `--settings=reforge_backoffice.settings.test`; anoniem geeft 403; de test-runner doet geen HTTP en raakt nooit live Exact.

**e2e** (Robins CLAUDE.md, skills `e2e` en `e2e-rules`): elke UI-wijziging krijgt een test in `tests/*.e2e.ts`; één `agent.act` per doel gevolgd door een exacte `expect`; `credentials.user()`, nooit secrets; na een wijziging één keer `--no-cache`; commit `.e2e/cache/`; klaar is `npx e2e run --reporter list,markdown` groen; bij een fout eerst `.e2e/summary.md` en de foutpagina lezen. Voorbeeld uit `frontend-app/tests/finance-overzicht.e2e.ts`:

```ts
test('finance-overzicht: focusmodus vanuit de visual-header', { session: 'demo' }, async ({ app, agent, screen }) => {
  await app.open('/finance');
  await agent.act("beweeg over de visual 'Omzet, kosten en marge per maand' en klik rechtsboven op het icoon 'Focusmodus'");
  await expect(screen.getByTestId('kaart-focus')).toBeVisible();
  await agent.act("klik op 'Terug naar rapport' om de focusmodus te sluiten");
  await expect(screen.getByTestId('kaart-focus')).toHaveCount(0);
});
```

**Onafhankelijke keurder**: een verse subagent krijgt spec, renders en testuitvoer, niet je eigen samenvatting, en oordeelt vóór je "klaar" zegt. Loop daarnaast de anti-patterns van `dataviz` door.
