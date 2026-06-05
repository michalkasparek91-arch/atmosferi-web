# UI Kit — Atmosferi Studio Website

A high-fidelity, interactive recreation of the Atmosferi° studio marketing site,
built to demonstrate the design system in a real layout. It is a cosmetic prototype
— routing and forms are faked — not production code.

## Run it
Open `index.html`. Everything loads from CDN (React 18 + Babel) and the root
`colors_and_type.css`. No build step.

## What it demonstrates
- **Sticky hairline nav** with the wordmark and the **hardware "Color" toggle** —
  flipping it switches *all* imagery from desaturated to full color globally (the
  manifesto's cinematic reveal, made interactive).
- **Hero** — 9XL concrete-block display type, baseline-locked micro-meta, full-bleed
  reveal image.
- **Work Index** — numbered rows that slide right on hover; click any row to open its
  **case study**.
- **Case Study** — viewfinder-framed hero (corner ticks, crosshair, REC + coordinate
  meta), brief/scope grid, and the **8-second linear auto-scroll panel** (hover to
  glide), plus a next-project link.
- **Studio** — manifesto principles in macro type.
- **Contact** — underline email field with a working "received" state.
- **Footer** — wordmark, studio meta, coordinates.

Navigate via the nav (Index / Studio / Contact) or by opening cases from the index.

## Files
| File | Role |
|---|---|
| `index.html` | Entry — loads React/Babel + all components in order. |
| `kit.css` | Website-specific layout (nav, toggle, buttons, reveal, scroller). Imports root tokens. |
| `data.jsx` | `window.ATMOS_WORKS` — sample projects. |
| `primitives.jsx` | `Wordmark`, `Eyebrow`, `Horizon`, `Toggle`, `Button`, `ArrowLink`. |
| `Nav.jsx` | Sticky nav + color toggle. |
| `Hero.jsx` | Landing hero. |
| `WorkIndex.jsx` | Numbered project index. |
| `CaseStudy.jsx` | Case detail + `Viewfinder` + 8s scroller. |
| `Studio.jsx` | About / principles. |
| `Footer.jsx` | `Contact` + `Footer`. |
| `app.jsx` | `App` shell — fake routing, global color mode. |

Each component file exports to `window` (Babel gives each `<script>` its own scope).

## Imagery
All photography is **Lorem Picsum placeholder** (`picsum.photos/seed/...`). Swap in
real atmospheric studio photography for production. Images render grayscale by
default; the reveal/toggle brings them to color.
