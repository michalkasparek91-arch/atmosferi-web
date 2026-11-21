import fs from 'node:fs';

// Every build discovers the editorial Article pages already published as root
// HTML. No manually maintained list, no invented dates or case studies.
const origin = 'https://www.atmosferi.com';
const output = 'guides.html';
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const categories = [
  {id:'digital', name:'Web Design & Digital', eyebrow:'01 / Websites', description:'Portfolios, CMS, accessibility, SEO and the systems behind architecture websites.', image:'img/cap-web.webp'},
  {id:'visualisation', name:'Architectural Visualisation', eyebrow:'02 / Visuals', description:'Briefs, renders, animations, image accuracy and visual storytelling.', image:'img/cap-viz.webp'},
  {id:'development', name:'Property Development', eyebrow:'03 / Developments', description:'Residential project websites, floor plans, apartment data and buyer journeys.', image:'img/cap-dev.webp'},
  {id:'technical', name:'Technical Guides', eyebrow:'04 / Details', description:'Drawing-led coordination checks for architectural images and built details.', image:'demos/atmosferi-viz/img/14-library-front.jpg'}
];
for (const category of categories) if (!fs.existsSync(category.image)) throw Error('Guides image not found: '+category.image);
const types = node => [node?.['@type']].flat().filter(Boolean);
const groupFor = file => {
  if (/property-development|residential-development|interactive-floor-plans|apartment-|phased-development|public-consultation/.test(file)) return 'development';
  if (/website|webdesign|webu|weby-|nettside|portfolio|cms-|studio-contact|studio-careers|architekturbuero|architekturleistungen|website-briefing|prepare-architecture-projects/.test(file)) return 'digital';
  if (/rendering-review|rendering-accuracy|facade-|interior-|roof-|balcony-|stair-|staircase-|glazing-|lightwell|site-grading|underground-parking|accessible-parking|accessible-restroom|fire-appliance|permeable-paving|tactile-paving|solar-carport|tree-protection|rain-garden|rainwater-downpipes|bicycle-storage|protective-bollards|loading-bay|parcel-locker|construction-hoarding|acoustic-screen|wayfinding-signage|bird-safe|existing-proposed|flood-resilience|ev-charging|bin-store|brick-bond/.test(file)) return 'technical';
  return 'visualisation';
};
const files = fs.readdirSync('.').filter(file=>file.endsWith('.html') && file!==output).sort();
const articles=[];
for (const file of files) {
  const source=fs.readFileSync(file,'utf8');
  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(source)) continue;
  const ldBlocks=[...source.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!ldBlocks.length) continue;
  let article;
  for (const match of ldBlocks) {
    let data;
    try {data=JSON.parse(match[1]);} catch {continue;}
    const nodes=Array.isArray(data['@graph'])?data['@graph']:[data];
    article=nodes.find(node=>types(node).includes('Article'));
    if (article) break;
  }
  if (!article) continue;
  const canonical=source.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
  const expected=origin+'/'+file;
  if (canonical!==expected) throw Error(file+': editorial canonical must be '+expected);
  const language=String(article.inLanguage || source.match(/<html\b[^>]*lang=["']([^"']+)/i)?.[1] || 'en').slice(0,2).toLowerCase();
  const date=String(article.datePublished || article.dateModified || '').slice(0,10);
  const headline=article.headline || source.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const description=article.description || source.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)/i)?.[1] || '';
  if (!headline || !description) throw Error(file+': editorial title or description missing');
  articles.push({file,headline,description,language,date:/^\d{4}-\d{2}-\d{2}$/.test(date)?date:'',group:groupFor(file)});
}
if (!articles.length) throw Error('No editorial articles found for /guides');
articles.sort((a,b)=>b.date.localeCompare(a.date)||a.headline.localeCompare(b.headline,'en'));
const byGroup=id=>articles.filter(a=>a.group===id);
const dateText=date=>date ? new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}) : '';
const langs={en:'EN',cs:'CS',de:'DE',nb:'NO',fr:'FR'};
const cards=categories.map(category=>{
  const number=byGroup(category.id).length;
  return '<a class="guidehub-topic" href="#'+category.id+'">'+
    '<div class="guidehub-topic__media"><img src="'+escape(category.image)+'" alt="" loading="lazy" decoding="async"></div>'+
    '<div class="guidehub-topic__info"><span>'+escape(category.eyebrow)+'</span><span>'+number+' guides ↗</span></div>'+
    '<h2>'+escape(category.name)+'</h2><p>'+escape(category.description)+'</p></a>';
}).join('\n');
const sections=categories.map(category=>{
  const items=byGroup(category.id);
  const rows=items.map(a=>
    '<article class="guidehub-entry" data-guide-row data-search="'+escape([a.headline,a.description,a.language].join(' ').toLocaleLowerCase())+'">'+
    '<a href="'+escape(a.file)+'"><div class="guidehub-entry__meta"><span>'+escape(langs[a.language]||a.language.toUpperCase())+'</span>'+
    (a.date?'<time datetime="'+a.date+'">'+escape(dateText(a.date))+'</time>':'')+'</div>'+
    '<h3>'+escape(a.headline)+'</h3><p>'+escape(a.description)+'</p>'+
    '<span class="guidehub-entry__link">Read guide <span aria-hidden="true">↗</span></span></a></article>'
  ).join('\n');
  return '<section class="guidehub-section wrap" id="'+category.id+'" data-guide-section aria-labelledby="'+category.id+'-title">'+
    '<div class="guidehub-section__head"><div><span class="guidehub-eyebrow">'+escape(category.eyebrow)+'</span><h2 id="'+category.id+'-title">'+escape(category.name)+'</h2><p>'+escape(category.description)+'</p></div>'+
    '<span class="guidehub-section__count">'+items.length+' articles</span></div>'+
    '<div class="guidehub-entries">'+rows+'</div></section>';
}).join('\n');
const canonical=origin+'/guides';
const structured={"@context":"https://schema.org","@type":"CollectionPage","@id":canonical+"#page",url:canonical,name:"Insights & Guides | Atmosferi",description:"Practical articles for architects, architecture studios and developers about websites, visualisation, residential projects and technical image review.",inLanguage:"en",isPartOf:{"@id":origin+"/#website"}};
const page=[
  '<!doctype html>',
  '<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Insights & Guides for Architects | Atmosferi</title>',
  '<meta name="description" content="Practical guides for architects and developers: websites, architectural visualisation, residential projects and technical coordination.">',
  '<meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="'+canonical+'">',
  '<meta property="og:type" content="website"><meta property="og:site_name" content="Atmosferi°"><meta property="og:title" content="Insights & Guides for Architects | Atmosferi">',
  '<meta property="og:description" content="Practical knowledge for architecture studios and property developers."><meta property="og:url" content="'+canonical+'">',
  '<meta property="og:image" content="'+origin+'/media/home-hero-poster.webp"><meta name="twitter:card" content="summary_large_image">',
  '<link rel="icon" href="/favicon-32.png"><link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="assets/redesign.css?v=20261101-clean-lines">',
  '<link rel="stylesheet" href="assets/brand-header.css?v=20261101-aligned"><link rel="stylesheet" href="assets/seo-services.css?v=20261120-r">',
  '<link rel="stylesheet" href="assets/guides-index.css"><script type="application/ld+json">'+JSON.stringify(structured)+'</script></head>',
  '<body class="seo-service guides-page">',
  '<nav class="nav" aria-label="Main navigation"><div class="wrap nav__inner">',
  '<a href="index.html" class="wordmark" aria-label="Atmosferi home"><span class="lg"><span class="lg-t" aria-hidden="true">atmosferı</span><i class="lg-o" aria-hidden="true"></i><span class="lg-sr">Atmosferi</span></span></a>',
  '<div class="nav__links"><a class="navlink" href="work.html">Work</a><a class="navlink" href="services.html">Services</a><a class="navlink" href="/guides" aria-current="page">Guides</a><a class="navlink" href="studio.html">Studio</a><a class="navlink" href="contact.html">Contact</a></div>',
  '<a class="seo-header-contact" href="contact.html">Discuss a project ↗</a><button class="nav__burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button></div>',
  '<div class="nav__mobile"><a href="work.html">Work</a><a href="services.html">Services</a><a href="/guides" aria-current="page">Guides</a><a href="studio.html">Studio</a><a href="contact.html">Contact</a></div></nav>',
  '<main id="content"><header class="guidehub-hero wrap"><p class="guidehub-eyebrow">Atmosferi° / Field notes</p>',
  '<div class="guidehub-hero__grid"><h1>Insights<br><em>&amp; Guides.</em></h1><div class="guidehub-hero__side"><p>Practical knowledge for architects, studios and developers. From your first website brief to the final architectural image.</p>',
  '<span>'+articles.length+' articles across four disciplines. Every guide is linked below.</span></div></div></header>',
  '<section class="guidehub-overview wrap" aria-labelledby="explore-title"><div class="guidehub-overview__head"><h2 id="explore-title">Explore by discipline.</h2><p>Find the topic that matches your next decision.</p></div>',
  '<div class="guidehub-topics">'+cards+'</div></section>',
  '<div class="guidehub-tools wrap"><label for="guides-search">Find a guide</label><div class="guidehub-tools__row"><input id="guides-search" type="search" placeholder="Search topics, details, keywords…" autocomplete="off" data-guides-search aria-controls="guidehub-results"><span aria-live="polite" data-guide-count>'+articles.length+' guides</span></div></div>',
  '<div id="guidehub-results">'+sections+'</div><div class="guidehub-no-results wrap" data-guide-empty hidden>No matching guides. Try another term.</div>',
  '<section class="guidehub-cta wrap"><span class="guidehub-eyebrow">A project in mind?</span><h2>Architecture deserves<br>clear presentation.</h2><a href="contact.html">Discuss your project ↗</a></section></main>',
  '<footer class="guidehub-footer wrap"><div><a href="index.html" class="guidehub-footer__brand">atmosferi°</a><p>Architecture, digital presentation &amp; visualisation.</p></div>',
  '<nav aria-label="Footer navigation"><a href="work.html">Work</a><a href="services.html">Services</a><a href="/guides" aria-current="page">All guides</a><a href="contact.html">Contact</a></nav>',
  '<p>© 2026 Atmosferi°</p></footer>',
  '<script src="assets/site.js"></script><script defer src="assets/guides-index.js"></script></body></html>'
].join('\n');
fs.writeFileSync(output,page+'\n','utf8');
console.log('Generated '+output+': '+articles.length+' editorial articles ('+categories.map(c=>c.id+': '+byGroup(c.id).length).join(', ')+').');
