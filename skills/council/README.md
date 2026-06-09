# Council

A Claude Code skill that convenes a council of independent AI advisors to deliberate on hard decisions: independent positions, a blind peer-review round, and a chairman synthesis that keeps the disagreement visible.

Use it for ambiguous calls with several credible paths: architecture choices, build-vs-buy, ship-vs-hold, strategy tradeoffs, go/no-go, vendor or hiring decisions, and risk reviews.

## Why it beats asking once

- **Distinct reasoning methods** per advisor (first-principles, outside-view, inversion, shipping-reality, second-order), so the panel surfaces blind spots instead of agreeing with itself.
- **Anti-anchoring by construction:** advisors are fresh subagents that see only the question and minimal context, never the running chat.
- **Blind peer review:** advisors rate each other's anonymized positions, so the strongest argument wins on merit, not on who spoke first.
- **A chairman that shows its work:** the verdict preserves dissent, states confidence, and names what would flip the call.

## Install

Claude Code reads skills from `~/.claude/skills/` (user-level) or `.claude/skills/` (project-level).

1. Copy the `council/` folder into one of those locations.
2. Restart Claude Code or start a new session so the skill is picked up.
3. Invoke it by typing `/council`, or just describe a hard decision and ask for a council, second opinions, or dissent.

```
~/.claude/skills/council/
├── SKILL.md
└── README.md
```

## Usage

Give it a decision with real ambiguity:

```
/council Should we migrate from a monolith to services now, or wait until after the Q3 launch?
```

The skill right-sizes the deliberation (reversible low-stakes calls get one fast round; one-way doors get the full treatment), runs the panel, and returns a compact verdict you can read on a phone.

## Requirements

Runs entirely on Claude Code's own subagents. No API keys, no external services, no other vendors required. If you happen to have other coding-agent CLIs installed, you can optionally route one or two advisor seats to them for cross-model diversity, but this is never required.

## License

MIT.
