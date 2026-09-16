---
name: project-structure
description: Set up or review an enforceable project layout policy for a new codebase; do not use it to blindly reorganize an existing repository.
---

# Project structure

Use the repository's `.project-structure.json` and `scripts/project-structure-check.js`.

- Pick only the top-level areas the project needs. `infra` projects do not need `frontend`.
- Put exceptions in `allowedRootFiles`; do not silently make a new root folder acceptable.
- Record the chosen seams in the configured boundaries document and add forbidden imports only where the language pattern is checkable.
- Run `node scripts/project-structure-check.js --repo .` before claiming the policy passes.
- This is a regression guard, not a migration tool. Baseline an existing repository deliberately before enabling it.

The guard can block Claude Code and Codex Write/Edit calls and common shell redirections. Cursor only exposes a shell hook, so editor writes in Cursor remain outside pre-write enforcement.
