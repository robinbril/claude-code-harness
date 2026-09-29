---
name: frontend-gotchas
description: >-
  Bewezen frontend-valkuilen op deze machine. Use when: building or debugging a Next.js 16/Turbopack/React 19 app; adding routes to a Vite SPA with a dev-proxy; writing CSS hide/override rules for branding overlays; or a chart/preview/screenshot hangs during frontend work.
---

# Frontend-gotchas (Next 16, Vite, CSS-overlays)

Drie domeinen, elk met regels die een echte sessie hebben gekost. De volledige waaroms staan in de wiki-pages; hier de werkregels plus verificatie.

## Next.js 16 / Turbopack / React 19 ([[nextjs16-turbopack-gotchas]])

- Strip relatieve `.js`-import-extensies (NodeNext-stijl) naar extensieloos: Turbopack resolvet ze niet naar `.ts`, en de fout verschijnt soms pas na een schone `.next`.
- Geen recharts `ResponsiveContainer`: meet-loop die de preview-renderer vastzet. Charts als viewBox-geschaalde `<svg>` met afgeronde coords (`toFixed(1)`).
- RSC-grens: nooit een functie als prop van Server naar Client Component; formatteer server-side en geef strings mee.
- SVG-coords uit `Math.cos/sin` afronden op 2 decimalen, anders hydration-mismatch.
- Stray `package-lock.json` in de home-dir: pin `turbopack: { root: "<projectpad>" }` en zet `devIndicators: false`.
- Preview-renderer vast na veel navigaties (screenshot timeout 30s, eval werkt nog): `preview_stop` + `preview_start`; diagnose via eval, niet via nóg een screenshot. Navigatie-regels: [[preview-tool-safe-nav]].

## Vite/SPA dev-proxy ([[vite-spa-proxy-gotchas]])

- Een frontend-route die met de proxy-prefix begint (`/api...`) bestaat effectief niet: de proxy slokt hem op en geeft een JSON-404. Kies routes buiten de prefix (`/settings/api-tokens`, niet `/api-tokens`). Geldt ook in productie achter een reverse-proxy met dezelfde prefix.
- Test: navigeer ernaartoe; een redirect naar `/login` bewijst dat de SPA de route pakt, een JSON-404 bewijst dat de proxy hem heeft.

## CSS-overlays en branding ([[css-overlay-gotchas]])

- Verbergregels altijd pagina-scoped onder een ancestor-selector; een globale `img[src*="..."]{display:none !important}` raakt elk hergebruik van het asset (boot-animatie, header, favicon) en wint qua specificiteit van legitieme styling.
- Na zo'n regel: verifieer dat het asset op de ANDERE plekken nog rendert, niet alleen dat de doelpagina klopt.

## Lokaal HTML-bestand bekijken

- `navigate` plakt `https://` voor een URL die niet met http begint, dus `file:///C:/...` wordt `https://file:///C:/...` en levert een errorpagina. Een screenshot faalt daarna met "Frame with ID 0 is showing error page".
- Werkroute: serveer het bestand en navigeer naar http. Kopieer het naar een lege map, `python -m http.server <poort> --bind 127.0.0.1` in de achtergrond, navigeer naar `http://127.0.0.1:<poort>/`, en stop de listener daarna op poort in plaats van op procesnaam.
- `scroll_amount` is gemaximeerd op 10; meer scrollen doe je met `repeat`, niet met een hogere waarde.

## Klaar-criterium

Een frontend-fix is af wanneer de pagina vers geladen is (schone cache waar relevant), de flow doorgeklikt, de console leeg, en bij overlay-werk de neven-locaties van het geraakte asset gecheckt. Een geslaagde build is geen bewijs; Turbopack-fouten zijn runtime.
