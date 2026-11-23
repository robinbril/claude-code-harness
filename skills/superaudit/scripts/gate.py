#!/usr/bin/env python3
"""Deterministic gates between the phases. Exit 0 = go on, exit 1 = this phase is not done.

    gate.py coverage RUN   every changed file is reviewed or skipped by its own area reader
    gate.py packets  RUN   check citations, mark likely duplicates, write verifier packets
    gate.py verdicts RUN   every finding has exactly one verdict -> verified.json
    gate.py fixes    RUN   every confirmed finding has exactly one action -> actions.json
    gate.py clean    RUN   remove the detached worktrees of this run

render.py calls the same functions again, so a stale result file cannot decide a verdict.
"""

from __future__ import annotations

import functools
import hashlib
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

from common import ACTIONS, DECISIONS, LENSES, SEVERITIES, fail, git, load, save

PACKET_SIZE = 28
NEAR = 10
TEXT_FIELDS = ("id", "lens", "severity", "path", "title", "scenario", "evidence", "refutation_tried", "fix")
# What a verifier may set; where a finding points and what it claims stay as they were checked.
VERDICT_FIELDS = ("decision", "severity", "reason", "fix", "test", "size", "net_lines", "duplicate_of", "options")
OPEN = ("confirmed", "needs_validation", "product_decision")


def objects(folder: Path, key: str) -> list[tuple[Path, dict]]:
    """Every JSON object under a folder; a wrong shape is an error, never an empty result."""
    out = []
    for path in sorted(folder.rglob("*.json")):
        data = load(path)
        if not isinstance(data, dict) or not isinstance(data.get(key), list) or not all(isinstance(x, dict) for x in data[key]):
            fail(f"{path} must be one object with a list of objects under '{key}'")
        out.append((path, data))
    return out


def coverage(run: Path, plan: dict) -> tuple[list[str], dict]:
    problems, status = [], {}
    reports = objects(run / "findings", "findings")
    owner = {f["path"]: f.get("area") for f in plan["files"]}
    for part in plan["areas"] + plan["specialists"]:
        own = [d for p, d in reports if re.fullmatch(re.escape(part["id"]) + r"(-r\d+)?", p.stem)]
        if not own:
            problems.append(f"{part['id']} wrote no findings/{part['id']}.json")
        for data in own:
            if not isinstance(data.get("files"), list) or not all(isinstance(f, dict) for f in data["files"]):
                problems.append(f"{part['id']}: 'files' is not a list of objects")
                continue
            for f in data["files"]:
                path, state = f.get("path"), f.get("status")
                if state not in ("reviewed", "skipped"):
                    problems.append(f"{part['id']}: {path} has status {state!r}")
                elif state == "skipped" and not str(f.get("reason") or "").strip():
                    problems.append(f"{part['id']}: {path} skipped without a reason")
                elif owner.get(path) == part["id"] and (path not in status or state == "reviewed"):
                    # A specialist reads for one purpose; it never replaces the area reader.
                    status[path] = {"path": path, "status": state, "by": part["id"], "reason": f.get("reason") or ""}
    said = {c.get("id"): c for _, d in reports for c in d.get("claims") or [] if c.get("status") in ("true", "false", "unproven")}
    for c in load(run / "prcheck.json")["claims"] if (run / "prcheck.json").exists() else []:
        if c["id"] not in said:
            problems.append(f"claim {c['id']} of the PR text has no status: {c['text'][:70]}")
    ledger = []
    for f in plan["files"]:
        if f["kind"] == "generated":
            ledger.append({"path": f["path"], "status": "skipped", "by": "plan", "reason": f["why_skipped"]})
        elif f["path"] in status:
            ledger.append(status[f["path"]])
        else:
            problems.append(f"{f['path']} ({f.get('area')}) has no status from its area reader")
    done = Counter(x["status"] for x in ledger)
    if not done["reviewed"]:
        problems.append("no file was reviewed at all")
    return problems, {"total": len(plan["files"]), "ledger": ledger, "reviewed": done["reviewed"], "skipped": done["skipped"], "claims": said}


def key_of(f: dict) -> str:
    text = "\0".join(str(f.get(k)) for k in (*TEXT_FIELDS, "line", "net_lines"))
    return hashlib.sha1(text.encode("utf-8", "surrogateescape")).hexdigest()[:10]


@functools.cache
def lines_at(repo: str, head: str, path: str) -> int:
    """Lines of a file at the pinned head, 0 when it is not a file there. From git, so it also works after clean."""
    if git(repo, "cat-file", "-t", f"{head}:{path}", check=False).strip() != "blob":
        return 0
    text = git(repo, "cat-file", "blob", f"{head}:{path}")
    return text.count("\n") + (not text.endswith("\n"))


def check(f: dict, plan: dict) -> list[str]:
    bad = [f"no {k}" for k in TEXT_FIELDS if not isinstance(f.get(k), str) or not f[k].strip()]
    if bad:
        return bad
    if f["severity"] not in SEVERITIES:
        bad.append(f"severity {f['severity']!r}")
    if f["lens"] not in LENSES:
        bad.append(f"lens {f['lens']!r}")
    for k in ("line", "net_lines"):
        if f.get(k) is not None and type(f[k]) is not int:
            bad.append(f"{k} must be a whole number")
    if f["lens"] == "sprawl" and f.get("net_lines") is None:
        bad.append("sprawl without net_lines")
    # A finding carried from an earlier run cites lines of that run.
    if bad or (f.get("carried") and f["id"].startswith("P-")):
        return bad
    changed = {p for x in plan["files"] for p in (x["path"], x.get("old_path")) if p}
    total = lines_at(plan["repo"], plan["head"], f["path"])
    if total:
        if f.get("line") is None or not 1 <= f["line"] <= total:
            bad.append(f"cites line {f.get('line')} of {total}")
    elif f["path"] not in changed:
        # Deleted files, old names and submodules have no file at the head, but are in the diff.
        bad.append(f"cites {f['path']}, which does not exist at the pinned head")
    return bad


def findings(run: Path, plan: dict) -> tuple[list[str], list[dict]]:
    found, problems, seen = [], [], set()
    for path, data in objects(run / "findings", "findings"):
        for f in data["findings"]:
            bad = check(f, plan)
            if f.get("id") in seen:
                bad.append("duplicate id")
            seen.add(f.get("id"))
            if bad:
                problems.append(f"{path.name} {f.get('id')}: {', '.join(bad)}")
            found.append({**f, "source": path.stem, "key": key_of(f)})
    keys = {(f.get("id"), f["key"]) for f in found}
    for _, packet in objects(run / "packets", "findings"):
        for f in packet["findings"]:
            if (f["id"], f["key"]) not in keys:
                problems.append(f"{f['id']} was changed or removed after it went to a verifier; restore it and report the new version under a new id")
    return problems, found


def given(run: Path, found: list[dict]) -> dict[str, list[dict]]:
    """Verdicts that belong to the current text of a finding; others are ignored."""
    keys, out = {f["id"]: f["key"] for f in found}, defaultdict(list)
    for _, data in objects(run / "verdicts", "verdicts"):
        for v in data["verdicts"]:
            if v.get("id") in keys and keys[v["id"]] == v.get("key"):
                out[v["id"]].append(v)
    return out


def invalid(v: dict) -> str:
    if v.get("decision") not in DECISIONS or not str(v.get("reason") or "").strip():
        return f"decision {v.get('decision')!r} or reason missing"
    if v.get("duplicate_of") and v["decision"] != "duplicate_of":
        return f"names a duplicate but decides {v['decision']}; a duplicate counts once"
    if v["decision"] in OPEN and v.get("severity") not in SEVERITIES:
        return f"{v['decision']} needs a severity"
    if v["decision"] == "product_decision":
        options = v.get("options")
        if not isinstance(options, list) or len([o for o in options if isinstance(o, str) and o.strip()]) < 2:
            return "product_decision needs a list of at least two options"
    if v.get("net_lines") is not None and type(v["net_lines"]) is not int:
        return "net_lines must be a whole number"
    return ""


def verdicts(run: Path, plan: dict) -> tuple[list[str], list[dict]]:
    problems, found = findings(run, plan)
    if problems:
        return problems, []
    got: dict[str, dict] = {}
    for i, votes in given(run, found).items():
        good = [v for v in votes if not invalid(v)]
        if len(good) > 1:
            problems.append(f"{i} has {len(good)} verdicts")
        elif good:
            got[i] = good[0]
        else:
            problems.append(f"{i}: {invalid(votes[-1])}; run packets for a new verdict")
    problems += [f"{f['id']} has no valid verdict" for f in found if f["id"] not in got]
    for i, v in got.items():
        if v["decision"] != "duplicate_of":
            continue
        to, hops = v.get("duplicate_of"), {i}
        while to in got and got[to]["decision"] == "duplicate_of" and to not in hops:
            hops.add(to)
            to = got[to].get("duplicate_of")
        if to not in got or to in hops or got[to]["decision"] == "rejected":
            problems.append(f"{i}: duplicate_of {v.get('duplicate_of')!r} must end at a finding that stands")
    merged = []
    for f in found:
        v = {k: x for k, x in got.get(f["id"], {}).items() if x not in (None, "") and k in VERDICT_FIELDS}
        if v.get("severity") not in SEVERITIES:
            v.pop("severity", None)
        merged.append({**f, "reader_severity": f["severity"], **v})
    return problems, [] if problems else merged


def not_a_fix(plan: dict, commit: str) -> str:
    repo = plan["repo"]
    if not re.fullmatch(r"[0-9a-f]{7,40}", commit):
        return "is not a commit hash"
    if not git(repo, "rev-parse", "--verify", "--quiet", f"{commit}^{{commit}}", check=False).strip():
        return "does not exist"
    known = subprocess.run(["git", "-C", repo, "merge-base", "--is-ancestor", commit, plan["head"]], capture_output=True, check=False)
    return "is already part of the audited head" if known.returncode == 0 else ""


def fixes(run: Path, plan: dict, merged: list[dict]) -> tuple[list[str], list[dict]]:
    todo = {f["id"]: f for f in merged if f["decision"] == "confirmed"}
    got, problems = {}, []
    for path, data in objects(run / "fixes", "items"):
        for x in data["items"]:
            i, action = x.get("id"), x.get("action")
            proof = str(x.get("proof") or "").strip()
            if i not in todo:
                problems.append(f"{path.name}: {i} is not a confirmed finding")
            elif i in got:
                problems.append(f"{i} has two actions")
            elif action not in ACTIONS:
                problems.append(f"{i}: action {action!r}")
            elif action == "fixed" and not (x.get("commit") and proof):
                problems.append(f"{i}: fixed without a commit and a proof")
            elif action == "fixed" and (why := not_a_fix(plan, str(x["commit"]))):
                problems.append(f"{i}: commit {x['commit']} {why}")
            elif action != "fixed" and not str(x.get("reason") or "").strip():
                problems.append(f"{i}: {action} without a reason")
            elif action == "dropped" and not proof:
                problems.append(f"{i}: dropped only with the proof that the finding is false")
            else:
                got[i] = x
    missing = [f"{i} ({f['severity']}) has no action" for i, f in todo.items() if i not in got]
    return problems + missing, list(got.values())


def write_packets(run: Path, found: list[dict]) -> list[int]:
    by_path, by_symbol = defaultdict(list), defaultdict(list)
    for f in found:
        by_path[f["path"]].append(f)
        if isinstance(f.get("symbol"), str) and f["symbol"]:
            by_symbol[f["symbol"]].append(f)
    parent = {f["id"]: f["id"] for f in found}

    def root(i: str) -> str:
        while parent[i] != i:
            i = parent[i]
        return i

    for f in found:
        near = {g["id"] for g in by_path[f["path"]] if abs((g.get("line") or 0) - (f.get("line") or 0)) <= NEAR}
        if isinstance(f.get("symbol"), str):
            near |= {g["id"] for g in by_symbol.get(f["symbol"], [])}
        f["maybe_same_as"] = sorted(near - {f["id"]})
        for other in f["maybe_same_as"]:
            parent[root(other)] = root(f["id"])
    decided = {i for i, votes in given(run, found).items() if not all(map(invalid, votes))}
    clusters = defaultdict(list)
    for f in sorted(found, key=lambda f: (f["path"], f.get("line") or 0)):
        if f["id"] not in decided:
            clusters[root(f["id"])].append(f)
    # Neighbours stay in one packet, so one verifier decides about the duplicates.
    groups: list[list[dict]] = []
    for cluster in sorted(clusters.values(), key=lambda c: c[0]["path"]):
        if groups and len(groups[-1]) + len(cluster) <= PACKET_SIZE:
            groups[-1] += cluster
        else:
            groups.append(list(cluster))
    used = [int(p.stem[1:]) for p in (run / "verdicts").glob("V*.json") if p.stem[1:].isdigit()]
    for old in (run / "packets").glob("V*.json"):
        if not (run / "verdicts" / old.name).exists():
            old.unlink()
    for n, group in enumerate(groups, max(used, default=0) + 1):
        group.sort(key=lambda f: SEVERITIES.index(f["severity"]))
        save(run / "packets" / f"V{n}.json", {"packet": f"V{n}", "findings": group})
    return [len(g) for g in groups]


def clean(plan: dict) -> int:
    for key in ("tree", "base_tree"):
        path = plan.get(key)
        # Only a directory this skill made; git refuses when it holds changes.
        if path and re.search(r"/superaudit/[^/]+/(head|base)$", path) and Path(path).exists():
            git(plan["repo"], "worktree", "remove", path, check=False)
            print(f"{'left in place (changed files)' if Path(path).exists() else 'removed'}: {path}")
    return 0


def finish(problems: list[str], target: Path | None, data: object, ok: str) -> int:
    if problems:
        if target:
            target.unlink(missing_ok=True)
        print(f"NOT DONE: {len(problems)} problems")
        print("\n".join(f"  - {p}" for p in problems[:60]))
        return 1
    if target:
        save(target, data)
    print(f"OK: {ok}")
    return 0


def counts(items: list[dict]) -> str:
    c = Counter(f["severity"] for f in items)
    return " ".join(f"{s}={c[s]}" for s in SEVERITIES)


def main() -> int:
    if len(sys.argv) != 3 or sys.argv[1] not in ("coverage", "packets", "verdicts", "fixes", "clean"):
        fail(__doc__)
    step, run = sys.argv[1], Path(sys.argv[2]).resolve()
    plan = load(run / "plan.json")
    if step == "clean":
        return clean(plan)
    if step == "coverage":
        problems, cov = coverage(run, plan)
        return finish(problems, run / "coverage.json", cov, f"{cov['reviewed']} reviewed, {cov['skipped']} skipped, {cov['total']} total")
    if step == "packets":
        problems, found = findings(run, plan)
        sizes = [] if problems else write_packets(run, found)
        return finish(problems, None, None, "" if problems else f"{len(found)} findings with valid citations, {counts(found)}; open packets {sizes}")
    problems, merged = verdicts(run, plan)
    if step == "verdicts":
        stand = [f for f in merged if f["decision"] == "confirmed"]
        return finish(problems, run / "verified.json", merged, f"{dict(Counter(f['decision'] for f in merged))}; confirmed {counts(stand)}")
    more, actions = fixes(run, plan, merged)
    return finish(problems + more, run / "actions.json", actions, f"{dict(Counter(x['action'] for x in actions))}")


if __name__ == "__main__":
    raise SystemExit(main())
