#!/usr/bin/env bash
# validate-phase.sh: verify a phase spec has the required structure
#
# Usage: validate-phase.sh <path-to-phase-spec.md>
#
# Exits 0 if the file has the required markers and sections.
# Exits 1 with specific errors otherwise.

set -uo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: validate-phase.sh <path-to-phase-spec.md>" >&2
  exit 2
fi

f="$1"
if [[ ! -f "$f" ]]; then
  echo "validate-phase.sh: file not found: $f" >&2
  exit 2
fi

errors=0

check_marker() {
  local marker="$1"
  local label="$2"
  if ! grep -q "$marker" "$f"; then
    echo "❌ $f: missing $label ($marker)" >&2
    errors=$((errors + 1))
  fi
}

check_section() {
  local heading="$1"
  if ! grep -qi "^## $heading\|^\*\*$heading" "$f"; then
    echo "❌ $f: missing section: $heading" >&2
    errors=$((errors + 1))
  fi
}

# Required markers
check_marker "SUPERGOAL_PHASE_START" "phase-start marker"

# section_body <heading>: the non-blank lines under "## <heading>" or "**<heading>", up to the next heading.
section_body() {
  local h
  h="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  awk -v h="$h" '
    { l = tolower($0) }
    /^## / || /^\*\*/ { if (inside) exit; if (index(l, "## " h) == 1 || index(l, "**" h) == 1) { inside = 1; next } }
    inside && NF { print }
  ' "$f"
}

# Required sections, each with real content (headings alone are not a phase).
for section in "Work" "Acceptance criteria" "Mandatory commands" "Evidence required"; do
  check_section "$section"
  if [[ -z "$(section_body "$section")" ]]; then
    echo "❌ $f: section is empty: $section" >&2
    errors=$((errors + 1))
  fi
done

# Every acceptance criterion carries its validation class: - [class] ... (or - [ ] [class] ...).
CLASSES='tool-output|deliverable|empirical|llm-judge|self-consistency'
criteria=$(section_body "Acceptance criteria" | grep -E '^[[:space:]]*-' || true)
n_criteria=$(printf '%s' "$criteria" | grep -c . || true)
n_classified=$(printf '%s\n' "$criteria" | grep -cE "^[[:space:]]*-[[:space:]]*(\[[ xX]\][[:space:]]*)?\[($CLASSES)\]" || true)
if [[ "$n_criteria" -eq 0 ]]; then
  echo "❌ $f: no acceptance criteria (bullet lines) found" >&2
  errors=$((errors + 1))
elif [[ "$n_classified" -lt "$n_criteria" ]]; then
  echo "❌ $f: $((n_criteria - n_classified)) of $n_criteria criteria lack a class [$CLASSES]" >&2
  errors=$((errors + 1))
fi
if [[ -z "$(section_body "Mandatory commands" | grep -E '^[[:space:]]*-' || true)" ]]; then
  echo "❌ $f: no mandatory commands listed" >&2
  errors=$((errors + 1))
fi

# Team marker: solo must be justified as atomic, else the phase must list tracks + specialists
team_line=$(grep -iE '^[[:space:]]*Team:' "$f" | head -1 || true)
if [[ -n "$team_line" ]] && echo "$team_line" | grep -qiE 'solo'; then
  if ! echo "$team_line" | grep -qiE 'atomair|atomic'; then
    echo "❌ $f: Team is 'solo' zonder atomariteits-reden. Een scheidbare fase moet sporen + specialisten dragen; solo vereist 'atomair: <reden>'." >&2
    errors=$((errors + 1))
  fi
fi

# Sanity check: at least one criterion line
crits=$(grep -cE '^[[:space:]]*-' "$f" || true)
if [[ "$crits" -lt 3 ]]; then
  echo "⚠️  $f: only $crits bullet lines, acceptance criteria look thin" >&2
fi

if (( errors > 0 )); then
  echo "✗ $f: $errors structural error(s)" >&2
  exit 1
fi

lines=$(wc -l < "$f" | tr -d ' ')
echo "✓ $f: structure ok ($lines lines, $crits bullets)"
exit 0
