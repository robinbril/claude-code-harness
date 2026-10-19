# Website reverse engineering

## Scope and collection

Resolve the exact reference URL from the user's message or selected page. Inventory sitemap.xml, robots.txt, navigation and linked routes. Distinguish canonical pages, redirects, aliases, PDFs and failed URLs. Fetch delivered HTML, CSS, JavaScript and referenced public assets without cookies or credentials. Preserve bytes and a manifest: requested/effective URL, HTTP status, MIME, size, capture time, SHA-256 and local path. Query-version assets need their original URL identities; identical version aliases may share a canonical file for local relative resolution. Do not treat HTML captured before React mounts as the rendered page.

## REA static analysis

```sh
/path/to/rea/scripts/run-rea.sh analyze-javascript-application /absolute/path/captured-source --format json --full-output > /absolute/path/evidence/rea-static.json
```

The `/path/to/rea` above means the installed skill folder, not the upstream Git clone. Run `inspect-analysis-view --help` to page a large Evidence record. REA finds module relationships, imports and endpoint/route candidates. It is not a substitute for direct CSS analysis or rendered screenshots. Capture inline scripts, native relative script paths, loaded shared dependencies and script-created asset references. Preserve originals; create readable derivatives separately.

## Runtime and visual evidence

Use the host's supported browser tool. Record viewport dimensions and actual loaded fonts. For each page family save desktop and mobile DOM/screenshot pairs and inspect a screenshot before claiming visual fidelity. For complete-site scope capture every discovered route at both requested viewports. Full-page capture alone does not prove scroll-triggered content: visit the sections to trigger their actual entry states.

Extract computed CSS custom properties, font family/weight/size/line-height, section bounds, max-widths, gutters, gradients, shadows, radii, media-query thresholds, z-index, sticky behavior and image source/dimensions. Preserve per-family overrides instead of forcing one generic breakpoint system. Record hover/focus/expanded/disabled/error/loading/success states where they matter.

For connected REA CDP use `list-browser-targets` first, then `inspect-web-page`, `analyze-web-bundle`, `capture-web-screenshot`. Existing literal loopback CDP endpoints only; never scan ports or attach unrelated profiles. REA is passive here. Select `include-script-sources` and `include-accessibility-text` when needed. No prior network activity can be recovered.

If the user explicitly requests REA-owned runtime capture, `capture-browser-scenario` can launch a separate temporary browser with a caller-selected executable, provided the host permits that route. Read the installed command schema and [het gebundelde browser-scenario-contract](browser-scenario-contract.md); actions and types are version-specific. Do not bypass the host's browser automation rules. Export captured scripts with `export-web-scripts` into an absent directory, then analyze the export.

## Trace interactions

For every meaningful control record trigger → state → output → reset. Inspect event handlers, hardcoded results, formulas, timers, fake progress, randomness, storage and network calls. Separate active UI branches from dormant/unreachable code. Typical checks: mobile menu, case filters, article TOC/reading progress, pricing slider at default/min/max, known/fuzzy/unknown integration matches, demo happy path and exception, FAQ and form validation contract. Do not click a sending/booking/approval control that changes the real service just to collect evidence.

## Deliverable

Prefer an HTML dossier plus source/evidence folders and machine-readable inventory. Include page/template map, token table, asset manifest, responsive component specification, interaction state machines, formulas/example outcomes, SEO/analytics behavior, reconstruction checklist, measured coverage and explicit unknowns. Link findings to exact source lines or Evidence IDs. Keep proprietary source/license ownership clear when a future implementation will publish assets.

## Repetive lesson

An actual public-site investigation found readable React.createElement modules and CSS, 38 canonical public HTML routes, five prepared agent simulations, a local fuzzy integration catalog and a deterministic pricing calculator. The marketed agent's production capability was not established by the demo's UI. Generalize the method, not those counts or the site's architecture: each new target needs fresh evidence.
