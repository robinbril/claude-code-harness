when: kind:test
A test that cannot fail: asserts on its own mock, recomputes the code, swallows the exception, unreachable assert. A wrong expectation that pins a bug. Depends on clock, order, shared state. Skipped without reason. Weakened or removed: which case did it hold?
Ask of each test: which line must I break to make it red? None: it proves nothing. Both sides made from the same source; a state list that accepts everything; a mock that always says yes; grep on source instead of behaviour; a name or comment that says another thing than the call; the shared database swept by a test; the refused case without a check that nothing was left behind.
Write actions: each gate, each privacy flag, other tenant, audit row, refused and expired. The claim in the PR that matters most has a test through the real entry point.
`revertcheck.json` in the run lists hunks that no test noticed.
Which branch, boundary or error path that could hurt has no test? Name the bug it would let through, or drop it. Hand-computed values; second run, wrong role, other tenant, empty, zero, flag off.
Deeper: mutate one condition in your head; does any test notice? `tests NAME` shows them.
