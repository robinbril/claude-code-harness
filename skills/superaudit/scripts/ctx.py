#!/usr/bin/env python3
"""Context router: gives an agent the smallest slice that can settle its question, and counts what it took.

    ctx.py RUN ID start [PAGE]          the work pack of this agent (brief, checks, code), page by page
    ctx.py RUN ID show PATH:A-B         lines of a file after the change
    ctx.py RUN ID base PATH:A-B         lines of that file before the change
    ctx.py RUN ID def NAME              where NAME is defined, with its body
    ctx.py RUN ID uses NAME             every use outside tests, one line each
    ctx.py RUN ID tests NAME            tests that mention NAME
    ctx.py RUN ID grep REGEX [GLOB]     search the whole tree
    ctx.py RUN ID card NAME             one check card
    ... --why "QUESTION"                needed once the budget is used; say what the answer would change

Everything is read from git at the pinned commits. Lines that this agent already has are not sent again.
"""

from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path

import cards
from common import DIFF, fail, git, load, redact, save

SKILL = Path(__file__).resolve().parent.parent
# Below what a shell tool returns in one piece; a longer answer would be read twice.
PAGE = 27_000
ANSWER = 9_000
# Characters, about four per token.
BUDGET = {"XS": 90_000, "S": 130_000, "M": 220_000, "L": 280_000}
VERIFY_BASE, VERIFY_EACH = 60_000, 14_000
DRIVERS = {".py": "python", ".go": "golang", ".rs": "rust", ".rb": "ruby", ".java": "java", ".php": "php", ".css": "css", ".sh": "bash"}
TESTS = re.compile(r"(^|/)(tests?|e2e|__tests__)/|(^|/)test_|[._](test|spec|e2e)\.")


class Agent:
    def __init__(self, run: Path, ident: str) -> None:
        self.run, self.id, self.plan = run, ident, load(run / "plan.json")
        self.repo, self.head, self.base = self.plan["repo"], self.plan["head"], self.plan["merge_base"]
        # Characters of code that still fit in this answer; a pack is paged and has no limit.
        self.room: int | None = None
        self.file = run / "ctx" / f"{ident}.json"
        self.state = json.loads(self.file.read_text()) if self.file.exists() else {"used": 0, "given": {}, "log": []}
        self.packet = load(run / "packets" / f"{ident}.json")["findings"] if re.fullmatch(r"V\d+", ident) else []
        self.part = next((p for p in self.plan["areas"] + self.plan["specialists"] if p["id"] == ident), None)

    @property
    def budget(self) -> int:
        return VERIFY_BASE + VERIFY_EACH * len(self.packet) if self.packet else BUDGET[self.plan["tier"]]

    def blob(self, path: str, commit: str | None = None) -> list[str] | None:
        ref = f"{commit or self.head}:{path}"
        if git(self.repo, "cat-file", "-t", ref, check=False).strip() != "blob":
            return None
        return git(self.repo, "cat-file", "blob", ref).split("\n")

    def new_lines(self, path: str, a: int, b: int) -> list[tuple[int, int]]:
        """The parts of a..b this agent does not have yet."""
        have = {n for x, y in self.state["given"].get(path, []) for n in range(x, y + 1)}
        out: list[tuple[int, int]] = []
        for n in range(a, b + 1):
            if n in have:
                continue
            if out and out[-1][1] == n - 1:
                out[-1] = (out[-1][0], n)
            else:
                out.append((n, n))
        return out

    def give(self, path: str, a: int, b: int, text: list[str]) -> str:
        fresh = self.new_lines(path, a, b)
        if not fresh:
            return f"{path}:{a}-{b} is already above."
        parts, cut = [], ""
        for x, y in fresh:
            rows = [f"{n:5} {text[n - 1]}" for n in range(x, y + 1)]
            sent = len(rows)
            if self.room is not None:
                rows = [r if len(r) <= 3000 else r[:3000] + " [long line]" for r in rows]
                sent, size = 0, 0
                while sent < len(rows) and size + len(rows[sent]) < self.room:
                    size, sent = size + len(rows[sent]) + 1, sent + 1
                self.room -= size
            if sent:
                self.state["given"].setdefault(path, []).append((x, x + sent - 1))
                parts.append("\n".join(rows[:sent]))
            if sent < len(rows):
                cut = f"\n[cut at line {x + sent}: ask for {x + sent}-{b}]"
                break
        return f"== {path}:{a}-{b}\n" + "\n   ... (already above)\n".join(parts) + cut

    def finish(self, command: str, text: str, cap: int) -> str:
        text = redact(text)
        if len(text) > cap:
            text = text[:cap].rsplit("\n", 1)[0] + "\n[cut: ask for a narrower part]"
        self.state["used"] += len(text)
        self.state["log"].append([command[:160], len(text)])
        save(self.file, self.state)
        return f"{text}\n[{self.state['used'] // 4000}k of about {self.budget // 4000}k tokens]"


def symbol_at(lines: list[str], path: str, line: int) -> tuple[int, int] | None:
    """The function or class around a line."""
    if path.endswith(".py"):
        try:
            nodes = [n for n in ast.walk(ast.parse("\n".join(lines))) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))]
        except (SyntaxError, ValueError):
            nodes = []
        spans = [(min([n.lineno, *[d.lineno for d in n.decorator_list]]), n.end_lineno) for n in nodes]
        around = [s for s in spans if s[0] <= line <= s[1]]
        return max(around) if around else None
    start = next((n for n in range(min(line, len(lines)), 0, -1) if cards.DEFINE.match(lines[n - 1])), None)
    if start is None:
        return None
    depth, seen = 0, False
    for n in range(start, min(len(lines), start + 400) + 1):
        depth += lines[n - 1].count("{") - lines[n - 1].count("}")
        seen = seen or "{" in lines[n - 1]
        if seen and depth <= 0:
            return (start, n) if n >= line else None
    return None


def window(lines: list[str], path: str, line: int, limit: int) -> tuple[int, int]:
    """The enclosing function when it fits, else the lines around the place."""
    span = symbol_at(lines, path, line)
    if span and span[1] - span[0] < limit:
        return span
    half = limit // 3
    return max(1, line - half), min(len(lines), line + half)


def numbered_diff(a: Agent, f: dict) -> str:
    """The change with whole functions around it, numbered as after the change."""
    if f["status"] == "D":
        text = a.blob(f["path"], a.base) or []
        return f"== {f['path']} DELETED, {len(text)} lines. Who still needs it? First lines:\n" + "\n".join(text[:25])
    attributes = a.run / "ctx" / "attributes"
    attributes.parent.mkdir(exist_ok=True)
    attributes.write_text("".join(f"*{s} diff={d}\n" for s, d in DRIVERS.items()))
    paths = [p for p in (f.get("old_path"), f["path"]) if p]
    for style in (["-W"], ["-U20"], ["-U6"], ["-U2"]):
        raw = git(a.repo, "-c", f"core.attributesFile={attributes}", "diff", *style, *DIFF, a.base, a.head, "--",
                  *[f":(literal){p}" for p in paths]).split("\n")
        if len(raw) <= 380:
            break
    out, n, begin, sent = [f"== {f['path']} {f['status']} +{f['added']} -{f['deleted']}"], 0, None, []
    for line in raw:
        m = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)", line)
        if m:
            n = begin = int(m.group(1))
            out.append("  ---")
        elif begin is not None and line[:1] == "-":
            out.append(f"      -{line[1:]}")
        elif begin is not None and line[:1] in ("+", " "):
            out.append(f"{n:5} {line}")
            sent += [n] if len(out) <= 420 else []
            n += 1
    # Only what is really in the pack; the rest can still be asked for.
    a.state["given"].setdefault(f["path"], []).extend((x, x) for x in sent)
    if len(out) > 420:
        out = out[:420] + [f"[{len(out) - 420} more lines: show {f['path']}:A-B]"]
    return "\n".join(out)


def hits(a: Agent, args: list[str], keep: int) -> list[str]:
    out = git(a.repo, "grep", "-nI", *args, check=False).split("\n")
    rows = [r.split(":", 1)[1][:190] for r in out if ":" in r]
    return rows[:keep] + ([f"[{len(rows) - keep} more]"] if len(rows) > keep else [])


def uses(a: Agent, name: str, tests: bool, keep: int = 25) -> list[str]:
    rows = [r for r in hits(a, ["-wF", "-e", name, a.head], 10**6) if bool(TESTS.search(r.split(":", 1)[0])) == tests]
    return rows[:keep] + ([f"[{len(rows) - keep} more]"] if len(rows) > keep else [])


def section(name: str) -> str:
    text = (SKILL / "references" / "briefs.md").read_text(encoding="utf-8")
    m = re.search(rf"^## {re.escape(name)}\n(.*?)(?=^## |\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else fail(f"no brief called {name}")


ROLES = {"security": "Security hunter", "release": "Release reader", "sprawl": "Sprawl reader", "ui": "UI prover"}


def pack(a: Agent) -> str:
    out = [section("Common")]
    if a.packet:
        out += [section("Verifier"), "# Findings to refute\n"]
        for f in a.packet:
            keep = {k: f[k] for k in ("id", "key", "lens", "severity", "title", "scenario", "evidence", "refutation_tried", "fix", "test",
                                      "net_lines", "sprawl_class", "maybe_same_as") if f.get(k) not in (None, "", [])}
            out.append(f"## {f['id']} {f['path']}:{f.get('line')}\n{json.dumps(keep, ensure_ascii=False)}")
            text = a.blob(f["path"])
            if text and isinstance(f.get("line"), int):
                out.append(a.give(f["path"], *window(text, f["path"], f["line"], 110), text))
        return "\n\n".join(out)
    if re.fullmatch(r"N\d+", a.id):
        return "\n\n".join([*out, section("Variant hunter")])
    if re.fullmatch(r"G\d+", a.id):
        return "\n\n".join([*out, section("Gap sweep")])
    if not a.part:
        fail(f"no agent {a.id} in this plan")
    out.append(section(ROLES.get(a.part.get("type", ""), "Area reader")))
    if a.part.get("duties"):
        out.append("DUTIES: " + ", ".join(a.part["duties"]))
    first = a.plan["areas"][0]["id"] if a.plan["areas"] else ""
    for name in ("YARDSTICK.md", "lessons.md", *(["prcheck.md"] if a.id == first or a.part.get("type") == "release" else [])):
        path = a.run / name
        if path.exists():
            out.append(path.read_text(encoding="utf-8")[:6000])
    files = [f for f in a.plan["files"] if f["path"] in set(a.part["files"])]
    chosen = cards.choose(a.part, files, a.run)
    out.append("# Checks that fit this change\n\n" + "\n\n".join(cards.text(n) for n in chosen))
    out.append("Other cards, only when the code asks for it: " + ", ".join(n for n in cards.names() if n not in chosen))
    if a.part.get("type") == "sprawl" or "sprawl" in a.part.get("duties", []):
        out.append("# Growth leads\n" + cards.leads(a.run, {f["path"] for f in files}))
    if a.part["id"][0] in "ATD":
        out.append("# The change\n\n" + "\n\n".join(numbered_diff(a, f) for f in files))
    else:
        # A specialist starts from the list and pulls only what its question needs.
        out.append("# Hunting ground\n" + "\n".join(f"{f['path']} {f['status']} +{f['added']} -{f['deleted']} {','.join(f.get('risk', []))}" for f in files))
    return "\n\n".join(out)


def span(a: Agent, spec: str, commit: str) -> str:
    m = re.fullmatch(r"(.+?):(\d+)(?:-(\d+))?", spec)
    if not m:
        fail("use PATH:A-B")
    path, x, y = m.group(1), int(m.group(2)), int(m.group(3) or m.group(2))
    text = a.blob(path, commit)
    if text is None:
        return f"{path} does not exist there."
    if not m.group(3):
        x, y = window(text, path, x, 90)
    x, y = max(1, x), min(len(text), y, x + 220)
    return a.give(path if commit == a.head else f"base:{path}", x, y, text)


def answer(a: Agent, what: str, rest: list[str]) -> str:
    arg = rest[0] if rest else fail(f"{what} needs an argument")
    if what == "show":
        return span(a, arg, a.head)
    if what == "base":
        return span(a, arg, a.base)
    if what == "card":
        return cards.text(arg)
    if what == "grep":
        return "\n".join(hits(a, ["-E", "-e", arg, a.head, "--", *([f":(glob){rest[1]}"] if len(rest) > 1 else [])], 40)) or "no hits"
    if what in ("uses", "tests"):
        return "\n".join(uses(a, arg, what == "tests")) or f"no {what} of {arg}"
    if what == "def":
        rows = [r for r in hits(a, ["-wE", "-e", rf"(def|class|function|func|fn|const|let|type|interface|enum|struct) +{re.escape(arg)}", a.head], 6) if ":" in r]
        out = []
        for row in rows[:3]:
            path, number, _ = row.split(":", 2)
            out.append(span(a, f"{path}:{number}", a.head))
        return "\n".join(out) or f"no definition of {arg}"
    return fail(f"unknown request {what}")


def main() -> int:
    args, why = sys.argv[1:], ""
    if "--why" in args:
        i = args.index("--why")
        why, args = " ".join(args[i + 1 : i + 2]), args[:i] + args[i + 2 :]
    if len(args) < 3:
        fail(__doc__)
    a = Agent(Path(args[0]).resolve(), args[1])
    what, rest = args[2], args[3:]
    if what == "start":
        cache = a.run / "ctx" / f"{a.id}.pack.txt"
        if not cache.exists():
            cache.parent.mkdir(exist_ok=True)
            cache.write_text(redact(pack(a)), encoding="utf-8", errors="surrogateescape")
        text, pages = cache.read_text(encoding="utf-8", errors="surrogateescape"), []
        while text:
            cut = len(text) if len(text) <= PAGE else text.rfind("\n", 0, PAGE) + 1 or PAGE
            pages.append(text[:cut])
            text = text[cut:]
        n = int(rest[0]) if rest else 1
        if not 1 <= n <= len(pages):
            fail(f"pages 1 to {len(pages)}")
        more = f"\n[page {n} of {len(pages)}: next is start {n + 1}]" if n < len(pages) else ""
        body = a.finish(f"start {n}", pages[n - 1] + more, PAGE + 200)
        sys.stdout.buffer.write((body + "\n").encode("utf-8", "replace"))
        return 0
    if a.state["used"] > 1.5 * a.budget:
        print("Budget and reserve are used. Decide with what you have; name what is open in notes.")
        return 1
    if a.state["used"] > a.budget and not why:
        print('Budget used. Decide now, or repeat with --why "which finding the answer would change".')
        return 1
    a.room = ANSWER - 700
    sys.stdout.buffer.write((a.finish(f"{what} {' '.join(rest)} {why}", answer(a, what, rest), ANSWER) + "\n").encode("utf-8", "replace"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
