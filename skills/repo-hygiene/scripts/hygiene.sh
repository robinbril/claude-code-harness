#!/usr/bin/env bash
# Read-only repo hygiene report: dev vs main, unmerged/dead branches,
# merge conflicts (via git merge-tree, no side effects), open PRs, Actions.
# Usage: hygiene.sh [repo-path] ; env: MAIN, DEV, STALE_DAYS (default 30)
set -uo pipefail

REPO="${1:-.}"
cd "$REPO" || {
  echo "Repo niet gevonden: $REPO"
  exit 2
}
git rev-parse --git-dir >/dev/null 2>&1 || {
  echo "Geen git-repo: $REPO"
  exit 2
}

STALE_DAYS="${STALE_DAYS:-30}"
# Long-lived branches: never reported as dead
PROTECT_RE="${PROTECT_RE:-^(main|master|dev|develop|development|acceptance|staging|production|release/.*)$}"
NOW=$(date +%s)
HAS_GH=0
gh repo view >/dev/null 2>&1 && HAS_GH=1

git fetch --prune --quiet origin 2>/dev/null || echo "WARN: git fetch faalde, data kan verouderd zijn"

ref_exists() { git show-ref --verify --quiet "refs/remotes/origin/$1"; }
if [ -z "${MAIN:-}" ]; then
  MAIN=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
  [ -z "$MAIN" ] && { ref_exists main && MAIN=main || MAIN=master; }
fi
if [ -z "${DEV:-}" ]; then
  for c in dev develop development acceptance staging; do ref_exists "$c" && {
    DEV=$c
    break
  }; done
fi
DEV="${DEV:-}"

echo "# Repo hygiene: $(basename "$(git rev-parse --show-toplevel)")"
echo "main=$MAIN  dev=${DEV:-<geen>}  stale>${STALE_DAYS}d  $(date '+%Y-%m-%d %H:%M')"
echo

# 1. dev vs main
echo "## 1. dev vs main"
if [ -n "$DEV" ]; then
  read -r MAIN_ONLY DEV_ONLY < <(git rev-list --left-right --count "origin/$MAIN...origin/$DEV")
  echo "- dev loopt $DEV_ONLY commits voor op main (nog niet gereleased)"
  echo "- main heeft $MAIN_ONLY commits die niet in dev zitten (hotfixes niet teruggemerged?)"
  [ "$MAIN_ONLY" -gt 0 ] && echo "  WARN: main -> dev back-merge nodig"
  if out=$(git merge-tree --write-tree --name-only --no-messages "origin/$MAIN" "origin/$DEV" 2>/dev/null); then
    echo "- dev -> main merge: OK, geen conflicts"
  else
    echo "- dev -> main merge: FAIL, conflicts in:"
    echo "$out" | tail -n +2 | sed 's/^/    /'
  fi
else
  echo "- geen dev-branch gevonden, overgeslagen"
fi
echo

# Merged PR heads (vangt squash/rebase merges die git zelf niet ziet)
MERGED_PR_HEADS=""
[ $HAS_GH -eq 1 ] && MERGED_PR_HEADS=$(gh pr list --state merged --limit 300 --json headRefName -q '.[].headRefName' 2>/dev/null)
OPEN_PR_HEADS=""
[ $HAS_GH -eq 1 ] && OPEN_PR_HEADS=$(gh pr list --state open --limit 200 --json headRefName -q '.[].headRefName' 2>/dev/null)

# 2+3+4. remote branches
echo "## 2. Remote branches (exclusief $MAIN${DEV:+, $DEV})"
echo "| branch | status | laatste commit | voor op base | conflict met base | open PR |"
echo "|---|---|---|---|---|---|"
git for-each-ref --format='%(refname:strip=3) %(committerdate:unix)' refs/remotes/origin/ | while read -r b ts; do
  case "$b" in HEAD | "$MAIN" | "$DEV") continue ;; esac
  if echo "$b" | grep -qE "$PROTECT_RE"; then
    echo "| $b | vast (beschermd) | - | $(git rev-list --count "origin/$MAIN..origin/$b") voor op $MAIN | - | - |"
    continue
  fi
  age=$(((NOW - ts) / 86400))
  base="$MAIN"
  [ -n "$DEV" ] && base="$DEV"
  ahead=$(git rev-list --count "origin/$base..origin/$b")
  pr="-"
  echo "$OPEN_PR_HEADS" | grep -qxF "$b" && pr="ja"
  if git merge-base --is-ancestor "origin/$b" "origin/$MAIN" ||
    { [ -n "$DEV" ] && git merge-base --is-ancestor "origin/$b" "origin/$DEV"; }; then
    status="DEAD (gemerged)"
  elif echo "$MERGED_PR_HEADS" | grep -qxF "$b" && [ "$pr" = "-" ]; then
    status="DEAD (PR gemerged, squash)"
  elif [ "$age" -gt "$STALE_DAYS" ]; then
    status="STALE (niet gemerged)"
  else
    status="actief"
  fi
  conflict="-"
  if [ "$ahead" -gt 0 ] && [ "${status#DEAD}" = "$status" ]; then
    files=$(git merge-tree --write-tree --name-only --no-messages "origin/$base" "origin/$b" 2>/dev/null)
    rc=$?
    case $rc in
      0) conflict="OK" ;;
      1) conflict="FAIL: $(echo "$files" | tail -n +2 | head -3 | tr '\n' ' ')" ;;
      *) conflict="? (geen merge-base)" ;;
    esac
  fi
  echo "| $b | $status | ${age}d | $ahead | $conflict | $pr |"
done
echo

# Lokale branches
echo "## 3. Lokale branches"
gone=$(git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads | awk '$2=="[gone]"{print $1}')
merged_local=$(git branch --format='%(refname:short)' --merged "origin/$MAIN" | grep -vxE "$MAIN|${DEV:-__none__}")
[ -n "$gone" ] && {
  echo "- upstream verwijderd (kan weg):"
  echo "$gone" | sed 's/^/    /'
}
[ -n "$merged_local" ] && {
  echo "- lokaal al gemerged in $MAIN (kan weg):"
  echo "$merged_local" | sed 's/^/    /'
}
[ -z "$gone$merged_local" ] && echo "- OK, niets op te ruimen"
echo

# Open PRs
echo "## 4. Open PR's"
if [ $HAS_GH -eq 1 ]; then
  gh pr list --state open --limit 50 --json number,title,headRefName,baseRefName,mergeable,isDraft,updatedAt \
    -q '.[] | "- #\(.number) \(.headRefName) -> \(.baseRefName) | mergeable=\(.mergeable)\(if .isDraft then " | draft" else "" end) | upd \(.updatedAt[0:10]) | \(.title)"' |
    sed 's/mergeable=CONFLICTING/mergeable=FAIL CONFLICTING/' || true
  [ -z "$OPEN_PR_HEADS" ] && echo "- geen"
else
  echo "- gh niet beschikbaar of geen GitHub-remote, overgeslagen"
fi
echo

# Actions
echo "## 5. GitHub Actions (laatste run per workflow)"
if [ $HAS_GH -eq 1 ]; then
  for br in "$MAIN" $DEV; do
    echo "### $br"
    gh run list --branch "$br" --limit 50 --json workflowName,status,conclusion,createdAt,url 2>/dev/null |
      jq -r 'group_by(.workflowName) | map(sort_by(.createdAt) | last) | .[]
               | (if .conclusion=="success" then "OK  " elif .status!="completed" then "RUN " else "FAIL" end)
                 + " \(.workflowName) | \(.conclusion // .status) | \(.createdAt[0:10]) | \(.url)"' ||
      echo "- geen runs"
  done
  echo "### Open failures elders (laatste 20 runs)"
  gh run list --status failure --limit 20 --json workflowName,headBranch,createdAt,url \
    -q '.[] | "- \(.headBranch): \(.workflowName) | \(.createdAt[0:10]) | \(.url)"' 2>/dev/null || true
else
  echo "- gh niet beschikbaar, overgeslagen"
fi
