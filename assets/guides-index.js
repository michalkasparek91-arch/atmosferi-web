// The full editorial archive stays in static HTML for discovery and no-JS access.
// Visitors see only entries written in the language selected on the homepage.
// A query parameter is a UI preference, never a separate indexable SEO version.
const params = new URLSearchParams(window.location.search);
const requested = params.get('lang');
const language = ['en', 'cs', 'de'].includes(requested) ? requested : 'en';
document.documentElement.lang = language;

const texts = {
  en: {
    nav: ['Work', 'Services', 'Guides', 'Studio', 'Contact'],
    contact: 'Discuss a project ↗', menu: 'Open menu',
    field: 'Atmosferi° / Field notes', title: 'Insights<br><em>&amp; Guides.</em>',
    intro: 'Practical knowledge for architects, studios and developers. From your first website brief to the final architectural image.',
    overview: 'Explore by discipline.', overviewSub: 'Find the topic that matches your next decision.',
    search: 'Find a guide', placeholder: 'Search topics, details, keywords…',
    empty: 'No matching guides. Try another term.', read: 'Read guide',
    guide: 'guide', guides: 'guides', article: 'article', articles: 'articles',
    disciplines: 'across four disciplines. Browse the guides below.',
    ctaEyebrow: 'A project in mind?', cta: 'Architecture deserves<br>clear presentation.',
    ctaLink: 'Discuss your project ↗', footer: 'Architecture, digital presentation & visualisation.',
    all: 'All guides', home: 'Atmosferi home',
    groups: [
      ['01 / Websites', 'Web Design & Digital', 'Portfolios, CMS, accessibility, SEO and the systems behind architecture websites.'],
      ['02 / Visuals', 'Architectural Visualisation', 'Briefs, renders, animations, image accuracy and visual storytelling.'],
      ['03 / Developments', 'Property Development', 'Residential project websites, floor plans, apartment data and buyer journeys.'],
      ['04 / Details', 'Technical Guides', 'Drawing-led coordination checks for architectural images and built details.']
    ]
  },
  cs: {
    nav: ['Práce', 'Služby', 'Návody', 'Studio', 'Kontakt'],
    contact: 'Probrat projekt ↗', menu: 'Otevřít menu',
    field: 'Atmosferi° / Poznámky z praxe', title: 'Články<br><em>&amp; návody.</em>',
    intro: 'Praktické informace pro architekty, ateliéry a developery. Od zadání webu až po výslednou architektonickou vizualizaci.',
    overview: 'Prozkoumejte témata.', overviewSub: 'Vyberte oblast, kterou právě řešíte.',
    search: 'Najít návod', placeholder: 'Hledat témata a klíčová slova…',
    empty: 'Žádné odpovídající návody. Zkuste jiný výraz.', read: 'Přečíst návod',
    guide: 'návod', guides: 'návodů', article: 'článek', articles: 'článků',
    disciplines: 've čtyřech oblastech. Všechny články najdete níže.',
    ctaEyebrow: 'Máte projekt?', cta: 'Architektura si zaslouží<br>dobrou prezentaci.',
    ctaLink: 'Probrat váš projekt ↗', footer: 'Architektura, digitální prezentace a vizualizace.',
    all: 'Všechny návody', home: 'Úvodní stránka Atmosferi',
    groups: [
      ['01 / Weby', 'Webdesign a digitální prezentace', 'Portfolia, redakční systémy, přístupnost, SEO a architektonické weby.'],
      ['02 / Vizualizace', 'Architektonické vizualizace', 'Zadání, rendery, animace, přesnost obrazu a vizuální příběhy.'],
      ['03 / Development', 'Developerské projekty', 'Weby rezidenčních projektů, půdorysy, nabídka bytů a komunikace se zájemci.'],
      ['04 / Detaily', 'Technické návody', 'Kontrola dokumentace a technických detailů v architektonických vizualizacích.']
    ]
  },
  de: {
    nav: ['Arbeiten', 'Leistungen', 'Ratgeber', 'Studio', 'Kontakt'],
    contact: 'Projekt besprechen ↗', menu: 'Menü öffnen',
    field: 'Atmosferi° / Praxiswissen', title: 'Wissen<br><em>&amp; Ratgeber.</em>',
    intro: 'Praxiswissen für Architekten, Büros und Projektentwickler. Vom Website-Briefing bis zur fertigen Architekturvisualisierung.',
    overview: 'Themen entdecken.', overviewSub: 'Finden Sie Antworten für Ihr nächstes Projekt.',
    search: 'Ratgeber finden', placeholder: 'Themen und Stichwörter suchen…',
    empty: 'Keine passenden Ratgeber. Versuchen Sie einen anderen Begriff.', read: 'Ratgeber lesen',
    guide: 'Ratgeber', guides: 'Ratgeber', article: 'Artikel', articles: 'Artikel',
    disciplines: 'in vier Themenbereichen. Alle Beiträge finden Sie unten.',
    ctaEyebrow: 'Ein Projekt im Kopf?', cta: 'Architektur verdient<br>eine klare Präsentation.',
    ctaLink: 'Projekt besprechen ↗', footer: 'Architektur, digitale Präsentation und Visualisierung.',
    all: 'Alle Ratgeber', home: 'Atmosferi Startseite',
    groups: [
      ['01 / Websites', 'Webdesign und Digitales', 'Portfolios, CMS, Barrierefreiheit, SEO und digitale Auftritte für Architekturbüros.'],
      ['02 / Visualisierung', 'Architekturvisualisierung', 'Briefings, Renderings, Animationen, Bildgenauigkeit und visuelles Erzählen.'],
      ['03 / Projektentwicklung', 'Immobilienentwicklung', 'Wohnprojekt-Websites, Grundrisse, Wohnungsdaten und Kundenanfragen.'],
      ['04 / Details', 'Technische Ratgeber', 'Planungsabstimmung und technische Prüfung von Architekturvisualisierungen.']
    ]
  }
};
const t = texts[language];
const setText = (selector, value) => { const el = document.querySelector(selector); if (el) el.textContent = value; };
const setHtml = (selector, value) => { const el = document.querySelector(selector); if (el) el.innerHTML = value; };
const localeSuffix = '?lang=' + language;
document.querySelectorAll('a[href="index.html"], a[href="work.html"], a[href="services.html"], a[href="studio.html"], a[href="contact.html"], a[href="/guides"]').forEach(a => {
  a.href = a.getAttribute('href') + localeSuffix;
});
document.querySelectorAll('.nav__links .navlink, .nav__mobile a').forEach((a, i) => {
  a.textContent = t.nav[i % t.nav.length];
});
document.querySelectorAll('.guidehub-footer nav a').forEach((a, i) => {
  a.textContent = [t.nav[0], t.nav[1], t.all, t.nav[4]][i];
});
setText('.seo-header-contact', t.contact);
setText('.nav__burger', t.menu);
setText('.guidehub-hero .guidehub-eyebrow', t.field);
setHtml('.guidehub-hero h1', t.title);
setText('.guidehub-hero__side p', t.intro);
setText('.guidehub-overview__head h2', t.overview);
setText('.guidehub-overview__head p', t.overviewSub);
setText('.guidehub-tools label', t.search);
const search = document.querySelector('[data-guides-search]');
if (search) search.placeholder = t.placeholder;
setText('[data-guide-empty]', t.empty);
setText('.guidehub-cta .guidehub-eyebrow', t.ctaEyebrow);
setHtml('.guidehub-cta h2', t.cta);
setText('.guidehub-cta a', t.ctaLink);
setText('.guidehub-footer > div p', t.footer);
document.querySelectorAll('.nav .wordmark').forEach(a => a.setAttribute('aria-label', t.home));

const articles = [...document.querySelectorAll('[data-guide-row]')];
const groups = [...document.querySelectorAll('[data-guide-section]')];
const topics = [...document.querySelectorAll('.guidehub-topic')];
const count = document.querySelector('[data-guide-count]');
const empty = document.querySelector('[data-guide-empty]');
const noun = n => language === 'cs' && n >= 2 && n <= 4 ? 'návody' : (n === 1 ? t.guide : t.guides);
const articleNoun = n => language === 'cs' && n >= 2 && n <= 4 ? 'články' : (n === 1 ? t.article : t.articles);
const formatDate = (date) => new Intl.DateTimeFormat(language === 'cs' ? 'cs-CZ' : language === 'de' ? 'de-DE' : 'en-GB', {month:'short', year:'numeric', timeZone:'UTC'}).format(new Date(date + 'T12:00:00Z'));
for (const article of articles) {
  const label = article.querySelector('.guidehub-entry__link');
  if (label) label.innerHTML = t.read + ' <span aria-hidden="true">↗</span>';
  const tm = article.querySelector('time[datetime]');
  if (tm) tm.textContent = formatDate(tm.getAttribute('datetime'));
}
groups.forEach((group, i) => {
  const c = t.groups[i];
  const topic = topics[i];
  const matches = [...group.querySelectorAll('[data-guide-row]')].filter(a => a.dataset.guideLang === language).length;
  if (topic) {
    topic.hidden = matches === 0;
    topic.querySelectorAll('.guidehub-topic__info span')[0].textContent = c[0];
    topic.querySelectorAll('.guidehub-topic__info span')[1].textContent = matches + ' ' + noun(matches) + ' ↗';
    topic.querySelector('h2').textContent = c[1];
    topic.querySelector('p').textContent = c[2];
  }
  setText('#' + group.id + ' .guidehub-eyebrow', c[0]);
  setText('#' + group.id + ' h2', c[1]);
  setText('#' + group.id + ' .guidehub-section__head p', c[2]);
  setText('#' + group.id + ' .guidehub-section__count', matches + ' ' + articleNoun(matches));
});
const apply = () => {
  const query = search ? search.value.trim().toLocaleLowerCase() : '';
  let visible = 0;
  for (const article of articles) {
    const match = article.dataset.guideLang === language &&
      (!query || (article.dataset.search || '').includes(query));
    article.hidden = !match;
    if (match) visible++;
  }
  for (const group of groups) {
    group.hidden = !group.querySelector('[data-guide-row]:not([hidden])');
  }
  if (count) count.textContent = visible + ' ' + noun(visible);
  if (empty) empty.hidden = visible > 0;
};
if (search) search.addEventListener('input', apply);
apply();
const initialCount = articles.filter(a => a.dataset.guideLang === language).length;
setText('.guidehub-hero__side > span', initialCount + ' ' + articleNoun(initialCount) + ' ' + t.disciplines);
