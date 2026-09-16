Gebruik `/projectstructuur`. Voor een nieuwe repository, run
`node scripts/project-structure-init.js --repo . --areas app,infra,tests,docs`,
then fill in each responsibility before relying on the contract. For an existing
repository, start with `node scripts/project-structure-inventory.js --repo .`.
Map callers, runtime config, CI and deployment paths before proposing a move.
Run `node scripts/project-structure-check.js --repo .` after any deliberate
contract change.
