"""What human reviewers asked about these folders before. One cheap query a week, cached next to the runs."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import time
from pathlib import Path

WEEK = 7 * 86400
QUERY = """query($o:String!,$r:String!,$c:String){repository(owner:$o,name:$r){pullRequests(last:50,before:$c){pageInfo{hasPreviousPage startCursor}
nodes{number author{login} files(first:40){nodes{path}} reviews(first:20){nodes{author{login __typename} state body}} comments(first:20){nodes{author{login __typename} body}}}}}}"""
POINT = re.compile(r"^\s*(?:\*\*)?\d{1,2}\.\s+(.+?)(?=\n\s*(?:\*\*)?\d{1,2}\.\s|\n#|\Z)", re.S | re.M)
NAMED_BOTS = ("[bot]", "coderabbit", "github-actions", "copilot", "greptile")


def gh(repo: Path, *args: str) -> dict | None:
    try:
        out = subprocess.run(["gh", *args], cwd=repo, capture_output=True, text=True, check=False)
        return json.loads(out.stdout) if not out.returncode else None
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def points(body: str) -> list[str]:
    return [re.sub(r"\s+", " ", p).replace("**", "")[:260] for p in POINT.findall(re.sub(r"<!--.*?-->", "", body, flags=re.S))]


def collect(repo: Path) -> list[dict]:
    where = gh(repo, "repo", "view", "--json", "owner,name")
    if not where:
        return []
    out, cursor = [], None
    for _ in range(6):
        more = ["-f", f"c={cursor}"] if cursor else []
        data = gh(repo, "api", "graphql", "-f", f"query={QUERY}", "-f", f"o={where['owner']['login']}", "-f", f"r={where['name']}", *more)
        if not data:
            break
        page = data["data"]["repository"]["pullRequests"]
        for pr in page["nodes"]:
            author = (pr["author"] or {}).get("login")
            for item in pr["reviews"]["nodes"] + pr["comments"]["nodes"]:
                who = item["author"] or {"login": "ghost", "__typename": "User"}
                if who["login"] == author or who["__typename"] == "Bot" or any(b in who["login"].lower() for b in NAMED_BOTS):
                    continue
                out += [{"pr": pr["number"], "point": p, "files": [f["path"] for f in pr["files"]["nodes"]]} for p in points(item["body"])]
        if not page["pageInfo"]["hasPreviousPage"]:
            break
        cursor = page["pageInfo"]["startCursor"]
    return out


def cache_file(run: Path, repo: Path) -> Path:
    return run.parent / f"reviews-cache-{hashlib.sha1(str(Path(repo).resolve()).encode()).hexdigest()[:8]}.json"


def near(run: Path, repo: Path, changed: set[str], keep: int = 12) -> list[str]:
    cache = cache_file(run, repo)
    if cache.exists() and time.time() - cache.stat().st_mtime < WEEK:
        rows = json.loads(cache.read_text(encoding="utf-8"))
    else:
        rows = collect(repo)
        if rows:
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    names = {Path(p).name for p in changed}
    folders = {str(Path(p).parent) for p in changed}

    def score(row: dict) -> int:
        said = any(n in row["point"] for n in names)
        return 4 * said + 2 * bool(changed & set(row["files"])) + bool(folders & {str(Path(f).parent) for f in row["files"]})

    best = sorted((r for r in rows if score(r)), key=lambda r: (-score(r), -r["pr"]))
    return [f"- PR {r['pr']}: {r['point']}" for r in best[:keep]]
