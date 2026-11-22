import fs from 'node:fs';
import assert from 'node:assert/strict';

// Commercial service pages should link to genuinely relevant editorial help,
// with matching language and no new footer language-navigation clutter.
const routes = [
  {
    file: 'weby-pro-architekty.html', lang: 'cs', section: 'resources-cs',
    targets: [
      'kolik-stoji-web-pro-architekta.html',
      'zadani-webu-pro-architektonicky-atelier.html',
      'redesign-webu-architektonickeho-atelieru.html'
    ]
  },
  {
    file: 'websites-for-architects.html', lang: 'en', section: 'resources-en',
    targets: [
      'architecture-studio-website-cost-scope-guide.html',
      'architecture-website-project-brief-template.html',
      'architecture-project-case-study-website-template.html',
      'cms-for-architecture-portfolio-website.html'
    ]
  },
  {
    file: 'webdesign-fuer-architekten.html', lang: 'de', section: 'resources-de',
    targets: [
      'website-kosten-architekturbuero.html',
      'website-briefing-architekturbuero-angebot-checkliste.html',
      'architekturbuero-website-relaunch-checkliste.html'
    ]
  }
];

for (const {file,lang,section,targets} of routes) {
  const html = fs.readFileSync(file, 'utf8');
  assert(html.includes('<html lang="' + lang + '">'), file + ': correct language');
  const start = '<section class="wrap section seo-guidance" aria-labelledby="' + section + '">';
  assert(html.includes(start), file + ': editorial guidance section');
  const from = html.indexOf(start);
  const to = html.indexOf('</section>', from);
  assert(to > from, file + ': guidance section must close');
  const block = html.slice(from, to);
  const links = [...block.matchAll(/<a href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(links, targets, file + ': only distinct, relevant guide paths');
  assert(from < html.indexOf('class="wrap section seo-faq"'), file + ': resources above FAQ');
  for (const target of targets) {
    assert(fs.existsSync(target), file + ': missing linked guide ' + target);
    const targetHtml = fs.readFileSync(target, 'utf8');
    assert(targetHtml.includes('<html lang="' + lang + '">'), file + ': language mismatch ' + target);
    assert(targetHtml.includes('"@type":"Article"') || targetHtml.includes('"@type": "Article"'), file + ': target not a published Article');
  }
}

// The guide gaining real Google impressions should lead to the actual
// commercial selector service within its first, decision-making section.
const article = fs.readFileSync('interactive-floor-plans-property-development-website.html', 'utf8');
const decision = article.match(/<section id="decision">([\s\S]*?)<\/section>/);
assert(decision, 'interactive floor plan decision section missing');
assert(decision[1].includes('href="interactive-floor-plan-design-real-estate.html"'), 'decision section missing direct service path');
const landing = fs.readFileSync('interactive-floor-plan-design-real-estate.html', 'utf8');
assert(landing.includes('href="interactive-floor-plans-property-development-website.html"'), 'service must explain the decision guide');
assert(fs.existsSync('interactive-floor-plan-design-real-estate.html'), 'service landing missing');

console.log('Commercial service-to-guide paths are relevant, reciprocal and locale-correct.');
