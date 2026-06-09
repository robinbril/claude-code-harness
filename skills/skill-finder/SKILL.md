---
name: skill-finder
description: >
  Find, reuse, or write a skill. At the start of any non-trivial request: check which installed
  skills fit; if none, search for proven implementations before building; and if the task recurs,
  write a new skill with proper structure. Triggers: "skill finder", "welke skill kan ik
  hiervoor gebruiken", "is hier al een skill voor", "schrijf een skill", "write a skill",
  "create a skill", "research before building", "reuse before building".
---

# Skill Finder

Before doing a task the hard way, find what already exists. This skill does two passes:
match the request against installed skills first, then look outward for proven approaches.

## Pass 1, Match installed skills (always first)
1. List the installed skills and their descriptions:
   ```
   uv run python scripts/list_skills.py            # alle skills
   uv run python scripts/list_skills.py --filter <woord>   # gefilterd
   ```
   (Path: `~/.claude/skills/skill-finder/scripts/list_skills.py`.)
2. Match the user's request against the descriptions. Pick the **one or two** that fit best.
3. Report: "Hiervoor is skill X (en eventueel Y). Wil je die inzetten?" Then invoke it.
4. If two skills overlap, prefer the more specific one; note the trade-off in one line.

## Pass 2, Research & reuse (only if no skill fits)
If nothing installed matches, do not hand-roll immediately. Search for a proven approach first
(research before building):
- **GitHub:** `gh search repos "<topic>"` and `gh search code "<pattern>"` for working examples.
- **Package registries:** npm / PyPI / crates.io before writing utility code.
- **Docs:** Context7 or the vendor's primary docs to confirm API behaviour and versions.
- **Web:** only when the above are insufficient; cite the sources you used.
Prefer adopting or porting a battle-tested approach over net-new code when it meets the need.

## Pass 3, Write a new skill (only if it's reusable)
If the task recurs and nothing covers it, write one. Keep team-facing skills generic
(no personal name).

**Process:** gather requirements (domain, use cases, scripts-or-just-instructions, reference
material) → draft → review with user.

**Structure:**
```
skill-name/
├── SKILL.md        # main instructions (required, < 100 lines)
├── REFERENCE.md    # detailed docs (only if SKILL.md would exceed ~100 lines)
└── scripts/        # utility scripts (only for deterministic ops)
```

**SKILL.md template:**
```md
---
name: skill-name
description: What it does (1st sentence). Use when [specific triggers] (2nd sentence).
---
# Skill Name
## Quick start
[minimal working example]
## Workflows
[step-by-step, checklists for complex tasks]
## Advanced
[link one level deep: See REFERENCE.md]
```

**Description = the only thing the agent sees when choosing a skill.** Max 1024 chars, third
person. Sentence 1 = capability, sentence 2 = "Use when [keywords/contexts/file types]".
Vague ("helps with documents") = never loaded.

**Add scripts** when the op is deterministic (validation, formatting) or the same code would
be regenerated repeatedly. Saves tokens, improves reliability.

**Split files** when SKILL.md passes ~100 lines, content spans distinct domains, or advanced
features are rarely needed.

**Checklist:** description has triggers · SKILL.md < 100 lines · no time-sensitive info ·
consistent terms · concrete examples · references one level deep.

## Output
- Which installed skill(s) fit, ranked, with a one-line why.
- If none: the best existing approach you found, with a link.
- A clear recommendation: use skill X / adopt repo Y / build new (and why).
