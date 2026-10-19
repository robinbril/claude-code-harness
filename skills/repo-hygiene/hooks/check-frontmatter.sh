#!/usr/bin/env bash
# SKILL.md moet beginnen met frontmatter waarin name en description staan.
set -euo pipefail
f="${1:-SKILL.md}"
head -1 "$f" | grep -qx -- '---' || {
  echo "$f: begint niet met frontmatter"
  exit 1
}
fm="$(awk 'NR==1&&$0=="---"{in_fm=1;next} in_fm&&$0=="---"{exit} in_fm' "$f")"
printf '%s\n' "$fm" | grep -q '^name: repo-hygiene$' || {
  echo "$f: name ontbreekt of klopt niet"
  exit 1
}
printf '%s\n' "$fm" | grep -q '^description: .' || {
  echo "$f: description ontbreekt"
  exit 1
}
