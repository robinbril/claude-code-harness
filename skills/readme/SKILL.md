---
name: readme
description: Layout, wording and visuals for a README and the one-line GitHub repo description - problem first, plain language, custom light/dark SVG images, verified in GitHub's own renderer. Use for /readme, a new README, a README overhaul or a repo description.
---

# README

A README has one job: a stranger understands in ten seconds what this is, why they want it and how to start. Facts come from the repo, words from the reader's world, visuals from a spec you can regenerate.

## 1. Collect facts first

Read manifests, entry points, install scripts, existing docs and the license files. Count what you will claim (skills, commands, checks) from the source, never from memory. Every link, command and version in the README must exist.

## 2. Tell it as a story

Use this order. Drop a section only when it has nothing true to say.

1. **Banner** with name, one-line promise and the 3 to 5 parts.
2. **The problem** in two or three sentences, in the reader's words: what goes wrong today.
3. **What you get**: one table, part and what you notice of it.
4. **How it works**: one flow visual, four to six steps.
5. **Install**: the shortest route first, one command per block; the alternative after it.
6. **Featured**: the one thing people come for, with "you type / you get" examples.
7. **Reference**: tables per group (what, when). Names the reader types stay in backticks.
8. **How you know it works**: observable signs, not promises.
9. **Tradeoff**: when not to use it, honestly.
10. **Sources and licenses**: every borrowed part with link and license.

The problem, "how you know it works" and "tradeoff" sections follow the README of [andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills): naming the failure first is what makes a reader recognise themselves.

## 3. Plain language

- Write for a smart reader who is not a developer. Short sentences, active verbs.
- A technical term appears only when the reader has to type or recognise it; explain it once in a few words ("hooks: small scripts that watch at fixed moments").
- No marketing adjectives, no em-dashes, no emoji unless the project uses them.
- Table columns answer "what" and "when", never restate the name.
- Numbers that can drift (counts, versions) live in text and badges, never inside images.

## 4. Repo description

The one line under the repo name on GitHub (About) and in package or plugin metadata.

- One sentence, at most about 140 characters: who it is for or what it becomes, then what is in it.
- Same promise as the banner tagline, in the same language as the README.
- Concrete nouns over adjectives; no "powerful", "simple" or "AI-powered".
- Changing the About text is public: show the old and new text and get a yes first, then `gh repo edit <eigenaar/repo> --description "<tekst>"` and read it back.

## 5. Visuals

Make banner and flows with `scripts/make_svgs.py` from a JSON spec; see `references/spec-voorbeeld.json` for the shape and `ICONS` in the script for icon names.

```bash
python3 <deze-skill-map>/scripts/make_svgs.py assets/visuals.json assets
```

- Commit the spec next to the SVGs (`assets/visuals.json`), so anyone can change a word and regenerate.
- Each SVG carries its own light and dark colours; no Mermaid for the main visuals.
- The script stops when a text will not fit. Shorten the text, do not shrink the font.
- Embed with `<img src="assets/x.svg" alt="what the image says" width="100%">`.
- Badges: shields.io for version, counts and license; the real CI badge when CI exists.

## 6. Verify

1. Render with GitHub's own markdown engine, light and dark, at 1012 and 390 px:

   ```bash
   node <deze-skill-map>/scripts/render_readme.mjs README.md <out-map> <eigenaar/repo>
   ```

   The report must say every image loads and nothing scrolls sideways.
2. `Read` the screenshots. Check the banner, the first table and one flow in both themes.
3. After pushing, open the README on GitHub itself and confirm every `assets/` image has loaded.

## Done when

- Every claim, count, link and command checked against the repo.
- Screenshots read in light and dark mode; the report is clean.
- The repo description matches the README's promise.
- A first-time reader can answer: what is it, why would I want it, how do I start.
