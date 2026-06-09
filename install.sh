#!/usr/bin/env bash
# Claude Harness - installer (macOS / Linux)
# Kopieert de skills naar ~/.claude/skills/ en plaatst de CLAUDE.md.
# Raakt je bestaande skills/settings niet aan; maakt back-ups van wat het vervangt.
#
# Draaien:  bash install.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
claude="${HOME}/.claude"
skills_dst="${claude}/skills"
stamp="$(date +%Y-%m-%d_%H%M%S)"

mkdir -p "$skills_dst"

copied=0
for d in "$here"/skills/*/; do
  name="$(basename "$d")"
  dst="${skills_dst}/${name}"
  if [ -e "$dst" ]; then
    mv "$dst" "${dst}.bak-${stamp}"
    echo "  back-up: ${name} -> ${name}.bak-${stamp}"
  fi
  cp -R "$d" "$dst"
  copied=$((copied+1))
done
echo "Skills geplaatst: ${copied}"

if [ -e "${claude}/CLAUDE.md" ]; then
  cp "${claude}/CLAUDE.md" "${claude}/CLAUDE.md.bak-${stamp}"
  echo "Bestaande CLAUDE.md geback-upt"
fi
cp "${here}/CLAUDE.md" "${claude}/CLAUDE.md"
echo "CLAUDE.md geplaatst in ${claude}"

echo ""
echo "Klaar. Herstart Claude Code. De skills triggeren vanzelf (of typ '/')."
