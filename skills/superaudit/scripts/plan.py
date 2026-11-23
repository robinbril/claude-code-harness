#!/usr/bin/env python3
"""Pin the target, inventory every changed file, split it into reader areas.

    plan.py [TARGET] [--base REF] [--max-readers N] [--run DIR]

TARGET: empty (default branch...working tree), a PR number (#12 or 12), a branch or
commit, a range (a..b or a...b), or a path (whole-directory audit without a diff).
Writes plan.json, growth.json and areas/*.txt. Never changes the repository's files;
adds .harness/ to .git/info/exclude and creates detached worktrees under TMPDIR.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import tempfile
import time
from collections import Counter, defaultdict
from fnmatch import fnmatch
from pathlib import Path

import gate
import growth
import lessons
import prcheck
from common import DIFF, LEAK, fail, git, patch_lines, save

EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
SMALL, MEDIUM, LARGE = 200, 1500, 6000
MIN_AREA_WEIGHT = 2000
MAX_AREA_FILES = 70

GENERATED = re.compile(
    r"(^|/)(node_modules|__snapshots__|\.e2e/cache)/|\.min\.(js|css)$|\.(lottie|drawio|snap|map)$"
    r"|(_pb2\.py|\.gen\.(ts|py|go)|\.generated\.\w+)$"
)
LOCKFILE = re.compile(
    r"(^|/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|uv\.lock|poetry\.lock|"
    r"Pipfile\.lock|Cargo\.lock|go\.sum|composer\.lock|Gemfile\.lock|bun\.lockb?)$"
)
MIGRATION = re.compile(r"(^|/)(migrations?|alembic/versions|prisma/migrations)/|^db/.*\.sql$")
TEST = re.compile(r"(^|/)(tests?|__tests__|e2e|spec|fixtures)/|(^|/)(test_[^/]+|conftest)\.py$|[._](test|spec|e2e)\.\w+$")
RELEASE = re.compile(
    r"^\.github/|^\.gitlab-ci|(^|/)(Dockerfile[^/]*|docker-compose[^/]*|compose[^/]*\.ya?ml|Makefile|Caddyfile|"
    r"nginx[^/]*\.conf|\.env[^/]*|vercel\.json|fly\.toml|Procfile)$|(^|/)(deploy|infra|terraform|k8s|helm|ops)/"
)
MANIFEST = re.compile(r"(^|/)(package\.json|pyproject\.toml|requirements[^/]*\.txt|Cargo\.toml|go\.mod|Gemfile|composer\.json)$")
DOC = re.compile(r"\.(md|mdx|rst|adoc)$|^docs/")
STYLE = re.compile(r"\.(css|scss|less|svg)$|(^|/)(locales?|i18n)/")

# Where a mistake is expensive. Matched on the path and on added lines of product code.
RISK = {
    "auth": r"auth(?!or)|log_?(in|out)\b|session_?(id|token|cookie)|jwt|oidc|passw|permission|rbac|\brole|csrf|\bmfa|require_(admin|user)|current_?user",
    "data": r"\b(org_id|tenant\w*|SELECT|INSERT INTO|UPDATE|DELETE FROM|execute|commit|rollback|transaction|select_for_update)\b",
    "route": r"@(router|app)\.(get|post|put|patch|delete)\b|\b(APIRouter|urlpatterns|addEventListener\(.fetch)\b|\bapp\.(get|post|put|delete)\(",
    "money": r"\b(invoice|amount|price|salary|vat|btw|fee|commission|payment|Decimal)\b",
    "egress": r"\b(httpx|requests\.(get|post)|fetch\(|axios|webhook|smtp|send_mail|urlopen)\b",
    "sink": r"v-html|innerHTML|dangerouslySetInnerHTML|subprocess|os\.system|\beval\(|pickle|yaml\.load|child_process|shell=True",
    "upload": r"\b(upload|multipart|UploadFile|zipfile|tarfile|presigned)\b",
    "llm": r"\b(llm|openai|anthropic|prompt|tool_call|completion|agent|mcp)\b",
    "erase": r"\b(delete|erase|purge|anonymi[sz]e|retention|gdpr|avg)\b",
}
# One hit is enough where a single line can open a door.
ONE_HIT = {"auth", "route", "sink", "upload"}
RISK_RX = {name: re.compile(rx, re.I if name not in ("data", "route") else 0) for name, rx in RISK.items()}
UI = {".vue", ".tsx", ".jsx", ".svelte", ".html", ".css", ".scss"}
E2E_CONFIG = re.compile(r"(^|/)(e2e|playwright)\.config\.[cm]?[jt]s$")
MAX_LOAD = 30
HUNTERS = {
    "identity": {"auth", "release"},
    "data-authz": {"route", "data", "llm", "erase", "money"},
    "client-egress": {"sink", "egress", "upload", "deps"},
}


def commit_of(repo: Path, ref: str) -> str:
    return git(repo, "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}", check=False).strip()


def is_ancestor(repo: Path, old: str, new: str) -> bool:
    return subprocess.run(["git", "-C", str(repo), "merge-base", "--is-ancestor", old, new], capture_output=True, check=False).returncode == 0


def current(repo: Path, name: str, warnings: list[str]) -> str:
    """Newest commit of a branch. Fetches with an explicit refspec: narrow clones hide the real tip."""
    ref = f"refs/remotes/origin/{name}"
    done = subprocess.run(
        ["git", "-C", str(repo), "fetch", "--quiet", "origin", f"+refs/heads/{name}:{ref}"],
        capture_output=True, check=False,
    )
    remote, local = commit_of(repo, ref), commit_of(repo, f"refs/heads/{name}") or commit_of(repo, name)
    if done.returncode:
        warnings.append(f"could not fetch {name} from origin; used the copy on this machine")
    if not remote or not local or is_ancestor(repo, remote, local):
        found = local or remote
        if not found:
            fail(f"{name} is not a branch, commit, range, path or PR")
        return found
    if is_ancestor(repo, local, remote):
        if local != remote:
            warnings.append(f"local {name} is behind origin; used origin")
        return remote
    warnings.append(f"local {name} and origin/{name} diverged; used origin, local commits are not part of this audit")
    return remote


def default_branch(repo: Path) -> str:
    head = git(repo, "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD", check=False).strip()
    if head:
        return head.split("/", 1)[1]
    for name in ("main", "master", "development"):
        if git(repo, "rev-parse", "--verify", "--quiet", name, check=False).strip():
            return name
    fail("no default branch found; pass --base")


def resolve(repo: Path, target: str, base_arg: str | None, warnings: list[str]) -> dict:
    """Return base and head as commits, plus what they mean."""
    def sha(ref: str) -> str:
        return git(repo, "rev-parse", "--verify", f"{ref}^{{commit}}").strip()

    number = re.fullmatch(r"#?(\d+)", target)
    if number:
        n = number.group(1)
        out = subprocess.run(
            ["gh", "pr", "view", n, "--json", "title,url,baseRefName,headRefName,headRefOid,baseRefOid,state,changedFiles,isCrossRepository"],
            cwd=repo, capture_output=True, text=True, check=False,
        )
        if out.returncode:
            fail(f"gh pr view {n}: {out.stderr.strip()[:300]}")
        pr = json.loads(out.stdout)
        git(repo, "fetch", "--quiet", "origin", f"+refs/pull/{n}/head:refs/superaudit/pr-{n}")
        head = sha(f"refs/superaudit/pr-{n}")
        if head != pr["headRefOid"]:
            fail(f"fetched {head[:9]} but the PR head is {pr['headRefOid'][:9]}; retry")
        # A merged PR is already inside its base branch; compare with the base it was merged into.
        base = sha(base_arg or pr["baseRefOid"]) if base_arg or pr["state"] == "MERGED" else current(repo, pr["baseRefName"], warnings)
        if pr["isCrossRepository"]:
            warnings.append("PR from a fork: do not run its code outside a sandbox")
        return {"kind": "pr", "pr": int(n), "title": pr["title"], "url": pr["url"], "base": base, "head": head,
                "base_branch": pr["baseRefName"], "head_branch": pr["headRefName"], "fork": pr["isCrossRepository"], "pr_changed_files": pr["changedFiles"]}
    if ".." in target:
        left, _, right = target.partition("...") if "..." in target else target.partition("..")
        # a..b names an exact left side; a...b starts at the merge base.
        return {"kind": "range", "title": target, "base": sha(left), "head": sha(right or "HEAD"), "exact": "..." not in target}
    if target and (repo / target).exists():
        path = str((repo / target).resolve().relative_to(repo.resolve()))
        return {"kind": "path", "title": target, "base": EMPTY_TREE, "head": git(repo, "stash", "create").strip() or sha("HEAD"), "path": path}
    base_branch = base_arg or default_branch(repo)
    base = sha(base_arg) if base_arg else current(repo, base_branch, warnings)
    if target:
        plain = re.fullmatch(r"[0-9a-f]{7,40}", target) and commit_of(repo, target)
        return {"kind": "branch", "title": target, "base": base, "head": plain or current(repo, target, warnings),
                "base_branch": base_branch, "head_branch": target}
    dirty = git(repo, "stash", "create").strip()
    return {"kind": "worktree", "title": git(repo, "branch", "--show-current").strip() or "HEAD",
            "base": base, "head": dirty or sha("HEAD"), "dirty": bool(dirty), "base_branch": base_branch,
            "head_branch": git(repo, "branch", "--show-current").strip()}


def inventory(repo: Path, base: str, head: str, scope: list[str]) -> list[dict]:
    """Changed files in diff order."""
    files: dict[str, dict] = {}
    fields = git(repo, "diff", "--name-status", "-z", *DIFF, base, head, *scope).split("\0")
    i = 0
    while i < len(fields) - 1:
        status = fields[i]
        if status[0] in "RC":
            files[fields[i + 2]] = {"path": fields[i + 2], "old_path": fields[i + 1], "status": status[0]}
            i += 3
        else:
            files[fields[i + 1]] = {"path": fields[i + 1], "status": status[0]}
            i += 2
    fields = git(repo, "diff", "--numstat", "-z", *DIFF, base, head, *scope).split("\0")
    i = 0
    while i < len(fields) - 1:
        added, deleted, name = fields[i].split("\t", 2)
        if name:
            i += 1
        else:
            name = fields[i + 2]
            i += 3
        files[name]["added"] = 0 if added == "-" else int(added)
        files[name]["deleted"] = 0 if deleted == "-" else int(deleted)
        files[name]["binary"] = added == "-"
    return list(files.values())


def declared_generated(tree: str, files: list[dict]) -> set[str]:
    names = "\0".join(f["path"] for f in files)
    out = subprocess.run(["git", "-C", tree, "check-attr", "-z", "--stdin", "linguist-generated", "linguist-vendored"],
                         input=names, capture_output=True, text=True, check=False).stdout.split("\0")
    return {out[i] for i in range(0, len(out) - 2, 3) if out[i + 2] in ("set", "true")}


def kind_of(path: str) -> str:
    for kind, rx in (("lock", LOCKFILE), ("generated", GENERATED), ("migration", MIGRATION), ("test", TEST),
                     ("release", RELEASE), ("manifest", MANIFEST), ("doc", DOC), ("style", STYLE)):
        if rx.search(path):
            return kind
    return "code"


def classify(files: list[dict], added: dict, removed: dict, declared: set[str], exclude: list[str]) -> list[dict]:
    leak_files = []
    for f in files:
        f["kind"] = kind_of(f["path"])
        lines = added.get(f["path"], [])
        for why, hit in (("binary", f["binary"]), ("generated file type", f["kind"] == "generated"),
                         ("declared generated or vendored in .gitattributes", f["path"] in declared),
                         ("excluded with --exclude", any(fnmatch(f["path"], g) for g in exclude))):
            if hit and "why_skipped" not in f:
                f["kind"], f["why_skipped"] = "generated", why
        if f["kind"] in ("code", "migration", "release", "manifest"):
            # A removed check is as risky as an added one.
            text = "\n".join(lines + removed.get(f["path"], []))
            words = re.sub(r"[/_.\-]+", " ", f["path"])
            f["risk"] = sorted(n for n, rx in RISK_RX.items() if len(rx.findall(text)) >= (1 if n in ONE_HIT else 3) or rx.search(words))
            if f["kind"] != "code":
                f["risk"] = sorted({*f["risk"], "deps" if f["kind"] == "manifest" else "release"})
        elif f["kind"] == "lock":
            f["risk"] = ["deps"]
        # Location only: the value itself never enters a plan, prompt or report.
        hits = sum(bool(LEAK.search(line)) for line in lines)
        if hits:
            leak_files.append({"path": f["path"], "hits": hits, "kind": f["kind"]})
    return leak_files


def weight(f: dict) -> float:
    factor = {"test": 0.3, "doc": 0.5, "style": 0.3}.get(f["kind"], 1.0)
    return (f["added"] + 0.4 * f["deleted"]) * factor + 8


def pool(parts: list[list[dict]], limit: float, cap: int) -> list[list[dict]]:
    """Put the leftovers together, smallest first."""
    parts = sorted(parts, key=lambda p: sum(map(weight, p)))
    while len(parts) > 1 and sum(map(weight, parts[0] + parts[1])) <= limit * 0.5 and len(parts[0] + parts[1]) <= cap:
        parts = sorted([parts[0] + parts[1], *parts[2:]], key=lambda p: sum(map(weight, p)))
    return sorted(parts, key=lambda p: p[0]["path"])


def split(files: list[dict], limit: float, cap: int, depth: int = 0) -> list[list[dict]]:
    """Cut along directories until every part fits; then re-pack small neighbours."""
    if sum(map(weight, files)) <= limit and len(files) <= cap:
        return [files]
    groups: dict[str, list[dict]] = defaultdict(list)
    for f in files:
        groups["/".join(f["path"].split("/")[: depth + 1])].append(f)
    if len(groups) == len(files) or depth > 12:
        parts = [[f] for f in files]
    else:
        parts = [p for key in sorted(groups) for p in split(groups[key], limit, cap, depth + 1)]
    packed: list[list[dict]] = []
    for part in parts:
        together = (packed[-1] if packed else []) + part
        # Two codebases share a reader only when both are small.
        room = limit if len({f["path"].split("/")[0] for f in together}) == 1 else limit * 0.5
        if packed and sum(map(weight, together)) <= room and len(together) <= cap:
            packed[-1] = together
        else:
            packed.append(part)
    return packed


def area_name(files: list[dict]) -> str:
    dirs = [f["path"].split("/")[:-1] for f in files]
    common = []
    for level in zip(*dirs, strict=False):
        if len(set(level)) != 1:
            break
        common.append(level[0])
    if common:
        return "/".join(common)
    top = Counter(d[0] if d else "." for d in dirs)
    return ", ".join(name for name, _ in top.most_common(3))


def make_areas(files: list[dict], max_readers: int) -> list[dict]:
    readable = [f for f in files if f["kind"] != "generated"]
    kinds = {"A": ("code", "migration", "release", "manifest", "style", "lock"), "T": ("test",), "D": ("doc",)}
    members = {g: m for g, k in kinds.items() if (m := [f for f in readable if f["kind"] in k])}
    if max_readers == 1:
        members = {"A": readable}
    # Fewer readers than kinds: docs go to the test reader, then both to the code reader.
    while len(members) > max(1, max_readers):
        last, into = list(members)[-1], list(members)[-2]
        members[into] = members[into] + members.pop(last)
    limit = max(MIN_AREA_WEIGHT, sum(map(weight, readable)) / max_readers)
    cap = MAX_AREA_FILES
    parts = {g: pool(split(m, limit, cap), limit, cap) for g, m in members.items() if m}
    # Grow the areas until the number of readers fits the budget.
    while sum(map(len, parts.values())) > max_readers and limit < 10**7:
        limit, cap = limit * 1.2, int(cap * 1.1)
        parts = {g: pool(split(m, limit, cap), limit, cap) for g, m in members.items() if m}
    areas = []
    for group in parts:
        for n, part in enumerate(parts[group], 1):
            risk = Counter(r for f in part for r in f.get("risk", []))
            high = group == "A" and bool({"auth", "data", "money", "route", "release", "erase", "sink", "upload"} & set(risk))
            area = {"id": f"{group}{n}", "name": area_name(part), "files": [f["path"] for f in part],
                    "added": sum(f["added"] for f in part), "deleted": sum(f["deleted"] for f in part),
                    "risk": [r for r, _ in risk.most_common()], "reader": "opus" if high else "sonnet"}
            for f in part:
                f["area"] = area["id"]
            areas.append(area)
    return areas


def specialists(files: list[dict], tier: str, tree: Path, warnings: list[str]) -> list[dict]:
    ui = [f["path"] for f in files if f["status"] != "D" and Path(f["path"]).suffix in UI and f["kind"] in ("code", "style")]
    out_ui = []
    if ui:
        configs = [p for p in git(tree, "ls-files").splitlines() if E2E_CONFIG.search(p)]
        load = os.getloadavg()[0]
        if not configs:
            warnings.append(f"{len(ui)} UI files changed, but there is no e2e or Playwright config: nobody used the screens")
        elif load > MAX_LOAD:
            warnings.append(f"{len(ui)} UI files changed, but the machine is too busy (load {load:.0f}): nobody used the screens")
        else:
            out_ui = [{"id": "U-ui", "type": "ui", "files": ui, "tags": configs[:3]}]
    if tier in ("XS", "S"):
        # One read with every lens: at this size extra readers mostly find the same things.
        return out_ui
    tags = {r for f in files for r in f.get("risk", [])}
    out = []
    for name, wanted in HUNTERS.items():
        hit = sorted(wanted & tags)
        if hit:
            out.append({"id": f"S-{name}", "type": "security", "tags": hit,
                        "files": [f["path"] for f in files if set(f.get("risk", [])) & wanted]})
    if tier == "M" and len(out) > 1:
        out = [{"id": "S-all", "type": "security", "tags": sorted({t for o in out for t in o["tags"]}),
                "files": sorted({p for o in out for p in o["files"]})}]
    shipping = [f["path"] for f in files if f["kind"] in ("migration", "release", "manifest", "lock")]
    if shipping:
        out.append({"id": "R-release", "type": "release", "files": shipping})
    if any(f["kind"] == "code" for f in files):
        out.append({"id": "W-sprawl", "type": "sprawl", "files": [f["path"] for f in files if f["kind"] == "code"]})
    return out + out_ui


def duties(files: list[dict], tier: str) -> list[str]:
    """What the area reader does itself when there is no specialist for it."""
    if tier not in ("XS", "S"):
        return []
    tags = {r for f in files for r in f.get("risk", [])}
    out = ["security"] if tags & set().union(*HUNTERS.values()) else []
    if any(f["kind"] in ("migration", "release", "manifest", "lock") for f in files):
        out.append("release")
    return out + (["sprawl"] if any(f["kind"] == "code" for f in files) else [])


def worktree(repo: Path, dest: Path, commit: str) -> str:
    if not dest.exists():
        git(repo, "worktree", "prune")
        git(repo, "worktree", "add", "--quiet", "--detach", str(dest), commit)
    if commit_of(dest, "HEAD") != commit:
        fail(f"{dest} holds another commit; use a new --run")
    return str(dest)


def previous(repo: Path, old_run: Path, t: dict) -> tuple[str | None, list[dict]]:
    """Open findings of an earlier run, and its head when the new work builds on it."""
    old = json.loads((old_run / "plan.json").read_text(encoding="utf-8"))
    if (old["repo"], old["kind"], old.get("pr") or old["title"]) != (str(repo), t["kind"], t.get("pr") or t["title"]):
        fail(f"{old_run} audited another target ({old['kind']} {old['title']})")
    problems, merged = gate.verdicts(old_run, old)
    missing, _ = gate.coverage(old_run, old)
    if problems or missing:
        fail(f"{old_run} never finished; resume it instead of rechecking it")
    carry = [{**{k: v for k, v in f.items() if k not in ("decision", "reason", "key", "source", "maybe_same_as", "reader_severity")},
              "id": f"P-{f['id']}", "carried": True, "evidence": f"{f['evidence']} | earlier verdict: {f['decision']}, {f.get('reason', '')}"}
             for f in merged if f["decision"] in gate.OPEN]
    return (old["head"] if is_ancestor(repo, old["head"], t["head"]) else None), carry


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("target", nargs="?", default="")
    ap.add_argument("--base")
    ap.add_argument("--max-readers", type=int, default=16)
    ap.add_argument("--run")
    ap.add_argument("--recheck", metavar="OLD_RUN", help="carry the open findings of a finished run and audit what changed since")
    ap.add_argument("--fast", action="store_true", help="one reader, no specialists; a partial audit")
    ap.add_argument("--exclude", action="append", default=[], metavar="GLOB",
                    help="vendored or generated paths; they stay in the ledger as skipped")
    args = ap.parse_args()

    repo = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").strip())
    warnings: list[str] = []
    t = resolve(repo, args.target.strip(), args.base, warnings)
    since, carry = previous(repo, Path(args.recheck).resolve(), t) if args.recheck else (None, [])
    if args.recheck and not since:
        warnings.append("the earlier head is not an ancestor of this head (rebase?); the whole diff is audited again")
    if since or t["kind"] == "path" or t.get("exact"):
        merge_base = since or t["base"]
    else:
        merge_base = git(repo, "merge-base", t["base"], t["head"], check=False).strip()
        if not merge_base:
            fail("base and head have no common commit (shallow or narrow clone?); fetch more history")
    scope = ["--", f":(literal){t['path']}"] if t.get("path") else []
    files = inventory(repo, merge_base, t["head"], scope)
    if not files:
        fail(f"empty diff {merge_base[:9]}..{t['head'][:9]}; check the target, do not report this as clean")

    run = Path(args.run or repo / ".harness" / "superaudit" / f"{time.strftime('%Y%m%d-%H%M%S')}-{t['head'][:9]}").resolve()
    if run.is_relative_to(repo) and subprocess.run(["git", "-C", str(repo), "check-ignore", "-q", str(run)]).returncode:
        exclude = Path(git(repo, "rev-parse", "--git-path", "info/exclude").strip())
        exclude = exclude if exclude.is_absolute() else repo / exclude
        exclude.parent.mkdir(parents=True, exist_ok=True)
        with exclude.open("a", encoding="utf-8") as fh:
            fh.write("\n/.harness/superaudit/\n")
    trees = Path(tempfile.gettempdir()) / "superaudit" / hashlib.sha1(str(run).encode()).hexdigest()[:12]
    tree = worktree(repo, trees / "head", t["head"])
    base_tree = None if merge_base == EMPTY_TREE else worktree(repo, trees / "base", merge_base)

    sides: dict[str, dict[str, list[str]]] = {"+": defaultdict(list), "-": defaultdict(list)}
    for name, sign, text in patch_lines(repo, merge_base, t["head"], [f["path"] for f in files], scope):
        sides[sign][name].append(text)
    added, removed = sides["+"], sides["-"]
    files.sort(key=lambda f: f["path"])
    leak_files = classify(files, added, removed, declared_generated(tree, files), args.exclude)
    code_lines = sum(f["added"] + f["deleted"] for f in files if f["kind"] not in ("generated", "lock", "doc"))
    tier = "XS" if code_lines <= SMALL else "S" if code_lines <= MEDIUM else "M" if code_lines <= LARGE else "L"
    areas = make_areas(files, 1 if args.fast or tier in ("XS", "S") else args.max_readers)
    for a in areas:
        a["duties"] = [] if args.fast else duties([f for f in files if f.get("area") == a["id"]], tier)
    untracked = [p for p in git(repo, "ls-files", "-z", "--others", "--exclude-standard", *scope).split("\0")
                 if t["kind"] in ("worktree", "path") and Path(p).suffix in growth.CODE and not any(fnmatch(p, g) for g in args.exclude)]
    plan = {
        "run": str(run), "repo": str(repo), "tree": tree, "base_tree": base_tree, "merge_base": merge_base, **t,
        "tier": tier, "reviewed_lines": code_lines, "kinds": dict(Counter(f["kind"] for f in files)),
        "added": sum(f["added"] for f in files), "deleted": sum(f["deleted"] for f in files),
        "commits": len(git(repo, "rev-list", f"{merge_base}..{t['head']}").split()) if merge_base != EMPTY_TREE else 0,
        "areas": areas, "specialists": [] if args.fast else specialists(files, tier, Path(tree), warnings), "fast": args.fast, "leak_files": leak_files,
        "not_covered_untracked": untracked, "warnings": warnings, "files": files,
    }
    save(run / "plan.json", plan)
    save(run / "pin.json", {k: plan[k] for k in ("run", "repo", "tree", "base_tree", "merge_base", "head", "kind", "title", "tier")})
    for folder in ("findings", "verdicts", "fixes", "packets"):
        (run / folder).mkdir(exist_ok=True)
    if carry:
        save(run / "findings" / "P.json", {"area": "P", "files": [], "findings": carry})
    grown = growth.measure(repo, plan, added, removed)
    save(run / "growth.json", grown)
    learned = lessons.write(run, repo, plan)
    checked = prcheck.check(repo, run, plan, added, removed)

    print(f"run        {run}\ntree       {tree}\nbase tree  {base_tree}")
    print(f"target     {t['kind']} {t['title']}  {merge_base[:9]}..{t['head'][:9]}  {plan['commits']} commits")
    print(f"tier       {tier}  {len(files)} files +{plan['added']} -{plan['deleted']}  kinds {plan['kinds']}")
    if "pr_changed_files" in t and t["pr_changed_files"] != len(files):
        print(f"WARNING    GitHub counts {t['pr_changed_files']} files, git counts {len(files)} (renames or a moved base)")
    for a in areas:
        print(f"  {a['id']:<4} {a['reader']:<7}{len(a['files']):>4} files +{a['added']:<6} -{a['deleted']:<6} {a['name']}  {','.join(a['risk'][:6])}{'  DUTIES=' + ','.join(a['duties']) if a['duties'] else ''}")
    for s in plan["specialists"]:
        print(f"  {s['id']:<15} {len(s['files']):>4} files  {','.join(s.get('tags', []))}")
    for w in warnings:
        print(f"WARNING    {w}")
    skipped = [f["path"] for f in files if f["kind"] == "generated" and not f["binary"]]
    if skipped:
        print(f"SKIPPED    {len(skipped)} text files: {', '.join(skipped[:8])}{' ...' if len(skipped) > 8 else ''}")
    if carry:
        print(f"CARRIED    {len(carry)} open findings of the earlier run")
    if leak_files:
        print(f"SECRETS?   {len(leak_files)} files match a key pattern: {', '.join(s['path'] for s in leak_files[:8])}")
    if untracked:
        print(f"NOT COVERED {len(untracked)} untracked code files: {', '.join(untracked[:6])}")
    print(growth.summary(grown))
    print(learned)
    for fact in checked["facts"]:
        print(f"FACT       {fact[:170]}")
    if checked["claims"]:
        print(f"CLAIMS     {len(checked['claims'])} sentences of the PR text need a status")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
