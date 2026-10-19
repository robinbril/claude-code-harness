---
name: rea
description: Reverse engineer websites, shipped apps, JavaScript bundles and binaries with REA, backed by evidence. Use for /rea and exact interface reconstruction; not for ordinary source-code review.
---

# REA: Reverse Engineer Anything

Use the local REA tool to investigate the target the user actually supplied. A reverse-engineering request produces findings and a reconstruction blueprint. Build a replica only when the user also asks for implementation. Do not confuse the REA repository with the app being investigated.

## Start

- Read [the bundled upstream workflow](references/upstream/SKILL.md) and only its relevant references. It covers binaries, packages, JavaScript, Android and passive runtime inspection.
- Prefer already-connected REA MCP tools and their current schemas. No startup diagnostics when working tools exist.
- Without MCP, use `scripts/run-rea.sh <command> ...` relative to this skill. It prefers an installed `rea`, otherwise runs the verified npm release with npx. This works in Claude Code, Codex and Cursor without global MCP changes.
- Read `<command> --help` or `--schema` before supplying unfamiliar inputs. Save complete `--format json --full-output` output to a local evidence file; large output belongs in files, not chat.
- Existing Node must satisfy the package requirements. Do not install or upgrade unrelated runtimes, native engines or global client settings as part of an investigation.

## Websites and visual reconstruction

Read [website workflow](references/websites.md). Inventory public routes and delivered source before guessing implementation. Browser screenshots establish appearance; source establishes formulas and event logic; runtime actions establish behavior. Keep these evidence types separate.

For a complete-site request, capture all discovered public routes and page families, exact design tokens, fonts, assets, responsive rules, motion, navigation, demos, calculators, filtering, consent and form boundaries. List gaps rather than calling inaccessible server code reconstructed. Local source acquisition is analysis; it is not a production clone.

## Connection setup only when requested or necessary

Read [local clients](references/local-clients.md). Plan MCP configuration changes with REA's dry-run first; preserve unrelated config and inspect the plan before applying the authorized client scope. Registering tools does not make them appear in a running session: restart/reconnect the client. A CLI fallback can continue useful work immediately.

## Evidence and completion

- Preserve URL/path, effective URL, timestamps, SHA-256 and REA Evidence IDs. Distinguish observed, derived, inferred and unknown.
- A advertised live agent, demo or calculator may be a fixed client-side simulation. Trace the event handler and actual data source, then verify one meaningful branch in the browser.
- Never submit contact forms, applications, bookings or outbound messages merely to inspect a site. Document an observed form's request contract; a sending test needs its own task scope.
- Finish with the deliverable, actual checks and material gaps. Match the user's requested response length; a thorough local dossier can accompany a short chat answer.
