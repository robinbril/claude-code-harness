---
name: humanizer
version: 5.0.0
description: >
  Make text sound human-written by removing AI patterns (em dashes, sycophancy, rule-of-three,
  inflated significance, promotional language) and rewriting toward a named voice profile.
  Activate when editing, reviewing, or rewriting any text that reads like AI output.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
---

# Humanizer: Remove AI Writing Patterns

Based on Wikipedia's "Signs of AI writing" (WikiProject AI Cleanup), extended with the structural tells that word lists cannot catch. The numbered lexical patterns with before/after examples live in [`PATTERNS.md`](PATTERNS.md); this file carries the process, the modern structural tells, and the voice mechanism.

**This file is the mechanism, not anyone's style.** Which tells to remove is general knowledge. How a specific person sounds is data, and it lives in a voice profile (see THE VOICE LAYER). Never hardcode one writer's habits, closing formulas, or vocabulary into this skill: it makes the skill unshareable and quietly turns one person's preference into a universal rule.

## Your Task

When given text to humanize:

1. **Identify AI patterns** - lexical (PATTERNS.md) and structural (MODERN TELLS below)
2. **Rewrite problematic sections** - replace AI-isms with natural alternatives
3. **Preserve meaning** - keep the core message intact
4. **Match the voice** - load the writer's profile and rewrite toward it, not toward a generic "clean"
5. **Add soul** - don't just remove bad patterns; inject actual personality
6. **Audit before delivering** - the reading test plus a blind read, per Process

---

## THE VOICE LAYER

Removing tells gives you clean. Clean is not the same as *theirs*. Sterile and voiceless is just as recognizable as slop, so the rewrite needs a target.

### Finding the profile

Resolve in this order, stop at the first hit:

1. **A sample or path in the request.** "Here's how I write: ..." or a file path. Use it directly.
2. **A named voice:** `~/.claude/voices/<name>.md`. Glob that directory when the text is being written *for* or *signed by* someone. One file per voice.
3. **The operating manual.** If CLAUDE.md or a project's instructions name a default voice profile, that is the default for anything the user sends or signs.
4. **Nothing found.** Fall back to the natural default below, and say which fallback you used. Do not invent a profile, and do not silently promote your own preferences into one.

Registers matter: a profile may define several (public writing, a message to one person, mail), and they legitimately contradict each other. Pick by audience before you apply a single rule from it. A profile's own precedence note wins over anything here.

### Reading a profile

Note before rewriting: sentence-length pattern, word-choice level (casual to academic), how paragraphs start, punctuation habits, recurring phrases and verbal tics, transitions, and what the writer never does. Then replace AI-isms with patterns *from that profile*, not with your own defaults. If they write short sentences, don't produce long ones. If they use `stuff` and `things`, don't upgrade to `elements` and `components`.

### Writing a profile

A profile is evidence, not preference. Keep it to what can be traced to real text:

- **Baseline:** measured facts (median sentence length, opener habit, language mix), with the corpus size they came from.
- **Corpus:** real sentences the person actually wrote. This does the heavy lifting; a handful of genuine lines beats any list of adjectives.
- **Registers:** one section each, with a precedence table if they conflict.
- **Never-list:** what this person demonstrably does not write.
- **Zo wel / zo niet:** paired examples, the wrong one and their real one.

When a line can no longer be traced to a real message, delete it rather than keep it as folklore.

### Sourcing a corpus (the two ways this goes wrong)

**1. Sent is not written.** A modern sent folder is contaminated: automated outreach, templated campaigns, and AI-assisted letters all sit under the person's own name. Feed those into a profile and you calibrate the writer toward the exact slop this skill removes. Validate every sample before it counts. Signals that a text was generated rather than typed: a machine-regular send cadence, one template with only a name swapped, perfect parallel structure, no concrete detail that could not have been scraped, and zero typos across a long text. Signals that a human typed it: a reason given where none was owed, a specific detail only they could know, and usually one typo. When a person's formal or legal writing suddenly gains a register that appears nowhere else in their corpus, that is the tell, not their range.

**2. One channel is not the voice.** Habits measured in chat do not transfer to mail, and vice versa. A rule like "never uses bullet lists" is true of the channel it was measured in and quietly false everywhere else. Note the channel and the sample size next to every claim, and never promote a single-channel finding to a universal rule.

Both failures look identical from the inside: a confident, specific, wrong line in a profile. The fix is the same: cite the evidence next to the claim, so the next reader can check it instead of trusting it.

### The natural default (no profile)

Have opinions, react to facts instead of listing them. Vary the rhythm: short punchy sentences, then longer ones that take their time getting where they're going. Acknowledge complexity (`This is impressive but also kind of unsettling` beats `This is impressive`). Use "I" where it fits. Let some mess in: tangents, asides, half-formed thoughts. Be specific about feelings, not `this is concerning` but the concrete thing that unsettles you.

**Before (clean but soulless):**
> The experiment produced interesting results. The agents generated 3 million lines of code. Some developers were impressed while others were skeptical. The implications remain unclear.

**After (has a pulse):**
> I don't know how to feel about this one. 3 million lines of code, generated while the humans presumably slept. Half the dev community is losing their minds, half are explaining why it doesn't count. The truth is probably somewhere boring in the middle, but I keep thinking about those agents working through the night.

---

## MODERN TELLS (2025-2026): structure beats vocabulary

The word lists in PATTERNS.md catch last-generation slop (`delve`, `tapestry`, the em dash). By 2025 the giveaway moved. A text can contain zero banned words and still scream AI, because the tell is now in the **rhythm, the structure, and the performed humanity**. This is the part a regex cannot see and you must judge by reading.

The `humanizer-guard` hook blocks or warns on the lexical tells and a few structural ones before a file write. Your job here is the rest: the shape of the thing.

### A. Rhythm and structure

1. **Metronomic sentences (low burstiness).** AI holds a steady sentence length. Humans swing wildly: a two-word sentence, then a thirty-word one. If every sentence is 12-20 words, that is the tell. Fix: cut one to three words, let another run long. This is the single highest-yield edit, see MEASURE IT below.
2. **Symmetric paragraphs.** Every paragraph 2-3 sentences, all roughly equal. Real writing has a one-line paragraph next to a six-line one because the content demanded it.
3. **The 4-beat paragraph.** `claim, expand, concede, resolve` in every paragraph, each tied off with a neat conclusion. Humans leave paragraphs open, start with the concession, or never resolve because they have not resolved it themselves.
4. **The founder-post arc.** `one-line hook, white line, three staccato lines, "here's the thing", the lesson, a list, a closing question`. ~91% of AI LinkedIn posts use one-sentence-per-line with blank-line spacing; ~73% use a permission phrase. If a post snaps onto this skeleton it reads as AI even when every word is fine. Merge lines into real paragraphs, drop the bridge, kill the closing question.
5. **Fragment-for-effect spam.** A short fragment as a punchline (`Every time.` / `Dat is het probleem.`) is fine once. As a recurring beat it is the tell. Fold most of them back into the sentence before them.
6. **Tricolon reflex.** `fast, reliable, and scalable` / `snel, eenvoudig en efficiënt`. Three is the AI default. Use two when two is true, or four, or a real clause. The third item is usually empty.

### B. Manufactured tension

- **Self-answering rhetorical question:** `But what makes a recruiter effective? Empathy, data, and speed.` Nobody asked. Cut the question, or ask a real one and leave it open.
- **False-tension bridges:** `here's the thing`, `en dan het mooiste:`, `hier wordt het interessant`, `wat de meeste mensen niet weten`. Deletes cleanly every time.
- **It's-not-X-it's-Y:** `Het gaat niet om harder werken, maar om slimmer werken.` The most-cited structural tell of 2025-2026: it manufactures false profundity by framing everything as a surprising reframe, and it measurably hurts recall because the reader anchors on what the thing is *not*. Say the Y directly.
- **Hook-pivot-payoff escalation:** mild claim, pivot, grand reveal. Humans give concrete evidence at each step, or go from grand to specific.

### C. Performed humanity (the tell that fools people)

AI now imitates "authentic". The imitation is itself a tell.

- **Fake candor:** `Laten we eerlijk zijn,` / `I'll be honest,` followed by something safe. Real candor is specific and a little uncomfortable: name the thing you actually got wrong, with details.
- **Observer opener:** `Het idee dat me niet meer losliet:` / `I've been thinking a lot about...` followed by a perfectly tidy four-point argument. If you had really been chewing on it for weeks, the result would be messier.
- **No lived specifics.** A "personal" piece with zero names, dates or concrete moments is a vacuum. `In het gesprek met Joost bleek dat zijn team de tool na week 2 niet meer opende` beats any amount of `ervaring leert dat...`.
- **Everything resolved.** AI ties every piece off with a conclusion or recommendation. Real writers sometimes end in doubt, or on a question they cannot answer.
- **No tangents.** Every sentence marches to the next relevant point. A human wanders once, drops an aside that does not serve the structure, then comes back.
- **Vague poetic filler:** `a deeper truth about connection`, personified abstractions (`de data vertelt ons`). If a metaphor is not specific enough to be wrong, cut it.

### D. Translation artefacts (any non-English text)

Models are trained overwhelmingly on English. A prompt in another language is processed through English patterns and rendered back, so the tells in that language are mostly **English structure wearing local words**. This is a language fact, not a style preference, and it applies to every writer.

For Dutch specifically, patterns 30-35 in [`PATTERNS.md`](PATTERNS.md) cover it: the English-style dash, the Oxford comma before `en`, title case in headings, `cruciaal`/`diepgaand` as translation reflexes, hollow openers like `in de snel veranderende wereld van`, and clickbait register that no Dutch professional uses. Check them whenever the output is not English.

### E. What the tells are worth (do not over-trust them)

- **Absence of a tell proves nothing.** Since November 2025 ChatGPT honors instructions to drop em dashes, so a clean text is not evidence of a human. Keep removing them, stop reading their absence as a pass.
- **One signal is noise, a cluster is a signal.** Real humans write `crucial` and use three-item lists. Only flag a pattern when several co-occur, or the fix would improve the sentence anyway.
- **Do not optimize against detectors.** Vendors claim 99% accuracy; the independent RAID benchmark measures 15-23 points lower, and Originality drops to ~32% on GPT-5 output. Tuning against a broken instrument is not a quality gate. The gate is whether the named writer could send the text unedited.

---

## MEASURE IT (cheap checks that beat self-assessment)

Reading your own draft "as the reader" is the weakest link in this whole skill: the writer cannot see its own rhythm. Two things are cheap and objective.

**1. Sentence-length spread.** Count words per sentence. If the median sits between 12 and 20 and the spread is narrow, it is a metronome regardless of how it feels. One-liner over a draft:

```bash
python -c "import re,sys,statistics as s; t=open(sys.argv[1],encoding='utf-8').read(); L=[len(x.split()) for x in re.split(r'(?<=[.!?])\s+',re.sub(r'\`\`\`[\s\S]*?\`\`\`','',t)) if x.strip()]; print('n',len(L),'median',s.median(L),'stdev',round(s.pstdev(L),1),'min',min(L),'max',max(L))" draft.md
```

Run it on the prose itself. Tables, headings and lists count as "sentences" and will inflate the spread into a false pass. Look at the spread, not a magic threshold: a human paragraph usually holds a sub-5-word sentence and a 30-plus one. If min and max sit inside 8-22, rewrite the rhythm before anything else. Structural rhythm work is where the leverage is; the one skill that validated against real detectors found sentence-rhythm restructuring alone accounts for roughly 90% of the achievable improvement.

**2. Repeated openers and n-grams.** Scan the first two words of each sentence and each paragraph. AI repeats them (`This approach`, `Dit betekent`, `Daarnaast`). Higher-order n-gram repetition is the strongest single detectable feature in the literature, and it is free to check by eye.

Do not compute perplexity or a "score". It needs a model, the numbers are not comparable across texts, and it would only tell you what the reading test already tells you.

---

## THE READING TEST (audit gate)

After a draft, read it as the reader. If any answer is no, it is still AI:

1. Does the sentence length actually vary, or is it a metronome? (Measure it, don't estimate.)
2. Is there one concrete, checkable detail (a name, a number, a real moment) a generator could not have invented?
3. Does it avoid the founder-post arc, the closing question, and the tidy bow?
4. Could the named writer send this unedited, or does it read as a cleaned-up version of them?

Context: high-AI-polish LinkedIn posts get ~0.4% engagement, visibly imperfect human posts about 5x more. Polish is not the goal.

---

## Process

Two passes, then an audit. Done means the reading test passes and the audit finds no remaining tells, not "the obvious three are gone".

1. Read the input carefully.
2. **Voice:** resolve the profile (THE VOICE LAYER) before rewriting, so the rewrite has a target instead of a direction.
3. **Pass 1, lexical:** open [`PATTERNS.md`](PATTERNS.md) and walk every numbered pattern. Each one is checked, not just the famous ones. Non-English text: include 30-35. Formal or B2B copy: pay extra attention to 36-40, the patterns a professional human editor strikes first (staccato fragments, register-mismatched metaphors, ungrounded absolutes, sections without back-references, example churn).
4. **Pass 2, structural:** apply MODERN TELLS. Fix the rhythm, break the arc, cut the manufactured tension and performed candor, add one concrete checkable detail, allow a tangent or an unresolved ending.
5. Present a draft.
6. **Self-audit.** Prompt: "What makes the below so obviously AI generated?" Answer honestly, then apply the reading test as the pass/fail gate.
7. Revise. Prompt: "Now make it not obviously AI generated."
8. **Blind read (for anything that ships: external mail, published copy, client-facing text).** Spawn a subagent with no session context. Give it *only* the final text and this question, nothing about how it was made:

   > Is this written by a human or an AI? What specifically gives it away? Quote the lines.

   A fresh reader catches what the writer has gone blind to. If it names a tell, fix that tell and re-run. This is the only check in this file that the drafting model cannot fool itself on.
9. Present the final version.

## Output Format

1. Draft rewrite
2. "What makes the below so obviously AI generated?" (brief bullets)
3. Final rewrite
4. Summary of changes (optional, if helpful)

A fully worked example lives at the end of [`PATTERNS.md`](PATTERNS.md).

---

## Reference

Based on [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), maintained by WikiProject AI Cleanup. Key insight: "LLMs use statistical algorithms to guess what should come next. The result tends toward the most statistically likely result that applies to the widest variety of cases."

Detection research backing the structural sections: burstiness and perplexity as detector features (GPTZero), surprisal-variance formalization of "metronomic rhythm" (DivEye, arXiv 2509.18880), n-gram order as the strongest single feature (arXiv 2304.04736), and the RAID benchmark for the gap between detector claims and reality.
