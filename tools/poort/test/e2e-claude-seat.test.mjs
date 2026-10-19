// e2e-claude-seat: een Claude-seat via `claude -p` als AI SDK-model. Een nep-claude
// (CLAUDE_BIN) legt argv, stdin en env vast; echte seat-calls horen in de smoke.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claudeSeat, flattenPrompt, extractJson, toolSchema, toolPlan, childEnv, seatEnv, seatToken, tokenFile, IMAGE_OMITTED, redact, judgeSeatAuth, managedPolicyProblems, unifiedFinish, sniffImageType, authStatusArgs, setPolicySourcesForTests, policySources, allowedEnvName } from '../integrations/e2e-claude-seat.mjs';

// CommonJS en niet ESM: het script heeft geen .mjs-extensie, en Node 18 en 20
// herkennen ESM-syntax in zo'n bestand niet (pas Node 22 detecteert dat zelf).
const FAKE = `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
// De instellingen van de nep-claude staan naast hem, niet in de env: de
// integratie geeft (terecht) alleen een allowlist van variabelen door.
const cfg = JSON.parse(fs.readFileSync(path.join(path.dirname(process.argv[1]), 'fake.json'), 'utf8'));
let stdin = '';
process.stdin.on('data', (d) => (stdin += d));
// Alleen synthetische velden in de logs: de test-env is al minimaal, en zo komt
// er ook bij een vergissing geen echte sleutel uit de shell in een tijdelijk bestand.
const logEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(ANTHROPIC_|CLAUDE|POORT_|NODE_OPTIONS$|LD_|DYLD_|OPENAI_|AWS_|LANG$|LC_|TMPDIR$|XDG_)|_proxy$/i.test(k)));
process.stdin.on('end', () => {
  const mode = cfg.FAKE_CLAUDE_MODE || '';
  const ai = args.indexOf('auth');
  if (ai >= 0 && args[ai + 1] === 'status') {
    if (mode === 'auth-sleep') return setTimeout(() => {}, 60000);
    if (cfg.FAKE_CLAUDE_AUTH_LOG) fs.appendFileSync(cfg.FAKE_CLAUDE_AUTH_LOG, JSON.stringify({ args, env: logEnv() }) + '\\n');
    if (mode === 'auth-no-safe-mode' && args.includes('--safe-mode')) {
      process.stderr.write("error: unknown option '--safe-mode'\\n");
      process.exit(1);
    }
    const f = cfg.FAKE_CLAUDE_AUTH_FILE;
    let st = (f && fs.existsSync(f) && fs.readFileSync(f, 'utf8')) || cfg.FAKE_CLAUDE_AUTH || '{"loggedIn":true,"authMethod":"oauth_token","apiProvider":"firstParty"}';
    // Zoals de echte CLI: projectinstellingen tellen mee, tenzij --setting-sources ""
    // vóór het subcommando staat.
    const isolated = args.slice(0, ai).includes('--setting-sources');
    if (!isolated && fs.existsSync('.claude/settings.json') && /apiKeyHelper/.test(fs.readFileSync('.claude/settings.json', 'utf8'))) {
      st = '{"loggedIn":true,"authMethod":"api_key_helper","apiProvider":"firstParty"}';
    }
    process.stdout.write(st);
    process.exit(/"loggedIn":true/.test(st) ? 0 : 1);
  }
  if (cfg.FAKE_PID_FILE) fs.writeFileSync(cfg.FAKE_PID_FILE, String(process.pid));
  const log = cfg.FAKE_CLAUDE_LOG;
  if (log) fs.appendFileSync(log, JSON.stringify({ args, stdin, env: logEnv(), cwd: process.cwd() }) + '\\n');
  const n = log ? fs.readFileSync(log, 'utf8').trim().split('\\n').length : 1;
  if (mode === 'sleep') return setTimeout(() => {}, 60000);
  if ((mode === 'overloaded-once' && n === 1) || mode === 'overloaded') {
    process.stderr.write('API Error: 529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\\n');
    process.exit(1);
  }
  // Een mislukt resultaat met de oorzaak alleen in errors (lege stderr).
  if (mode === 'errors-overloaded-once' && n === 1) {
    process.stdout.write(JSON.stringify({ type: 'result', subtype: 'error_during_execution', is_error: true, result: '', errors: ['API Error: 529 Overloaded'] }));
    process.exit(1);
  }
  if (mode === 'usage-limit') {
    process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: 'Claude usage limit reached. Your limit will reset at 5pm.' }));
    process.exit(1);
  }
  if (mode === 'leak') {
    process.stderr.write('debug: Authorization: Bearer ' + process.env.CLAUDE_CODE_OAUTH_TOKEN + ' andere sk-ant-api03-abcdefghijklmnop\\n');
    process.exit(2);
  }
  if (mode === 'success-then-exit' || mode === 'success-then-kill') {
    process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'half' }));
    if (mode === 'success-then-kill') return process.kill(process.pid, 'SIGKILL');
    process.exit(3);
  }
  if (mode === 'no-safe-mode' && args.includes('--safe-mode')) {
    process.stderr.write("error: unknown option '--safe-mode'\\n");
    process.exit(1);
  }
  if (mode === 'crash') {
    process.stderr.write('boem\\n');
    process.exit(3);
  }
  const res = JSON.parse(cfg.FAKE_CLAUDE_RESPONSE || '{"type":"result","subtype":"success","is_error":false,"result":"ok"}');
  const line = JSON.stringify({ session_id: 'sess-1', usage: { input_tokens: 10, cache_read_input_tokens: 5, cache_creation_input_tokens: 2, output_tokens: 7 }, ...res });
  if (args.includes('stream-json')) process.stdout.write(JSON.stringify({ type: 'system', subtype: 'init' }) + '\\n' + line + '\\n');
  else process.stdout.write(line);
  if (mode === 'exit1') process.exitCode = 1;
});
`;

// Elke fixture-map gaat na de test weg.
const fixtureDirs = [];
afterEach(() => {
  for (const d of fixtureDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  setPolicySourcesForTests(null);
});
const tmpDir = (prefix) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fixtureDirs.push(d);
  return d;
};

function setup(response, mode = '', extra = {}) {
  const dir = tmpDir('seat-test-');
  const bin = path.join(dir, 'claude');
  fs.writeFileSync(bin, FAKE, { mode: 0o755 });
  const log = path.join(dir, 'log.jsonl');
  const managed = path.join(dir, 'managed');
  fs.mkdirSync(managed);
  const home = path.join(dir, 'home');
  fs.mkdirSync(home);
  // Nooit het echte systeembeleid: een lege nepmap via de testnaad, tenzij een
  // test er iets in zet. De laatste setup van een test wint.
  setPolicySourcesForTests({ dir: managed, plists: [path.join(managed, 'com.anthropic.claudecode.plist')], registry: false });
  const fakeCfg = {
    FAKE_CLAUDE_AUTH_LOG: path.join(dir, 'auth.jsonl'),
    FAKE_CLAUDE_LOG: log,
    FAKE_CLAUDE_MODE: mode,
    FAKE_CLAUDE_RESPONSE: JSON.stringify({ type: 'result', subtype: 'success', is_error: false, ...response }),
  };
  const envExtra = {};
  for (const [k, v] of Object.entries(extra)) (k.startsWith('FAKE_') ? fakeCfg : envExtra)[k] = v;
  const fake = (more = {}) => fs.writeFileSync(path.join(dir, 'fake.json'), JSON.stringify(Object.assign(fakeCfg, more)));
  fake();
  // Een minimale, synthetische env: nooit de env van de shell waarin de tests
  // draaien, zodat geen echte sleutel of token in een fixture of log belandt.
  const env = {
    PATH: [path.dirname(process.execPath), '/usr/bin', '/bin'].join(path.delimiter),
    HOME: home,
    ANTHROPIC_API_KEY: 'sk-test-niet-gebruiken',
    ANTHROPIC_BASE_URL: 'http://127.0.0.1:9/proxy',
    ANTHROPIC_AUTH_TOKEN: 'proxy-token',
    CLAUDE_CODE_OAUTH_TOKEN: 'seat-token-test',
    ...envExtra,
  };
  const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
  const calls = () => read(log);
  const authCalls = () => read(fakeCfg.FAKE_CLAUDE_AUTH_LOG);
  return { bin, env, calls, authCalls, dir, managed, fake };
}

const ask = (m, extra = {}) => m.doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }], ...extra });

const flag = (args, name) => args[args.indexOf(name) + 1];
const PNG = (n) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, n]);

const TOOLS = [
  { type: 'function', name: 'click', description: 'klik op een element', inputSchema: { type: 'object', properties: { selector: { type: 'string' } }, required: ['selector'] } },
  { type: 'function', name: 'type', inputSchema: { type: 'object', properties: { selector: { type: 'string' }, text: { type: 'string' } }, required: ['selector', 'text'] } },
];

test('claude-seat: argv zonder --bare, met model, systeemprompt en tools, MCP en instellingen uit', async () => {
  const s = setup({ result: 'hallo' });
  const m = claudeSeat('claude-sonnet-5-5', { bin: s.bin, env: s.env });
  assert.equal(m.specificationVersion, 'v4');
  assert.equal(m.provider, 'claude-seat');
  const r = await m.doGenerate({
    prompt: [
      { role: 'system', content: 'Je bent een tester.' },
      { role: 'system', content: 'Wees kort.' },
      { role: 'user', content: [{ type: 'text', text: 'zeg hallo' }] },
    ],
  });
  const [c] = s.calls();
  assert.ok(!c.args.includes('--bare'), 'nooit --bare: dat slaat de seat-login over');
  assert.equal(c.args[0], '-p');
  assert.equal(flag(c.args, '--model'), 'claude-sonnet-5-5');
  assert.equal(flag(c.args, '--system-prompt'), 'Je bent een tester.\n\nWees kort.');
  assert.equal(flag(c.args, '--output-format'), 'json');
  assert.equal(flag(c.args, '--tools'), '');
  assert.ok(c.args.includes('--strict-mcp-config'));
  assert.equal(flag(c.args, '--mcp-config'), '{"mcpServers":{}}');
  assert.equal(flag(c.args, '--setting-sources'), '');
  assert.ok(c.args.includes('--no-session-persistence'));
  assert.ok(c.args.includes('--safe-mode'));
  assert.ok(!c.args.includes('--json-schema'), 'zonder tools of json geen schema');
  assert.match(c.stdin, /zeg hallo/);
  assert.ok(!c.stdin.includes('Je bent een tester'), 'systeemprompt niet ook in stdin');
  assert.deepEqual(r.content, [{ type: 'text', text: 'hallo' }]);
  assert.equal(r.finishReason.unified, 'stop');
  assert.deepEqual(r.usage.inputTokens, { total: 17, noCache: 10, cacheRead: 5, cacheWrite: 2 });
  assert.equal(r.usage.outputTokens.total, 7);
});

test('claude-seat: env zonder API-sleutel en proxy, seat-token blijft', async () => {
  const s = setup({ result: 'x' });
  await claudeSeat('claude-haiku-4-5', { bin: s.bin, env: s.env }).doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }] });
  const [c] = s.calls();
  for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN']) assert.equal(c.env[k], undefined, `${k} weg`);
  assert.equal(c.env.CLAUDE_CODE_OAUTH_TOKEN, 'seat-token-test');
  assert.ok(!c.cwd.startsWith(process.cwd()), 'kind draait niet in de repo (geen CLAUDE.md van het project)');
  const e = childEnv({ ANTHROPIC_API_KEY: 'a', PATH: '/bin' });
  assert.deepEqual(e, { PATH: '/bin' });
  // Opname vanuit een agent-sessie: niets van de host-sessie of een cloud-account
  // mag mee, de seat-token en de keuze van de config-map wel.
  const binnen = childEnv({
    PATH: '/bin',
    HOME: '/h',
    CLAUDECODE: '1',
    CLAUDE_PID: '42',
    CLAUDE_CODE_SESSION_ID: 's',
    CLAUDE_CODE_MESSAGING_SOCKET: '/tmp/sock',
    CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH: '1',
    CLAUDE_CODE_USE_BEDROCK: '1',
    CLAUDE_AGENT_SDK_VERSION: '1',
    ANTHROPIC_MODEL: 'iets-anders',
    CLAUDE_CODE_OAUTH_TOKEN: 'seat',
    CLAUDE_CONFIG_DIR: '/h/.claude-werk',
  });
  assert.deepEqual(binnen, { PATH: '/bin', HOME: '/h', CLAUDE_CODE_OAUTH_TOKEN: 'seat', CLAUDE_CONFIG_DIR: '/h/.claude-werk' });
});

test('claude-seat: token uit ~/.config/poort/claude-seat-token, alleen als hij privé is', () => {
  const home = tmpDir('seat-home-');
  const base = { PATH: '/bin', HOME: home };
  // Geen bestand en geen env: geen token, niets verzonnen.
  assert.equal(seatToken(base), null);
  assert.equal(seatEnv(base).CLAUDE_CODE_OAUTH_TOKEN, undefined);

  const file = tokenFile(base);
  assert.equal(file, path.join(home, '.config', 'poort', 'claude-seat-token'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'uit-bestand\n', { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  assert.equal(seatEnv(base).CLAUDE_CODE_OAUTH_TOKEN, 'uit-bestand');
  // De env wint van het bestand.
  assert.equal(seatEnv({ ...base, CLAUDE_CODE_OAUTH_TOKEN: 'uit-env' }).CLAUDE_CODE_OAUTH_TOKEN, 'uit-env');
  // Een ander pad via POORT_CLAUDE_SEAT_TOKEN_FILE.
  assert.equal(tokenFile({ ...base, POORT_CLAUDE_SEAT_TOKEN_FILE: '/x/t' }), '/x/t');

  if (process.platform !== 'win32') {
    fs.chmodSync(file, 0o644);
    assert.throws(() => seatEnv(base), /leesbaar voor anderen.*chmod 600/);
  }
});

test('claude-seat: CLAUDE_BIN kiest de binary', async () => {
  const s = setup({ result: 'via env' });
  const old = process.env.CLAUDE_BIN;
  process.env.CLAUDE_BIN = s.bin;
  try {
    const r = await claudeSeat('m', { env: s.env }).doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }] });
    assert.equal(r.content[0].text, 'via env');
  } finally {
    if (old === undefined) delete process.env.CLAUDE_BIN;
    else process.env.CLAUDE_BIN = old;
  }
});

test('claude-seat: alleen de laatste 2 afbeeldingen gaan mee, via stream-json', async () => {
  const s = setup({ result: 'gezien' });
  const prompt = [
    { role: 'user', content: [{ type: 'text', text: 'doel' }, { type: 'file', mediaType: 'image/png', data: { type: 'data', data: PNG(1) } }] },
    { role: 'assistant', content: [{ type: 'tool-call', toolCallId: 't1', toolName: 'click', input: { selector: '#a' } }] },
    {
      role: 'tool',
      content: [
        { type: 'tool-result', toolCallId: 't1', toolName: 'click', output: { type: 'content', value: [{ type: 'text', text: 'geklikt' }, { type: 'file', mediaType: 'image/png', data: { type: 'data', data: PNG(2) } }] } },
      ],
    },
    { role: 'user', content: [{ type: 'text', text: 'verder' }, { type: 'file', mediaType: 'image/png', data: Buffer.from(PNG(3)).toString('base64') }] },
  ];
  await claudeSeat('m', { bin: s.bin, env: s.env }).doGenerate({ prompt });
  const [c] = s.calls();
  assert.equal(flag(c.args, '--input-format'), 'stream-json');
  assert.equal(flag(c.args, '--output-format'), 'stream-json');
  assert.ok(c.args.includes('--verbose'));
  const msg = JSON.parse(c.stdin.trim());
  assert.equal(msg.type, 'user');
  const blocks = msg.message.content;
  const imgs = blocks.filter((b) => b.type === 'image');
  assert.equal(imgs.length, 2);
  assert.deepEqual(imgs.map((b) => Buffer.from(b.source.data, 'base64')[4]), [2, 3], 'de oudste valt weg');
  assert.equal(imgs[0].source.media_type, 'image/png');
  const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  assert.ok(text.includes(IMAGE_OMITTED));
  assert.match(text, /\[tool-aanroep click id=t1\] \{"selector":"#a"\}/);
  assert.match(text, /\[tool-resultaat click id=t1\]\ngeklikt/);
  // volgorde: tekst van het resultaat staat vóór zijn schermafbeelding
  assert.ok(blocks.findIndex((b) => b.type === 'image') > blocks.findIndex((b) => b.type === 'text' && b.text.includes('geklikt')));
});

test('claude-seat: tools worden een schema; het antwoord een tool-call met unieke id', async () => {
  const s = setup({ result: '', structured_output: { action: { tool: 'type', input: { selector: '#q', text: 'poort' } } } });
  const m = claudeSeat('m', { bin: s.bin, env: s.env });
  const opts = { prompt: [{ role: 'user', content: [{ type: 'text', text: 'zoek poort' }] }], tools: TOOLS, toolChoice: { type: 'required' } };
  const a = await m.doGenerate(opts);
  const b = await m.doGenerate(opts);
  const [c] = s.calls();
  const schema = JSON.parse(flag(c.args, '--json-schema'));
  assert.deepEqual(schema.required, ['action']);
  const options = schema.properties.action.anyOf;
  assert.deepEqual(options.map((o) => o.properties.tool?.const), ['click', 'type'], 'required: geen tekst-optie');
  assert.deepEqual(options[1].properties.input, TOOLS[1].inputSchema);
  assert.deepEqual(options[0].required, ['tool', 'input']);
  assert.match(flag(c.args, '--system-prompt'), /Zeg nooit dat je een tool niet hebt/);
  assert.equal(a.content.length, 1);
  const call = a.content[0];
  assert.equal(call.type, 'tool-call');
  assert.equal(call.toolName, 'type');
  assert.deepEqual(JSON.parse(call.input), { selector: '#q', text: 'poort' });
  assert.equal(a.finishReason.unified, 'tool-calls');
  assert.notEqual(call.toolCallId, b.content[0].toolCallId);
  // auto: ook een tekst-optie; tool: alleen die ene; none: geen schema
  assert.ok(toolSchema(toolPlan(TOOLS, { type: 'auto' })).properties.action.anyOf.some((o) => o.properties.text));
  assert.deepEqual(toolPlan(TOOLS, { type: 'tool', toolName: 'click' }).tools.map((t) => t.name), ['click']);
  assert.equal(toolPlan(TOOLS, { type: 'none' }), null);
});

test('claude-seat: zonder structured_output wordt het JSON-blok uit de tekst gelezen', async () => {
  const s = setup({ result: 'Ik klik.\n```json\n{"action":{"tool":"click","input":{"selector":"button.go"}}}\n```' });
  const r = await claudeSeat('m', { bin: s.bin, env: s.env }).doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'ga' }] }], tools: TOOLS, toolChoice: { type: 'auto' } });
  assert.equal(r.content[0].type, 'tool-call');
  assert.deepEqual(JSON.parse(r.content[0].input), { selector: 'button.go' });
  assert.deepEqual(extractJson('tekst {"a":{"b":"}"}} meer'), { a: { b: '}' } });
  assert.equal(extractJson('geen json'), undefined);
});

test('claude-seat: auto met tekst-antwoord geeft tekst, geen tool-call', async () => {
  const s = setup({ result: '', structured_output: { action: { text: 'klaar' } } });
  const r = await claudeSeat('m', { bin: s.bin, env: s.env }).doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }], tools: TOOLS, toolChoice: { type: 'auto' } });
  assert.deepEqual(r.content, [{ type: 'text', text: 'klaar' }]);
  assert.equal(r.finishReason.unified, 'stop');
});

test('claude-seat: responseFormat json geeft het schema door en de JSON terug', async () => {
  const schema = { type: 'object', properties: { pass: { type: 'boolean' }, reason: { type: 'string' } }, required: ['pass', 'reason'] };
  const s = setup({ result: 'zie structured', structured_output: { pass: true, reason: 'knop zichtbaar' } });
  const r = await claudeSeat('claude-opus-5-5', { bin: s.bin, env: s.env }).doGenerate({
    prompt: [{ role: 'user', content: [{ type: 'text', text: 'oordeel' }] }],
    responseFormat: { type: 'json', schema, name: 'verdict' },
  });
  const [c] = s.calls();
  assert.deepEqual(JSON.parse(flag(c.args, '--json-schema')), schema);
  assert.deepEqual(JSON.parse(r.content[0].text), { pass: true, reason: 'knop zichtbaar' });
});

test('claude-seat: doStream levert de onderdelen die de specificatie vraagt', async () => {
  const s = setup({ result: '', structured_output: { action: { tool: 'click', input: { selector: '#a' } } } });
  const { stream } = await claudeSeat('m', { bin: s.bin, env: s.env }).doStream({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }], tools: TOOLS, toolChoice: { type: 'required' } });
  const parts = [];
  for await (const p of stream) parts.push(p);
  assert.deepEqual(
    parts.map((p) => p.type),
    ['stream-start', 'response-metadata', 'tool-input-start', 'tool-input-delta', 'tool-input-end', 'tool-call', 'finish'],
  );
  const id = parts[2].id;
  assert.equal(parts[5].toolCallId, id);
  assert.deepEqual(JSON.parse(parts[3].delta), { selector: '#a' });
  assert.equal(parts.at(-1).finishReason.unified, 'tool-calls');
  assert.equal(parts.at(-1).usage.outputTokens.total, 7);

  const t = setup({ result: 'tekst' });
  const { stream: s2 } = await claudeSeat('m', { bin: t.bin, env: t.env }).doStream({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }] });
  const p2 = [];
  for await (const p of s2) p2.push(p);
  assert.deepEqual(p2.map((p) => p.type), ['stream-start', 'response-metadata', 'text-start', 'text-delta', 'text-end', 'finish']);
  assert.equal(p2[3].delta, 'tekst');
});

test('claude-seat: fouten in gewone taal; "Not logged in" wijst naar inloggen', async () => {
  const s = setup({ is_error: true, result: 'Not logged in · Please run /login' });
  await assert.rejects(
    claudeSeat('m', { bin: s.bin, env: s.env }).doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }] }),
    (e) => e.kind === 'auth' && /log in/.test(e.message) && /CLAUDE_CODE_OAUTH_TOKEN/.test(e.message) && /claude setup-token/.test(e.message),
  );
  const crash = setup({}, 'crash');
  await assert.rejects(claudeSeat('m', { bin: crash.bin, env: crash.env }).doGenerate({ prompt: [] }), (e) => e.kind === 'cli' && /exit 3/.test(e.message) && /boem/.test(e.message));
  await assert.rejects(claudeSeat('m', { bin: path.join(s.dir, 'bestaat-niet'), env: s.env }).doGenerate({ prompt: [] }), (e) => e.kind === 'spawn' && /claude niet gevonden/.test(e.message));
});

test('claude-seat: kent de CLI --safe-mode niet, dan zonder opnieuw', async () => {
  const s = setup({ result: 'oud' }, 'no-safe-mode');
  const r = await claudeSeat('m', { bin: s.bin, env: s.env }).doGenerate({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }] });
  assert.equal(r.content[0].text, 'oud');
  const calls = s.calls();
  assert.equal(calls.length, 2);
  assert.ok(!calls[1].args.includes('--safe-mode'));
});

test('claude-seat: timeout en AbortSignal stoppen het kind', async () => {
  const s = setup({}, 'sleep');
  // timeoutMs is één termijn voor de hele aanroep: een hangend kind gebruikt hem
  // op, en daarna geen nieuwe poging die de belofte zou breken.
  const t0 = Date.now();
  await assert.rejects(claudeSeat('m', { bin: s.bin, env: s.env, timeoutMs: 800, retryDelaysMs: [10, 10] }).doGenerate({ prompt: [] }), (e) => e.kind === 'timeout' && /binnen 1 s geen antwoord/.test(e.message));
  const took = Date.now() - t0;
  assert.ok(took >= 700 && took < 800 + 400, `binnen de termijn (${took} ms)`);
  assert.equal(s.calls().length, 1);
  // Een hangende controle vooraf valt ook binnen dezelfde termijn.
  const a = setup({}, 'auth-sleep');
  const t1 = Date.now();
  await assert.rejects(claudeSeat('m', { bin: a.bin, env: a.env, timeoutMs: 500 }).doGenerate({ prompt: [] }), (e) => e.kind === 'timeout');
  assert.ok(Date.now() - t1 < 500 + 400, `controle vooraf begrensd (${Date.now() - t1} ms)`);
  // Een tijdelijke fout met een backoff die niet meer past: meteen de fout.
  const o = setup({}, 'overloaded');
  const t2 = Date.now();
  await assert.rejects(claudeSeat('m', { bin: o.bin, env: o.env, timeoutMs: 1500, retryDelaysMs: [5000] }).doGenerate({ prompt: [] }), (e) => e.kind === 'overloaded');
  assert.ok(Date.now() - t2 < 1500, 'wacht geen backoff uit voorbij de termijn');
  assert.equal(o.calls().length, 1);
  const ac = new AbortController();
  const p = claudeSeat('m', { bin: s.bin, env: s.env }).doGenerate({ prompt: [], abortSignal: ac.signal });
  setTimeout(() => ac.abort(), 100);
  await assert.rejects(p, (e) => e.name === 'AbortError');
});

test('flattenPrompt: tool-resultaten compact, oude afbeeldingen vervangen', () => {
  const f = flattenPrompt(
    [
      { role: 'user', content: [{ type: 'file', mediaType: 'image/png', data: PNG(1) }] },
      { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'x', toolName: 'observe', output: { type: 'json', value: { url: '/' } } }] },
      { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'y', toolName: 'click', output: { type: 'error-text', value: 'niet gevonden' } }] },
    ],
    { keepImages: 0 },
  );
  assert.equal(f.images, 0);
  assert.equal(f.blocks.length, 1);
  assert.match(f.blocks[0].text, /\[schermafbeelding weggelaten\]/);
  assert.match(f.blocks[0].text, /\[tool-resultaat observe id=x\] \{"url":"\/"\}/);
  assert.match(f.blocks[0].text, /\[tool-resultaat click id=y\] fout: niet gevonden/);
});

// ---------- review-bevindingen: seat afdwingen, niets lekken, niets stil goedkeuren ----------

// Een env zonder token in env of bestand: alleen een interactieve login kan dan seat zijn.
const noToken = () => ({ CLAUDE_CODE_OAUTH_TOKEN: '', HOME: tmpDir('seat-home-'), POORT_CLAUDE_SEAT_TOKEN_FILE: '/bestaat/niet' });

test('claude-seat auth: vóór elk kind `claude auth status`, geïsoleerd en met dezelfde env als de call', async () => {
  const s = setup({ result: 'ok' });
  const m = claudeSeat('m', { bin: s.bin, env: s.env });
  await ask(m);
  await ask(m);
  const auth = s.authCalls();
  assert.equal(auth.length, 2, 'geen cache: elke call controleert opnieuw');
  assert.deepEqual(auth[0].args, authStatusArgs(true));
  assert.deepEqual(auth[0].args, ['--setting-sources', '', '--strict-mcp-config', '--safe-mode', 'auth', 'status', '--json']);
  assert.equal(auth[0].env.CLAUDE_CODE_OAUTH_TOKEN, 'seat-token-test');
  assert.equal(auth[0].env.ANTHROPIC_API_KEY, undefined);
  assert.equal(s.calls().length, 2);
  // Interactieve abonnementslogin zonder token: ook een seat.
  const c = setup({ result: 'ok' }, '', { ...noToken(), FAKE_CLAUDE_AUTH: '{"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty"}' });
  assert.equal((await ask(claudeSeat('m', { bin: c.bin, env: c.env }))).content[0].text, 'ok');
  // Kent de CLI --safe-mode niet, dan de controle zonder.
  const old = setup({ result: 'ok' }, 'auth-no-safe-mode');
  assert.equal((await ask(claudeSeat('m', { bin: old.bin, env: old.env }))).content[0].text, 'ok');
  assert.deepEqual(old.authCalls().at(-1).args, authStatusArgs(false));
});

test('claude-seat auth: beleid of login die tussen twee calls verandert, telt bij de volgende call', async () => {
  const s = setup({ result: 'ok' });
  const authFile = path.join(s.dir, 'auth.json');
  s.fake({ FAKE_CLAUDE_AUTH_FILE: authFile });
  const m = claudeSeat('m', { bin: s.bin, env: s.env });
  assert.equal((await ask(m)).content[0].text, 'ok');
  // Nieuw beheerd beleid met een hook: de volgende call weigert.
  fs.writeFileSync(path.join(s.managed, 'managed-settings.json'), JSON.stringify({ hooks: { SessionStart: [] } }));
  await assert.rejects(ask(m), (e) => e.kind === 'managed');
  fs.rmSync(path.join(s.managed, 'managed-settings.json'));
  assert.equal((await ask(m)).content[0].text, 'ok');
  // Login gewisseld naar een Console-sleutel: de volgende call weigert.
  fs.writeFileSync(authFile, '{"loggedIn":true,"authMethod":"api_key","apiProvider":"firstParty"}');
  await assert.rejects(ask(m), (e) => e.kind === 'auth' && /api_key/.test(e.message));
  assert.equal(s.calls().length, 2, 'na een weigering geen modelcall');
  // Ook een nieuwe poging na een tijdelijke fout controleert opnieuw.
  const r = setup({ result: 'tweede keer' }, 'overloaded-once');
  await ask(claudeSeat('m', { bin: r.bin, env: r.env, retryDelaysMs: [10] }));
  assert.equal(r.authCalls().length, 2);
});

test('claude-seat auth: controle met dezelfde instellingen als de opname (projectinstellingen tellen niet)', async () => {
  // Een werkmap met een apiKeyHelper in .claude/settings.json: zonder isolatie zou
  // auth status api_key_helper melden, terwijl de opname die instellingen niet laadt.
  const s = setup({ result: 'ok' });
  const cwd = tmpDir('seat-cwd-');
  fs.mkdirSync(path.join(cwd, '.claude'));
  fs.writeFileSync(path.join(cwd, '.claude', 'settings.json'), JSON.stringify({ apiKeyHelper: 'echo sk-ant-api03-nepnepnep' }));
  assert.equal((await ask(claudeSeat('m', { bin: s.bin, env: s.env, cwd }))).content[0].text, 'ok');
  assert.equal(s.authCalls()[0].args.indexOf('--setting-sources') < s.authCalls()[0].args.indexOf('auth'), true);
  assert.equal(s.calls()[0].cwd, fs.realpathSync(cwd));
});

test('claude-seat auth: API-sleutel, helper, Bedrock/Vertex/gateway en onbekend falen dicht met de methode in de fout', async () => {
  const cases = [
    [{ loggedIn: true, authMethod: 'api_key', apiProvider: 'firstParty', apiKeySource: '/login managed key' }, /API-sleutel/],
    [{ loggedIn: true, authMethod: 'api_key', apiProvider: 'firstParty' }, /authMethod is api_key/],
    [{ loggedIn: true, authMethod: 'api_key_helper', apiProvider: 'firstParty' }, /authMethod is api_key_helper/],
    [{ loggedIn: true, authMethod: 'third_party', apiProvider: 'bedrock' }, /apiProvider is bedrock/],
    [{ loggedIn: true, authMethod: 'oauth_token', apiProvider: 'vertex' }, /apiProvider is vertex/],
    [{ loggedIn: true, authMethod: 'oauth_token', apiProvider: 'foundry' }, /apiProvider is foundry/],
    [{ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'gateway' }, /apiProvider is gateway/],
    [{ loggedIn: true, authMethod: 'iets_nieuws', apiProvider: 'firstParty' }, /authMethod is iets_nieuws/],
    [{ loggedIn: true, authMethod: 'claude.ai' }, /apiProvider is onbekend/],
  ];
  for (const [st, re] of cases) {
    const s = setup({ result: 'mag niet' }, '', { FAKE_CLAUDE_AUTH: JSON.stringify(st) });
    await assert.rejects(ask(claudeSeat('m', { bin: s.bin, env: s.env })), (e) => e.name === 'ClaudeSeatError' && e.kind === 'auth' && re.test(e.message) && /geweigerd/.test(e.message), JSON.stringify(st));
    assert.equal(s.calls().length, 0, 'geen modelcall zonder seat');
  }
  // oauth_token, maar niet uit CLAUDE_CODE_OAUTH_TOKEN (bijv. een ant-profiel): geen seat.
  const p = setup({ result: 'x' }, '', noToken());
  await assert.rejects(ask(claudeSeat('m', { bin: p.bin, env: p.env })), (e) => e.kind === 'auth' && /niet uit CLAUDE_CODE_OAUTH_TOKEN/.test(e.message));
  // Niet ingelogd: de login-hint.
  const n = setup({ result: 'x' }, '', { FAKE_CLAUDE_AUTH: '{"loggedIn":false,"authMethod":"none","apiProvider":"firstParty"}' });
  await assert.rejects(ask(claudeSeat('m', { bin: n.bin, env: n.env })), (e) => e.kind === 'auth' && /claude setup-token/.test(e.message));
  assert.equal(judgeSeatAuth(null).ok, false);
  assert.equal(judgeSeatAuth({ loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty' }).ok, true);
});

test('claude-seat: HTTP(S)_PROXY, ALL_PROXY en NO_PROXY gaan eraf, in elke schrijfwijze', async () => {
  const proxies = { HTTP_PROXY: 'http://p:1', HTTPS_PROXY: 'http://p:1', ALL_PROXY: 'socks5://p:1', NO_PROXY: 'x', http_proxy: 'http://p:1', https_proxy: 'http://p:1', all_proxy: 'socks5://p:1', no_proxy: 'x' };
  const s = setup({ result: 'x' }, '', proxies);
  await ask(claudeSeat('m', { bin: s.bin, env: s.env }));
  for (const c of [...s.calls(), ...s.authCalls()]) for (const k of Object.keys(proxies)) assert.equal(c.env[k], undefined, `${k} weg`);
  assert.deepEqual(childEnv({ PATH: '/bin', Https_Proxy: 'x' }), { PATH: '/bin' });
});

test('claude-seat: beheerde instellingen met hooks, env, apiKeyHelper, MCP of onbekende sleutels worden altijd geweigerd', async () => {
  const write = (dir, rel, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  const cases = [
    ['managed-settings.json', JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'curl evil' }] }] } }), /managed-settings\.json zet hooks/],
    ['managed-settings.json', JSON.stringify({ env: { HTTPS_PROXY: 'http://p' }, apiKeyHelper: 'echo k' }), /zet env, apiKeyHelper/],
    ['managed-settings.d/10-org.json', JSON.stringify({ env: { ANTHROPIC_BASE_URL: 'http://p' } }), /10-org\.json zet env/],
    ['managed-settings.json', JSON.stringify({ awsCredentialExport: 'x', otelHeadersHelper: 'y' }), /zet awsCredentialExport, otelHeadersHelper/],
    ['managed-settings.json', JSON.stringify({ permissions: {}, enabledPlugins: { x: true } }), /zet enabledPlugins/],
    ['managed-mcp.json', '{"mcpServers":{}}', /neemt de MCP-servers over/],
    ['com.anthropic.claudecode.plist', '<plist/>', /MDM-profiel .*(niet te lezen|zet)/],
    ['managed-settings.json', '{kapot', /geen geldige JSON/],
  ];
  for (const [rel, text, re] of cases) {
    const s = setup({ result: 'ok' });
    write(s.managed, rel, text);
    // Er is geen opt-out meer: een onbekende optie verandert niets.
    await assert.rejects(ask(claudeSeat('m', { bin: s.bin, env: s.env, allowManagedSettings: true })), (e) => e.kind === 'managed' && re.test(e.message) && !/allowManagedSettings/.test(e.message), rel);
    assert.equal(s.calls().length + s.authCalls().length, 0, 'niets gestart');
  }
  // MDM-profiel via plutil (alleen macOS): alleen beperkend beleid mag, een hook niet.
  if (process.platform === 'darwin') {
    const plist = (body) => `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>${body}</dict></plist>\n`;
    const good = setup({ result: 'ok' });
    write(good.managed, 'com.anthropic.claudecode.plist', plist('<key>forceLoginMethod</key><string>claudeai</string>'));
    assert.deepEqual(managedPolicyProblems(), []);
    const bad = setup({ result: 'ok' });
    write(bad.managed, 'com.anthropic.claudecode.plist', plist('<key>hooks</key><dict/>'));
    assert.match(managedPolicyProblems().join(), /MDM-profiel .* zet hooks/);
  }
  // Beleid zonder hooks, env of routing (alleen permissies): geen bezwaar.
  const ok = setup({ result: 'ok' });
  write(ok.managed, 'managed-settings.json', JSON.stringify({ permissions: { deny: ['Bash'] } }));
  assert.deepEqual(managedPolicyProblems(), []);
  assert.equal((await ask(claudeSeat('m', { bin: ok.bin, env: ok.env }))).content[0].text, 'ok');
});

test('claude-seat: de token en elk sk-ant-patroon gaan uit foutmelding en detail', async () => {
  const token = 'sk-ant-oat01-GEHEIMSEATTOKEN0123456789';
  const clean = (e) => {
    const all = `${e.message}\n${e.detail ?? ''}\n${JSON.stringify(e)}`;
    return !all.includes(token) && !all.includes('GEHEIMSEATTOKEN') && !all.includes('abcdefghijklmnop');
  };
  // stderr met de token (exit 2)
  const a = setup({}, 'leak', { CLAUDE_CODE_OAUTH_TOKEN: token });
  await assert.rejects(ask(claudeSeat('m', { bin: a.bin, env: a.env })), (e) => e.kind === 'cli' && clean(e) && /\[token\]/.test(e.message));
  // JSON-fout, auth
  const b = setup({ is_error: true, result: `authentication_error: invalid bearer ${token}` }, '', { CLAUDE_CODE_OAUTH_TOKEN: token });
  await assert.rejects(ask(claudeSeat('m', { bin: b.bin, env: b.env })), (e) => e.kind === 'auth' && clean(e));
  // JSON-fout, generiek, met een andere sleutel erin
  const c = setup({ is_error: true, result: `iets ging mis met ${token} en sk-ant-api03-abcdefghijklmnop` }, '', { CLAUDE_CODE_OAUTH_TOKEN: token });
  await assert.rejects(ask(claudeSeat('m', { bin: c.bin, env: c.env })), (e) => e.kind === 'cli' && clean(e));
  // Een token-achtige tekenreeks die niet de actieve token is, gaat ook weg.
  assert.equal(redact('x sk-ant-api03-abcdefghij y', []), 'x sk-ant-[token] y');
  assert.equal(redact('Bearer geheimtoken12', ['geheimtoken12']), 'Bearer [token]');
});

test('claude-seat: tijdelijke fouten begrensd opnieuw, limiet en auth niet; afbreken tijdens het wachten', async () => {
  const quick = { retryDelaysMs: [10, 10] };
  const once = setup({ result: 'tweede keer' }, 'overloaded-once');
  assert.equal((await ask(claudeSeat('m', { bin: once.bin, env: once.env, ...quick }))).content[0].text, 'tweede keer');
  assert.equal(once.calls().length, 2);

  const always = setup({}, 'overloaded');
  await assert.rejects(ask(claudeSeat('m', { bin: always.bin, env: always.env, ...quick })), (e) => e.kind === 'overloaded' && e.isRetryable === true);
  assert.equal(always.calls().length, 3, 'maximaal 2 keer opnieuw');

  const limit = setup({}, 'usage-limit');
  await assert.rejects(ask(claudeSeat('m', { bin: limit.bin, env: limit.env, ...quick })), (e) => e.kind === 'limit' && e.isRetryable === false);
  assert.equal(limit.calls().length, 1, 'een gebruikslimiet niet herhalen');

  const auth = setup({ is_error: true, result: 'Not logged in · Please run /login' });
  await assert.rejects(ask(claudeSeat('m', { bin: auth.bin, env: auth.env, ...quick })), (e) => e.kind === 'auth');
  assert.equal(auth.calls().length, 1);

  // Afbreken tijdens de backoff: meteen weg, geen tweede poging.
  const ab = setup({}, 'overloaded');
  const ac = new AbortController();
  const t0 = Date.now();
  const p = ask(claudeSeat('m', { bin: ab.bin, env: ab.env, retryDelaysMs: [30_000] }), { abortSignal: ac.signal });
  setTimeout(() => ac.abort(), 600);
  await assert.rejects(p, (e) => e.name === 'AbortError');
  assert.ok(Date.now() - t0 < 5000, 'wacht de backoff niet uit');
  assert.equal(ab.calls().length, 1);
});

test('claude-seat: een niet-nul exit of een signaal is een fout, ook met een succes-resultaat op stdout', async () => {
  const exit = setup({}, 'success-then-exit');
  await assert.rejects(ask(claudeSeat('m', { bin: exit.bin, env: exit.env })), (e) => e.kind === 'cli' && /exit 3/.test(e.message));
  const kill = setup({}, 'success-then-kill');
  await assert.rejects(ask(claudeSeat('m', { bin: kill.bin, env: kill.env })), (e) => e.kind === 'cli' && /SIGKILL/.test(e.message));
});

test('claude-seat: de errors-lijst van een mislukt resultaat telt mee (auth, limiet, overbelast) en wordt geredigeerd', async () => {
  const token = 'sk-ant-oat01-ERRORSLIJSTGEHEIM0123';
  const failed = (errors) => ({ subtype: 'error_during_execution', is_error: true, result: '', errors });
  const quick = { retryDelaysMs: [10, 10] };
  const a = setup(failed([`authentication_error: invalid bearer ${token}`]), '', { CLAUDE_CODE_OAUTH_TOKEN: token });
  await assert.rejects(ask(claudeSeat('m', { bin: a.bin, env: a.env, ...quick })), (e) => e.kind === 'auth' && !String(e.detail).includes(token));
  const l = setup(failed([{ message: 'Claude usage limit reached' }]));
  await assert.rejects(ask(claudeSeat('m', { bin: l.bin, env: l.env, ...quick })), (e) => e.kind === 'limit');
  assert.equal(l.calls().length, 1);
  // Overbelast in deze vorm krijgt de beloofde nieuwe poging.
  const o = setup({ result: 'gelukt' }, 'errors-overloaded-once');
  assert.equal((await ask(claudeSeat('m', { bin: o.bin, env: o.env, ...quick }))).content[0].text, 'gelukt');
  assert.equal(o.calls().length, 2);
});

test('claude-seat: stop_reason wordt de finish reason van de AI SDK, in doGenerate en doStream', async () => {
  const cases = [
    [{ result: 'half', stop_reason: 'max_tokens' }, null, 'length'],
    [{ result: 'nee', stop_reason: 'refusal' }, null, 'content-filter'],
    [{ result: 'ok', stop_reason: 'end_turn' }, null, 'stop'],
    [{ result: 'ok', stop_reason: 'stop_sequence' }, null, 'stop'],
    [{ result: 'ok', stop_reason: 'pause_turn' }, null, 'other'],
    [{ result: '', stop_reason: 'end_turn', structured_output: { action: { tool: 'click', input: { selector: '#a' } } } }, TOOLS, 'tool-calls'],
  ];
  for (const [res, tools, unified] of cases) {
    const s = setup(res);
    const m = claudeSeat('m', { bin: s.bin, env: s.env });
    const extra = tools ? { tools, toolChoice: { type: 'required' } } : {};
    const g = await ask(m, extra);
    assert.equal(g.finishReason.unified, unified, JSON.stringify(res));
    assert.equal(g.finishReason.raw, res.stop_reason);
    const { stream } = await m.doStream({ prompt: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }], ...extra });
    const parts = [];
    for await (const p of stream) parts.push(p);
    assert.equal(parts.at(-1).finishReason.unified, unified, `stream ${JSON.stringify(res)}`);
  }
  assert.equal(unifiedFinish('tool_use', false), 'other', 'een CLI-tool zonder onze tool-call is geen tool-call voor de SDK');
  assert.equal(unifiedFinish('tool_use', true), 'tool-calls');
  assert.equal(unifiedFinish(undefined), 'stop');
  assert.equal(unifiedFinish('max_tokens', true), 'length', 'afgekapt wint');
});

test('claude-seat: v4-afbeeldingen met mediaType "image" of "image/*" krijgen het type uit de bytes', async () => {
  const bytes = {
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/jpeg': [0xff, 0xd8, 0xff, 0xe0, 0, 0x10],
    'image/gif': [...Buffer.from('GIF89a')],
    'image/webp': [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBPVP8 ')],
  };
  for (const [type, b] of Object.entries(bytes)) {
    for (const mediaType of ['image', 'image/*']) {
      const s = setup({ result: 'gezien' });
      await ask(claudeSeat('m', { bin: s.bin, env: s.env }), { prompt: [{ role: 'user', content: [{ type: 'text', text: 'kijk' }, { type: 'file', mediaType, data: { type: 'data', data: new Uint8Array(b) } }] }] });
      const msg = JSON.parse(s.calls()[0].stdin.trim());
      const img = msg.message.content.find((x) => x.type === 'image');
      assert.ok(img, `${mediaType} met ${type}-bytes is een afbeelding`);
      assert.equal(img.source.media_type, type);
    }
    assert.equal(sniffImageType(Buffer.from(b).toString('base64')), type);
  }
  // Onbekende bytes met "image": geen gok, een tekstregel.
  const f = flattenPrompt([{ role: 'user', content: [{ type: 'file', mediaType: 'image', data: new Uint8Array([1, 2, 3, 4]) }] }]);
  assert.equal(f.images, 0);
});

// ---------- ronde 3 ----------

test('claude-seat env: allowlist; NODE_OPTIONS, LD_PRELOAD, DYLD_* en vreemde sleutels gaan nooit mee', async () => {
  const bad = {
    NODE_OPTIONS: '--require=/tmp/steel.cjs',
    LD_PRELOAD: '/tmp/x.so',
    DYLD_INSERT_LIBRARIES: '/tmp/x.dylib',
    DYLD_LIBRARY_PATH: '/tmp',
    OPENAI_API_KEY: 'sk-nep',
    AWS_SECRET_ACCESS_KEY: 'nep',
    HTTPS_PROXY: 'http://p:1',
  };
  const good = { LANG: 'nl_NL.UTF-8', LC_ALL: 'nl_NL.UTF-8', TMPDIR: os.tmpdir(), XDG_CONFIG_HOME: '/x' };
  const s = setup({ result: 'ok' }, '', { ...bad, ...good });
  await ask(claudeSeat('m', { bin: s.bin, env: s.env }));
  const all = [...s.calls(), ...s.authCalls()];
  assert.equal(all.length, 2, 'modelcall en controle vooraf');
  for (const c of all) {
    for (const k of Object.keys(bad)) assert.equal(c.env[k], undefined, `${k} weg`);
    for (const [k, v] of Object.entries(good)) assert.equal(c.env[k], v, `${k} blijft`);
    assert.equal(c.env.CLAUDE_CODE_OAUTH_TOKEN, 'seat-token-test');
  }
  // Windows: hoofdletterongevoelig, en alleen de systeemvariabelen die een proces nodig heeft.
  assert.deepEqual(childEnv({ Path: 'C:\\w', SystemRoot: 'C:\\Windows', ComSpec: 'cmd.exe', PATHEXT: '.CMD', NODE_OPTIONS: '-r x' }, 'win32'), { Path: 'C:\\w', SystemRoot: 'C:\\Windows', ComSpec: 'cmd.exe', PATHEXT: '.CMD' });
  assert.equal(allowedEnvName('SystemRoot', 'linux'), false);
  assert.equal(allowedEnvName('NODE_EXTRA_CA_CERTS'), false);
});

test('claude-seat beleid: geen env-variabele kan de echte beleidsplekken vervangen', () => {
  const old = process.env.POORT_CLAUDE_MANAGED_DIR;
  process.env.POORT_CLAUDE_MANAGED_DIR = '/leeg';
  try {
    assert.equal(policySources('darwin').dir, '/Library/Application Support/ClaudeCode');
    assert.equal(policySources('linux').dir, '/etc/claude-code');
    assert.equal(policySources('win32').dir, 'C:\\Program Files\\ClaudeCode');
    assert.equal(policySources('win32').registry, true);
    assert.match(policySources('darwin').plists.join(), /\/Library\/Managed Preferences\//);
  } finally {
    if (old === undefined) delete process.env.POORT_CLAUDE_MANAGED_DIR;
    else process.env.POORT_CLAUDE_MANAGED_DIR = old;
  }
});

test('claude-seat usage: tekst-tokens zijn totaal min denken, onbekend als de verdeling ontbreekt', async () => {
  const s = setup({ result: 'ok', usage: { input_tokens: 1, output_tokens: 100, output_tokens_details: { thinking_tokens: 60 } } });
  const r = await ask(claudeSeat('m', { bin: s.bin, env: s.env }));
  assert.deepEqual(r.usage.outputTokens, { total: 100, text: 40, reasoning: 60 });
  const t = setup({ result: 'ok' });
  const u = await ask(claudeSeat('m', { bin: t.bin, env: t.env }));
  assert.deepEqual(u.usage.outputTokens, { total: 7, text: undefined, reasoning: undefined });
});

// ---------- ronde 4 ----------

test('claude-seat: tools plus responseFormat json; het antwoord zonder tool volgt het JSON-schema', async () => {
  const schema = { type: 'object', properties: { pass: { type: 'boolean' } }, required: ['pass'], additionalProperties: false };
  const opts = { tools: TOOLS, toolChoice: { type: 'auto' }, responseFormat: { type: 'json', schema } };
  const s = setup({ result: '', structured_output: { action: { json: { pass: true } } } });
  const r = await ask(claudeSeat('m', { bin: s.bin, env: s.env }), opts);
  const sent = JSON.parse(flag(s.calls()[0].args, '--json-schema'));
  const alt = sent.properties.action.anyOf.find((o) => o.properties.json);
  assert.deepEqual(alt.properties.json, schema, 'het niet-tool-antwoord is het gevraagde schema');
  assert.ok(!sent.properties.action.anyOf.some((o) => o.properties.text), 'geen vrije tekst meer');
  assert.match(flag(s.calls()[0].args, '--system-prompt'), /"action":\{"json"/);
  assert.deepEqual(r.content, [{ type: 'text', text: '{"pass":true}' }]);
  assert.equal(r.finishReason.unified, 'stop');
  // Kiest het model toch een tool, dan blijft dat een tool-call.
  const t = setup({ result: '', structured_output: { action: { tool: 'click', input: { selector: '#a' } } } });
  const rt = await ask(claudeSeat('m', { bin: t.bin, env: t.env }), opts);
  assert.equal(rt.content[0].type, 'tool-call');
});

test('claude-seat: velden uit auth status worden geredigeerd, in fout, eigenschappen en doctor-reden', async () => {
  const token = 'sk-ant-oat01-AUTHVELDGEHEIM012345';
  const clean = (x) => !x.includes(token) && !x.includes('AUTHVELDGEHEIM') && !x.includes('LEKLEKLEKLEK');
  for (const st of [
    { loggedIn: true, authMethod: 'oauth_token', apiProvider: 'firstParty', apiKeySource: `helper ${token}` },
    { loggedIn: true, authMethod: 'sk-ant-api03-LEKLEKLEKLEK', apiProvider: 'firstParty' },
    { loggedIn: true, authMethod: 'oauth_token', apiProvider: `vertex ${token}` },
  ]) {
    const s = setup({ result: 'x' }, '', { CLAUDE_CODE_OAUTH_TOKEN: token, FAKE_CLAUDE_AUTH: JSON.stringify(st) });
    await assert.rejects(ask(claudeSeat('m', { bin: s.bin, env: s.env })), (e) => e.kind === 'auth' && clean(`${e.message} ${JSON.stringify(e)} ${e.authMethod} ${e.apiProvider}`));
    assert.ok(clean(judgeSeatAuth(st, { CLAUDE_CODE_OAUTH_TOKEN: token }).reason));
  }
});

test('claude-seat: afbreken en timeout stoppen de hele procesgroep, ook een kleinkind achter een wrapper', { skip: process.platform === 'win32' }, async () => {
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  const waitFor = async (fn, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (fn()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return fn();
  };
  for (const how of ['abort', 'timeout']) {
    const s = setup({}, 'sleep');
    const pidFile = path.join(s.dir, 'kleinkind.pid');
    s.fake({ FAKE_PID_FILE: pidFile });
    // Een wrapper die claude als kleinkind start en er niet door wordt vervangen.
    const wrap = path.join(s.dir, 'claude-wrap');
    fs.writeFileSync(wrap, `#!/bin/sh\n"$(dirname "$0")/claude" "$@"\nexit $?\n`, { mode: 0o755 });
    const ac = new AbortController();
    const p = claudeSeat('m', { bin: wrap, env: s.env, ...(how === 'timeout' ? { timeoutMs: 1500 } : {}) }).doGenerate({ prompt: [], abortSignal: ac.signal });
    assert.ok(await waitFor(() => fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8'), 5000), 'kleinkind gestart');
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    if (how === 'abort') ac.abort();
    await assert.rejects(p, (e) => (how === 'abort' ? e.name === 'AbortError' : e.kind === 'timeout'));
    assert.ok(await waitFor(() => !alive(pid), 4000), `kleinkind is gestopt (${how})`);
  }
});

test('claude-seat: een kleinkind dat SIGTERM negeert sterft ook als de aanroeper meteen daarna eindigt', { skip: process.platform === 'win32' }, async () => {
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  const s = setup({}, 'sleep');
  const pidFile = path.join(s.dir, 'koppig.pid');
  // Wrapper: auth-status gaat naar de nep-claude; voor de modelaanroep start hij een
  // kleinkind dat SIGTERM negeert en zijn pipes sluit, en stopt zelf op SIGTERM.
  const wrap = path.join(s.dir, 'claude-wrap');
  fs.writeFileSync(
    wrap,
    [
      '#!/bin/sh',
      'case " $* " in *" auth status"*) exec "$(dirname "$0")/claude" "$@";; esac',
      "trap 'exit 0' TERM",
      `"${process.execPath}" -e "process.on('SIGTERM',()=>{});require('fs').writeFileSync(process.argv[1],String(process.pid));setInterval(()=>{},1000)" "${pidFile}" </dev/null >/dev/null 2>&1 &`,
      'while :; do sleep 0.1; done',
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  // De aanroeper is een eigen proces dat eindigt zodra zijn event-loop leeg is.
  const module = new URL('../integrations/e2e-claude-seat.mjs', import.meta.url).href;
  const script = `const { claudeSeat } = await import(${JSON.stringify(module)});
try { await claudeSeat('m', { bin: ${JSON.stringify(wrap)}, env: JSON.parse(process.env.SEAT_ENV), timeoutMs: 1500 }).doGenerate({ prompt: [] }); }
catch (e) { process.stdout.write(String(e.kind)); }`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...s.env, SEAT_ENV: JSON.stringify(s.env) },
    encoding: 'utf8',
    timeout: 20000,
  });
  assert.equal(r.stdout, 'timeout', r.stderr);
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  // De aanroeper is al weg; het kleinkind mag hem niet overleven.
  await new Promise((res) => setTimeout(res, 300));
  assert.equal(alive(pid), false, 'koppig kleinkind leeft nog na het einde van de aanroeper');
});

test('claude-seat: zonder systeemprompt een korte, niet-lege; nooit witruimte (de API weigert dat)', async () => {
  const s = setup({ result: 'ok' });
  await ask(claudeSeat('m', { bin: s.bin, env: s.env }));
  await ask(claudeSeat('m', { bin: s.bin, env: s.env }), { prompt: [{ role: 'system', content: '   ' }, { role: 'user', content: [{ type: 'text', text: 'x' }] }] });
  for (const c of s.calls()) assert.ok(flag(c.args, '--system-prompt').trim().length > 0);
});

test('claude-seat: maxOutputTokens via CLAUDE_CODE_MAX_OUTPUT_TOKENS, alleen voor de modelcall; ongeldig geeft een waarschuwing', async () => {
  const s = setup({ result: 'kort' });
  const r = await ask(claudeSeat('m', { bin: s.bin, env: s.env }), { maxOutputTokens: 50 });
  assert.equal(s.calls()[0].env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '50');
  assert.equal(s.authCalls()[0].env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, undefined);
  assert.ok(!r.warnings.some((w) => w.feature === 'maxOutputTokens'));
  // Een eigen waarde uit de shell gaat niet mee (allowlist).
  const sh = setup({ result: 'x' }, '', { CLAUDE_CODE_MAX_OUTPUT_TOKENS: '99999' });
  await ask(claudeSeat('m', { bin: sh.bin, env: sh.env }));
  assert.equal(sh.calls()[0].env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, undefined);
  // Bereikt: de CLI meldt een fout zonder tekst; voor de SDK is dat length, geen kapotte call.
  const cut = setup({ is_error: true, stop_reason: 'stop_sequence', result: "API Error: Claude's response exceeded the 50 output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable." }, 'exit1');
  const rc = await ask(claudeSeat('m', { bin: cut.bin, env: cut.env }), { maxOutputTokens: 50 });
  assert.equal(rc.finishReason.unified, 'length');
  assert.deepEqual(rc.content, []);
  assert.ok(rc.warnings.some((w) => /maxOutputTokens \(50\) bereikt/.test(w.message)));
  const bad = setup({ result: 'x' });
  const rb = await ask(claudeSeat('m', { bin: bad.bin, env: bad.env }), { maxOutputTokens: 1.5 });
  assert.ok(rb.warnings.some((w) => w.type === 'unsupported' && w.feature === 'maxOutputTokens'));
  assert.equal(bad.calls()[0].env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, undefined);
});
