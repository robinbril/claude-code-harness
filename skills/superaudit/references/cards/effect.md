when: kind:code
**Does it do what it says, through the real path?** Start at the user or the caller, not at the new function. Can the real code reach the new state, or only a mock? Is a value written that nobody reads, or put back by the next normal save? Does an older row, another tenant or a fresh install get it too? Is a value from one customer hard-coded for all? Does the docstring or name promise a protection that the code does not have?
If nothing visible or stored would differ without the change: say so as a finding.
