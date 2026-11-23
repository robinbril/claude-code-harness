#!/usr/bin/env python3
"""Do the tests notice the change? Undo one production hunk at a time in the sandbox and run the tests.

    revertcheck.py RUN [--read PATH ...] [--hunks N] [--seconds N] -- TEST COMMAND

A run that stays green with a hunk undone means no test would catch losing it. That is a lead for the
reader or verifier, not a finding: the hunk may be text, types or a pure move. Writes revertcheck.json.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from common import DIFF, fail, git, load, save

SANDBOX = Path(__file__).with_name("sandbox.py")


def hunks(repo: str, base: str, head: str, path: str) -> list[tuple[int, str]]:
    """Each hunk of a file as its own patch, with the line after the change."""
    raw = git(repo, "diff", "-U3", *DIFF, base, head, "--", f":(literal){path}")
    top, *parts = re.split(r"(?m)^(?=@@ )", raw)
    out = []
    for part in parts:
        m = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)", part)
        out.append((int(m.group(1)) if m else 0, top + part))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("run")
    ap.add_argument("--read", action="append", default=[])
    ap.add_argument("--hunks", type=int, default=25)
    ap.add_argument("--seconds", type=int, default=180)
    own = sys.argv[1:]
    cut = own.index("--") if "--" in own else len(own)
    args, command = ap.parse_args(own[:cut]), own[cut + 1 :]
    if not command:
        fail("give the test command after --")
    run = Path(args.run).resolve()
    plan = load(run / "plan.json")
    read = [a for p in args.read for a in ("--read", p)]

    def tests(overlay: Path | None) -> int:
        extra = ["--overlay", str(overlay)] if overlay else []
        return subprocess.run([sys.executable, "-B", str(SANDBOX), str(run), *extra, *read, "--seconds", str(args.seconds), "--", *command],
                              capture_output=True, check=False).returncode

    start = tests(None)
    if start:
        fail(f"the tests are not green on the untouched head (exit {start}); fix the command or the sandbox first")
    todo = [(f["path"], line, patch) for f in plan["files"] if f["kind"] == "code" and f["status"] == "M"
            for line, patch in hunks(plan["repo"], plan["merge_base"], plan["head"], f["path"])]
    unnoticed, undone = [], 0
    for path, line, patch in todo[: args.hunks]:
        with tempfile.TemporaryDirectory(prefix="superaudit-undo-") as tmp:
            target = Path(tmp) / path
            target.parent.mkdir(parents=True)
            target.write_text(git(plan["repo"], "cat-file", "blob", f"{plan['head']}:{path}"), encoding="utf-8", errors="surrogateescape", newline="")
            done = subprocess.run(["git", "apply", "--reverse", "--unidiff-zero", "-"], cwd=tmp, input=patch.encode("utf-8", "surrogateescape"), capture_output=True, check=False)
            if done.returncode:
                continue
            undone += 1
            if tests(Path(tmp)) == 0:
                unnoticed.append({"path": path, "line": line})
                print(f"nobody notices: {path}:{line}")
    save(run / "revertcheck.json", {"command": command, "hunks": len(todo), "tried": undone, "unnoticed": unnoticed})
    print(f"{undone} of {len(todo)} hunks undone, {len(unnoticed)} not noticed by the tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
