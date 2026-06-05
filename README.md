# Atmosferi° — Design System

> Atmospheric design studio. Contemporary, minimal, light, bold — and chic.

Atmosferi is a (fictional/in-development) creative-technology studio working at the
intersection of **photography, spatial design, and interface**. The brand voice is
that of a precision instrument: severe Swiss typography, a strictly monochrome
interface, and color that enters the world *only* through the imagery the studio
captures. The result reads as luxury-technical — Vercel's developer-chic restraint
crossed with the editorial silence of a high-end print monograph.

This repository is a self-contained design system: foundations (color, type,
spacing, motion), brand assets, preview specimens, and a high-fidelity website UI
kit you can assemble real pages from.

---

## Sources

**No external resources were provided** — no codebase, no Figma file, no slide deck.
This system was authored entirely from the written brand manifesto supplied at
kickoff (references + architectural constraints). If you later have a Figma library,
production repo, or brand book, share the links and this system will be reconciled
against them.

- Codebase: _none provided_
- Figma: _none provided_
- Decks: _none provided_

---

## The Manifesto

### References (the benchmarks)
- **Antinomy Studio** — "Editorial Silence" (massive vertical spacing), asymmetric
  layouts, mathematically framed image containers.
- **Vercel / Linear** — developer-chic micro-typography, pure black / monochrome
  palette, physical hardware-like toggle switches.
- **Dieter Rams / Braun** — UI elements that behave like physical objects: the
  toggle track and the viewfinder crosshairs prioritise function over decoration.
- **International Typographic Style (Swiss)** — severe contrast in type scale (9XL
  titles beside 9px metadata), strict flush-left / flush-right grid alignment.

### Architectural constraints (non-negotiable)
1. **The Obsidian Palette.** Backgrounds are off-white; never dark gray for the
   canvas. **Shadows and radii are forbidden** — everything is mathematically sharp.
2. **Extreme Typographic Tension.** Macro titles up to 9XL in a rigid geometric
   sans, leading 0.85–1.0 so words stack like concrete blocks. Micro metadata at
   9–10px, `tracking 0.2em`, `neutral-500`, always baseline-aligned to the title.
3. **The Mathematical Grid.** Major sections divided by full-width 1px lines at 10%
   opacity. Flush alignment everywhere.
4. **Precision Kinetics.** All motion uses **the Atmosferi Curve**
   `cubic-bezier(0.76, 0, 0.24, 1)`. Media performs a **cinematic reveal**
   (desaturated → full color on hover). Vertical case images **auto-glide over 8s
   linear** on hover, simulating a live interface.

---

## CONTENT FUNDAMENTALS

How Atmosferi writes. Copy is part of the instrument — terse, declarative, confident.

- **Voice & person.** Third-person and imperative, rarely "we", almost never "you".
  The studio states facts about the work, it doesn't sell. _"Northbound. A film
  about distance."_ not _"We made an amazing film for you!"_
- **Tone.** Cold-precise but humane. Closer to a museum wall label or a camera spec
  sheet than to marketing copy. Confidence through brevity.
- **Casing.** Two registers only:
  - **Macro headlines** — sentence case or a single bold word (`Northbound`, `Fog`).
  - **Micro metadata** — `UPPERCASE`, wide-tracked, for indices, categories, dates,
    coordinates, technical specs (`CASE 014 · FILM · 2026`).
  Avoid Title Case. It reads corporate.
- **Numbers as texture.** Indices (`010`, `014`), years (`MMXXVI` or `2026`),
  coordinates (`N 45°27′ E 09°11′`), and camera specs (`F2.8 · 1/250 · ISO 100`)
  are used as *typographic material*, not data. Use them sparingly and only where
  they're real — never invent stats to fill space.
- **Punctuation.** The middot `·` separates metadata fields. The degree sign `°`
  is the brand's signature glyph (atmosphere, measurement) — it appears in the
  wordmark and may punctuate headlines. Em dashes for asides. No exclamation marks.
- **Length.** Headlines: 1–4 words. Body: 1–2 tight sentences, then silence.
  White space carries as much meaning as the words.
- **Emoji.** Never. Not part of the brand.
- **Vibe.** Imagine the index of an art monograph designed by an engineer.

Sample copy:
> **Atmosferi°** designs atmospheres. — Film, identity, and spatial systems for
> people who measure light. _Selected work, 2024–2026._

---

## VISUAL FOUNDATIONS

**Color.** Strictly monochrome interface: pure black `#000000` ink on a warm
off-white canvas `#F2F1EC`. A Vercel-lineage neutral ramp (`900→200`) handles
secondary text and hairlines; `neutral-500 #737373` is the metadata gray. **There
is no brand accent color.** Color is reserved exclusively for photography — the
interface stays achromatic so imagery does all the chromatic work.

**Type.** `Geist` (geometric sans, Vercel) for everything visible; `Geist Mono` for
metadata, code, and technical captions. Extreme scale tension: displays run to
~160px with leading `0.85` and tracking `-0.03em` (concrete-block stacking) while
metadata sits at 9–10px, `UPPERCASE`, tracking `0.2em`, muted. Body is 17px at
leading `1.55`. Helvetica Neue is the system fallback.

**Spacing.** 8px base grid. Vertical rhythm is intentionally cavernous — "editorial
silence." Section gaps reach `128–256px`. Horizontal page gutters use
`clamp(1.25rem, 4vw, 3.5rem)`; content frames to a `1440px` max width, flush-left.

**Backgrounds.** Flat off-white. No gradients, no textures, no patterns, no noise on
the *interface*. Imagery is full-bleed or held in mathematically precise containers.
Photography is the only "texture" the brand permits.

**Animation.** One easing curve only — the Atmosferi Curve
`cubic-bezier(0.76, 0, 0.24, 1)` (high-friction: slow-in, fast-middle, slow-out).
Durations: `0.2s` micro (button invert), `0.6s` standard (reveals, slide), `8s`
linear for the auto-scroll case images. No bounces, no springs, no parallax confetti.

**Hover states.** Buttons **invert** (black↔off-white) over 0.2s. Images perform the
**cinematic reveal** (grayscale→color) over 0.6s. Index rows **slide right** ~14px.
Links nudge their arrow `translateX(6px)`. Hover is purposeful, never decorative.

**Press states.** No scale-shrink, no shadow. Pressed = the inverted/active end-state
held. Physical controls (toggle) animate their knob across the track on the curve.

**Borders.** A single weight: `1px`. Three strengths — `rgba(0,0,0,0.10)` horizon
dividers, `rgba(0,0,0,0.24)` emphasis, and full `#000` ink rules. Borders, not
shadows, communicate structure and grouping.

**Shadows & elevation.** **None.** Forbidden. There is no elevation system — depth is
expressed through line weight, scale contrast, and negative space.

**Transparency & blur.** Used almost never. Overlaid metadata on imagery uses solid
ink chips (`background:#000; color:#F2F1EC`) rather than blur or scrims, keeping the
hard-edged precision. No frosted glass.

**Imagery vibe.** Atmospheric, large-format, cool-toned. Desaturated → full color on
interaction. Subjects: landscape, fog, water, architecture, light. (Preview cards
use Lorem Picsum placeholders — **replace with real studio photography**.)

**Corner radii.** `0` everywhere. No rounded anything.

**Cards.** "Cards" are defined by a `1px` hairline border or a horizon divider — no
fill change, no radius, no shadow. Often they are simply a region of the grid bounded
by rules, with baseline-locked metadata in the corners (see the viewfinder frame).

**Layout rules.** Flush-left bodies, flush-right metadata. Metadata baseline-aligns to
the title it annotates. Sticky/fixed elements (nav) are minimal hairline bars.
Asymmetry is encouraged; centered layouts are reserved for single-object moments
(e.g. the wordmark).

---

## ICONOGRAPHY

Atmosferi is **near-iconless by doctrine** — it favours typographic and geometric
marks over a pictographic icon set. The "icon" system is:

- **Functional glyphs drawn in CSS**, not images: the viewfinder **corner ticks** and
  **center crosshair** (1px lines), the **hardware toggle** knob/track, the spacing
  bars. These are constructed from borders/`::before`/`::after` — there are no icon
  PNGs or an icon font in this system.
- **Unicode marks used as iconography**, set in Geist Mono: the arrow `→` (navigation,
  links, "begin"), the degree `°` (the brand glyph), the middot `·` (metadata
  separator), the bullet `●` (status / "REC"), and `⊘` (the "forbidden" mark).
- **No emoji. No colored icons. No filled pictograms.**

If a project genuinely needs a UI icon the marks above can't express (search,
settings, close, chevrons), substitute **[Lucide](https://lucide.dev)** — thin
`1.5px` stroke, square caps, currentColor — at small sizes (`16–20px`), stroke in
`--ink` or `--neutral-500`. Load from CDN:
`<script src="https://unpkg.com/lucide@latest"></script>`. **This is a substitution,
not a brand decision** — flag it and prefer the native glyphs/marks first.

Brand marks live in `assets/`:
- `logo.svg` — `Atmosferi°` wordmark, ink on canvas.
- `logo-reversed.svg` — wordmark, canvas on ink.
(Both embed Geist via Google Fonts; render them in a browser context.)

---

## Fonts

`Geist` and `Geist Mono` are loaded from **Google Fonts** (confirmed available, OFL
licensed) via `@import` in `colors_and_type.css`. **Local font files are not bundled**
— for offline/production use, download the woff2 files from
<https://fonts.google.com/specimen/Geist> into `fonts/` and add `@font-face` rules.
Helvetica Neue / Arial are the metric-fallback stack.

---

## Index — what's in this folder

| Path | What it is |
|---|---|
| `colors_and_type.css` | **Start here.** All design tokens (color, type, spacing, motion) as CSS custom properties + semantic helper classes (`.atmos-display`, `.atmos-meta`, `.atmos-horizon`, `.atmos-reveal`…). |
| `assets/` | Brand marks — `logo.svg`, `logo-reversed.svg`. |
| `fonts/` | Drop local Geist woff2 here for offline use (see Fonts). |
| `preview/` | 22 design-system specimen cards (rendered in the Design System tab) + shared `card.css`. |
| `ui_kits/website/` | High-fidelity Atmosferi studio website recreation — `index.html` (interactive) + JSX components. See its own `README.md`. |
| `SKILL.md` | Agent-Skills manifest so this system can be used inside Claude Code. |
| `README.md` | This file. |

### Quick start
1. Link `colors_and_type.css`.
2. Set page `background: var(--canvas)`, text `color: var(--ink)`, font `var(--font-sans)`.
3. Build with the helper classes and the rules above. When in doubt: **sharp, flat,
   monochrome, silent, and let the photograph carry the color.**
