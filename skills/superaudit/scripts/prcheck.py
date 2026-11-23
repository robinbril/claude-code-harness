"""What reviewers keep asking and a script can answer: does it still merge, does another open PR break it,
does the PR text match the diff, and which checks were skipped. No model, no agent.
"""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from common import DIFF, git, patch_lines, save

MIGRATION_NO = re.compile(r"(?:^|/)(\d{3,})_[^/]+\.sql$|(?:^|/)migrations?/(\d{4})_[^/]+\.py$")
SIGNATURE = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?(?:def|function|func|fn)\s+([A-Za-z_]\w{3,})\s*(\(.*)")
PATHS = re.compile(r"`?((?:[\w.@-]+/)+[\w.@-]+\.(?:py|tsx?|jsx?|vue|sql|md|ya?ml|json|sh|css|html))`?")
# Sentences a reviewer will hold against the code.
CLAIM = re.compile(
    r"\b(\d[\d.,]*\s+(?:passed|tests?|groen|green|files?|routes?|deals?|rows?|rijen)|nothing (?:visible|changes)|no (?:behaviou?r|visible|functional) change|"
    r"behaviou?r[- ]preserving|unchanged|independent|only|alleen|never|nooit|always|altijd|every|all (?:consumers|callers|routes)|no (?:other )?(?:consumer|caller)s?|"
    r"consumers checked|idempotent|backwards? compatible|geen gedrag)\b", re.I)
SKIPPED = re.compile(r"(POORT_SKIP|UNVERIFIED|not run|niet gedraaid|did not finish|skipped|overgeslagen|known[- ]red|baseline)", re.I)
SKIP_CODE = re.compile(r"(@pytest\.mark\.(?:skip|xfail)|pytest\.skip\(|\.(?:skip|only|fixme)\(|continue-on-error:\s*true|eslint-disable|# noqa)")


def gh(repo: Path, *args: str) -> object:
    try:
        out = subprocess.run(["gh", *args], cwd=repo, capture_output=True, text=True, check=False)
        return json.loads(out.stdout) if not out.returncode else None
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def conflicts(repo: Path, one: str, two: str) -> list[str]:
    out = subprocess.run(["git", "-C", str(repo), "merge-tree", "--write-tree", "--name-only", "--no-messages", one, two], capture_output=True, text=True, check=False)
    return [line for line in out.stdout.split("\n")[1:] if line] if out.returncode == 1 else []


def changed_signatures(added: dict, removed: dict) -> set[str]:
    def found(side: dict) -> dict[str, str]:
        return {m.group(1): m.group(2) for lines in side.values() for line in lines if (m := SIGNATURE.match(line))}

    new, old = found(added), found(removed)
    return {n for n in old if n not in new or new[n] != old[n]}


def sides(repo: Path, base: str, head: str) -> tuple[dict, dict]:
    names = git(repo, "diff", "--name-only", "-z", *DIFF, base, head).split("\0")[:-1]
    out: tuple[dict, dict] = ({}, {})
    for path, sign, text in patch_lines(repo, base, head, names, []):
        out[sign == "-"].setdefault(path, []).append(text)
    return out


def calls(names: set[str], lines: dict) -> set[str]:
    return {n for n in names for text in lines.values() for t in text if re.search(rf"\b{re.escape(n)}\(", t) and not SIGNATURE.match(t)}


def neighbours(repo: Path, plan: dict, added: dict, removed: dict) -> list[str]:
    """Other open PRs into the same base: conflicts, changed signatures and equal migration numbers."""
    rows = gh(repo, "pr", "list", "--state", "open", "--base", plan["base_branch"], "--limit", "60", "--json", "number,title,headRefName,files")
    if rows is None:
        return ["could not list open PRs (gh)"]
    mine = {f["path"] for f in plan["files"]}
    numbers = {m.group(1) or m.group(2): p for p in mine if (m := MIGRATION_NO.search(p))}
    out, fetched = [], 0
    for pr in rows:
        if pr["number"] == plan.get("pr") or pr["headRefName"] == plan.get("head_branch"):
            continue
        theirs = {f["path"] for f in pr["files"]}
        for path in sorted(theirs - mine):
            m = MIGRATION_NO.search(path)
            if m and (m.group(1) or m.group(2)) in numbers:
                out.append(f"#{pr['number']} uses the same migration number: {path} and {numbers[m.group(1) or m.group(2)]}")
        folders = {str(Path(p).parent) for p in mine}
        if not (theirs & mine or folders & {str(Path(p).parent) for p in theirs}) or fetched >= 10:
            continue
        fetched += 1
        ref = f"refs/superaudit/pr-{pr['number']}"
        if subprocess.run(["git", "-C", str(repo), "fetch", "--quiet", "origin", f"+refs/pull/{pr['number']}/head:{ref}"], capture_output=True, check=False).returncode:
            continue
        head = git(repo, "rev-parse", ref).strip()
        clash = conflicts(repo, plan["head"], head)
        if clash:
            out.append(f"#{pr['number']} conflicts in {', '.join(clash[:4])} ({pr['title'][:60]})")
        base = git(repo, "merge-base", plan["base"], head, check=False).strip()
        if base:
            plus, minus = sides(repo, base, head)
            for name in sorted(calls(changed_signatures(plus, minus), added) | calls(changed_signatures(added, removed), plus)):
                out.append(f"#{pr['number']} and this change disagree about {name}(): one changes its signature, the other calls it")
    return out


def claims(body: str) -> list[dict]:
    text = re.sub(r"```.*?```|<!--.*?-->", "", body, flags=re.S)
    out = []
    for line in re.split(r"\n|(?<=[.!?])\s+", text):
        line = re.sub(r"\s+", " ", line).strip(" -*|#")
        if 20 < len(line) < 400 and CLAIM.search(line):
            out.append({"id": f"C{len(out) + 1}", "text": line[:300]})
    return out[:25]


def check(repo: Path, run: Path, plan: dict, added: dict, removed: dict) -> dict:
    out: dict = {"facts": [], "claims": []}
    facts = out["facts"]
    if plan["kind"] in ("pr", "branch", "worktree"):
        behind = git(repo, "rev-list", "--count", f"{plan['head']}..{plan['base']}").strip()
        clash = conflicts(repo, plan["head"], plan["base"])
        if clash:
            facts.append(f"does not merge into {plan.get('base_branch')}: {', '.join(clash[:6])}")
        if int(behind or 0) >= 20:
            facts.append(f"{behind} commits behind {plan.get('base_branch')}: green tests on this head say little about the merge")
        facts += neighbours(repo, plan, added, removed)
    for path, lines in sorted(added.items()):
        hit = next((line for line in lines if SKIP_CODE.search(line)), None)
        if hit:
            facts.append(f"adds a skip or exception: {path}: {hit.strip()[:90]}")
    facts += [f"changes the list of accepted red tests: {f['path']}" for f in plan["files"] if re.search(r"baseline\.json$", f["path"])]
    if plan["kind"] == "pr":
        body = str((gh(repo, "pr", "view", str(plan["pr"]), "--json", "body") or {}).get("body") or "")
        kinds = {f["kind"] for f in plan["files"]}
        known = {p for f in plan["files"] for p in (f["path"], f.get("old_path")) if p}
        missing = [p for p in sorted(set(PATHS.findall(body))) if p not in known and git(repo, "cat-file", "-t", f"{plan['head']}:{p}", check=False).strip() != "blob"
                   and not any(k.endswith("/" + p) for k in known) and not git(repo, "ls-tree", "-r", "--name-only", plan["head"], "--", f"*/{p}", check=False).strip()]
        facts += [f"the PR text names a file that does not exist: {p}" for p in missing[:8]]
        if not re.search(r"behaviou?r|gedrag", body, re.I) and "code" in kinds:
            facts.append("the PR text has no section about changed behaviour")
        if {"manifest", "lock"} & kinds and not re.search(r"depend|bump|upgrade|lock|package|pakket", body, re.I):
            facts.append("dependencies change and the PR text does not say so")
        facts += [f"the PR text admits a check that did not run: {line.strip()[:140]}" for line in body.split("\n") if SKIPPED.search(line)][:5]
        out["claims"] = claims(body)
    save(run / "prcheck.json", out)
    text = ["# Facts about this change (from a script)", *(f"- {f}" for f in facts or ["none"])]
    if out["claims"]:
        text += ["", "# Claims of the PR text: give each a status", *(f"- {c['id']}: {c['text']}" for c in out["claims"])]
    (run / "prcheck.md").write_text("\n".join(text) + "\n", encoding="utf-8", errors="replace")
    return out
