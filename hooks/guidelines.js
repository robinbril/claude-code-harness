#!/usr/bin/env node
// SessionStart (plugin route): load the working rules from guidelines/CLAUDE.md as session context.
// A plugin cannot ship a CLAUDE.md; the install.sh route copies the same file to ~/.claude instead.
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
const file = path.join(root, 'guidelines', 'CLAUDE.md');
let rules;
try {
  rules = fs.readFileSync(file, 'utf8');
} catch (error) {
  process.stderr.write(`guidelines: ${file} niet gevonden (${error.code})\n`);
  process.exit(0);
}
process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: rules },
}));
