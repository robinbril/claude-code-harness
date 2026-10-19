---
name: polpohire-design
description: The current PolpoHire (Polpo) frontend-v4 design language, extracted verbatim from the redesign on branch codex/design-performance-polish. Bold, high-density, light indigo/violet theme with Apple-light shadows, a flat button system, one spring motion voice, and a status-quartet colour language. Use when building, restyling or reviewing any PolpoHire surface (the recruiter cockpit, the tenant-management cockpit, or an embedded panel) so it matches the product 1:1. Supersedes the older `polpodesign` skill; this one carries the exact token and component values.
---

# PolpoHire design language (polpohire-design)

The real, shipped Polpo look, read straight from the code so nothing is invented. When you build a Polpo surface you copy these values; you do not design a new language next to it. The failure this skill exists to prevent: a hand-rolled panel that looks childish and off-language because someone guessed at "clean" instead of matching the product.

Source of truth (frontend-v4, branch `codex/design-performance-polish`): `src/styles/theme.css` (tokens + components), `src/styles/customize.css` (loads AFTER theme, so its `:root` redefinitions of radius/font win), `src/styles/motion.css`, `src/styles/fonts.css`, `src/components/primitives/*.vue`, `src/views/candidates/import/ImportStep*.vue`. Verify against those before trusting memory.

## Philosophy

- Bold, high-density, **light** theme. Indigo/violet brand on near-white paper. It is confident and information-dense, not airy or minimal.
- **Apple-light shadows**: every elevation is two layers (a tight contact shadow + a broad soft ambient), ink tinted toward the brand hue, never above ~14% alpha. Cards gently float, never look like hard stickers.
- **One motion voice**: a single critically-damped spring, compositor-only (transform + opacity). Overshoot only for momentum gestures.
- **Tokens, never primitives.** Components reference semantic tokens (`--brand`, `--surface`, `--ok-ink`). A raw `--violet-600` or a hex in a component is a bug: the theme engine only re-derives semantic tokens per preset.
- UI font is **Inter**. ABC Arizona Flare is a separate, opt-in display face (not yet shipped; falls back to system).

## Tokens (authoritative values)

Colour, semantic (theme.css:29-48):
- `--bg:#f4f4fb; --surface:#fff; --surface-2:#fafaff; --border:#e7e7f1; --border-strong:#d6d6e6`
- `--brand:#5b50e6; --brand-strong:#4a3fd6; --brand-soft:#eef0ff; --brand-text:#4a3fd6`
- Text ramp: `--text:#1b1830; --text-2:#3c3858; --text-3:#6b6786; --text-faint:#8d89a6` (customize.css darkens text/-2/-3 one rung in light mode for contrast)
- **Status quartets** (each: base / -ink text / -soft bg / -line border): `--ok #15a05c / #0f7d47 / #e8f8f0 / #cdeedd`; `--warn #d97a06 / #a85d00 / #fff5e6 / #ffe8c7`; `--danger #e0454a / #c12f34 / #fff0f1 / #ffe0e2`; `--info #2f6feb / #1f57c7 / #eef4ff / #dbe7ff`; `--contract` (teal second series) `#19c5c0 / #0e7d79 / #e6faf9 / #c7f0ee`.

Type (theme.css:54-57): `--fs-display:38 --fs-xl:26 --fs-h1:21 --fs-num:30 --fs-h2:15 --fs-body:14 --fs-sm:13 --fs-xs:12 --fs-2xs:11` (px). Numbers use `.num` (`font-variant-numeric:tabular-nums`).

Space, 4-based (theme.css:60): `--s1:4 --s2:8 --s3:12 --s4:16 --s5:20 --s6:24 --s8:32`. (A compact density variant exists in customize.css:515: s2 6, s3 9, s4 12, s5 15, s6 18, s8 24, fs-body 13.)

Radius — **customize.css wins**, use these: `--r-sm:10 --r-md:14 --r-lg:20 --r-xl:28 --r-2xl:36 --r-pill:999` (px). Do NOT use theme.css's older 8/12/16.

Elevation (theme.css:67-72): `--shadow-ink:60,52,120`;
`--e1:0 .5px 1px rgba(var(--shadow-ink),.05), 0 4px 10px -3px rgba(var(--shadow-ink),.06)`;
`--e2:0 1px 2px .../ 0 10px 22px -6px .08`; `--e3:0 2px 6px .../ 0 26px 52px -14px .14`.
Focus ring: `--ring:0 0 0 3px var(--violet-200)` (#c7c9fb).

Motion (theme.css:72 + motion.css): `--dur-fast:120ms --dur:200ms --ease:cubic-bezier(.2,.7,.3,1)`; and the voice layer `--spring:cubic-bezier(.22,1,.36,1)` (calm, no overshoot), `--spring-pop:cubic-bezier(.34,1.3,.5,1)` (momentum only), `--dur-enter:230ms --dur-press:110ms`, stagger `50/100/150/200ms`. Keyframes: `m-rise` (opacity 0→1, translateY 6px→0), `m-materialize` (opacity + scale .96→1).

## Hard rules (each is a real incident)

1. **Semantic tokens only** on components, never a primitive or hex (tier badges are the sole hardcoded-hex exception).
2. **A `<button>` needs an explicit `color`.** `button{color:inherit}` is set globally; a bespoke button that sets its own background must also set `color`, or text falls back to UA black.
3. **Numbers are tabular** (`.num` / `font-variant-numeric:tabular-nums`) everywhere they change (stats, counts, prices, pager).
4. **Form labels are sentence case**, weight 600, `--text-2` — they read as text, not headings.
5. **No emoji as an icon.** Line icons via `Icon.vue`. `EmptyState` maps emoji props to line icons internally.
6. **Focus is visible**: `:focus-visible{outline:2px solid var(--brand);offset:2px}` globally; interactive controls use `box-shadow:var(--ring)` on focus.
7. **Hover is a subtle lift or tone-shift, active scales down** (`scale(.97)`/`.98`), transitions on transform/opacity only. Colour shifts are instant.
8. No em-dashes in copy. No supporting sub-copy under a heading unless it prevents a real mistake.

## Components (exact specs)

**Buttons — FLAT, `html .btn` (theme.css:453-491).** The gradient block in customize.css is neutralized by an `html .btn` specificity trick; the shipped button is flat.
- Base `.btn`: `height:40px; padding:0 13px; border-radius:var(--r-sm)(10px); font-weight:600; font-size:13px; letter-spacing:-.01em; border:1px solid transparent; background:color-mix(in srgb,var(--surface-2) 82%,var(--text) 5%); color:var(--text); box-shadow:none; gap:6px`. svg 16px. Hover: bg `color-mix(surface-2 70%,text 8%)`. Focus: `box-shadow:var(--ring)`. Active: `scale(.98)`. Disabled: `opacity:.5`.
- `.btn--primary`: `background:var(--brand); color:#fff` (FLAT, no gradient); hover `background:var(--brand-strong)`.
- `.btn--ghost`: transparent, `color:var(--text-2)`; hover `background:var(--surface-2)`. `.btn--danger-ghost`: transparent + `--danger-ink`; hover `--danger-soft`.
- Sizes: `--sm` 30px / fs-12; `--md` 34px; `--lg` 44px / padding 0 20 / fs-14.

**Card (theme.css:181-194).** `.card`: `surface + 1px border + var(--r-lg)(20px)`, flex column, `overflow:hidden`, no default shadow. `.card__head`: `padding:16px 20px; border-bottom:1px solid border; gap:8px`; `h2` fs-h2(15) weight 600, `letter-spacing:-.01em`. `.card__body`: `padding:12px 16px`. `.card__foot`: `padding:12px 20px; border-top:1px dashed border; fs-xs; text-3`. `.card__count` pill: fs-xs weight 800, surface-2, border, pill.

**Fields / inputs (theme.css:642-678).** `.fld`: flex column gap 6px. `.fld__lbl`: fs-xs weight 600 text-2. `.inp`: `height:40px; padding:0 12px; border:1px solid border; border-radius:var(--r-md)(14px); background:surface; font-size:fs-sm(13)`; focus `border-color:brand; box-shadow:var(--ring)`. `textarea.inp`: min-height 72, padding 10 12. `.seg` segmented: surface-2 + border + r-md + 3px pad; `button.is-on` brand bg #fff + e1. `.hint`: brand-soft bg + brand-tinted border + r-md + fs-xs.

**Pills / badges / chips / markers (theme.css:265-306, 582-593).**
- `.pill` (StatusPill/StagePill): `height:24px; padding:0 10px; border-radius:pill; font-size:11; weight:700; border:1px solid border-strong; bg surface-2; color text-2`. Stage variants use status quartets; interview/nego/contract use brand-soft + brand-strong.
- `.badge` (7-colour): `height:22px; padding:0 9px; pill; fs-11 weight 700`; gray/green/amber/red/blue/indigo(brand) via quartets.
- `.chip` (header urgency): `height:28px; padding:0 11px; pill; fs-12 weight 700`; danger/warn/info/ok/muted quartets.
- `.prio`: `min-width:30px; height:22px; radius:7px(literal); fs-11 weight 900`.
- `.tier`: `height:22px; pill; fs-11 weight 800` — the one place with hardcoded hex (diamond/platinum/gold/silver/bronze).
- **`.mom__dot` marker**: a `9px` circle with a **3px soft-colour halo** (`box-shadow:0 0 0 3px var(--<hue>-50)`), label fs-11 weight 700. This is the product's dot marker — small with a halo, never a big filled disc.

**StatTile (theme.css:570-576).** `.stat`: surface + border + r-lg(20) + padding 20. `.stat__label`: fs-2xs(11) uppercase, `letter-spacing:.06em`, weight 800, text-3. `.stat__val.num`: fs-num(30) weight 800, `letter-spacing:-.02em`, tabular. `.stat__sub`: fs-xs text-3. Grid `.statrow`: `repeat(4,1fr) gap 16`.

**ProgressBar (theme.css:219-223).** Track: `height:10px; border-radius:pill; background:color-mix(border 70%,surface-2); overflow:hidden`. Fill: `linear-gradient(90deg,var(--brand),var(--brand-strong))`; signal `--ok` green gradient, `--warn` amber, `--bad` red. Optional 2px pace marker.

**List rows (theme.css:245-263).** `.row`: `padding:11px 16px; border-bottom:1px solid border; hover bg surface-2`. `.row__title` weight 700 fs-sm; `.row__sub` fs-xs text-3. `.row__chevron` slides `translateX(3px)` + brand on hover.

**Nav (theme.css:108-116).** `.nav a`: `padding:8px 12px; border-radius:pill; fs-sm weight 600 text-2`; hover surface-2; `.is-active` brand-soft bg + brand-strong text.

**SelectMenu, DataTable, EmptyState, PageHead, Pager, ScoreRing**: self-contained primitives; match their real specs (SelectMenu btn pill 32px / field 40px, panel glass blur 24 + r-lg; DataTable thead sticky surface-2 uppercase fs-11 weight 800, td padding 11 16, row hover surface-2; EmptyState centred padding 32 20 icon 30; PageHead h1 `clamp(1.3rem,1.9vw,1.5rem)` weight 650 `letter-spacing:-.025em`; ScoreRing stroke `size*0.1`, count-up 780ms easeOutCubic). Read the file before restyling one.

## Progress / process panels (the deploy-panel analog)

The product's live-process + result pattern (`ImportStepProcess.vue`, `ImportStepReport.vue`) is the template for any "run something, show steps, show result" surface:
- Wrapper `.import-step`: flex column, `gap:var(--s5)(20px)`. Title fs-h1(21) weight 800. Hint fs-sm text-3 (negative top margin to sit under the title).
- A process bar block: `flex column gap 6px`; head row `space-between`, fs-sm weight 700, count as `{done} / {total}` in `.num`; the ProgressBar with `signal="ok"` (green) for the success track.
- Actions row: `.btn` (pause/secondary) + `.btn--primary` (resume/primary), `gap:var(--s3)`.
- Result: a `repeat(4,1fr)` grid of `.stat`-style cards (created/updated/skipped/errors) + a DataTable with status `.badge`s (green/blue/amber/red). Chips for filters: `.dryrun-chip` h28 pill, `.is-active` brand-soft.
- For a step ladder, `ImportStepper.vue` is the reference: a 26px dot `background:var(--surface-2); border:1px solid var(--border)`; done/active dot `background:var(--brand); border-color:var(--brand); color:#fff` (brand, NOT green); check icon 13px; label fs-sm weight 600, done→text-2, active→brand-text; 1px connector rule `var(--border)`, brand when done; `align-items:center` so label sits on the dot axis.

## Verification (before "done")

- Every colour resolves to a semantic token; grep the diff for raw `--violet-`/`--ink-`/hex on text.
- Numbers tabular; labels sentence case; icons are line icons.
- Buttons flat (no gradient/sheen), 40px base, `scale(.98)` active, `--ring` focus.
- Markers small (dot+halo) or brand step-dots, never big saturated discs. Green/red reserved for status tints, not decoration.
- Vertical rhythm on the space scale; card padding 16/20; field gaps 6, group sep 16.
- Machine-render with skill `render-proof` and read a concrete value back (a size, a token colour, an alignment) against the spec above. Alignment: labels centred on their marker axis.
