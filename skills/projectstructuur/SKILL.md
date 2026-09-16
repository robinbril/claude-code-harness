---
name: projectstructuur
description: Ontwerp, herstructureer veilig en bewaak een repositoryindeling die een junior begrijpt. Gebruik bij een nieuwe repo of een expliciet geautoriseerde opschoning van een bestaande repo.
---

# Projectstructuur

Gebruik deze skill als `/projectstructuur`. Laat een repository zichzelf uitleggen
via een paar duidelijke plekken, niet door bestanden alleen netjes te husselen.

## Hard rules

- Treat five or six visible root areas as a review signal, not a rule. Pick the
  number the product needs and explain each responsibility.
- Name an area for its responsibility, not an implementation accident. Only use
  an `-mcp` suffix for a real MCP server.
- Keep root files deliberate: product entrypoints, dependency manifests and
  one-off runtime files only when documented in the contract.
- Never infer that a file is obsolete from its directory or git history. Label
  it active, disabled, obsolete, or unknown with evidence. Do not delete or
  change production configuration without explicit authority.
- The checker proves only objective rules: area count, root entries and selected
  dependency directions. It cannot prove the layout is well designed.
- Hooks inspect direct write tools, patch destinations and common shell commands.
  They are not a universal shell or JavaScript parser, so CI must run the full
  checker after a change.

## Existing repository: inspect, decide, migrate

1. Bootstrap the helpers in the target repository first. Copy this skill's
   `tools/` directory to `.harness/projectstructuur/tools/`; copy
   `tools/project-structure.yml` to `.github/workflows/project-structure.yml`
   only after reviewing the target's existing CI. In the commands below,
   `node .harness/projectstructuur/tools/<tool>.js` is the portable form. A
   harness repository may use its equivalent `scripts/` path.
2. Run `node .harness/projectstructuur/tools/project-structure-inventory.js --repo .` and read the
   result. Then inspect callers, imports, Docker/Compose build contexts,
   mounts, CI workflows, deploy scripts and README references for every part
   under consideration.
3. Write a compact map before moving anything: current item, responsibility,
   evidence of status, callers/runtime references, proposed destination and
   migration risk. Treat a bridge that relays Slack or WhatsApp to an agent seat
   as a bridge, not an MCP server; keep a separate MCP adapter with the product
   it exposes. Group a search engine and its adapter under search, with their
   internal roles documented.
4. Choose the areas that describe the product. Do not manufacture
   `frontend` and `backend` for an infrastructure repository. Put scripts,
   Caddy snippets, Compose files and assets with the responsibility they serve,
   not one directory deeper merely to hide root clutter.
5. Present the map and proposed contract for approval. Installing a contract is
   not a migration and must never be described as one.
6. After explicit approval, move one responsibility at a time. Update imports,
   build contexts, mounts, command scripts, CI, deploy paths and README in the
   same change. Run the entrypoint and behaviour tests that exercise each moved
   path. Keep uncertain or disabled material intact and report it separately.

## New repository: choose, contract, enforce

1. Identify the product and runtime first. Select only the areas it needs.
2. Start a draft with `node .harness/projectstructuur/tools/project-structure-init.js --repo . --areas app,infra,tests,docs`.
3. Replace every placeholder responsibility. List allowed root files and write
   the boundaries document. Add dependency rules only for source forms the
   checker supports.
4. Run `node .harness/projectstructuur/tools/project-structure-check.js --repo .` before enabling the
   hooks and CI.

## Contract

`.project-structure.json` has `areas`, each with a responsibility,
`allowedRootFiles`, an optional `boundariesDocument`, and optional
`forbiddenDependencies`. The shared checker powers the command, CI and hooks.
Changing a contract is a deliberate governance action, not an automatic fix.

## Completion

Report the inventory or migration evidence, the chosen areas and their jobs,
the hard checks run, and every unknown or unverified runtime path. Do not claim
that a repository is reorganised unless files and their references were moved
and the relevant behaviours passed.
