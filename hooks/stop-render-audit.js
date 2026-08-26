#!/usr/bin/env node
/**
 * stop-render-audit.js  (Stop)
 *
 * Blocks finishing a turn that changed markup or CSS without a render having been
 * looked at afterward. Motivation: a footer menu that rendered as two round 40px
 * pills because an existing selector in the same container forced width/height/
 * display. The HTML was verified, the render was not, and that gap is exactly
 * where visual bugs live.
 *
 * Order matters: a screenshot earlier in the session proves nothing about a CSS
 * change that came after it. So the check looks for a render fetched AFTER the
 * last visual edit.
 *
 * Fires at most once per session, so "I can't render here, I'll flag it as
 * unproven" always stays an escape hatch. Fail-open: any error in this guard lets
 * the session through.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch (_) { process.exit(0); }

const transcriptPath = input && input.transcript_path;
if (!transcriptPath || !fs.existsSync(transcriptPath)) process.exit(0);

// Scratch and archive dirs are throwaway; nothing there needs to render.
const EXEMPT = /[\\/](scratchpad|_archive|node_modules|\.git|dist|build)[\\/]/i;
const PURE_VISUAL = /\.(css|scss|sass|less|html|htm)$/i;
const COMPONENT = /\.(vue|jsx|tsx|svelte|astro)$/i;
// A component file only counts when the change was about appearance.
const STYLE_IN_COMPONENT = /class(Name)?\s*=|style\s*=|<style|:\s*(flex|grid|block|none|absolute|relative)\b|(margin|padding|width|height|color|background|border|font|transform|opacity|gap|z-index)\s*:/i;

const RENDER_TOOLS = /(claude-in-chrome|Claude_Browser|chrome-devtools|computer-use)__(computer|take_screenshot|screenshot)$/;
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;

function isRender(t) {
  if (!t || !t.name) return false;
  // Playwright/shoot.js is the reliable render gate. A Read of an image actually
  // shows the pixels to the model (just like a screenshot), so that counts as
  // "render looked at". Running shoot.js produces that PNG.
  if (t.name === 'Read') { const f = t.input && t.input.file_path; return !!(f && IMAGE.test(f)); }
  if (t.name === 'Bash') { const c = (t.input && t.input.command) || ''; return /shoot\.js\b/.test(c); }
  if (/take_screenshot|__screenshot$/.test(t.name)) return true;
  if (!RENDER_TOOLS.test(t.name)) return false;
  const action = t.input && t.input.action;
  return action === 'screenshot' || action === 'zoom';
}

function isVisualEdit(t) {
  if (!t || (t.name !== 'Write' && t.name !== 'Edit')) return false;
  const f = t.input && t.input.file_path;
  if (!f || EXEMPT.test(f)) return false;
  if (PURE_VISUAL.test(f)) return true;
  if (!COMPONENT.test(f)) return false;
  const content = (t.input.content || '') + (t.input.new_string || '');
  return STYLE_IN_COMPONENT.test(content);
}

let lastEdit = -1;
let lastRender = -1;
let lastExpectation = -1;
let renderAfterEditWithoutExpectation = false;
const files = new Set();

// The rule: a screenshot is only proof once the expectation is written down
// BEFORE looking (a number, label, or position). This detects an "EXPECT" line
// in assistant text; the check below requires it between the last visual edit
// and the render meant to prove it. "VERWACHT" stays matched for backward
// compatibility.
const EXPECTATION = /\b(EXPECT|VERWACHT(ING)?)\b\s*[:=]/i;

try {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    let e;
    try { e = JSON.parse(lines[i]); } catch (_) { continue; }
    const content = e && e.message && Array.isArray(e.message.content) ? e.message.content : [];
    const isAssistant = e && e.message && e.message.role === 'assistant';
    for (const c of content) {
      if (!c) continue;
      if (c.type === 'tool_use') {
        if (isVisualEdit(c)) { lastEdit = i; files.add(c.input.file_path); }
        // A render proves the edits before it: clear the pending set so that only
        // files changed AFTER the last render remain. Without this the guard would
        // dump the whole session history every turn, including long-rendered or
        // untouched files.
        else if (isRender(c)) {
          renderAfterEditWithoutExpectation =
            lastEdit !== -1 && lastEdit > lastRender && lastExpectation < lastEdit;
          lastRender = i; files.clear();
        }
      } else if (c.type === 'text' && isAssistant && EXPECTATION.test(c.text || '')) {
        lastExpectation = i;
      }
    }
  }
} catch (_) { process.exit(0); }

// Path 2: there WAS a render after the edit, but without a pre-written
// expectation. Softer than the render block: a one-time warning (no exit 2),
// because the render does exist; only the proof is weaker than the rule
// requires. Own marker so it disturbs the session only once.
if (lastEdit !== -1 && lastRender > lastEdit && renderAfterEditWithoutExpectation) {
  const sessionW = path.basename(transcriptPath, '.jsonl');
  const markerW = path.join(os.tmpdir(), `render-expectation-${sessionW}.txt`);
  try {
    if (!fs.existsSync(markerW) || Number(fs.readFileSync(markerW, 'utf8')) < lastRender) {
      fs.writeFileSync(markerW, String(lastRender));
      process.stderr.write(
        '[render-audit] Screenshot seen, but without a pre-written expectation. ' +
        'The rule: first "EXPECT: <number/label/position>", then look. ' +
        'Without an expectation a glance approves the work almost every time. Next visual check: expectation first.\n'
      );
    }
  } catch (_) {}
}

if (lastEdit === -1 || lastRender > lastEdit) process.exit(0);

// Once per session: the marker carries the line index of the edit that made it
// fire, so a later visual change in the same session gets checked again.
const session = path.basename(transcriptPath, '.jsonl');
const marker = path.join(os.tmpdir(), `render-audit-${session}.txt`);
try {
  if (fs.existsSync(marker) && Number(fs.readFileSync(marker, 'utf8')) >= lastEdit) process.exit(0);
  fs.writeFileSync(marker, String(lastEdit));
} catch (_) { process.exit(0); }

const list = [...files].slice(0, 5).map(f => '  ' + f).join('\n');
process.stderr.write(
  '[render-audit] You changed markup or CSS and did not look at a render afterward:\n' +
  list + '\n' +
  'The DOM or a grep proves nothing about layout. Render and LOOK, reliably via Playwright:\n' +
  '  node $HOME/.claude/claude-code-harness/scripts/shoot.js <url|file> <out.png> [selector] [width]\n' +
  '  then Read <out.png>  (with the expectation written down BEFORE).\n' +
  'Alternatively claude-in-chrome; force the state on hover or focus. ' +
  'Or state explicitly that it is unproven. This guard will not fire again for the same change.\n'
);
process.exit(2);
