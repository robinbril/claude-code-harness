# Project structure skill

## Goal

Give an agent one reusable workflow that can either design and enforce a new
repository layout or inspect and safely restructure an existing repository
after explicit authorisation.

## Requirements

- A structure contract names its root areas, permitted root files,
  each area's responsibility, and checkable dependency rules.
- The existing-repository workflow inventories files, runtime/config references,
  CI and deploy paths before any move. It labels evidence as active, disabled,
  obsolete, or unknown without deleting on inference.
- The new-repository workflow chooses only necessary areas, without inventing
  frontend or backend folders.
- The checker rejects excess root areas, unapproved root files, and supported
  forbidden dependency directions. It does not pretend to judge architecture.
- A migration plan updates imports, build contexts, mounts, scripts, CI, and
  documentation together, then runs the repository's relevant behaviours.
- A deterministic inventory/check/init helper and representative fixtures prove
  the hard rules. The skill explains the soft judgement that still requires an
  agent.

## Acceptance

1. A messy fixture produces an inventory and a valid five-area contract.
2. The checker advises on a seventh root area, fails for root clutter and a
   forbidden supported import, while a valid fixture passes.
3. A new-project fixture can be initialised with a minimal non-generic layout.
4. The existing pre-write guard and CI use the same checker.
5. The skill does not claim an existing repository was reorganised merely by
   installing a contract.
