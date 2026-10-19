#!/usr/bin/env bash
# repo-state.sh: evaluate the COMPLETE working-tree state relative to a baseline commit.
#
# Why this exists
# ---------------
# Supergoal's final audit and per-phase cleanliness checks must see every change an
# autonomous run produced, whether it was committed or left sitting in the working
# tree. A plain `git diff <baseline>..HEAD` only compares two commits, so a run that
# never commits looks completely empty: deliverables read as "missing" and cleanliness
# greps read as "0 debug prints" no matter what was actually written. This helper is the
# single source of truth for the corrected comparison (see
# references/repo-state-comparison.md).
#
# The strategy (complete state vs baseline)
# -----------------------------------------
#   tracked changes (committed + staged + unstaged + deleted)
#       = git diff <baseline>            # single revision, NOT <baseline>..HEAD
#         -> diffs the WORKING TREE against the baseline commit, so it already
#            includes staged, unstaged, and any post-baseline commits.
#   untracked deliverables (new files never `git add`-ed)
#       = git ls-files --others --exclude-standard
#         -> untracked files are diff-invisible, so they are detected separately.
#   invalid / unavailable baseline ("no-git" sentinel, bogus sha, or non-repo)
#       -> degrade gracefully to a filesystem existence test.
#
# Read commands never mutate the repository or the index. `snapshot` only writes a commit
# object plus a ref under refs/supergoal/; `rollback` only rewrites working-tree files.
# Paths containing spaces are handled (callers must quote the path argument).
#
# Usage:
#   repo-state.sh deliverable   <baseline> <path>
#       -> "present - <evidence>" (exit 0) | "missing" (exit 1); a path that no longer
#          exists is missing, even when its deletion shows up as a change
#   repo-state.sh snapshot      <phase>
#       -> sha of a restore point holding the COMPLETE working tree (committed, staged,
#          unstaged and untracked work, .supergoal/ excluded); HEAD, index, working tree
#          and stash stay untouched. Create-only: a phase that already has a snapshot gets
#          the original back. Prints "no-git" outside a repository.
#   repo-state.sh rollback      <snapshot> [<path>...]
#       -> restores the working tree (or only <path>s) to the snapshot: changed and deleted
#          files come back, files created after the snapshot are removed. .supergoal/ is
#          never touched. Saves the current state first and prints an `undo:` line.
#   repo-state.sh changed-files <baseline>
#       -> newline-delimited paths changed since baseline (tracked + untracked + deleted)
#   repo-state.sh added-lines   <baseline>
#       -> every added/new line since baseline: tracked-diff '+' lines plus the full body
#          of each untracked file (every line is "new"). Feed to grep for cleanliness counts.

set -uo pipefail

in_git_repo() { git rev-parse --is-inside-work-tree >/dev/null 2>&1; }

# baseline_ok <ref>: true only when <ref> resolves to a real commit in this repo.
baseline_ok() {
  local b="${1:-}"
  [ -n "$b" ] || return 1
  [ "$b" = "no-git" ] && return 1
  git rev-parse --verify --quiet "${b}^{commit}" >/dev/null 2>&1
}

# exists_now <path>: the path (or, for a glob, at least one match) is on disk right now.
exists_now() {
  local p="$1" f
  [ -e "$p" ] && return 0
  in_git_repo || return 1
  while IFS= read -r f; do
    [ -n "$f" ] && [ -e "$f" ] && return 0
  done < <(git ls-files --cached --others --exclude-standard -- "$p" 2>/dev/null)
  return 1
}

cmd_deliverable() {
  local baseline="$1" path="$2"

  # A deleted deliverable is missing, even though its deletion is a "change".
  if ! exists_now "$path"; then
    printf 'missing\n'
    return 1
  fi

  if in_git_repo && baseline_ok "$baseline"; then
    # 1) tracked change vs baseline: committed, staged, unstaged, or deleted.
    local stat
    stat="$(git diff --stat "$baseline" -- "$path" 2>/dev/null || true)"
    if [ -n "$stat" ]; then
      printf 'present - changed vs baseline (%s)\n' \
        "$(printf '%s' "$stat" | tail -1 | sed 's/^[[:space:]]*//')"
      return 0
    fi
    # 2) brand-new untracked deliverable (diff-invisible).
    local untracked
    untracked="$(git ls-files --others --exclude-standard -- "$path" 2>/dev/null | head -1 || true)"
    if [ -n "$untracked" ]; then
      printf 'present - untracked new file (%s)\n' "$untracked"
      return 0
    fi
    # 3) the path exists but is unchanged this run.
    printf 'present - exists, unchanged since baseline\n'
    return 0
  fi

  # Fallback: baseline missing/invalid or not a git repo; existence was checked above.
  printf 'present - exists on disk (baseline unavailable)\n'
  return 0
}

# make_snapshot <message>: commit object holding the complete working tree (.supergoal/ excluded).
make_snapshot() {
  local msg="$1" tmp tree parent
  # A throwaway index seeded from the real one: `git add -A` on it records every change,
  # including untracked files, without touching the real index or working tree.
  tmp="$(mktemp "${TMPDIR:-/tmp}/supergoal-index.XXXXXX")" || return 1
  cp "$(git rev-parse --git-path index)" "$tmp" 2>/dev/null || rm -f "$tmp"
  if ! GIT_INDEX_FILE="$tmp" git add -A -- . ':(exclude).supergoal' >/dev/null 2>&1; then
    rm -f "$tmp"; echo "repo-state.sh: snapshot failed to read the working tree" >&2; return 1
  fi
  tree="$(GIT_INDEX_FILE="$tmp" git write-tree)" || { rm -f "$tmp"; return 1; }
  rm -f "$tmp"
  export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-supergoal}" GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-supergoal@localhost}"
  export GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-supergoal}" GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-supergoal@localhost}"
  if parent="$(git rev-parse --verify --quiet HEAD)"; then
    printf '%s\n' "$msg" | git commit-tree "$tree" -p "$parent"
  else
    printf '%s\n' "$msg" | git commit-tree "$tree"
  fi
}

cmd_snapshot() {
  local phase="$1" ref snap existing
  if ! in_git_repo; then printf 'no-git\n'; return 0; fi
  cd "$(git rev-parse --show-toplevel)" || return 1
  ref="refs/supergoal/phase-${phase}-pre"
  # Create-only: a resumed session or a retry of phase N keeps the original anchor,
  # so a rollback still returns to the state before the phase started.
  if existing="$(git rev-parse --verify --quiet "${ref}^{commit}")"; then
    echo "repo-state.sh: phase ${phase} already has a snapshot; reusing it" >&2
    printf '%s\n' "$existing"
    return 0
  fi
  snap="$(make_snapshot "supergoal phase ${phase} pre")" || return 1
  # The ref keeps the snapshot reachable, so garbage collection cannot remove it.
  git update-ref "$ref" "$snap" "" || return 1
  printf '%s\n' "$snap"
}

cmd_rollback() {
  local snap="$1"; shift
  if ! in_git_repo || ! baseline_ok "$snap"; then
    echo "repo-state.sh: rollback needs a snapshot sha from 'repo-state.sh snapshot' (got '$snap')" >&2
    return 1
  fi
  local top f restored=0 removed=0 safety
  top="$(git rev-parse --show-toplevel)" || return 1
  cd "$top" || return 1
  [ "$#" -gt 0 ] || set -- .
  # Safety net: save the current state first, so a rollback to the wrong snapshot
  # (or with the wrong paths) can itself be undone.
  safety="$(make_snapshot "supergoal pre-rollback to ${snap}")" || return 1
  git update-ref "refs/supergoal/pre-rollback-$(date +%Y%m%d%H%M%S)-$$" "$safety" || return 1
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in .supergoal|.supergoal/*) continue ;; esac
    if git cat-file -e "${snap}:${f}" 2>/dev/null; then
      git restore --source="$snap" --worktree -- "$f" && restored=$((restored + 1))
    elif [ -e "$f" ]; then
      rm -f -- "$f" && removed=$((removed + 1))
    fi
  done < <({
    git diff --name-only "$snap" -- "$@" 2>/dev/null
    git ls-files --others --exclude-standard -- "$@" 2>/dev/null
  } | LC_ALL=C sort -u)
  printf 'rolled back to %s: %d restored, %d removed\n' "$snap" "$restored" "$removed"
  printf 'undo: repo-state.sh rollback %s\n' "$safety"
}

cmd_changed_files() {
  local baseline="$1"
  if in_git_repo && baseline_ok "$baseline"; then
    {
      git diff --name-only "$baseline" 2>/dev/null || true   # modified/staged/deleted
      git ls-files --others --exclude-standard 2>/dev/null || true   # untracked
    } | LC_ALL=C sort -u | sed '/^$/d'
  fi
  return 0
}

cmd_added_lines() {
  local baseline="$1"
  if in_git_repo && baseline_ok "$baseline"; then
    # Added lines from tracked changes (strip the leading '+', skip the '+++' file header).
    git diff "$baseline" 2>/dev/null | grep '^+' | grep -v '^+++' | sed 's/^+//' || true
    # Full body of every untracked file: each line counts as newly added.
    # Skip binaries: added-lines feeds text greps, so binary bodies are only noise.
    git ls-files --others --exclude-standard -z 2>/dev/null | while IFS= read -r -d '' f; do
      [ -f "$f" ] && LC_ALL=C grep -Iq . "$f" 2>/dev/null && cat -- "$f"
    done
  fi
  return 0
}

sub="${1:-}"
shift 2>/dev/null || true
case "$sub" in
  deliverable)
    [ "$#" -ge 2 ] || { echo "usage: repo-state.sh deliverable <baseline> <path>" >&2; exit 2; }
    cmd_deliverable "$1" "$2"
    ;;
  changed-files)
    [ "$#" -ge 1 ] || { echo "usage: repo-state.sh changed-files <baseline>" >&2; exit 2; }
    cmd_changed_files "$1"
    ;;
  added-lines)
    [ "$#" -ge 1 ] || { echo "usage: repo-state.sh added-lines <baseline>" >&2; exit 2; }
    cmd_added_lines "$1"
    ;;
  snapshot)
    [ "$#" -ge 1 ] || { echo "usage: repo-state.sh snapshot <phase>" >&2; exit 2; }
    cmd_snapshot "$1"
    ;;
  rollback)
    [ "$#" -ge 1 ] || { echo "usage: repo-state.sh rollback <snapshot> [<path>...]" >&2; exit 2; }
    cmd_rollback "$@"
    ;;
  ""|-h|--help|help)
    cat >&2 <<'EOF'
repo-state.sh - evaluate the complete working-tree state vs a baseline commit.

  repo-state.sh deliverable   <baseline> <path>   present|missing (+ evidence), exit 0|1
  repo-state.sh changed-files <baseline>          paths changed since baseline
  repo-state.sh added-lines   <baseline>          added/new lines since baseline
  repo-state.sh snapshot      <phase>             restore point incl. uncommitted work
  repo-state.sh rollback      <snapshot> [path..] restore working tree to a snapshot

<baseline> is a commit sha (or "no-git" / any invalid ref to force the filesystem
fallback). Compares the working tree - not just HEAD - so uncommitted, staged, and
untracked work is included. See references/repo-state-comparison.md.
EOF
    exit 2
    ;;
  *)
    echo "repo-state.sh: unknown subcommand '$sub' (try deliverable|changed-files|added-lines|snapshot|rollback)" >&2
    exit 2
    ;;
esac
