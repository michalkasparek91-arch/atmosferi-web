import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const html=fs.readFileSync('pricing.html','utf8'),css=fs.readFileSync('assets/pricing-page.css','utf8');
assert(html.includes('<body class="f pricing-page">'));
assert(html.includes('assets/for-agencies.css'));
assert(html.includes('data-i18n-langs="en,de,cs,fr"'));
assert.equal((html.match(/class="p-card"/g)||[]).length,3);
assert.equal((html.match(/class="p-visual-price"/g)||[]).length,4);
assert(html.includes('02 / Visualisation &amp; motion'));
for(const n of ['€3,000','€7,000','€15,000','€400','€1,200','€650','€1,600'])assert(html.includes(n));
assert(!html.includes('id="stack"')&&!html.includes('assets/pricing.js'));
assert(html.includes('href="/guides"')&&html.includes('data-footer-agencies'));
for(const anchor of ['index.html#work','index.html#services','index.html#visuals']) assert(html.includes('href="'+anchor+'"'), 'Footer must navigate back to homepage section '+anchor);
assert(fs.readFileSync('assets/pricing-page.js','utf8').includes("u.searchParams.set('lang',lang)"), 'Preserve language on subpage links');
assert(css.includes('@media(max-width:700px)'));
const ctx={window:{I18N_DICT:{}}};vm.runInNewContext(fs.readFileSync('assets/pricing-page-i18n.js','utf8'),ctx);
for(const lang of ['en','de','cs','fr'])assert(html.includes('data-i18n-langs="en,de,cs,fr"'));
for(const lang of ['de','cs','fr']){
  assert(ctx.window.I18N_DICT[lang]['Clear price.']);
  for(const key of ['Stills','Architectural films','360° tours','Interactive 3D'])assert(ctx.window.I18N_DICT[lang][key]);
}
console.log('Pricing layout, prices, localization and simplification checks passed.');