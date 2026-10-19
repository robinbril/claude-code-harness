---
name: pre-pr-gates
description: >
  Review kill-gates before opening or updating a PolpoHire PR. Use before
  every `gh pr create`, `gh pr ready`, "open een pr", "klaar voor review", or
  when reporting a feature branch as review-ready. Catches the recurring
  review classes that tests and typecheck do not: ghost versions, cancelled
  gestures that commit, swallowed DB errors, unwired production paths,
  oracle/predicate drift, sibling-page inconsistency, missing org_id tests,
  and stale PR descriptions. After the checklist, emit a `PRE-PR CHECK:`
  artefact before `gh pr create` (poort's PR gate in `tools/poort` checks it).
---

# Pre-PR gates (review kill-gates)

Run this **after** the render proof below on a frontend diff, and **before** a
final code review and opening the PR. This skill is the open-PR gate.

The failure mode it kills: a PR that looks finished, then comes back from
review with the same HIGH/blocking comments as the last five PRs.

When finished, write this line in visible assistant text (not thinking):

```
PRE-PR CHECK: ghost=ok; gesture-cancel=ok; except-rollback=ok; prod-path=ok; oracle=ok; siblings=ok; org-id=ok; description=ok; render=ok; console=ok; behaviour=ok; motion=n/a
```

Any gate that does not apply is `n/a`, never silently `ok`. A failing gate
is a code fix, not a waiver. If a PR-gate hook reads the
artefact from a state file, write it there in its OWN Bash call, before the
call that runs `gh pr create`: a write inside the same command is not seen.
poort's PR gate (`tools/poort`) ties the evidence to the exact commit.

Do **not** run `gh pr create` until every applicable gate is `ok` or `n/a`.

---

## Gate 1 — Ghost version (`feedback_no_ghost_version`)

Error, empty, loading, and zero must not look the same.

For every async fetch this diff adds or touches:

- [ ] `.error` is read in the template (or the computed that feeds it).
- [ ] Failed fetch does **not** render as "0 items" / empty state / "—".
- [ ] Loading is distinct from empty.

Pattern: siblings already using `EmptyState v-if="xAsync.error.value"` are
the template. A new `?? []` on a failed fetch is a ghost.

## Gate 2 — Cancelled gesture must not commit

If the diff binds `@pointercancel` or a drag/resize `pointerup`:

- [ ] `pointercancel` is **not** the same handler as `pointerup`.
- [ ] Cancel reverts to the pre-gesture state and does **not** persist.
- [ ] Escape (if a keyboard cancel exists) takes the same revert path.
- [ ] A test exists that cancel does not call persist/onDrop.

Known incident: card-drag had a dedicated cancel; tile-resize rebound
`@pointercancel` to `onResizeUp` which always `persistDraft()`.

## Gate 3 — `except` + live SQLAlchemy session

If the diff has `except Exception` (or a broad `except`) around DB work:

- [ ] `db.rollback()` runs before the loop/caller continues.
- [ ] The error is logged with context (`logger.exception`, not swallowed silent).
- [ ] A test proves the session is still usable after the failure
      (`PendingRollbackError` must not escape).

A logged-and-continued `except` without rollback poisons the rest of the
request.

## Gate 4 — Feature is wired into the production path

If the diff adds a column, flag, or helper:

- [ ] Search every writer of that model (`ModelName(` and `db.add`).
- [ ] The path users actually hit (board confirm, workflow node, public
      API, not only the new settings endpoint) **writes the field**.
- [ ] A test hits that production path, not only the helper in isolation.

Known incident: `expected_start_date` existed on create/update in revenue
and never on `confirm_placement` / workflow deal nodes — the feature
never fired for board placements.

## Gate 5 — Test oracle = production predicate

If the diff adds a filter, realized-check, or date ladder:

- [ ] Python helper, SQL helper, and TS port use the **same** predicate.
- [ ] Frozen oracles (`scripts/gen_*.py`, `*oracle*.json`) call that
      helper, they do not reimplement a weaker filter.
- [ ] Regenerating the oracle is a conscious step, not a silent skip.

## Gate 6 — All sibling consumers

If the diff changes a pattern used on more than one page (activity feed,
empty state, contact-moment body, summary tile):

```
rg "<component-or-pattern>" frontend-v4/src/views/
```

- [ ] Every sibling page got the same change, or an explicit reason why
      one stayed different is in the PR body.
- [ ] "I migrated 3 of 4" is a blocking finding.

## Gate 7 — Cross-org isolation test (RLS is dormant)

If the diff adds a table or an org-scoped endpoint:

- [ ] A test creates a row in org A and asserts org B reads the default
      / 404 / empty, **not** A's data.
- [ ] The query filters `org_id` (the only in-process isolation).

## Gate 8 — PR description matches the code

- [ ] Routes claimed in the body exist in `tests/e2e/00-smoke.spec.ts`
      if they are new top-level routes.
- [ ] Invariants in the body match the code (e.g. "never below actual"
      vs "strictly greater").
- [ ] Behaviour delta section lists intended changes; anything else in
      the diff that changes behaviour is a bug.

## Gate 9 — Sink coverage and failing-condition tests

If the diff fixes or adds a callback, handler, guard, redirect or early
return:

- [ ] The fix sits on the sink (the function every path converges on), not
      on one of its callers. `rg` every caller/trigger and list them in the
      PR body or the `VERIFIED:` line.
- [ ] Every new guard or branch has a test that triggers its failure
      condition for real (a failing storage delete, a header-only file, a
      refresh that fails). A source-text test (`?raw` import plus regex or
      `toContain` on the source) pins text, not behaviour, and does not count.

Known incident: 2eb7c32c patched one of three `onLogout()` triggers; the
demo-reset guard and the header-only rejection shipped with no test that hit
their condition (#657 review).

If the diff adds `CREATE INDEX` in `db/migrations/`:

- [ ] The table is created in the same migration, or the index is declared
      on the ORM model instead (`ensure_additive_indexes()` builds it
      CONCURRENTLY). A plain `CREATE INDEX` on an existing table SHARE-locks
      it for the whole build during deploy. `polpo-guard` blocks this on
      write and on commit.

## Gate 10 — Frontend render proof

Applies when the diff touches `.vue`, `.tsx`, `.jsx`, `.css`, `.scss` or
`.html` under a frontend directory. Otherwise write
`render=n/a; console=n/a; behaviour=n/a; motion=n/a`.

- [ ] **Scope first.** Routes/components from `git diff --name-only`. One
      line per route with the expected fact (a number, a label, a position)
      written BEFORE any render. "Looks right" is not a fact.
- [ ] **Render at three widths.** Per changed route:
      `node scripts/shoot.js <url> <out.png> "" 1440` (uit deze harness),
      then 768 and 390. `Read` each PNG and read the expected fact off it. A
      mismatch is a code fix, not a note.
- [ ] **Console clean.** Open each changed route in a browser (or an e2e run)
      and confirm zero console errors and zero failed requests.
- [ ] **Behaviour.** A changed flow on a demo or non-PII page:
      an e2e flow test passes (skill `e2e`, `npx --no-install e2e run`). Logged-in, hover or drag state: claude-in-chrome with the
      state visible in the screenshot, else `UNVERIFIED`.
- [ ] **Motion.** If the diff adds or changes `transition`, `animation`,
      `@keyframes` or motion props: run skill `emil-design-eng`.

---

## Auto-run order (do not skip or reorder)

1. Render proof — only for a frontend diff: the render, console and behaviour gates above.
2. **This skill (`pre-pr-gates`)** — the ten gates above.
3. `find-bugs` — full-diff security/logic pass.
4. A code review against standards and spec (e.g. `code-review` from mattpocock/skills).
5. Open the PR — only after the `PRE-PR CHECK:` artefact is written.

The render proof is the "the screen is proven" gate. This skill is the
"this may become a PR" gate. The code review is the last human-shaped
read before `gh pr create`.
