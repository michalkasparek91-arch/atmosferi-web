// Compatibility entry point: regenerate static SEO assets without rewriting
// homepage/footer markup or inserting a redundant language switch.
// The regular build runs this sequence through package.json prebuild.
await import('./build-international-seo.mjs');
await import('./build-guides.mjs');
await import('./generate-sitemap.mjs');
await import('./check-international-seo.mjs');
await import('./check-guides.mjs');
console.log('Updated language service pages, editorial directory and sitemap without changing navigation.');
