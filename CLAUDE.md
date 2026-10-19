# CLAUDE.md: Code Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Derived from
[Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876)
on LLM coding pitfalls.

**Tradeoff:** these bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them, don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it, don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work")
require constant clarification.

## 5. Verify Before "Done"

- "Done" exists only after a tool call that proves it: a test, build, curl, render or query.
  End with `VERIFIED: <what ran> -> <real output>` or `UNVERIFIED: <why not>`. Enforced by
  `verified-claim-guard`.
- Something a human must see: a real render (`node scripts/shoot.js`) or an e2e run (skill `e2e`).

## 6. Look It Up, Don't Assume

- Identifiers, existing concepts, where it really runs, every call site: read the source before typing.
- Follow the contract of two sibling implementations.

## 7. Structure

- Files 200 to 400 lines; 800 is the hard limit. A file growing past it gets split by
  responsibility before you build on. Functions under 50 lines, nesting at most 4.
- The root explains the project: entrypoints, manifests, README and config that tooling needs there.
- Folders are named for their responsibility. New project: group by feature. Existing repo: follow
  the layout that is already there.
- Dependencies flow one way: UI to domain to data. Domain logic stays free of framework, database and HTTP.
- New repo or reorganisation: skill `projectstructuur`.

## 8. Models

| Tier | Model | Effort | Use |
|---|---|---|---|
| Orchestrator | Opus 5.5 (`claude-opus-5-5`) | high | Main session, planning, architecture, review, final verification |
| Worker | Sonnet 5.5 (`claude-sonnet-5-5`) | medium | Bounded implementation, refactors, writing tests |
| Cheap | Haiku 5.5 (`claude-haiku-5-5`) | low | Search, running builds and tests, log triage |

- Haiku never judges correctness or security, picks architecture, edits production code or accepts work.
- A subagent result is a claim. The orchestrator runs the acceptance check itself.

## 9. Before Irreversible Steps

- Delete, push, send or production deploy: first write
  `BLAST RADIUS: what dies, collateral scope, reversible?` and wait for a yes.
- Never commit or push on your own (skill `commit-discipline`).
- The same correction given twice becomes a rule or a skill, not a third correction.

## 10. Compacting

Keep: the goal, the plan with done and open, touched files, test commands with their last result,
open decisions. Drop: tool output, dead ends, repeated file contents.

---

This file sets behavior; the skills set process (plan → debug → verify) and
craft (UI, documents). On conflict, this CLAUDE.md wins,
user instructions always take precedence over skills.
