# Fixing (only with `--fix`)

Order: before, fixers, after, ship. Rules: a fix adds no layer, flag, fallback or second path; a sprawl fix ends with fewer production lines; over about 3 production files or a data model change is its own branch and PR with a design note.

## Orchestrator: before the fixers start

0. Run the tests around the touched code on the untouched head, isolated: that red was already there. Fix target, used below as start and as PR base: the audited head branch; for a merged PR the branch it was merged into; for a path audit the default branch. A fork or someone else's branch gets a patch, no push.

1. Fetch the fix target and branch from its fresh tip. Not from the base of an open PR: the audited code is not there. Check each confirmed finding on that tip; already solved: `dropped`, with the commit as proof.
2. Make a fix plan: theme, branch, worktree, finding ids, files owned, test commands, reserved numbers (migrations of open PRs). No file has two owners at the same time. A root cause seen in several areas goes to the branch that owns the shared place.
3. Isolated test environment per fixer: own database name, port and cache; never the shared dev stack. Install dependencies once, from the lock file.
4. At most 6 fixers at once. A refactor starts after the fixes that touch its files are committed.
5. Decide nothing that is a product decision. Those stay out of every branch.

## Fixer: per finding

1. Read the finding, the verdict (it beats the finding) and the real code. Search every user of what you will change.
2. Write the red test. Run it. A confirmed UI finding gets an e2e test in the repo's own style when the repo has e2e. It must fail for the reason in the scenario. It will not go red after an honest attempt: `dropped`, with what you ran as proof. The orchestrator reruns that for every critical and high.
3. Fix at the shared place, with the smallest change. Reuse the existing home. Match the neighbours. No new layer, flag, fallback, wrapper, option or compat path. Remove what your fix makes unused, in the same commit.
4. Green: the new test, its siblings, every test file that names a symbol you changed or removed (search, do not guess), types and lint for the files you touched.
5. Commit per theme (when your agent type may not commit: leave the edits, write `"commit": "TBD"`, the orchestrator commits and fills it in), explicit paths only. Message: what and why, one to four lines, following the repo's commit and attribution rules. Never bypass hooks; a check that cannot run here is skipped only by the repo's own documented route, with the reason.
6. Stop on the item and report it when it needs a product decision, a data model change, or more than about 3 production files (`large`, with a design sketch).
7. Do not push, open PRs, or touch files you do not own.

Proof other than a red test:

| Kind | Proof |
|---|---|
| Parser, money, date, sort | the red example, plus one property over generated input when the repo has a library for it (`property-based-testing`); the property must fail on the old code |
| Removal | search in all languages shows no user (strings, registries, templates, routes, jobs, external callers); build and tests with the same count, minus the tests of the removed code, named |
| Merge of rivals | one test table with the inputs where they differed; each caller moved; the losing version deleted in the same commit. A changed outcome is a behaviour delta |
| Refactor | the same tests green before and after, same count; public contract identical (API schema dump, exports, routes); no test edited except imports |
| Test fix | break the production line for a moment: the test goes red; restore |
| Docs | the corrected command or path runs or exists |
| Migration | up, down and up again on a copy with representative rows |

Net lines: report production lines added and removed per branch. A sprawl branch must end below zero.

Output `RUN/fixes/<branch>.json`:

```json
{"branch": "...", "items": [{"id": "A1-03", "action": "fixed|dropped|product_decision|large|blocked",
  "commit": "sha", "branch": "...", "proof": "fixed and dropped: red then green with the test name, or the proof above", "reason": "for anything not fixed",
  "behaviour_delta": "who notices what, or none"}], "net_lines": -120, "checks": ["command -> last line"]}
```

## Orchestrator: after and ship

0. `gate.py fixes RUN`: every confirmed finding is `fixed`, `dropped`, `product_decision`, `large` or `blocked`.

1. Read each diff. Reject: unrelated changes, weakened tests, new indirection, swallowed errors, a fix in one caller of many, text that explains history.
2. Rerun at least every critical and high red test yourself, on the untouched head (red) and on the branch (green).
3. Merge all branches into a throwaway branch in merge order; full checks there. Conflicts: solve in the later branch. New red against the baseline goes back to its fixer; red that was there before is named as such.
4. Post-fix sweep: run `plan.py` on the throwaway branch against the tip of the fix target, with its own `--run`, and give that diff one fresh area reader. Fixes create bugs too. Confirmed ones get one more round.
5. Before the PR: `plan.py` on the branch shows the facts reviewers ask about (merge, other PRs, claims, skipped checks); solve them. Every sentence in the body is true on this head: counts from the last run, consumers named one by one, each changed behaviour listed, nothing skipped without a reason. Optional `revertcheck.py` on the touched tests.
6. PR body: what and why · Behaviour delta · findings closed, with ids · proof · design note for a large one · net lines · merge order and what it depends on · open decisions.
7. Push, open the PRs into the fix target by the repo's PR and attribution rules, run the repo's review skill on each (at most two rounds), `render.py RUN`, `gate.py clean RUN`. Remove only your own worktrees and containers.
