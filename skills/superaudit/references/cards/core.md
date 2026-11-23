when: always
Per hunk: which input, state, timing or environment makes this line wrong? Falsy zero and empty string; off by one on dates and pages; missing value from a lookup or outside API; wrong variable after copy and paste; value read before it is set; `await` missing; error swallowed so the caller thinks it worked; empty, error, loading and zero shown the same; cancel that still saves.
Runs twice? Outside call succeeds and the local write fails? Two requests at once?
**Removed or moved lines**: which guard, limit, anchor or test did each carry, and where is it now? Look there before anything else.
**Callers**: signature, return shape, order, default, exception or field changed? `uses NAME`, and check the ones that depend on it.
**Intent**: each promise in the yardstick: complete, deviated, missing or unproven. Behaviour nobody asked for is a finding until a doc says otherwise. Is it wired into the path users hit?
Not a finding: style, what lint or types stop, "consider", hardening without an attack, speed without a hot path, behaviour pinned by a test, docstring or ADR (unless it leaks, loses data or breaks what the change itself promises: then the pin is part of the finding).
Deeper when: money, dates or text parsing -> `card values`; several effects in a row -> `card failure`; a rule or flag -> `card paths`.
