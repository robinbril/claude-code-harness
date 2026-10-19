# De compacte top-right themeselector (topbar-trigger)

Dit is de kleine themeselector rechtsboven in de topbar: een icoon-knop
(zon/maan/monitor die in elkaar morphen) die een rechts-uitgelijnd menu opent met
**Licht / Donker / Systeem** (radio) en, na een divider, **Geavanceerd**. Het is de
elegante ENTRY POINT naar de theme-engine; "Geavanceerd" opent de volledige
Weergave-dialoog (de `dialog_v2` / Appearance-modal uit deze skill).

De grote dialoog toont ALLES (18 colourways, custom kleuren, glas, font, dichtheid).
Deze trigger geeft de drie keuzes die 95% van de gebruikers wil, inline, zonder de
dialoog te openen. Bouw beide: de trigger in de topbar, de dialoog achter
"Geavanceerd".

Bron (canoniek, Vue): `applicant_tracking_system/frontend-v4/src/components/ThemeToggle.vue`.
`ThemeToggle.vue` hiernaast is een 1-op-1 snapshot.

## Engine-contract (wat de trigger van de engine nodig heeft)

De trigger schrijft NOOIT zelf tokens. Hij roept vier acties aan en leest een
reactieve "huidige modus". In de Vue-engine (`useTheme.ts`):

| Trigger-actie | Engine-call |
|---|---|
| Licht | `applyTheme(LIGHT_DEFAULT_ID)` (bv. `"polpohire"`) |
| Donker | `applyTheme(DEFAULT_ID)` (bv. `"midnight"`) |
| Systeem | `followSystem()` — zet `followsSystem=true` en volgt `prefers-color-scheme` |
| Geavanceerd | `settings.open()` — opent de volledige Weergave-dialoog |

Reactieve leesbron voor het bolletje/vinkje:
- `followsSystem` (ref) → als true is de actieve keuze "Systeem".
- anders `presetIsDark(activeThemeId.value)` → "dark" of "light".

## De invariant die drift voorkomt

**`applyTheme` is de ENIGE token-writer.** De trigger en de grote dialoog roepen
allebei dezelfde `applyTheme`/`followSystem` aan; geen van beide zet zelf CSS-vars.
Daardoor kunnen het snelmenu en de dialoog-picker nooit uit elkaar lopen. Kopieer
deze regel mee: laat een top-menu nooit een eigen tweede code-pad naar de tokens
maken.

## i18n-keys

```
topbar.themeToggle: "Thema"
topbar.themeMenu.light: "Licht"
topbar.themeMenu.dark: "Donker"
topbar.themeMenu.system: "Systeem"
topbar.themeMenu.advanced: "Geavanceerd"
```

## Plaatsing en vorm

- Mount in het rechter-cluster van de topbar (naast de andere icoon-knoppen).
- Knop is een 34px `iconbtn` zodat hij matcht met zijn topbar-buren; een
  onzichtbare `::after inset:-5px` maakt er een 44px tap-target van.
- Panel: `position:absolute; right:0; top:calc(100% + 8px); transform-origin:top right`
  zodat het onder de knop opent en naar rechts uitlijnt (origin-aware, niet vanuit
  het midden).
- Icoon-morph (zon↔maan↔monitor) en panel-pop respecteren
  `prefers-reduced-motion`.
- Sluit op outside-click en op Escape (listeners alleen actief terwijl open).

## Wiring per spoor

- **Vue (PolpoHire / build-step):** kopieer `ThemeToggle.vue`, wissel de imports
  naar je eigen `useTheme`, `useSettings`, `Icon` en `v-tip`. Klaar.
- **Vanilla-JS (Odysseus-platform / geen build):** herbouw dezelfde vier acties
  tegen de vanilla-port-engine (`theme_v2.js`): Licht/Donker → `applyColourway()`
  met de licht- respectievelijk donker-default colourway-id; Geavanceerd →
  `openThemeDialog()`; Systeem → een eigen `prefers-color-scheme`-follow (de
  vanilla-port heeft geen kant-en-klare `followSystem`, schrijf een kleine
  media-query-listener die bij change de juiste default-colourway zet). Gebruik
  dezelfde markup/CSS-klassen als hierboven zodat het contract deelt met de
  dialoog.

## Wat NIET te doen

- Geen tweede token-writer naast `applyTheme`/`applyColourway`.
- Geen ondersteunende subtekst onder de menu-items; één label per rij (Licht,
  Donker, Systeem, Geavanceerd) is genoeg.
- Systeem is geen derde "thema" maar een volg-modus; toon het vinkje op Systeem
  zolang `followsSystem` waar is, ook al is de onderliggende preset licht of donker.
