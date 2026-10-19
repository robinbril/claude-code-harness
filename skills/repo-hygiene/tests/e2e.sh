#!/usr/bin/env bash
# End-to-end tests voor scripts/hygiene.sh.
# Bouwt een echte git-opzet in een tijdelijke map (bare origin + clone) en controleert de rapportage.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/scripts/hygiene.sh"
FAKE_GH="$ROOT/tests/fake-gh"
PASS=0
FAIL=0

ok() {
  PASS=$((PASS + 1))
  printf '  ok   %s\n' "$1"
}
bad() {
  FAIL=$((FAIL + 1))
  printf '  FAIL %s\n' "$1"
}
expect() { # expect <beschrijving> <regex> <tekst>
  if grep -qE -- "$2" <<<"$3"; then ok "$1"; else bad "$1  (verwacht: $2)"; fi
}
reject() {
  if grep -qE -- "$2" <<<"$3"; then bad "$1  (onverwacht: $2)"; else ok "$1"; fi
}

export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.test
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.test
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

commit() { # commit <bestand> <inhoud> <bericht> [dagen-geleden]
  printf '%s\n' "$2" >"$1"
  git add "$1"
  if [ -n "${4:-}" ]; then
    local d
    d="$(date -v-"$4"d '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || date -d "-$4 days" '+%Y-%m-%dT%H:%M:%S')"
    GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -qm "$3"
  else
    git commit -qm "$3"
  fi
}

setup_repo() { # bouwt $TMP/<naam>/{origin.git,work}; $1 = naam, $2 = met dev-branch (1/0)
  local base="$TMP/$1"
  mkdir -p "$base"
  git init -q --bare -b main "$base/origin.git"
  git clone -q "$base/origin.git" "$base/work" 2>/dev/null
  cd "$base/work" || exit 1
  git checkout -q -b main
  commit app.txt "regel 1" "init"
  git push -q -u origin main
  git remote set-head origin main >/dev/null
  if [ "$2" = 1 ]; then
    git checkout -q -b dev
    commit dev.txt "dev werk" "dev commit"
    git push -q -u origin dev

    git checkout -q -b merged-feature dev
    commit merged.txt "klaar" "merged feature"
    git push -q -u origin merged-feature
    git checkout -q dev && git merge -q --no-edit merged-feature && git push -q origin dev

    git checkout -q -b stale-feature dev
    commit stale.txt "oud" "oude feature" 60
    git push -q -u origin stale-feature

    git checkout -q -b conflict-feature dev
    commit dev.txt "andere inhoud" "conflict feature"
    git push -q -u origin conflict-feature
    git checkout -q dev && commit dev.txt "nog weer anders" "dev wijzigt dezelfde regel" && git push -q origin dev

    git checkout -q -b active-feature dev
    commit active.txt "nieuw" "actieve feature"
    git push -q -u origin active-feature

    git checkout -q -b squashed-feature dev
    commit squash.txt "gesquasht" "squash feature"
    git push -q -u origin squashed-feature

    git checkout -q -b open-feature dev
    commit open.txt "open" "open pr feature"
    git push -q -u origin open-feature

    git checkout -q -b gone-local dev
    commit gone.txt "weg" "branch die remote verdwijnt"
    git push -q -u origin gone-local
    git push -q origin --delete gone-local

    git checkout -q main
    commit hotfix.txt "fix" "hotfix op main"
    git push -q origin main
  fi
}

echo "# e2e: hygiene.sh"

echo "## Scenario 1: volledige repo, zonder gh"
setup_repo full 1
OUT="$(PATH="/usr/bin:/bin" bash "$SCRIPT" "$TMP/full/work" 2>&1)"
expect "kop met repo-naam" '^# Repo hygiene: work' "$OUT"
expect "main en dev herkend" 'main=main  dev=dev' "$OUT"
expect "dev loopt voor op main" 'dev loopt [1-9][0-9]* commits voor op main' "$OUT"
expect "hotfix op main gezien" 'main heeft 1 commits die niet in dev zitten' "$OUT"
expect "waarschuwing back-merge" 'WARN: main -> dev back-merge nodig' "$OUT"
expect "gemergede branch is DEAD" '\| merged-feature \| DEAD \(gemerged\)' "$OUT"
expect "oude branch is STALE" '\| stale-feature \| STALE \(niet gemerged\) \| 6[0-9]d' "$OUT"
expect "conflict gevonden" '\| conflict-feature \| actief \| [0-9]+d \| 1 \| FAIL: dev.txt' "$OUT"
expect "actieve branch zonder conflict" '\| active-feature \| actief \| [0-9]+d \| 1 \| OK' "$OUT"
expect "zonder gh geen squash-detectie" '\| squashed-feature \| actief' "$OUT"
expect "lokale branch met verdwenen upstream" 'upstream verwijderd' "$OUT"
expect "gone-local in de opruimlijst" '^    gone-local$' "$OUT"
expect "PR-sectie overgeslagen zonder gh" 'gh niet beschikbaar of geen GitHub-remote, overgeslagen' "$OUT"
reject "main en dev staan niet in de branchtabel" '^\| (main|dev) \|' "$OUT"

echo "## Scenario 2: dezelfde repo, met nep-gh"
OUT="$(PATH="$FAKE_GH:/usr/bin:/bin" bash "$SCRIPT" "$TMP/full/work" 2>&1)"
expect "squash-merge herkend via PR" '\| squashed-feature \| DEAD \(PR gemerged, squash\)' "$OUT"
expect "open PR gemarkeerd" '\| open-feature \| actief \| [0-9]+d \| 1 \| OK \| ja \|' "$OUT"
expect "conflicterende PR als FAIL" 'mergeable=FAIL CONFLICTING' "$OUT"
expect "Actions-run op main" 'OK   CI \| success' "$OUT"
expect "failure elders gemeld" '- feature-x: CI' "$OUT"

echo "## Scenario 3: repo zonder dev-branch"
setup_repo nodev 0
OUT="$(PATH="/usr/bin:/bin" bash "$SCRIPT" "$TMP/nodev/work" 2>&1)"
expect "geen dev gemeld" 'dev=<geen>' "$OUT"
expect "dev vs main overgeslagen" 'geen dev-branch gevonden, overgeslagen' "$OUT"
expect "lokaal niets op te ruimen" 'OK, niets op te ruimen' "$OUT"

echo "## Scenario 4: foute invoer"
OUT="$(bash "$SCRIPT" "$TMP/bestaat-niet" 2>&1)"
RC=$?
expect "melding bij onbekend pad" 'Repo niet gevonden' "$OUT"
[ "$RC" = 2 ] && ok "exitcode 2 bij onbekend pad" || bad "exitcode 2 bij onbekend pad (kreeg $RC)"
mkdir -p "$TMP/geen-git"
OUT="$(bash "$SCRIPT" "$TMP/geen-git" 2>&1)"
RC=$?
expect "melding bij map zonder git" 'Geen git-repo' "$OUT"
[ "$RC" = 2 ] && ok "exitcode 2 bij map zonder git" || bad "exitcode 2 bij map zonder git (kreeg $RC)"

echo "## Scenario 5: script verandert niets aan de repo"
cd "$TMP/full/work" || exit 1
BEFORE="$(
  git for-each-ref --format='%(refname) %(objectname)' refs/heads
  git status --porcelain
)"
PATH="/usr/bin:/bin" bash "$SCRIPT" "$TMP/full/work" >/dev/null 2>&1
AFTER="$(
  git for-each-ref --format='%(refname) %(objectname)' refs/heads
  git status --porcelain
)"
[ "$BEFORE" = "$AFTER" ] && ok "lokale branches en werkmap ongewijzigd" || bad "lokale branches of werkmap gewijzigd"

echo
echo "Resultaat: $PASS geslaagd, $FAIL mislukt"
[ "$FAIL" -eq 0 ]
