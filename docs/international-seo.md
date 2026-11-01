# Atmosferi: international architecture search

## Implemented

Four indexable service pages with full HTML content, one per language:

| Search intent | Page | Audience |
| --- | --- | --- |
| website design for architects / architecture firm website design | /websites-for-architects.html | English-speaking practices worldwide, including the USA |
| tvorba webů pro architekty / web architektonického studia | /weby-pro-architekty.html | Czech practices |
| Webdesign für Architekten / Website Architekturbüro | /webdesign-fuer-architekten.html | German-speaking practices, including German-speaking Switzerland |
| nettsider for arkitekter / nettside arkitektkontor | /nettsider-for-arkitekter.html | Norway, Bokmål |

These are content hypotheses, not measured keyword volumes. Each page explains deliverables, portfolio structure, development websites, visualisation, process, remote collaboration and common questions. It links to actual concepts and pricing. Concepts are explicitly identified as fictional practices. No fabricated offices, client results, reviews or guaranteed rankings.

Self-referencing canonical URLs, reciprocal language alternates (en/cs/de/nb + x-default), matching WebPage/Service JSON-LD, social metadata, static language links and sitemap entries are included. Existing query-string UI translations remain available but are no longer declared as separate indexed translations. Canonical host follows the verified production 308 redirect from atmosferi.com to www.atmosferi.com (1 November 2026).

The German page covers the German-speaking Swiss audience, not all Swiss languages. French and Italian versions should only be added with complete, reviewed translations. English serves other international visitors without duplicate country pages.

## Release and measurement

1. Deploy the repository. Confirm all four service URLs return 200 on the www host; no redirect, authentication wall or accidental noindex. Confirm the production sitemap matches this repository.
2. In the verified Google Search Console domain property, submit https://www.atmosferi.com/sitemap.xml. Inspect the four URLs and request indexing. This repository change does not verify property ownership or submit URLs.
3. Establish a 28-day baseline, then review at 28 and 90 days: indexed pages, non-brand impressions, queries, clicks and landing pages, segmented by CZ/CH/NO/US. Use absolute counts alongside rates when volumes are small. Rankings and indexing are not guaranteed.
4. Track actual enquiries by landing page using the site's existing consent-aware analytics. Mailto clicks are intent signals, not confirmed leads. Do not add advertising or tracking scripts just for this release.

## Content and authority priorities

- Publish a practical guide to preparing architectural projects for a website: photos, plans, credits, status, accessibility and captions. Include genuine examples rather than a generic keyword article.
- Explain architecture portfolio structure with annotated concept screenshots. Keep concept work distinct from client commissions.
- When permission exists, publish real case studies: initial problem, exact scope, design decisions and measurable results with dates and measurement methods. Never invent traffic or conversion improvements.
- Use genuine professional relationships and relevant architecture/design publications for editorial coverage and links. No bulk directory submissions, bought links or unsolicited messages from this task.
- Evaluate a separate property-development service page once query/enquiry data supports it. Do not create near-identical pages for every city or country.
- Add a separate visualisation language cluster after reviewing that portfolio's actual services and project evidence.

## Maintenance

Edit language content in scripts/build-international-seo.mjs, then run:

    node scripts/build-international-seo.mjs
    node scripts/check-international-seo.mjs

scripts/update-seo-index.mjs maintains the language footer and sitemap. Review its output before use after adding new routes. It must not remove editorial language links in page content.

Reference: https://developers.google.com/search/docs/specialty/international/localized-versions
Reference: https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse
