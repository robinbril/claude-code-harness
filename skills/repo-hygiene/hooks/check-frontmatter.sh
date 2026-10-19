#!/usr/bin/env bash
# SKILL.md moet beginnen met frontmatter waarin name en description staan.
set -euo pipefail
f="${1:-SKILL.md}"
head -1 "$f" | grep -qx -- '---' || {
  echo "$f: begint niet met frontmatter"
  exit 1
}
grep -q '^name: repo-hygiene$' "$f" || {
  echo "$f: name ontbreekt of klopt niet"
  exit 1
}
grep -q '^description: .' "$f" || {
  echo "$f: description ontbreekt"
  exit 1
}
