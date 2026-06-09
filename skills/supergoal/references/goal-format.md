# `/goal` format reference

## What `/goal` actually is

`/goal <end-state condition>` is a host slash command available in both Claude Code and Codex (Codex CLI). It is **not** a task description. It is a **measurable end-state condition** that a fast evaluator checks against the transcript after each agent turn. The agent keeps working, running tools and editing files, until the condition holds, at which point control returns to the user.

Key implications:

1. **Condition is short.** A long task body in the `/goal` argument is the wrong shape. Long content belongs in files the agent reads from disk.
2. **The host evaluator only sees the transcript.** Conditions must be phrased so the agent's own output can prove them ("ACCEPT verdict printed for each phase", "AUDIT_COMPLETE printed"). The host evaluator does not independently run tools.
3. **Host behaviour:**
   - **Claude Code**: a small fast model checks the condition each turn; "no" continues with the reason as guidance, "yes" clears the goal and returns control.
   - **Codex**: an auto-continuation loop drives the goal to terminal status. Subcommands: `/goal <objective>`, `/goal` (status), `/goal pause`, `/goal resume`, `/goal clear`.

Note the distinction: the **host evaluator** is a cheap transcript checker. Supergoal's **independent evaluator** (the generator/evaluator split) is a separate, deeper thing that re-runs every check against ground truth. The host evaluator only confirms that the independent evaluator did its job and printed ACCEPT.

## Supergoal's single-`/goal` shape

Supergoal uses one `/goal` per run, dispatched by the **user** at the end of Stage 7. Slash commands fire only from user input on both hosts, so the planner cannot fire `/goal` from its own message text. Stage 7 writes all phase specs to disk, then prints a copy-paste-ready `/goal` block. The user pastes once; from there the run is autonomous.

The condition is:

```
Execute all phases in .supergoal/ROADMAP.md sequentially per
.supergoal/PROTOCOL.md. For each phase: read phase-N.md, do the work
as the GENERATOR, print SUPERGOAL_PHASE_EVIDENCE (raw commands+output+
exit codes, files changed, artifact observations; NO verdict). Then run
the INDEPENDENT EVALUATOR per .supergoal/evaluator.md: it re-runs every
check itself against repository ground truth and the running artifact,
blind to the generator's account, and prints SUPERGOAL_EVAL_VERDICT
phase=N with ACCEPT or REJECT. Only on ACCEPT print SUPERGOAL_PHASE_DONE
and advance; on REJECT follow the 3-strike recovery in PROTOCOL.md.
After the last phase, the evaluator runs the FINAL AUDIT against the
original ROADMAP.md and re-observes the artifact; only after
AUDIT_COMPLETE print SUPERGOAL_RUN_COMPLETE.

Done when SUPERGOAL_RUN_COMPLETE appears with one ACCEPT and one
SUPERGOAL_PHASE_DONE per phase, AUDIT_COMPLETE printed before
SUPERGOAL_RUN_COMPLETE, and no FAILURE_HANDOFF or AUDIT_HANDOFF this run.
```

This works on both hosts. There is no per-phase `/goal` dispatch and no inter-session chain. Once active, a single `/goal` session reads PROTOCOL.md, loops through every phase spec (generator builds, independent evaluator gates), runs the final audit, and completes only when the audit is clean.

## Required transcript blocks (Supergoal-specific)

The phase specs and PROTOCOL.md require these named blocks during execution. They are what the human watching AND the host evaluator rely on.

### `SUPERGOAL_PHASE_START` (once per phase, at execution start)

```
SUPERGOAL_PHASE_START
Phase: <N> of <total> - <name>
Task: <one-line from ROADMAP.md>
Type: <new-project|existing-repo|bugfix|refactor|ui>
Mandatory commands: <comma-separated list>
Acceptance criteria: <count>
Evidence required: <comma-separated types>
Depends on phases: <list, or "none">
Validation classes: <classes present, e.g. tool-output, deliverable, empirical>
```

### `SUPERGOAL_PHASE_TEAM` (generator, only when a phase runs as a team)

Printed before the work when a phase has two or more separable tracks. A phase with 2+ independent tracks runs as a team: one specialist subagent per track, in parallel. Solo is only for an atomic phase. A team with one agent, or a Tracks>=2 block with sequential dispatch, is invalid.

```
SUPERGOAL_PHASE_TEAM phase=<N>
Pattern: <none | classify-and-act | fan-out-and-synthesize | adversarial-verification | generate-and-filter | tournament | loop-until-done>
Tracks:
- <track 1>: <deliverable> | skill: <installed|acquired|written|none> | criteria: <which>
- <track 2>: ...
Specialisten parallel: <N, at least 2; if 1 it is not a team, run solo>
Teams parallel: <1 or more concurrent teams>
Dispatch: <subagents (Task) | workflow-tool | sequential in /goal>
```

With 2+ Tracks, Dispatch must be `subagents` or `workflow-tool`, never `sequential`.

### `SUPERGOAL_PHASE_EVIDENCE` (generator, once per phase, before the verdict)

Raw evidence, no pass/fail judgment. The generator reports what it did and observed; the evaluator decides.

```
SUPERGOAL_PHASE_EVIDENCE
Commands:
- <cmd>: exit <code> - <last ~10 lines or summary line>
- ...
Files changed: <count>
- <file>: <one-line summary>
Artifact observations (per empirical criterion):
- <criterion>: <screenshot path | HTTP response | CLI output | e2e result>
- ...
```

### `SUPERGOAL_EVAL_VERDICT` (independent evaluator, once per phase, gates the phase)

The evaluator re-ran every check itself, blind to the generator's account.

```
SUPERGOAL_EVAL_VERDICT phase=<N>
- [<class>] <criterion 1>: pass | fail | inconclusive
  Evidence: <what the evaluator re-ran or observed>
- [<class>] <criterion 2>: pass | fail | inconclusive
  Evidence: <...>
Cleanliness (evaluator ran repo-state.sh added-lines vs Baseline ref):
- debug prints added: <count>
- session TODO/FIXME added: <count>
- dead imports added: <count>
Verdict: ACCEPT | REJECT
```

ACCEPT only if every criterion is `pass` or `inconclusive` and cleanliness counts are zero (unless the spec sets `Cleanliness override:`). Any `fail` or non-zero cleanliness count forces REJECT.

### `SUPERGOAL_COUNCIL_VERDICT` (council direction gate, once per phase, only after an ACCEPT)

The council judges direction, never correctness. It runs only on an evaluator ACCEPT, and cannot overrule it.

```
SUPERGOAL_COUNCIL_VERDICT phase=<N>
decision: AUTO-APPROVE | ESCALATE
reason: <one line: why no direction call is needed, or why this escalates>
```

AUTO-APPROVE is the default. ESCALATE only when all three hold: the choice is hard to reverse, has multiple credible paths, and falls outside what the user already confirmed in Stage 1 or Stage 6.

### `SUPERGOAL_COUNCIL_ESCALATE` (council, only on ESCALATE, pauses for go/B/C)

Printed when the gate convenes the full `council` skill for a genuine direction call.

```
SUPERGOAL_COUNCIL_ESCALATE phase=<N>
Question: <the direction at stake, one line>
A (council recommendation): <option> - <half-line why>
B: <alternative> - <main trade-off>
C: <alternative> - <main trade-off>
Sources: <1-3 links or file:line the choice rests on>
Waiting for: go (follow A) | B | C
```

On `go`: follow A, no spec change. On `B`/`C`: rewrite the affected future phase-specs in-place AND the matching `ROADMAP.md` phase blocks, rerun `validate-phase.sh`, log under `STATE.md` Council decisions. With no live answer in an autonomous run: follow A and log it as `auto-A`.

### `MEMORY_SAVED` (once per phase, after ACCEPT, before DONE)

```
MEMORY_SAVED: <memory-name>     (or "none - nothing non-obvious this phase")
```

### `SUPERGOAL_PHASE_DONE` (once per phase, only after an ACCEPT verdict)

```
SUPERGOAL_PHASE_DONE
Phase <N> complete. STATE.md updated.
```

### `AUDIT_START` (once per audit round, after the last phase)

```
AUDIT_START
Round: <1|2|3>
Phases to verify: <N>
Criteria to re-check: <count>
Commands to re-run: <comma-separated, deduplicated set>
```

### `AUDIT_VERIFY` (once per audit round, after the evaluator's re-checks)

```
AUDIT_VERIFY
Per-phase completeness:
- Phase 1: <ACCEPT + DONE present | missing>
- Phase 2: ...
Re-run mandatory commands:
- <cmd>: exit <code> - <last line>
Artifact re-observation (empirical criteria, end-to-end):
- <criterion>: <pass | fail> - <observation>
Acceptance criteria re-check:
- Phase 1 / "<criterion>": <pass | fail | inconclusive> - <evidence>
Deliverables (complete-working-tree check vs Baseline ref via repo-state.sh):
- Phase 1 / "<deliverable bullet>": <present | missing> - <evidence>
Summary: <pass> pass, <fail> fail, <inconclusive> inconclusive, <missing> deliverable-gaps
```

### `AUDIT_GAPS` (only if gaps found this round)

```
AUDIT_GAPS
Round: <N>
Gaps:
- <gap 1>: <details>
Writing fix spec at .supergoal/phases/audit-fix-<N>.md, executing inline.
```

### `AUDIT_COMPLETE` (zero gaps, emit before SUPERGOAL_RUN_COMPLETE)

```
AUDIT_COMPLETE
Rounds: <N>
Phases re-verified: <count>
Commands re-run clean: <count>
Acceptance criteria: <pass> pass / 0 fail / <inconclusive> inconclusive
Deliverables: <present> present / 0 missing
Audit coverage: <re_verified> re-verified / <inconclusive> inconclusive (<pct>%)
```

### `AUDIT_HANDOFF` (3 audit rounds all failed, stop)

```
AUDIT_HANDOFF
Round: 3
Persistent gaps:
- <gap>
Three audit rounds attempted; fix specs at .supergoal/phases/audit-fix-{1,2,3}.md
Suggested next move: <one line>
STATE.md updated to BLOCKED.
```

### `SUPERGOAL_RUN_COMPLETE` (once, after AUDIT_COMPLETE)

```
SUPERGOAL_RUN_COMPLETE
[Audit coverage: <re_verified> re-verified, <inconclusive> inconclusive (<pct>%). Check the open points manually before merging.]   <- only when inconclusive fraction > 30%
Audit coverage: <re_verified> re-verified, <inconclusive> inconclusive (<pct>%).
All <N> phases complete. Audit passed in <rounds> round(s).
Summary: <5 lines max - what shipped, what changed, what to verify manually>
```

The banner is printed only when inconclusive is more than 30% of total checks. Below 30%, only the plain `Audit coverage:` line appears.

## Failure blocks (used by recovery protocol, on evaluator REJECT)

### `FAILURE_PROBE` (first REJECT)

```
FAILURE_PROBE
Phase: <N> - <name>
Failed criterion: <text the evaluator marked fail>
Tried: <what was attempted>
Hypothesis: <root cause guess>
Next: auto-retry with probe injected
```

### `FAILURE_ESCALATE` (second REJECT, fix spec)

```
FAILURE_ESCALATE
Phase: <N> - <name>
Failed criterion: <text>
Retry probe history:
  attempt 1: <summary>
  attempt 2: <summary>
Writing fix spec at .supergoal/phases/phase-<N>.fix.md
```

### `FAILURE_HANDOFF` (third REJECT, stop)

```
FAILURE_HANDOFF
Phase: <N> - <name>
Failed criterion: <text>
Three attempts tried:
  1. <summary>
  2. <summary>
  3. <fix spec summary>
Rollback considered: <reverted to phase <N-k> baseline | not a regression>
Suggested next move: <one line>
STATE.md updated to BLOCKED. User intervention required.
```

## Anti-patterns

- **Don't stuff long task content into the `/goal` argument.** Use a short condition; put work in files.
- **Don't let the generator grade itself.** The phase gate is the independent evaluator's verdict, not the generator's evidence block.
- **Don't accept "tests pass" as proof of behavior.** Empirical criteria require the evaluator to drive the running artifact and observe it.
- **Don't chain `/goal` commands across sessions.** One run, one `/goal`. The agent loops internally.
- **Don't skip evidence to save space.** Files have no char budget; be exhaustive.
