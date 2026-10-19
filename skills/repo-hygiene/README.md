# repo-hygiene

Claude Code-skill die een git-repo leest en rapporteert: dev tegenover main, dode en verouderde branches, merge-conflicten, open PR's en GitHub Actions. Het script verandert niets aan de repo, behalve `git fetch --prune`.

## Gebruik

```bash
scripts/hygiene.sh <pad-naar-repo>
```

Instellingen via omgevingsvariabelen: `MAIN`, `DEV`, `STALE_DAYS`, `PROTECT_RE`.

## Testen

```bash
bash tests/e2e.sh
```

De e2e-tests bouwen in een tijdelijke map een echte git-opzet met een nep-GitHub-remote en controleren elke sectie van het rapport. `tests/fake-gh/gh` speelt GitHub na voor PR's en Actions.

## Hooks

```bash
pre-commit install --install-hooks
```

- **Bij elke commit:** shellcheck, shfmt, bash-syntax, de frontmatter van SKILL.md, een geheimenscan, standaard bestandscontroles en de e2e-tests zodra `scripts/` of `tests/` verandert.
- **Bij het commitbericht:** de eerste regel mag niet leeg zijn en maximaal 72 tekens hebben.
- **Vóór een push:** de volledige e2e-tests.
