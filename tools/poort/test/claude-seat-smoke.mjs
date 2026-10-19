// Echte smoke van integrations/e2e-claude-seat.mjs tegen je eigen Claude-seat.
// Kost seat-gebruik, dus niet in npm test: draai bewust met
//   POORT_SEAT_SMOKE=1 node test/claude-seat-smoke.mjs [runs] [act-model] [judge-model]
// Meet per call de latency en telt hoeveel act-calls een geldige tool-call gaven.
// Exit 0 alleen als élke act-call geldig was en de judge geldige JSON met
// pass === true gaf. Is `ai` op te lossen vanuit de werkmap of AI_SDK_DIR, dan
// gaat er ook één generateText met tools door de echte AI SDK.
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { claudeSeat } from '../integrations/e2e-claude-seat.mjs';

if (!process.env.POORT_SEAT_SMOKE) {
  console.log('overgeslagen: zet POORT_SEAT_SMOKE=1 (gebruikt je Claude-seat)');
  process.exit(0);
}
const runs = Number(process.argv[2] || 5);
const actModel = process.argv[3] || process.env.E2E_MODEL || 'claude-sonnet-5-5';
const judgeModel = process.argv[4] || process.env.E2E_JUDGE || 'claude-opus-5-5';
const failures = [];

// 1x1 PNG: genoeg om het afbeeldingspad (stream-json) echt te raken.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const typeSchema = { type: 'object', properties: { selector: { type: 'string' }, text: { type: 'string' } }, required: ['selector', 'text'], additionalProperties: false };
const clickSchema = { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'], additionalProperties: false };
const tools = [
  { type: 'function', name: 'click', description: 'Click an element on the page.', inputSchema: clickSchema },
  { type: 'function', name: 'type', description: 'Type text into an input.', inputSchema: typeSchema },
];
const page = 'Page: <form><input id="email" type="email" placeholder="E-mail"><button id="send">Send</button></form>. The e-mail field is empty.';
const goal = `${page}\nGoal: fill in test@example.com as the e-mail address.`;
const validType = (name, input) => name === 'type' && typeof input?.selector === 'string' && /test@example\.com/.test(input?.text ?? '');

const act = claudeSeat(actModel);
let ok = 0;
const lat = [];
for (let i = 1; i <= runs; i++) {
  const t0 = Date.now();
  try {
    const r = await act.doGenerate({
      prompt: [
        { role: 'system', content: 'You drive a browser test. Take exactly one action per turn using the tools.' },
        { role: 'user', content: [{ type: 'text', text: goal }, { type: 'file', mediaType: 'image/png', data: { type: 'data', data: PNG } }] },
      ],
      tools,
      toolChoice: { type: 'required' },
    });
    const ms = Date.now() - t0;
    lat.push(ms);
    const call = r.content.find((c) => c.type === 'tool-call');
    let input;
    try {
      input = call && JSON.parse(call.input);
    } catch {}
    const valid = Boolean(call) && validType(call.toolName, input);
    if (valid) ok++;
    console.log(`act ${i}: ${valid ? 'geldig' : 'ONGELDIG'} ${ms} ms ${call ? `${call.toolName} ${call.input}` : JSON.stringify(r.content)}`);
  } catch (e) {
    console.log(`act ${i}: FOUT ${Date.now() - t0} ms ${e.message}`);
  }
}
console.log(`act: ${ok}/${runs} geldige tool-calls (${actModel}); latency ms: ${lat.join(', ')}`);
if (ok !== runs) failures.push(`act ${ok}/${runs}`);

const judge = claudeSeat(judgeModel);
const t0 = Date.now();
try {
  const r = await judge.doGenerate({
    prompt: [{ role: 'user', content: [{ type: 'text', text: `${page.replace('is empty', 'contains test@example.com')}\nAssertion: the e-mail field is filled in.` }] }],
    responseFormat: { type: 'json', schema: { type: 'object', properties: { pass: { type: 'boolean' }, reason: { type: 'string' } }, required: ['pass', 'reason'], additionalProperties: false } },
  });
  const text = r.content[0]?.text ?? '';
  let verdict;
  try {
    verdict = JSON.parse(text);
  } catch {}
  console.log(`judge: ${Date.now() - t0} ms ${text}`);
  if (!verdict || typeof verdict !== 'object') failures.push('judge gaf geen geldige JSON');
  else if (verdict.pass !== true) failures.push(`judge pass=${JSON.stringify(verdict.pass)}`);
} catch (e) {
  console.log(`judge: FOUT ${Date.now() - t0} ms ${e.message}`);
  failures.push('judge faalde');
}

// Optioneel: door de echte AI SDK, zoals e2e het model gebruikt.
const sdkDir = process.env.AI_SDK_DIR || process.cwd();
let ai;
try {
  const req = createRequire(path.join(path.resolve(sdkDir), 'package.json'));
  ai = await import(pathToFileURL(req.resolve('ai')).href);
} catch {}
if (!ai) console.log(`sdk: overgeslagen (geen 'ai' op te lossen vanuit ${sdkDir}; zet AI_SDK_DIR)`);
else {
  const t1 = Date.now();
  try {
    const r = await ai.generateText({
      model: claudeSeat(actModel),
      system: 'You drive a browser test. Take exactly one action per turn using the tools.',
      prompt: goal,
      tools: {
        click: ai.tool({ description: 'Click an element on the page.', inputSchema: ai.jsonSchema(clickSchema) }),
        type: ai.tool({ description: 'Type text into an input.', inputSchema: ai.jsonSchema(typeSchema) }),
      },
      toolChoice: 'required',
    });
    const call = r.toolCalls?.[0];
    const valid = Boolean(call) && validType(call.toolName, call.input);
    console.log(`sdk: ${valid ? 'geldig' : 'ONGELDIG'} ${Date.now() - t1} ms generateText ${call ? `${call.toolName} ${JSON.stringify(call.input)}` : JSON.stringify(r.text)}`);
    if (!valid) failures.push('sdk generateText gaf geen geldige tool-call');
  } catch (e) {
    console.log(`sdk: FOUT ${Date.now() - t1} ms ${e.message}`);
    failures.push('sdk generateText faalde');
  }
}

console.log(failures.length ? `smoke: MISLUKT (${failures.join('; ')})` : 'smoke: ok');
process.exit(failures.length ? 1 : 0);
