---
name: e2e-rules
description: House rules for end-to-end UI tests with e2e (TesterArmy). Use alongside the e2e skill on any UI change in a web or mobile app, when setting up e2e in a project, and when an e2e run fails. Covers the subscription-only model setup, the config template, file naming, when e2e runs, advises or is skipped, and when a task counts as done.
---

# e2e house rules

- On a UI change in a web or mobile app: add or update an e2e test. Use the `e2e` skill and the `e2e` MCP server.
- Project without e2e: copy `assets/e2e.config.template.ts` from this skill to `e2e.config.ts`, adjust `targets` (start command, URL), then `npm i -D e2e@0.21.2 @e2e-dev/web@0.15.2 ai@7.0.143`. The template runs models on your own Claude seat through `claudeSeat()` from poort, which ships with this harness: `node <harness>/tools/poort/poort.mjs init` (v0.4.1); fix the relative import of `.poort/integrations/e2e-claude-seat.mjs` if the config sits in a subfolder. Without poort, set the model in the config as the `e2e` skill describes. Do not run `npx e2e init` over an existing config.
- Test files are named `*.e2e.ts` and live in `tests/`.
- Models run on the user's own Claude seat: `claudeSeat()` from `.poort/integrations/e2e-claude-seat.mjs` runs `claude -p`. No API keys, no proxy, no other providers. Switch models with `E2E_MODEL` / `E2E_JUDGE` (Claude ids, e.g. `claude-sonnet-5-5`, `claude-opus-5-5`). Not signed in: ask the user to run `claude` and log in, or to set `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`. Recording sees demo data only; replay calls no model.
- One `agent.act` per goal, followed by an exact `expect`.
- When e2e runs: see the table below. Where it runs and counts, done = `npx --no-install e2e run --reporter list,markdown` passes. On failure, read `.e2e/summary.md` and the failure page before changing code.
- After changing a test, run it once with `--no-cache`. Commit `.e2e/cache/`.
- Never put secrets in tests; use `credentials.user()`.

## When e2e runs

e2e is a nice-to-have, not a hard gate. It scales with the size of the PR and with how busy the machine is:

| | Machine calm | Busy | Full |
| --- | --- | --- | --- |
| No UI touched | skip | skip | skip |
| Small UI change | advisory: run it, red does not block | skip | skip |
| Large UI change | run it, red blocks | advisory | skip |

- Large: from 200 changed UI lines, 8 UI files, or 50 lines on a shared surface, over the whole branch.
- Busy or full: load per core from 0.8 or 1.6, free memory under 25% or 10%. Another e2e run on the machine also counts as full.
- poort (`tools/poort`) makes this decision itself for a check of `type: "e2e"`. Without poort, decide from the same table.
- Typecheck, unit tests and smoke tests stay required in every cell.
- Skipped: put `UNVERIFIED: e2e overgeslagen: <reason>` in the PR. Advisory and red: name the red tests as well. Red from a run that counted stays red until a green run; a busy machine does not turn it green.
- A skipped run is never reported as green.
