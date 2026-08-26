#!/usr/bin/env node
/**
 * spec-init.js — creates a light, machine-readable spec dossier for a build,
 * so the requirements + acceptance live outside the chat window and verification
 * can check against them. Removes the friction the spec gate requires.
 *
 * Usage:  node spec-init.js <slug> ["one-line goal"]
 * Writes: .harness/<slug>/spec.md  (in the current repo/cwd)
 * Prints: the absolute path. Never overwrites an existing dossier.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const slug = (process.argv[2] || '').trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
if (!slug) { console.error('usage: node spec-init.js <slug> ["goal"]'); process.exit(2); }
const goal = (process.argv[3] || '').trim();

const dir = path.join(process.cwd(), '.harness', slug);
const file = path.join(dir, 'spec.md');
if (fs.existsSync(file)) { console.log(file); process.exit(0); }

fs.mkdirSync(dir, { recursive: true });
const tpl = `# Spec: ${slug}

Goal: ${goal || '<one line: what must be true when this is done>'}

## Requirements
Each requirement: an id, what it proves, how you check it, and the validation class
(tool-output | render | test | empirical | judge).

- R1  <requirement>
      acceptance: <testable criterion, a tool call that proves it>
      class: tool-output

- R2  <requirement>
      acceptance: <...>
      class: <...>

## env
seat/rail: <where this work belongs (judgment/PII stays local, otherwise auto)>
targets: <files/paths you touch>
branch: <branch>   cwd: <repo>   backup: <if destructive>

## Not in scope
- <explicitly what you do NOT do, against scope creep>
`;
fs.writeFileSync(file, tpl, 'utf8');
console.log(file);
