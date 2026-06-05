# Fonts

This system loads **Geist** and **Geist Mono** from **Google Fonts** via `@import` in
`colors_and_type.css` (both confirmed available, OFL licensed). Local files are **not
bundled** here to keep the system light.

For **offline or production** use, download the woff2 files and add `@font-face`
rules pointing into this folder:

- Geist — https://fonts.google.com/specimen/Geist
- Geist Mono — https://fonts.google.com/specimen/Geist+Mono

Fallback stack (already in the tokens): `Helvetica Neue, Helvetica, Arial, sans-serif`
for sans; `SF Mono, ui-monospace, Roboto Mono, monospace` for mono.
