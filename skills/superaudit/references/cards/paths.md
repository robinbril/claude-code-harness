when: kind:code
**One rule, every door.** For each rule this change adds, moves or relies on (permission, tenant, privacy flag, audit row, duplicate check, validation, state transition): list every way to the same effect: create and update, single and bulk, route and job, import, seed, tool, webhook, approve and refuse, undo and delete. `uses` on the write, then on the rule. A door without the rule is a finding.
Privacy or legal flags come as a set: the code checks one, do the others apply? Is the rule now written in a second place with a small difference? Then there is one owner too many.
A refusal, a 4xx and a rollback need the same audit and notice as a success.
