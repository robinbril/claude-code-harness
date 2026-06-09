---
name: council
description: Convene a multi-voice AI council that deliberates on a hard decision through independent positions, a blind peer-review round, and a chairman synthesis. Use for ambiguous calls with several credible paths, such as architecture choices, build-vs-buy, ship-vs-hold, strategy tradeoffs, go/no-go calls, hiring or vendor decisions, and risk reviews, or whenever you want structured disagreement and second opinions before committing. Triggers include "council", "convene a council", "second opinions", "stress-test this decision", "get me dissent", and "multiple perspectives".
---

# Council

Convene a council of independent advisors for decisions where one answer is not enough. Each advisor reasons with a distinct method, positions are gathered in parallel without anchoring, the advisors then rate each other blind, and a chairman synthesizes a verdict that keeps the disagreement visible.

This is for **decision-making under ambiguity**, not code review, implementation planning, or architecture drafting.

## What makes this stronger than asking once

1. **Distinct reasoning methods, not just vibes.** Each voice is bound to a named method (first-principles, inversion, outside-view, second-order, shipping-reality). Diversity of method is what surfaces blind spots.
2. **Anti-anchoring by construction.** Advisor positions are produced by fresh subagents that receive only the question and minimal context, never the running conversation. The loudest framing in the chat cannot contaminate the panel.
3. **Blind peer review.** Before synthesis, each advisor rates the *other* anonymized positions on a rubric. This weighs arguments on merit, not on who spoke first or longest.
4. **A chairman who must show its work.** The synthesis preserves the raw positions and the strongest dissent, states a confidence level, and names what would change the verdict.

## When to Use

- A decision has multiple credible paths and no obvious winner.
- Tradeoffs need to be made explicit before choosing.
- The user asks for second opinions, dissent, or multiple perspectives.
- Conversational anchoring is a real risk (you have already argued one side).
- A go / no-go call would benefit from adversarial challenge.

Examples: monorepo vs polyrepo, ship now vs hold for polish, feature flag vs full rollout, build vs buy, this vendor vs that one, simplify scope vs keep strategic breadth.

## When NOT to Use

| Instead of council | Do this |
| --- | --- |
| Verifying whether an output is correct | Verify it directly or use an adversarial review pass |
| Breaking a feature into implementation steps | Plan it |
| Designing system architecture from scratch | Design it directly |
| Reviewing code for bugs or security | Run a code review |
| Straight factual questions | Just answer |
| Obvious execution tasks | Just do the task |

Council is for choosing between options, not for producing the options' implementation.

## Right-size the deliberation first

Before convening, classify the decision:

- **Reversibility.** A two-way door (cheap to undo) deserves one fast round. A one-way door (expensive or impossible to undo) earns a full round plus peer review, and a second round if the panel splits.
- **Stakes.** Low stakes: 3 voices, single round, skip peer review. High stakes: 5 voices, peer review, optional second round.

If the decision is genuinely a two-way door with low stakes, say so and just recommend. Do not convene a council for a coin flip.

## The Voices

Default council is four voices for normal decisions, five for high-stakes. You participate as the Chairman; the others are launched as independent subagents.

| Voice | Reasoning method | Lens |
| --- | --- | --- |
| Architect | First-principles | Correctness, maintainability, long-term structural implications |
| Skeptic | Outside view / base rates | Challenge the premise, question assumptions, propose the simplest credible alternative |
| Pragmatist | Shipping reality | Speed, user impact, operational cost, cost of delay |
| Critic | Inversion / pre-mortem | Downside risk, edge cases, the failure modes that kill this |
| Strategist (5th, high-stakes only) | Second-order effects | Knock-on consequences, incentives, what this decision makes true 12 months out |

## Workflow

### 1. Extract the real question

Reduce the decision to one explicit prompt:
- What are we deciding?
- What constraints are non-negotiable?
- What counts as success?

If the question is vague, ask one sharp clarifying question before convening. A council on the wrong question wastes the whole exercise.

### 2. Gather only the necessary context

- Codebase-specific decision: collect the few relevant files, snippets, metrics, or issue text. Keep it compact.
- Strategic or general decision: skip repo detail unless it materially changes the answer.

The context block you hand each advisor must be small enough that it does not smuggle in your preferred conclusion.

### 3. Write the Chairman's prior

Before reading any advisor, write down privately:
- your initial position,
- the three strongest reasons for it,
- the main risk in your preferred path.

Doing this first stops the synthesis from merely echoing whichever advisor wrote best.

### 4. Launch the advisors in parallel

Spawn each voice as a fresh independent subagent. Each gets the question, the compact context, and its role. None gets the conversation history. Launch them in a single batch so they run concurrently.

Prompt template per advisor:

```text
You are the [ROLE] on an independent decision council. Your reasoning method is [METHOD].

Question:
[the one explicit decision question]

Context:
[only the relevant snippets or constraints, compact]

Respond in this exact shape:
1. Position - 1 to 2 sentences. Pick a side.
2. Reasoning - 3 concise bullets, argued from your method.
3. Risk - the single biggest risk in your own recommendation.
4. Blind spot - one thing the other advisors are likely to miss.
5. Confidence - low / medium / high, with a half-sentence why.

Rules: be direct, no hedging, no "it depends" without committing to a default. Under 250 words.
```

Method emphasis to put in each advisor's prompt:
- Architect (first-principles): strip the problem to fundamentals, ignore convention, reason up from what must be true.
- Skeptic (outside view): how do decisions like this usually turn out, what is the base rate, what is the boring default that probably wins.
- Pragmatist (shipping reality): what ships fastest with least operational drag, what does the user actually feel, what does delay cost.
- Critic (inversion): assume it failed in a year, work backward, name the specific failure modes and edge cases.
- Strategist (second-order): what does this decision incentivize, what becomes hard later, what does it make true downstream.

### 5. Blind peer-review round (skip for low-stakes)

Strip the author labels from the advisor positions, shuffle them, and give the anonymized set to each advisor again (fresh subagent, no history). This catches the case where the loudest argument is not the best-reasoned one.

Peer-review prompt template:

```text
Below are anonymized positions from a decision council on this question:

[question]

Positions (authors hidden):
[A] ...
[B] ...
[C] ...
[D] ...

For each position, score 1 to 5 on:
- Soundness: is the reasoning valid and well-supported?
- Insight: does it surface something non-obvious?
- Risk-honesty: does it own its own downside?

Then: name the single strongest position and the single weakest, and say in one line what the strongest one gets right that the others miss. Do not try to guess who wrote what.
```

Aggregate the scores. A position that scores high across reviewers it did not write is a real signal, not just a confident author.

### 6. Synthesize as Chairman, with bias guardrails

You are both a participant and the synthesizer, so hold yourself to these:
- Do not dismiss an advisor's view without saying why.
- If an advisor changed your recommendation, say so explicitly.
- Always include the strongest dissent, even if you reject it.
- If two voices align against your prior, treat that as a real signal, not noise to argue away.
- If peer review ranked a position above yours, address it head-on.
- Keep the raw positions visible before the verdict.

### 7. Present a compact verdict

```markdown
## Council: [short decision title]

**Architect:** [1-2 sentence position] - [1 line why]
**Skeptic:** [1-2 sentence position] - [1 line why]
**Pragmatist:** [1-2 sentence position] - [1 line why]
**Critic:** [1-2 sentence position] - [1 line why]
[**Strategist:** ... if convened]

### Peer review
- Top-rated position: [which, and the one thing it got right]
- Lowest-rated: [which, and why]

### Verdict
- **Consensus:** [where the voices genuinely align]
- **Strongest dissent:** [the most important disagreement, stated fairly]
- **Premise check:** [did the Skeptic land a hit on the question itself?]
- **Recommendation:** [the synthesized path]
- **Confidence:** [low / medium / high]
- **What would change this:** [the specific evidence or condition that flips the call]
```

Keep it scannable on a phone screen. The value is not unanimity. The value is making the disagreement legible before choosing.

## Second round (only when the panel genuinely splits)

Default is one round. Run a second only if peer review left two positions tied on merit and the decision is a one-way door. When you do:
- sharpen the question to the exact axis of disagreement,
- carry forward only the two contested positions,
- keep one advisor (usually the Skeptic) clean of the prior round to preserve anti-anchoring value.

Stop after the second round. A council that cannot converge in two rounds is signalling that you are missing information, not perspectives. Say that, and name the missing input.

## Optional: genuine model diversity

The core skill runs entirely on this agent's own subagents and needs nothing else. If you happen to have other coding-agent CLIs installed (for example a second vendor's CLI), you can route one or two advisor seats to them for true cross-model diversity. This is optional and must never be a hard dependency: if those CLIs are absent, run the full council on native subagents without degradation. Do not introduce external API keys or paid routing to satisfy this.

## Anti-Patterns

- Using council for code review or plain implementation work.
- Feeding the subagents the entire conversation transcript (defeats anti-anchoring).
- Letting the author labels leak into the peer-review round.
- Hiding disagreement inside a tidy consensus.
- Convening a five-voice council for a reversible, low-stakes coin flip.
- Running endless rounds instead of admitting you lack information.

## Example

Question:

```text
Ship the 2.0 alpha now, or hold until the control-plane UI is more complete?
```

Likely council shape:
- Architect pushes for structural integrity and a coherent surface over a half-built UI.
- Skeptic questions whether the UI is actually the gating factor or just the visible one.
- Pragmatist asks what can ship now without burning user trust, and what holding costs.
- Critic runs the pre-mortem: support burden, expectation debt, rollout confusion.
- Peer review surfaces whether "hold" is genuinely strongest or just the cautious default.

The verdict makes the tradeoff legible, recommends a path, and names the one fact that would flip it.
