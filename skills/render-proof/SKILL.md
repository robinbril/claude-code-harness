---
name: render-proof
description: Render a web page or local HTML file headless to PNG with Playwright, full page or one element, at a chosen width, and read the expected fact off the image. Use to prove a UI change visually before calling it done, at 1440, 768 and 390 wide, or when another skill asks for a render proof.
---

# Render proof

A DOM read proves nothing about layout. A real render does. This skill renders a URL or a local file headless and saves a PNG you read back.

## Steps

1. Write the expected fact first: a number, a label, a position. "Looks right" is not a fact.
2. Render with the script in this skill's folder:

   ```bash
   node <deze-skill-map>/scripts/shoot.js <url|bestand> <out.png> [selector] [breedte]
   ```

   - Full page: leave out `selector` or pass `""`.
   - One element sharp: pass a CSS selector, for example `"#hero"`.
   - Width: default 1280. For a UI change render 1440, 768 and 390.
3. `Read` each PNG and check the expected fact. A mismatch is a code fix, not a note.

## Requirement

Playwright with Chromium. In the project: `npm i -D playwright` and `npx playwright install chromium`. The script also finds a Playwright install in your home folder (`~/node_modules`).

## Limits

- Logged-in pages, hover or drag state: use the user's own browser, not this headless render.
- Never render pages with client, candidate or other personal data for a model outside your own Claude seat.
