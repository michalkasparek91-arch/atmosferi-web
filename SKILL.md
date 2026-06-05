---
name: atmosferi-design
description: Use this skill to generate well-branded interfaces and assets for Atmosferi, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Fast orientation
- `README.md` — brand context, content fundamentals, visual foundations, iconography, file index. **Read this first.**
- `colors_and_type.css` — every design token (color, type, spacing, motion) as CSS vars + helper classes. Link this and you inherit the system.
- `preview/` — 22 specimen cards showing each token/component in isolation.
- `ui_kits/website/` — interactive studio-site recreation; lift components from here.
- `assets/` — `logo.svg`, `logo-reversed.svg`.

## The five rules to never break
1. **Monochrome interface.** Pure black `#000` on warm off-white `#F2F1EC`. No accent color — color lives only in photography.
2. **Zero radii, zero shadows.** Everything sharp and flat. Structure comes from 1px lines.
3. **Extreme type tension.** Geist; macro titles to ~160px (leading 0.85, tracking -0.03em) beside 9–10px uppercase mono metadata (tracking 0.2em, neutral-500), baseline-aligned.
4. **Editorial silence.** Cavernous vertical spacing on an 8px grid.
5. **The Atmosferi Curve** for all motion: `cubic-bezier(0.76, 0, 0.24, 1)`. Cinematic grayscale→color reveals; 8s linear auto-scroll.
