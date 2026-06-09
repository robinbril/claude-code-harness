#!/usr/bin/env node
/**
 * humanizer-guard.js
 * PreToolUse hook: scans Write/Edit content of prose files for AI writing patterns.
 *
 * Two tiers:
 *   - HARD tells  -> BLOCK the write (exit 2). The egregious slop never lands.
 *   - SOFT tells  -> warn only (exit 0). Common words that are usually but not
 *                    always slop; flagged so they can be reconsidered.
 *
 * Only scans prose files (.md/.txt/.rst/.mdx). Code regions are stripped first,
 * so tells inside fenced/inline code never trigger. Code, JSON, config are exempt
 * by extension. Matches Robin's CLAUDE.md humanizer rules.
 */

// Egregious tells -> block. Keep this list tight to avoid false-positive blocks.
const HARD_PATTERNS = [
  { pattern: /—/g, label: 'em dash' },
  { pattern: /^(Great question|Certainly|Absolutely|Of course|Goede vraag|Zeker|Absoluut)[!,]/gim, label: 'sycophantic opener' },
  { pattern: /\bdelve\b/gi, label: '"delve"' },
  { pattern: /\b(tapestry|treasure trove)\b/gi, label: '"tapestry / treasure trove"' },
  { pattern: /\bnot only\b[^.\n]{0,60}\bbut also\b/gi, label: 'negative parallelism (not only...but also)' },
  { pattern: /\ba testament to\b/gi, label: '"a testament to"' },
  { pattern: /\bever-evolving\b/gi, label: '"ever-evolving"' },
  { pattern: /\b(in|across) the realm of\b/gi, label: '"in the realm of"' },
  { pattern: /\b(harness|unlock) the (power|potential)\b/gi, label: '"unlock the potential"' },
  { pattern: /\b(revolutioni[sz]e|supercharge|turbocharge)\b/gi, label: '"revolutionize/supercharge"' },
  { pattern: /\bhet is belangrijk om\b/gi, label: '"het is belangrijk om..."' },
  { pattern: /\bin de wereld van\b/gi, label: '"in de wereld van"' },
];

// Usually-slop words -> warn. Common enough that a hard block would over-fire.
const SOFT_PATTERNS = [
  { pattern: /\brobust\b/gi, label: '"robust"' },
  { pattern: /\bleverage\b/gi, label: '"leverage"' },
  { pattern: /\bstreamline\b/gi, label: '"streamline"' },
  { pattern: /\bseamless(ly)?\b/gi, label: '"seamless(ly)"' },
  { pattern: /\bcomprehensive\b/gi, label: '"comprehensive"' },
  { pattern: /\butili[sz](e|es|ing|ed)\b/gi, label: '"utilize"' },
  { pattern: /\bfacilitate\b/gi, label: '"facilitate"' },
  { pattern: /\bfoster\b/gi, label: '"foster"' },
  { pattern: /\bmyriad\b/gi, label: '"myriad"' },
  { pattern: /\bplethora\b/gi, label: '"plethora"' },
  { pattern: /\belevate\b/gi, label: '"elevate"' },
  { pattern: /\b(cutting-edge|state-of-the-art)\b/gi, label: '"cutting-edge"' },
  { pattern: /\bgame[- ]changer\b/gi, label: '"game changer"' },
  { pattern: /\b(deep dive|dive into)\b/gi, label: '"dive into / deep dive"' },
  { pattern: /\bpivotal\b/gi, label: '"pivotal"' },
  { pattern: /\bplays? a (pivotal|crucial|key|vital) role\b/gi, label: '"plays a crucial role"' },
  { pattern: /\bembark\b/gi, label: '"embark"' },
  { pattern: /\bnavigat(e|ing) the\b/gi, label: '"navigating the"' },
  { pattern: /\bit'?s worth noting\b/gi, label: '"it\'s worth noting"' },
  { pattern: /\bit'?s important to (note|understand|remember)\b/gi, label: '"it\'s important to note"' },
  { pattern: /\bimportantly,\b/gi, label: '"Importantly,"' },
  { pattern: /\b(in summary|in conclusion|to summari[sz]e),?\b/gi, label: '"in summary/conclusion"' },
  { pattern: /\b(furthermore|moreover),?\b/gi, label: '"furthermore/moreover"' },
  { pattern: /\bthat being said\b/gi, label: '"that being said"' },
  { pattern: /\bneedless to say\b/gi, label: '"needless to say"' },
  { pattern: /\bwhen it comes to\b/gi, label: '"when it comes to"' },
  { pattern: /\brest assured\b/gi, label: '"rest assured"' },
  { pattern: /\bplease keep in mind\b/gi, label: '"please keep in mind"' },
  { pattern: /\bthis approach enables\b/gi, label: '"This approach enables"' },
  // NL slop
  { pattern: /\bnaadlo(os|ze)\b/gi, label: '"naadloos"' },
  { pattern: /\brobuust\b/gi, label: '"robuust"' },
  { pattern: /\becosysteem\b/gi, label: '"ecosysteem"' },
  { pattern: /\bmoeiteloos\b/gi, label: '"moeiteloos"' },
  { pattern: /\b(baanbrekend|ongekende?)\b/gi, label: '"baanbrekend/ongekend"' },
  { pattern: /\b(uiteraard|simpelweg)\b/gi, label: '"uiteraard/simpelweg"' },
  { pattern: /\b(kortom|kort samengevat)\b/gi, label: '"kortom"' },
  { pattern: /\bwanneer het aankomt op\b/gi, label: '"wanneer het aankomt op"' },
  { pattern: /\been schat aan\b/gi, label: '"een schat aan"' },
];

function scan(prose, patterns) {
  const hits = [];
  for (const { pattern, label } of patterns) {
    const m = prose.match(pattern);
    if (m) hits.push(`${label} (${m.length}x)`);
  }
  return hits;
}

let input = '';
process.stdin.on('data', chunk => (input += chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const toolName = data.tool_name || '';
    if (!['Write', 'Edit'].includes(toolName)) {
      process.stdout.write(input);
      return;
    }

    const content = data.tool_input?.content || data.tool_input?.new_string || '';
    const filePath = data.tool_input?.file_path || '';
    if (!/\.(md|txt|rst|mdx|html?)$/i.test(filePath)) {
      process.stdout.write(input);
      return;
    }

    // Strip code regions so tells inside them never fire. For HTML, also drop
    // <style>/<script>/comments so CSS/JS class names and config don't trigger
    // soft-warnings; em dashes in real prose still get caught.
    const prose = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^~~~[\s\S]*?^~~~/gm, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/`[^`\n]*`/g, '');

    const hard = scan(prose, HARD_PATTERNS);
    const soft = scan(prose, SOFT_PATTERNS);

    if (soft.length) {
      process.stderr.write(`[humanizer-guard] soft AI tells in ${filePath}:\n`);
      soft.forEach(h => process.stderr.write(`  - ${h}\n`));
    }

    if (hard.length) {
      process.stderr.write(`[humanizer-guard] BLOCKED ${filePath} — hard AI tells:\n`);
      hard.forEach(h => process.stderr.write(`  - ${h}\n`));
      process.stderr.write(`[humanizer-guard] Rewrite without these (comma/period instead of em dash, drop the slop). Code and inline-code are already exempt. If truly intentional, disable this hook in settings.json.\n`);
      process.exit(2);
    }

    if (soft.length) {
      process.stderr.write(`[humanizer-guard] (non-blocking) apply the humanizer pass before this lands.\n`);
    }
  } catch (_) {}

  process.stdout.write(input);
});
