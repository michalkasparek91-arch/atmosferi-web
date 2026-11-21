## Imported Claude Cowork project instructions

- Homepage footer: never add a column of language names (English / Česky / Deutsch / Norsk). Language switching is only in the header. Links to translated SEO pages use the page titles (see docs/international-seo.md).

- Editorial directory: `/guides` is generated on every build by `scripts/build-guides.mjs` from real root HTML Article JSON-LD. Do not hand-edit `guides.html`, hardcode a finite list of articles or replace the canonical `/guides` URL with `/guides.html`.
- Homepage footer: keep the four indexable architecture-web-design service links labelled with their actual page titles. Add only one prominent `All guides` link to the generated directory; do not paste the complete article archive into the footer. Other site footers should also link to `/guides`.
