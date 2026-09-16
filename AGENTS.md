# Project structure guard

For a new repository, create a small `.project-structure.json` before adding
new top-level areas. Keep only the areas that fit the project and document the
chosen seams in its boundary document.

- Do not use this policy to silently reorganize an existing repository.
- Add an exception explicitly in `allowedRootFiles` when a root config file is needed.
- Add forbidden import rules only when the language pattern is actually checked.
- Run `node scripts/project-structure-check.js --repo .` after changing the policy.
- Treat a passing check as protection against new drift, not proof of a good design.
