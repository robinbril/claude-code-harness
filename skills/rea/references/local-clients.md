# Local clients

Paths below are relative to this skill's folder (`<deze-skill-map>`). Claude Code discovers `/rea` from the skill name. Cursor has a `/rea` command that opens this skill. Codex uses `$rea` or selects `rea` through `/skills`; do not promise a native `/rea` command when the client does not expose one.

The CLI works without MCP registration:

```sh
<deze-skill-map>/scripts/run-rea.sh --version
<deze-skill-map>/scripts/run-rea.sh analyze-javascript-application /absolute/path/to/app --format json --full-output
```

The fallback is pinned to the tested release 6.4.0. Set `REA_VERSION` only for an intentionally selected npm release. It uses local Node and npm, makes no global installation and never selects another analysis/model provider.

## Optional MCP registration

When the user asks to register REA, inspect each selected plan first:

```sh
<deze-skill-map>/scripts/run-rea.sh setup --client claude_code --dry-run --format json
<deze-skill-map>/scripts/run-rea.sh setup --client codex --dry-run --format json
<deze-skill-map>/scripts/run-rea.sh setup --client cursor --dry-run --format json
```

Read the plan's files, backups, replacements and provider installation choices. Applying an already-authorized plan uses the same client scope with `--yes` in place of `--dry-run`. Do not add Hopper/native engines unless requested. `doctor --client <id> --format json` checks stored registration; restart/reconnect is needed for tools to appear. Preserve the custom `rea` skill; upstream setup may install its separate `reverse-engineer-anything` skill.

## Updating

This skill bundles upstream instructions from morluto/rea. `references/upstream-provenance.json` records the source commit/version. Before refreshing, inspect the new package schemas and preserve these local website/client instructions; changing upstream reference text alone does not update an active MCP server.
