"""Inventariseer alle lokaal geïnstalleerde skills (~/.claude/skills/*/SKILL.md).

Leest per skill de naam + description uit de YAML-frontmatter en print een nette lijst.
Gebruik: uv run python list_skills.py [--filter zoekterm]
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

SKILLS = Path.home() / ".claude" / "skills"


def parse_frontmatter(text: str) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not m:
        return {}
    block = m.group(1)
    out, key, buf = {}, None, []
    for line in block.splitlines():
        fm = re.match(r"^(\w[\w-]*):\s*(.*)$", line)
        if fm and not line.startswith(" "):
            if key:
                out[key] = " ".join(buf).strip()
            key = fm.group(1)
            val = fm.group(2).strip()
            buf = [] if val in (">", "|", "") else [val]
        elif key:
            buf.append(line.strip())
    if key:
        out[key] = " ".join(buf).strip()
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--filter", default="")
    args = ap.parse_args(argv)
    if not SKILLS.exists():
        print("Geen skills-map gevonden.")
        return
    rows = []
    for d in sorted(SKILLS.iterdir()):
        sk = d / "SKILL.md"
        if not sk.is_file():
            continue
        fm = parse_frontmatter(sk.read_text(encoding="utf-8", errors="ignore"))
        name = fm.get("name", d.name)
        desc = re.sub(r"\s+", " ", fm.get("description", "")).strip()
        rows.append((name, desc))
    f = args.filter.lower()
    for name, desc in rows:
        if f and f not in name.lower() and f not in desc.lower():
            continue
        print(f"- {name}: {desc[:160]}")
    print(f"\n{len(rows)} skills in {SKILLS}")


if __name__ == "__main__":
    raise SystemExit(main())
