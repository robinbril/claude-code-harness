---
name: repo-hygiene
description: Read-only git/GitHub hygiene check for a repo - dev vs main drift, unmerged and dead branches (incl. squash-merged), merge conflicts per branch via side-effect-free git merge-tree, open PRs and failing GitHub Actions. Use when asked for a codehygiene check, repo health, "is alles gemerged", "loopt dev goed t.o.v. main", "dode branches opruimen", "zijn er merge conflicts", "falen de actions", stale branches or branch cleanup.
---

# Repo hygiene

One deterministic script gathers everything; you interpret and propose cleanup. Nothing is
deleted or merged without explicit per-action approval.

## Quick start
```bash
~/.claude/skills/repo-hygiene/scripts/hygiene.sh <repo-path>
```
Env overrides: `MAIN=main DEV=dev STALE_DAYS=30 PROTECT_RE='^(main|dev|release/.*)$'`.
Auto-detect: main = `origin/HEAD`; dev = first of dev, develop, development, acceptance, staging.

## What it checks
1. **dev vs main**: commits ahead/behind both ways, plus a dry-run merge dev -> main.
   main ahead of dev = hotfix not back-merged.
2. **Remote branches**: `DEAD (gemerged)` = ancestor of main/dev; `DEAD (PR gemerged, squash)` =
   head of a merged PR with no open PR; `STALE` = unmerged and older than STALE_DAYS;
   conflict column = `git merge-tree --write-tree` against dev (or main). Exit 0 OK, 1 conflict,
   other = no merge-base (usually a branch from rewritten history).
3. **Local branches**: upstream gone, or already merged into main.
4. **Open PRs**: base, mergeable state, draft.
5. **Actions**: latest run per workflow on main and dev, plus the last 20 failures anywhere.

Only side effect: `git fetch --prune` (updates remote-tracking refs).

## Workflow
1. Run the script on the repo. Long output: read it fully before summarising.
2. Report as a short scorecard, worst first:
   - FAIL: failing workflow on main/dev, dev -> main conflict, main ahead of dev.
   - WARN: open PRs with CONFLICTING, stale unmerged branches with conflicts, PR stacks
     (PR whose base is another feature branch).
   - Cleanup: count of DEAD remote branches + local branches that can go.
3. For each failing Actions run, fetch the cause before reporting it:
   `gh run view <id> --log-failed | tail -40`. Report cause + fix, not just "failed".
4. Propose cleanup as ready-to-run commands, grouped, and **ask before running**:
   ```bash
   git push origin --delete <branch> <branch> ...
   git branch -D <branch> ...
   ```
   STALE branches with unique commits: list them, ask per branch (merge, rebase or delete).
   Never delete protected branches or a branch with an open PR.
5. Merge conflicts: resolve them one branch at a time.

## Gotchas
- `voor op base` for a squash-merged branch is high but meaningless; the PR check is what counts.
- `? (geen merge-base)`: branch predates a history rewrite; almost always safe to delete after
  confirming its PR is closed.
- Without `gh` auth or a GitHub remote, sections 4-5 and squash detection are skipped.
