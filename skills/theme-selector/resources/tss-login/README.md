# TSS-loginscherm (glaskaart op een WebGL-rookveld)

Het login-scherm van TSS, 1-op-1 uit `tss-platform/web/app/(auth)/login/page.tsx`.
Eén self-contained React-component: een fullscreen WebGL-shader die trage navy
rook tekent, een geblurde glaskaart erboven, floating-label velden, een
morphende oog-toggle en een submit met pijl-nudge. Alle CSS zit inline in de
component (`TSSAUTH_CSS`), dus er is geen los stylesheet nodig.

## Bestanden

| Bestand | Wat |
|---|---|
| `page.tsx` | De complete login-pagina, verbatim. Inline shader (VERT/FRAG), `useSmokeShader`-hook, het formulier en alle CSS. |
| `forge-mark.tsx` | Het Reforge-merkteken als inline SVG (`currentColor`). Op de login wit op het navy glas. |

## Zo werkt de rook

- **Fragment-shader**: gelaagde cosinus-distortie (8 iteraties) buigt de UV, een
  `abs(sin(...))` maakt de golf, `smoothstep(1.15, 0.05, wave)` de gloed. Kleur =
  `SMOKE_COLOR` (`#1a2b5e`, diep gedempt navy).
- **Muis stuurt het ripple-centrum**, maar snapt nooit: elk frame easet het met
  een kritisch-gedempte falloff (`ease = 1 - exp(-dt/0.35)`) naar de muis, en
  zakt bij vertrek terug naar het midden.
- **Fallbacks**: geen WebGL-context = de vaste donkere `background: #05070f`
  blijft staan (geen crash). `prefers-reduced-motion` rendert één stilstaand
  frame (`iTime = 0`, geen `requestAnimationFrame`-loop).

## De drie swap-punten (om hem in een andere app te zetten)

1. **De fetch-call** in `handleSubmit` (`/api/auth/login`) en waar hij na succes
   heen routeert (`data.agreement_signed ? "/" : "/agreement"`). Vervang door je
   eigen auth-endpoint en bestemming.
2. **`ForgeMark` + de wordmark** (`"The Staffing Society"`). Vervang het merkteken
   en de tekst door je eigen logo. `forge-mark.tsx` ligt ernaast als voorbeeld.
3. **`EyeToggleIcon`** (wachtwoord tonen/verbergen). Komt uit de `animated-icons`
   van TSS (zie de "bewegende iconen"-sectie in `SKILL.md`). Vervang door een
   statisch oog-icoon als je die set niet meeneemt: `open`-prop → toon/verberg.

## Kleuren (los van de theme-engine)

Het login-scherm staat BEWUST los van de colourway-engine: hij is altijd donker
navy, ongeacht het gekozen thema, zodat het merk-moment consistent blijft. De
accent-kleuren zijn hardcoded blauw (`#2563eb` submit, `#3b82f6` focus, `#60a5fa`
label-focus, `#8ea2ff` link). Wil je hem het thema laten volgen, vervang die
hexen door `var(--brand)` en de `SMOKE_COLOR` door de RGB van je `--brand`.
