"""Sprawl signals for a diff: where the codebase grew, and what the growth left behind.

Every number is a lead for the sprawl reader. Nothing here is a finding by itself.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from pathlib import Path

from common import git

CODE = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".go", ".rs", ".rb", ".php", ".java", ".kt", ".swift", ".sh"}
TEXT = CODE | {".html", ".json", ".yml", ".yaml", ".toml", ".sql", ".css", ".scss", ".md", ".cfg", ".ini", ".txt"}
WORD = re.compile(r"[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*")
DEFINE = re.compile(
    r"^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:def|class|function|func|fn|interface|struct)\s+([A-Za-z_]\w{4,})"
    r"|^\s*export\s+(?:const|let|type|enum)\s+([A-Za-z_]\w{4,})"
)
DECORATED = re.compile(r"^\s*@")
# Names a framework calls, or that every module may define for itself.
COMMON = re.compile(r"^(test_.*|Test.*|__.*|upgrade|downgrade|setup|main|render|default|props|emits|handler|model_config|Config|Meta|handle_(data|starttag|endtag))$")
MULTIWORD = re.compile(r"[a-z]_[a-z]|[a-z][A-Z]")
SMELL_NAME = re.compile(r"(utils?|helpers?|misc|common|manager|legacy|compat|deprecated|_old|_new|_v\d|V\d)\b", re.I)
LINE_SIGNALS = {
    "broad_catch": r"except\s*(Exception|BaseException)?\s*(as \w+)?:|catch\s*(\([^)]*\))?\s*\{",
    "silent_catch": r"except.*:\s*pass\b|catch\s*(\([^)]*\))?\s*\{\s*\}",
    "fallback_chain": r"\bor\b.+\bor\b|\?\?.+\?\?|\|\|.+\|\|",
    "type_escape": r"\bas any\b|:\s*any\b|type:\s*ignore|@ts-(ignore|expect-error)|\bcast\(",
    "lint_escape": r"eslint-disable|#\s*noqa|pylint:\s*disable",
    "flag_or_env": r"os\.(environ|getenv)|process\.env|import\.meta\.env|feature_?flag|is_enabled\(",
    "back_compat": r"backwards?[- ]compat|legacy|deprecated|\bshim\b|for old (clients|callers)",
    "todo": r"\b(TODO|FIXME|HACK|XXX)\b",
    "narration": r"(#|//)\s*(now|first|then|finally|this (function|method)|we (now|also)|previously|no longer|used to)\b",
}
LINE_RX = {k: re.compile(v, re.I) for k, v in LINE_SIGNALS.items()}


def same_codebase(rel: str, homes: set[str]) -> list[str]:
    """Same top directory and same language family: names across codebases may repeat."""
    def family(p: str) -> str:
        web = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"}
        return "web" if Path(p).suffix in web else Path(p).suffix

    return sorted(h for h in homes if h.split("/")[0] == rel.split("/")[0] and family(h) == family(rel))


def read(path: Path) -> str:
    try:
        return "" if path.stat().st_size > 1_500_000 else path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def definitions(text: str) -> set[str]:
    names, previous = set(), ""
    for line in text.splitlines():
        m = DEFINE.match(line)
        # A decorated symbol is registered somewhere; a missing reference proves nothing.
        if m and not DECORATED.match(previous):
            names.add(m.group(1) or m.group(2))
        if line.strip():
            previous = line
    return {n for n in names if not COMMON.match(n)}


def words_gone(added: dict[str, list[str]], removed: dict[str, list[str]]) -> set[str]:
    def words(side: dict[str, list[str]]) -> set[str]:
        return {w for lines in side.values() for line in lines for w in WORD.findall(line)}

    return words(removed) - words(added)


def measure(repo: Path, plan: dict, added: dict[str, list[str]], removed: dict[str, list[str]]) -> dict:
    tree = Path(plan["tree"])
    by_kind: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for f in plan["files"]:
        by_kind[f["kind"]][0] += f["added"]
        by_kind[f["kind"]][1] += f["deleted"]
    code = [f for f in plan["files"] if f["kind"] == "code" and Path(f["path"]).suffix in CODE and f["status"] != "D"]

    words: Counter[str] = Counter()
    defined: dict[str, set[str]] = defaultdict(set)
    tests: Counter[str] = Counter()
    for rel in git(tree, "ls-files", "-z").split("\0"):
        path = Path(rel)
        if path.suffix not in TEXT or re.search(r"(^|/)(node_modules|dist|vendor)/|lock\.(json|yaml)$", rel):
            continue
        text = read(tree / rel)
        found = WORD.findall(text)
        words.update(found)
        if re.search(r"(^|/)(tests?|e2e|__tests__)/|\.(test|spec|e2e)\.", rel):
            tests.update(found)
        elif path.suffix in CODE:
            for name in definitions(text):
                defined[name].add(rel)

    unused, rivals, crossed = [], [], []
    for f in code:
        rel = f["path"]
        fresh = definitions("\n".join(added.get(rel, [])))
        for name in sorted(fresh):
            homes = defined.get(name, set())
            if words[name] - tests[name] <= 1:
                unused.append({"name": name, "path": rel, "in_tests": tests[name]})
            elif MULTIWORD.search(name) and len(twins := same_codebase(rel, homes)) > 1:
                rivals.append({"name": name, "paths": twins[:6]})
        total = read(tree / rel).count("\n")
        before = 0 if f["status"] == "A" else total - f["added"] + f["deleted"]
        for limit in (800, 400):
            if total > limit >= before:
                crossed.append({"path": rel, "before": before, "after": total, "limit": limit})
                break

    orphaned = []
    if plan["kind"] != "path":
        gone = words_gone(added, removed)
        fresh_names = {u["name"] for u in unused}
        for name in sorted(gone & set(defined) - fresh_names):
            if words[name] - tests[name] <= 1:
                orphaned.append({"name": name, "path": sorted(defined[name])[0], "in_tests": tests[name]})

    signals = {k: Counter() for k in LINE_RX}
    for f in code:
        for line in added.get(f["path"], []):
            for k, rx in LINE_RX.items():
                if rx.search(line):
                    signals[k][f["path"]] += 1
    rework: Counter[str] = Counter()
    if plan["kind"] != "path":
        log = git(repo, "log", "--no-merges", "--format=", "--name-only", f"{plan['merge_base']}..{plan['head']}")
        rework = Counter(p for p in log.splitlines() if Path(p).suffix in CODE)
    new = [f for f in code if f["status"] == "A"]
    seen = set()
    return {
        "lines_by_kind": {k: {"added": a, "deleted": d, "net": a - d} for k, (a, d) in sorted(by_kind.items())},
        "new_code_files": len(new),
        "deleted_code_files": sum(1 for f in plan["files"] if f["kind"] == "code" and f["status"] == "D"),
        "smell_names": sorted(f["path"] for f in new if SMELL_NAME.search(Path(f["path"]).stem)),
        "crossed_limit": sorted(crossed, key=lambda c: -c["after"]),
        "unreferenced_new_symbols": unused,
        "orphaned_by_diff": orphaned,
        "same_name_in_several_files": [r for r in rivals if not (r["name"] in seen or seen.add(r["name"]))],
        "line_signals": {k: {"total": sum(c.values()), "top": c.most_common(8)} for k, c in signals.items()},
        "rework": [[p, n] for p, n in rework.most_common(15) if n >= 4],
    }


def summary(g: dict) -> str:
    def net(kind: str) -> int:
        return g["lines_by_kind"].get(kind, {}).get("net", 0)

    return (
        f"growth     code {net('code'):+d}, tests {net('test'):+d}, docs {net('doc'):+d} lines net; "
        f"{g['new_code_files']} new and {g['deleted_code_files']} deleted code files\n"
        f"leads      {len(g['unreferenced_new_symbols'])} new symbols without a user, "
        f"{len(g['orphaned_by_diff'])} orphaned by the diff, "
        f"{len(g['same_name_in_several_files'])} names with more than one home, "
        f"{len(g['crossed_limit'])} files over a size limit, {len(g['rework'])} rework hot spots"
    )
