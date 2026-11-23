# Companion skills

For the orchestrator, in phase 0. Take only the rows whose trigger the plan shows. A companion adds checks, leads or a method to an agent that already exists here; it never starts its own workflow, agents, report, commits or fixes. Output of a script is a lead, never a finding. Not installed: go on without it, one line in `not_verified` only when its trigger matched.

| Trigger | Companion | Who gets it | What is taken |
|---|---|---|---|
| Every confirmed critical or high | `variant-analysis` | Variant hunter (phase 3) | its five steps; not its plugin workflow |
| Parser, normaliser, encoder, money, date, sort or comparison code in a finding or a fix | `property-based-testing` | area reader (which invariant is missing), fixer (the red test) | the property catalog and the two ways a property asserts nothing. No Hypothesis or fast-check in the repo: write a table of examples and propose the dependency, do not add it. Its frontmatter lowers effort: read its files, do not invoke it |
| A `needs_validation` that a local run can settle, or a red test that will not go red | `diagnosing-bugs` | verifier or fixer | phase 1: build one command that goes red on exactly this bug |
| Python or TS code | `spaghetti-audit` scripts (`metrics.py`, `coupling.py`, `duplicates.py`) on both trees | Sprawl reader | candidates that are new or worse than base |
| Python or Vue code with deletions or moves | `dead-code-sweep` (`scripts/sweep.py --root <tree> --all --json`) on both trees | Sprawl reader | candidates that base did not have |
| Models, migrations or queries (SQLAlchemy, Postgres) | `data-integrity-audit` (`scripts/integrity.py`) on both trees | area readers with `data` risk, release reader | its failure classes and new candidates |
| Auth, routes, egress, secrets, AI, uploads | `security-audit` companion files | Security hunters | only the file that fits the boundary, chosen by the `sec-*` cards |
| Agents, prompts, tools, MCP, model calls | `airesearch` | area readers with `llm` risk | approval, tool and context checks; no scores |
| Candidate, employee or other personal data | `avg-recruitment-audit` | hunters, area readers | retention, erasure, purpose and automated-decision checks |
| UI files and an e2e setup | `e2e` | UI prover, fixer | open a session, act, observe; tests in the repo's style |
| UI components | `fixing-accessibility`, and the repo's own design skill | area readers of UI | keyboard, focus, names, contrast |
| Path rules exist | `npx -y @alibaba-group/open-code-review delegate rule --format json <paths>` | area readers | the rule text per path |
| The repo has a PR gate or proof skill (`pre-pr-check`, `pr-proof`, `publish-pr`) | that skill | orchestrator, phase 6 | followed in full |

A script's result file goes in the Questions line of the agent that gets it, as a path with the few rows that matter.

Not used, because this skill replaces them: `audit`, `code-audit`, `find-bugs`, `code-review`, `security-review`, `speur-loop`, `fix-loop`, `systematic-debugging`.
