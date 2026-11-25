# ECharts in Vue: opzet, recepten en tests

Wanneer lezen: zodra je een grafiekcomponent bouwt of wijzigt in een Vue 3-app met ECharts. Bestandsnamen zijn voorbeelden; volg de indeling van je eigen repo.

Stack: Vue 3.5, ECharts 6.1, vue-echarts 8, SVG-renderer, vitest + vue-tsc.

## 1. Eén ECharts-opzet

Eén bestand registreert ECharts. Nieuwe vormen registreren hier hun module.

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

SVG: scherp op elk scherm, printbaar, zonder canvas in jsdom. Een test tekent een custom series als SVG en faalt als `CustomChart` uit `use()` verdwijnt (zrender meet tekst via canvas; zet in de test `HTMLCanvasElement.prototype.getContext` op null).

## 2. Waarom alles een custom series is

De standaardseries halen de vaste maatvoering niet: kolommen hooguit 24px, 4px rond aan het data-eind en recht op de basislijn, 2px lucht in plaats van een rand, 2px lijnen met eindpunt en ring. De grafiek is `silent: true` en alleen tekenwerk; hover, focus, tooltip en klik zitten in een HTML-laag erboven.

## 3. Anatomie van een grafiekcomponent

1. **Optiebouwer**: pure functie van een benoemde invoer-interface naar een ECharts-optie. Geen Vue, geen DOM.
2. **Tekening**: `<VChart :option :init-options="INIT_OPTIES" aria-hidden="true" />`, absoluut, `pointer-events: none`.
3. **Knoppenlaag**: per maand, staaf of rij een `<button>` met voluit `aria-label`, roving tabindex; `@mouseenter` en `@focus` zetten dezelfde index, dus toetsenbord = hover. De tooltip (`role="status"`) volgt die index en blijft binnen de grafiek.
4. **Tabeltweeling**: één tabelmodel voor tabel en CSV.

```vue
<VChart class="tekening" :option="optie" :init-options="INIT_OPTIES" :autoresize="kanMeten" aria-hidden="true" />
<div class="banden" role="group" aria-label="Maanden. Pijltjes om te bewegen.">
  <button v-for="(k, i) in kolommen" :key="k.key" type="button" class="band"
    :tabindex="i === rovingIndex ? 0 : -1" :aria-label="ariaLabel(k)"
    @mouseenter="actief = i" @focus="opFocus(i)" @blur="actief = null"
    @keydown="opToets($event, i)" @click="opKlik(k)" />
</div>
```

De knoppenlaag is een sibling van `<VChart>`. Zet je `AriaComponent` aan, dan krijgt de container `role="img"` en verdwijnen kinderen daarvan voor schermlezers. jsdom kent geen matchMedia of ResizeObserver: teken dan op vaste maat.

## 4. Tokens: het proefelement

ECharts kent geen `var()` of `color-mix()`. Los elke CSS-token op via een onzichtbaar element:

```ts
const proef = document.createElement("span");
proef.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
document.body.appendChild(proef);
try {
  proef.style.color = "var(--chart-marge)";
  const kleur = getComputedStyle(proef).color; // de browser rekent het uit
} finally {
  proef.remove();
}
```

Lees ook de goed- en slecht-token voor afwijkingsvullingen. Houd een lichte terugval zodat jsdom dezelfde kleuren ziet. Een `MutationObserver` op het thema-attribuut van `<html>` bouwt de optie opnieuw bij een themawissel.

## 5. Gedeelde maten

| Maat | Waarde |
|---|---|
| Kolom of staaf maximaal | 24px |
| Lucht tussen vlakken | 2px |
| Ronding aan het data-eind | 4px |
| Eindpunt van een lijn | r 4 met 2px ring in de oppervlaktekleur |
| Schone as | stappen 1, 2, 2,5, 5, 10; nul altijd op een gridlijn |
| Kolombreedte binnen een band | 0,46 (één) of 0,78 (groep) |

Animatie 230 ms `cubicOut`, update 160 ms, uit bij reduced motion. Gridlijnen doorgetrokken en licht, geen asstreepjes, geen asnaam.

## 6. Recepten

**Kolom**

```ts
renderItem: (params, api) => {
  const k = kolommen[params.dataIndex];
  if (!k) return null;
  const [midden = 0, basis = 0] = api.coord([params.dataIndex, 0]);
  const maat = api.size?.([1, 0]);
  const band = Array.isArray(maat) ? (maat[0] ?? 0) : (maat ?? 0);
  const breedte = Math.min(24, band * 0.46);
  const top = api.coord([params.dataIndex, k.waarde])[1] ?? basis;
  return {
    type: "rect",
    shape: verticaleStaaf(midden - breedte / 2, breedte, basis, top, k.waarde < 0),
    style: { fill: kleur },
  };
}
```

- **Gestapelde kolom**: kosten onder (recht), marge boven (rond), 1px van elk vlak af. Negatieve marge: alleen het kostenvlak plus een omzetstreep in tekstinkt. Waardelabel alleen op de laatste afgesloten en de lopende maand.
- **Bandregel**: onder 34px per maand krijgt elke tweede maand een naam (terugtellend vanaf de laatste) en vervallen percentages en waardelabels. Tooltip en tabel houden alles.
- **Labels**: label het maximum, de laatste afgesloten en de lopende periode. Test labelvakken op overlap, ook op telefoonbreedte.
- **Lijn**: 2px polyline over afgesloten maanden, het stuk naar de lopende maand op 40% dekking, vlak op 10% dekking.
- **Brug**: elke staaf heeft `van` en `tot`; totalen op nul, stappen zweven, verbindingslijn 1px, label met teken. Liggend zodra de band smaller is dan 52px of de langste naam niet past (tekstschatting = tekens x fontgrootte x 0,62, deterministisch in jsdom). Afwijkingsstappen in de goed- en slecht-token, kosten/omzetstappen in reekskleur.
- **Dumbbell**: lijn van forecast naar actual (2px, 55%), forecast open cirkel, actual gevulde stip; gesorteerd op absolute afwijking; "Overig" alleen tekst.
- **Liggende staven met vergelijkstreepje**: één kleur, rijhoogte 40, vorige periode als streepje van 2px, 8px hoger dan de staaf.
- **Referentielijn**: gestippeld in teksttoken, alleen over de weken die hij middelt.
- **Trap**: gestippeld en gearceerd (prognose), boven elke trede wat er wegvalt; overlappende labels vervallen, grootste daling eerst.
- **100%-balk**: HTML, geen ECharts; vlakken in categorievolgorde, later = donkerder, elk vlak een knop.
- **Matrix met databalken**: groepen en losse regels elk een eigen maximum per kolom, anders vult geen regel zijn cel.
- **Arcering**: decal op 45 of 135 graden, toon-op-toon (licht 38% naar zwart, donker 45% naar wit), vaste hoek per reeks.
- **Sparkline**: eigen SVG, 2px lijn, laatste punt met ring; `null` breekt de lijn; `aria-hidden`.

## 7. Kleur per entiteit

Kleur hangt aan de ID of de reeksrol, nooit aan rang of richting. Een filter dat rijen weghaalt, herkleurt de overblijvers niet; bewijs dat met een test.

## 8. Tabeltweeling en CSV

Semantische `<table>` met `<caption class="sr-only">`, getallen rechts. CSV: puntkomma, decimale komma, geen duizendtallen, CRLF, BOM; zet elk veld tussen aanhalingstekens en verdubbel aanhalingstekens erin; zet een apostrof voor tekst die met `=`, `+`, `-`, `@`, tab, CR of LF begint. Excel kan die apostrof bij opslaan verwijderen; exporteer dus geen onvertrouwde tekst die iemand opnieuw opslaat en deelt.

## 9. Tests

- **Optiebouwers**: roep `renderItem` aan met een nep-coördinatenstelsel en toets de getekende elementen.
- **Data**: injecteer een echte interface via provide/inject in plaats van modules te mocken.
- **Pure modellen**: elke grens en tekst zonder renderer, tijd als argument.

**Valkuil in scoped CSS.** `:global(html[data-theme="dark"]) .x { }` compileert tot kaal `html[...] { }` en kleurt de hele pagina. Schrijf `html[data-theme="dark"] .x { }`.

## 10. Bewijs

- Renders van de echte app: licht 1440, donker 1440, telefoon 375; verwachting vooraf opgeschreven.
- Log één keer in per run en hergebruik de sessie: een strakke throttle op de login lijkt anders op een codefout. Zet nooit een inlog in een test of skill.
- Unit-tests en typecheck groen; backend-tests zonder live externe systemen; e2e voor de UI-wijziging.
