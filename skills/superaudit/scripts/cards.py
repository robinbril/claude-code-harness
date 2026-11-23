"""Check cards: short lists of questions, chosen by what the change contains.

A card is references/cards/NAME.md. Its first line says when it is chosen:
    when: always | risk:a,b | kind:a,b | suffix:.py,.vue | lead:key,key | duty:name
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from common import fail

FOLDER = Path(__file__).resolve().parent.parent / "references" / "cards"
DEFINE = re.compile(
    r"^\s*(?:export\s+)?(?:default\s+)?(?:(?:public|private|protected|static|async)\s+)*"
    r"(?:function\*?|class|interface|func|fn|struct|enum)\b|^\s*(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?(?:\(|function|\w+\s*=>)"
)
# A lead is only a reason for a card when it points into the files of this agent.
LEADS = ("unreferenced_new_symbols", "orphaned_by_diff", "same_name_in_several_files", "crossed_limit", "smell_names")


def names() -> list[str]:
    return sorted(p.stem for p in FOLDER.glob("*.md"))


def read(name: str) -> tuple[str, str]:
    path = FOLDER / f"{name}.md"
    if name not in names():
        fail(f"no card {name}; there are: {', '.join(names())}")
    first, _, body = path.read_text(encoding="utf-8").partition("\n")
    return first.removeprefix("when:").strip(), body.strip()


def text(name: str) -> str:
    return f"## {name}\n{read(name)[1]}"


def touched_leads(run: Path, paths: set[str]) -> dict[str, list]:
    grown = json.loads((run / "growth.json").read_text(encoding="utf-8"))
    out = {}
    for key in LEADS:
        rows = [r for r in grown[key] if paths & ({r} if isinstance(r, str) else {r.get("path"), *r.get("paths", [])})]
        if rows:
            out[key] = rows
    return out


def leads(run: Path, paths: set[str]) -> str:
    grown = json.loads((run / "growth.json").read_text(encoding="utf-8"))
    rows = [f"net lines by kind: {json.dumps({k: v['net'] for k, v in grown['lines_by_kind'].items()})}"]
    rows += [f"{k}: {json.dumps(v[:12], ensure_ascii=False)}" for k, v in touched_leads(run, paths).items()]
    signals = {k: v["total"] for k, v in grown["line_signals"].items() if v["total"]}
    return "\n".join([*rows, f"line signals in added code: {json.dumps(signals)}"])


def choose(part: dict, files: list[dict], run: Path) -> list[str]:
    risks = {r for f in files for r in f.get("risk", [])}
    kinds = {f["kind"] for f in files}
    suffixes = {Path(f["path"]).suffix for f in files}
    duties = {*part.get("duties", []), part.get("type", "")}
    found = set(touched_leads(run, {f["path"] for f in files}))
    facts = {"risk": risks, "kind": kinds, "suffix": suffixes, "lead": found, "duty": duties}
    out = []
    for name in names():
        rule, _ = read(name)
        # Conditions on one line are all needed; the values of one condition are alternatives.
        wanted = [c.partition(":") for c in rule.split()]
        if all(key == "always" or facts.get(key, set()) & set(values.split(",")) for key, _, values in wanted):
            out.append(name)
    return out
