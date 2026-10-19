// verified-claim-guard: a done-claim needs evidence observed after the last mutation, in English or Dutch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempDir, runHook } from './helpers.mjs';

const HOOK = 'hooks/verified-claim-guard.js';
let seq = 0;

// steps: ['user', text] | ['tool', name, input, output, isError] | ['say', text]
function transcript(steps) {
  const lines = [];
  for (const step of steps) {
    if (step[0] === 'user') lines.push({ message: { role: 'user', content: step[1] } });
    if (step[0] === 'say') lines.push({ message: { role: 'assistant', content: [{ type: 'text', text: step[1] }] } });
    if (step[0] === 'tool') {
      const id = `t${++seq}`;
      lines.push({ message: { role: 'assistant', content: [{ type: 'tool_use', id, name: step[1], input: step[2] }] } });
      lines.push({ message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: step[3], is_error: !!step[4] }] } });
    }
  }
  const file = path.join(tempDir('claim-guard-'), 'transcript.jsonl');
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n'));
  return file;
}

const decide = (steps) => {
  const res = runHook(HOOK, { transcript_path: transcript(steps) }, process.cwd());
  return res.stdout.includes('"block"') ? 'block' : 'pass';
};

const edit = ['tool', 'Edit', { file_path: 'a.js' }, 'ok'];
const testRun = ['tool', 'Bash', { command: 'npm test' }, '3 passing'];
const read = ['tool', 'Read', { file_path: 'a.js' }, 'const a = 1;'];

test('English claim without label is blocked (baseline)', () => {
  assert.equal(decide([['user', 'fix it'], edit, ['say', 'Done, it works.']]), 'block');
});

test('Dutch claim without label is blocked', () => {
  assert.equal(decide([['user', 'fix het'], edit, ['say', 'Klaar, het werkt.']]), 'block');
});

test('other Dutch claims are blocked too', () => {
  for (const say of ['Opgelost.', 'Gefixt en gemerged.', 'Staat live.', 'Afgerond.']) {
    assert.equal(decide([['user', 'fix het'], edit, ['say', say]]), 'block', say);
  }
});

test('an observation before the last mutation is not evidence', () => {
  assert.equal(decide([['user', 'fix it'], read, edit, ['say', 'VERIFIED: read a.js. Done.']]), 'block');
});

test('an observation after the last mutation is evidence', () => {
  assert.equal(decide([['user', 'fix het'], edit, testRun, ['say', 'VERIFIED: npm test -> 3 passing. Klaar.']]), 'pass');
});

test('a failed check after the mutation is not evidence', () => {
  const failing = ['tool', 'Bash', { command: 'npm test' }, '1 failing', true];
  assert.equal(decide([['user', 'fix it'], edit, failing, ['say', 'VERIFIED: npm test. Done.']]), 'block');
});

test('UNVERIFIED is always allowed', () => {
  assert.equal(decide([['user', 'fix het'], edit, ['say', 'UNVERIFIED: geen testomgeving. Klaar met de wijziging.']]), 'pass');
});

test('no mutation, no gate', () => {
  assert.equal(decide([['user', 'wat staat erin?'], read, ['say', 'Klaar: er staat een constante in.']]), 'pass');
});

test('a read and a write in one Bash call: the read came first, so no evidence', () => {
  const mixed = ['tool', 'Bash', { command: 'cat a.js && echo changed > a.js' }, 'const a = 1;'];
  assert.equal(decide([['user', 'fix it'], mixed, ['say', 'VERIFIED: cat a.js. Done.']]), 'block');
});

test('a build then a test in one Bash call counts as evidence', () => {
  const chain = ['tool', 'Bash', { command: 'npm run build && npm test 2>&1 | tail -5' }, '3 passing'];
  assert.equal(decide([['user', 'fix het'], edit, chain, ['say', 'VERIFIED: build en test -> 3 passing. Klaar.']]), 'pass');
});
