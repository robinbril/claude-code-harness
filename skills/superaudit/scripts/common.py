"""Shared helpers for the superaudit scripts. Standard library only."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path

DIFF = ("-M", "--no-color", "--no-ext-diff", "--no-textconv", "--no-relative", "--src-prefix=a/", "--dst-prefix=b/")

SEVERITIES = ("critical", "high", "medium", "low")
LENSES = (
    "correctness",
    "data",
    "security",
    "contract",
    "intent",
    "tests",
    "release",
    "sprawl",
)
DECISIONS = (
    "confirmed",
    "rejected",
    "duplicate_of",
    "needs_validation",
    "product_decision",
)
ACTIONS = ("fixed", "dropped", "product_decision", "large", "blocked")

LEAK = re.compile(
    r"(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|"
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,})"
)
# The lines of a key block, with the line number and diff sign in front of them.
LEAK_BODY = re.compile(r"(?m)^([ \d]*[+-]?[ ]?)[A-Za-z0-9+/]{64}[ ]*$|(?<=PRIVATE KEY-----)((?:\n[ \d]*[+-]?[ ]?[A-Za-z0-9+/=]{16,})+)")


def redact(text: str) -> str:
    """Same lines, without what looks like a key."""
    text = LEAK_BODY.sub(lambda m: f"{m[1]}[key]" if m[2] is None else re.sub(r"[A-Za-z0-9+/=]{16,}", "[key]", m[2]), text)
    return LEAK.sub("[key]", text)


def fail(message: str) -> None:
    print(f"superaudit: {message}", file=sys.stderr)
    raise SystemExit(2)


def git(repo: Path | str, *args: str, check: bool = True) -> str:
    out = subprocess.run(
        ["git", "-c", "core.quotepath=off", "-C", str(repo), *args],
        capture_output=True,
        check=False,
    )
    if check and out.returncode != 0:
        fail(f"git {' '.join(args[:3])} failed: {out.stderr.decode(errors='replace').strip()[:400]}")
    # Not text=True: that turns a lone carriage return inside a source line into a new line.
    return out.stdout.decode("utf-8", "surrogateescape")


def patch_lines(repo: Path | str, base: str, head: str, paths: list[str], scope: list[str]) -> Iterator[tuple[str, str, str]]:
    """Yield (path, sign, text). Paths come from the -z inventory in the same order, so quoting and
    the user's diff configuration cannot lose a file."""
    number, in_hunk = -1, False
    for line in git(repo, "-c", "diff.submodule=short", "diff", "-U0", *DIFF, base, head, *scope).split("\n"):
        if line.startswith("diff --git "):
            number, in_hunk = number + 1, False
        elif line.startswith("@@"):
            in_hunk = True
        elif in_hunk and line.startswith(("+", "-")):
            yield paths[number], line[0], line[1:]
    if number + 1 != len(paths):
        fail(f"the patch holds {number + 1} files, the inventory {len(paths)}")


def load(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"missing {path}")
    except json.JSONDecodeError as exc:
        fail(f"{path} is not valid JSON: {exc}")


def save(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
