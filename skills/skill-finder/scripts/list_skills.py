"""Inventariseer alle lokaal geïnstalleerde skills: eigen skills (~/.claude/skills/*/SKILL.md)
en skills uit geïnstalleerde plugins (~/.claude/plugins/cache/<marketplace>/<plugin>/<versie>/skills).

Leest per skill de naam + description uit de YAML-frontmatter en print een nette lijst;
plugin-skills krijgen de plugin als voorvoegsel (`plugin:skill`), zoals Claude Code ze aanroept.
Gebruik: uv run python list_skills.py [--filter zoekterm]
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

CLAUDE = Path.home() / ".claude"
SKILLS = CLAUDE / "skills"
PLUGIN_CACHE = CLAUDE / "plugins" / "cache"


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


def skill_files():
    """(voorvoegsel, pad) voor elke SKILL.md: eigen skills zonder, plugin-skills met `plugin:`."""
    if SKILLS.exists():
        for d in sorted(SKILLS.iterdir()):
            if (d / "SKILL.md").is_file():
                yield "", d / "SKILL.md"
    if PLUGIN_CACHE.exists():
        # cache/<marketplace>/<plugin>/<versie>/skills/<skill>/SKILL.md
        for sk in sorted(PLUGIN_CACHE.glob("*/*/*/skills/*/SKILL.md")):
            plugin = sk.parents[3].name
            yield f"{plugin}:", sk


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--filter", default="")
    args = ap.parse_args(argv)
    rows = []
    for prefix, sk in skill_files():
        fm = parse_frontmatter(sk.read_text(encoding="utf-8", errors="ignore"))
        name = prefix + fm.get("name", sk.parent.name)
        desc = re.sub(r"\s+", " ", fm.get("description", "")).strip()
        rows.append((name, desc))
    if not rows:
        print("Geen skills gevonden.")
        return
    f = args.filter.lower()
    for name, desc in rows:
        if f and f not in name.lower() and f not in desc.lower():
            continue
        print(f"- {name}: {desc[:160]}")
    print(f"\n{len(rows)} skills in {SKILLS} en {PLUGIN_CACHE}")


if __name__ == "__main__":
    raise SystemExit(main())
