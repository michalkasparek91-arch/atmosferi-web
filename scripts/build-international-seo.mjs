import fs from 'node:fs';

// Static, useful service pages: language versions, not near-identical city pages.
// No runtime translation is required for their indexable content or metadata.
const origin = 'https://www.atmosferi.com';
const pages = [
  {
    lang:'en', file:'websites-for-architects.html', locale:'en_US', label:'English',
    title:'Website Design for Architects & Architecture Firms | Atmosferi',
    description:'Architecture websites designed and built by an architect. Project portfolios, developer websites and architectural visualisation. Based in Prague, working worldwide.',
    eyebrow:'Architecture · Web design · Visualisation',
    heading:'Website design for architects.',
    intro:'Your buildings deserve a website that explains the thinking behind them. I design and build project-led websites for independent architects, architecture firms and property developers, with room for photography, drawings and the details that make each project different.',
    author:'I’m Michal Kašpárek, an architect and the founder of Atmosferi. I bring more than a decade of architectural visualisation experience to website design and development. You work directly with the person designing and building your site.',
    audience:'A portfolio, a practice or a development.',
    cards:[['Architecture portfolios','A clear project index, carefully ordered imagery and individual project pages. Plans, location, project status, credits and a concise story give visitors context beyond a beautiful image.'],['Architecture firm websites','Connect your projects with your services, people and approach. Make it easy for a prospective client to understand the kinds of commissions you take on and how to start a conversation.'],['Property development websites','Present a development through its architecture, location and available information. Renders and plans can explain a project before construction; the scope can include availability information or an enquiry journey.']],
    deliver:'Design, development and the images in between.',
    deliverText:'The work can include site structure, visual design, responsive development, project content and a way to manage updates. I can work with your existing photography and drawings, or create architectural renders, films and 360° views where new imagery is needed. The final scope follows your actual content and business needs.',
    process:'How we work together.',
    steps:[['01 · Content and brief','We review your current website, selected projects, intended audience and the enquiries you want to receive. This defines the page structure and what content is missing.'],['02 · Design and build','We agree the visual direction, then develop the website around real project material. Desktop and mobile layouts are considered together, including navigation, typography and image loading.'],['03 · Launch and handover','We review content, links, forms and the mobile experience before launch. Page titles, descriptions, crawlable project pages and image descriptions form part of the technical foundation.']],
    remote:'From Prague, across borders.',
    remoteText:'Atmosferi is based in Prague, Czechia, and works remotely with architecture practices worldwide, including the United States, Switzerland and Norway. We agree communication, review times, site languages and the required deliverables at the start of each project.',
    proof:'Explore the approach.', proofText:'The portfolio includes working website concepts for fictional architecture practices. Explore their layouts, project pages and interactions before discussing your own brief.',
    work:'Explore website concepts', pricing:'See pricing and scope', visuals:'Explore architectural visualisation',
    faq:'Questions before a project.',
    questions:[['Can you redesign an existing architecture website?','Yes. We can start by reviewing your project archive, page structure and current presentation. Existing material can be reused where it fits; the redesign scope is agreed before work begins.'],['Can the website have several languages?','Yes. We can plan separate language URLs, translated content and language links. The brief defines the languages and who supplies or reviews each translation, including regional terminology.'],['Do you also create architectural visualisations?','Yes. Renders, architectural films and 360° views can be included where they help explain the project. They can also be a separate commission.'],['How much does an architecture website cost?','The price depends on the number of layouts, project content, languages, editing tools and any new imagery. The pricing page explains the current starting scope; a specific brief receives an individual proposal.']],
    cta:'Let’s talk about your website.', ctaText:'Send your current website, a few projects and what you would like to change.', email:'Discuss a project', nav:['Work','Services','Pricing','Studio','Contact'], languages:'Read this page in',
  },
  {
    lang:'cs', file:'weby-pro-architekty.html', locale:'cs_CZ', label:'Česky',
    title:'Tvorba webů pro architekty a architektonická studia | Atmosferi',
    description:'Weby pro architekty, ateliéry a developery. Návrh, vývoj, projektové portfolio a architektonické vizualizace od architekta Michala Kašpárka. Praha a spolupráce na dálku.',
    eyebrow:'Architektura · Webdesign · Vizualizace', heading:'Weby pro architekty.',
    intro:'Vaše stavby si zaslouží web, který ukáže i myšlenky za nimi. Navrhuji a stavím webové stránky pro samostatné architekty, architektonické ateliéry a developery. S prostorem pro fotografie, výkresy i detaily, kterými se každý projekt liší.',
    author:'Jsem Michal Kašpárek, architekt a zakladatel Atmosferi. Do návrhu a vývoje webů přináším více než deset let zkušeností s architektonickými vizualizacemi. Jednáte přímo s člověkem, který váš web navrhuje i realizuje.',
    audience:'Portfolio, ateliér nebo developerský projekt.',
    cards:[['Architektonické portfolio','Přehledný výběr realizací, promyšlené pořadí obrazů a samostatné stránky projektů. Půdorysy, místo, stav projektu, spoluautoři a stručný příběh doplní souvislosti, které samotná fotografie neřekne.'],['Web architektonického studia','Propojení projektů se službami, týmem a přístupem ateliéru. Budoucí klient snadno pochopí, jaké zakázky řešíte, co je pro vás důležité a jak vás oslovit.'],['Web developerského projektu','Prezentace architektury, lokality a dostupných podkladů. Vizualizace a půdorysy představí záměr ještě před stavbou. Součástí zadání mohou být informace o dostupnosti jednotek nebo cesta k poptávce.']],
    deliver:'Návrh, vývoj i práce s obrazem.',
    deliverText:'Součástí spolupráce může být struktura webu, grafický návrh, responzivní vývoj, projektový obsah i způsob jeho aktualizace. Pracuji s vašimi fotografiemi a výkresy; tam, kde podklady chybí, mohu vytvořit architektonické vizualizace, film nebo 360° prohlídku. Rozsah vychází z konkrétního obsahu a potřeb vašeho studia.',
    process:'Jak spolupráce probíhá.',
    steps:[['01 · Obsah a zadání','Projdeme současný web, vybrané projekty, cílové klienty a požadované poptávky. Z toho sestavíme strukturu stránek a seznam chybějících podkladů.'],['02 · Návrh a realizace','Odsouhlasíme vizuální směr a web vyvíjím nad skutečnými projekty. Mobilní a počítačovou verzi řeším společně včetně navigace, typografie a načítání obrázků.'],['03 · Spuštění a předání','Před spuštěním projdeme obsah, odkazy, formuláře a mobilní zobrazení. Technický základ zahrnuje titulky stránek, popisy, dostupné projektové stránky a popisy obrazových podkladů.']],
    remote:'Z Prahy, bez hranic.',
    remoteText:'Atmosferi působí z Prahy a spolupracuje na dálku s architekty v Česku i zahraničí, včetně Švýcarska, Norska a USA. Na začátku si domluvíme komunikaci, termíny připomínek, jazykové verze a konkrétní výstupy.',
    proof:'Prohlédněte si přístup.', proofText:'V portfoliu najdete funkční koncepty webů pro fiktivní architektonická studia. Ukazují možnosti kompozice a ovládání, které si můžete sami vyzkoušet.',
    work:'Prohlédnout koncepty webů', pricing:'Ceník a rozsah spolupráce', visuals:'Architektonické vizualizace',
    faq:'Otázky před spoluprací.',
    questions:[['Můžete přepracovat stávající web ateliéru?','Ano. Začneme rozborem projektového archivu, struktury stránek a současné prezentace. Vhodné podklady můžeme využít znovu. Rozsah redesignu si odsouhlasíme před zahájením.'],['Může být web ve více jazycích?','Ano. Navrhneme samostatné jazykové adresy, překlady a odkazy mezi verzemi. Součástí zadání je výběr jazyků a dohoda, kdo překlady dodá nebo zkontroluje.'],['Vytváříte také vizualizace architektury?','Ano. Vizualizace, architektonické filmy a 360° prohlídky mohou být součástí webu, pokud pomohou projekt vysvětlit. Mohou tvořit i samostatnou zakázku.'],['Kolik stojí web pro architekta?','Záleží na počtu typů stránek, rozsahu projektů, jazycích, správě obsahu a nových vizualizacích. Ceník popisuje výchozí rozsah; konkrétní zadání nacením individuálně.']],
    cta:'Promluvme si o vašem webu.', ctaText:'Pošlete současný web, několik projektů a představu, co chcete změnit.', email:'Probrat projekt',nav:['Projekty','Služby','Ceník','Studio','Kontakt'],languages:'Jazyk této stránky',
  },
  {
    lang:'de',file:'webdesign-fuer-architekten.html',locale:'de_DE',label:'Deutsch',
    title:'Webdesign für Architekten und Architekturbüros | Atmosferi',
    description:'Websites für Architekten, Architekturbüros und Projektentwickler. Gestaltung, Entwicklung und Architekturvisualisierung von einem Architekten. Zusammenarbeit weltweit.',
    eyebrow:'Architektur · Webdesign · Visualisierung',heading:'Webdesign für Architekten.',
    intro:'Ihre Gebäude verdienen eine Website, die auch die Gedanken dahinter vermittelt. Ich gestalte und entwickle projektorientierte Websites für selbstständige Architekten, Architekturbüros und Projektentwickler. Mit Raum für Fotografien, Pläne und die Besonderheiten jedes Entwurfs.',
    author:'Ich bin Michal Kašpárek, Architekt und Gründer von Atmosferi. Mehr als zehn Jahre Erfahrung in der Architekturvisualisierung prägen meine Arbeit an Websites. Sie arbeiten direkt mit der Person, die Ihre Website gestaltet und entwickelt.',
    audience:'Portfolio, Büro oder Immobilienprojekt.',
    cards:[['Architekturportfolios','Ein übersichtliches Projektverzeichnis, bewusst angeordnete Bilder und eigene Projektseiten. Pläne, Standort, Projektstatus, Beteiligte und ein kurzer Text geben dem Entwurf Kontext.'],['Websites für Architekturbüros','Verbinden Sie Ihre Projekte mit Leistungen, Team und Haltung. Potenzielle Auftraggeber erkennen, welche Aufgaben Sie übernehmen und wie sie mit Ihnen ins Gespräch kommen.'],['Websites für Projektentwickler','Präsentieren Sie Architektur, Lage und die verfügbaren Projektinformationen. Visualisierungen und Grundrisse erklären ein Vorhaben vor Baubeginn. Angaben zur Verfügbarkeit und ein Anfrageprozess können Teil des Auftrags sein.']],
    deliver:'Gestaltung, Entwicklung und Bildwelten.',
    deliverText:'Die Zusammenarbeit kann Seitenstruktur, visuelle Gestaltung, responsive Entwicklung, Projektinhalte und deren Pflege umfassen. Ich arbeite mit vorhandenen Fotografien und Plänen oder erstelle bei Bedarf Architekturvisualisierungen, Filme und 360°-Ansichten. Der Umfang richtet sich nach Ihren Inhalten und den Bedürfnissen Ihres Büros.',
    process:'So arbeiten wir zusammen.',
    steps:[['01 · Inhalte und Briefing','Wir besprechen Ihre aktuelle Website, ausgewählte Projekte, Zielgruppen und gewünschte Anfragen. Daraus entstehen die Seitenstruktur und eine Übersicht der noch benötigten Inhalte.'],['02 · Gestaltung und Entwicklung','Nach Abstimmung der gestalterischen Richtung entwickle ich die Website mit echtem Projektmaterial. Desktop und Mobilansicht werden gemeinsam geplant, einschliesslich Navigation, Typografie und Bildladezeiten.'],['03 · Veröffentlichung und Übergabe','Vor dem Start prüfen wir Inhalte, Links, Formulare und die mobile Darstellung. Seitentitel, Beschreibungen, crawlbare Projektseiten und Bildbeschreibungen gehören zur technischen Grundlage.']],
    remote:'Von Prag aus, über Grenzen hinweg.',
    remoteText:'Atmosferi sitzt in Prag, Tschechien, und arbeitet digital mit Architekturbüros weltweit zusammen, auch in der deutschsprachigen Schweiz, Deutschland und Österreich. Kommunikation, Abstimmungstermine, Sprachversionen und Leistungen vereinbaren wir zu Projektbeginn.',
    proof:'Entdecken Sie die Herangehensweise.',proofText:'Das Portfolio enthält funktionierende Websitekonzepte für fiktive Architekturbüros. Entdecken Sie Gestaltung, Projektseiten und Interaktionen direkt im Browser.',
    work:'Websitekonzepte ansehen',pricing:'Preise und Leistungsumfang',visuals:'Architekturvisualisierung entdecken',
    faq:'Fragen vor dem Projekt.',
    questions:[['Überarbeiten Sie bestehende Architekturwebsites?','Ja. Zuerst prüfen wir Projektarchiv, Seitenstruktur und aktuelle Präsentation. Geeignetes Material kann weiterverwendet werden. Den Umfang vereinbaren wir vor Beginn.'],['Kann die Website mehrsprachig sein?','Ja. Wir können eigene Sprach-URLs, übersetzte Inhalte und Sprachverknüpfungen planen. Im Briefing legen wir Sprachen sowie Lieferung und Prüfung der Übersetzungen fest, auch für regionale Begriffe.'],['Erstellen Sie auch Architekturvisualisierungen?','Ja. Visualisierungen, Architekturfilme und 360°-Ansichten können das Projekt erklären und Teil der Website sein. Sie können auch separat beauftragt werden.'],['Was kostet eine Website für Architekten?','Der Preis hängt von Seitentypen, Projektinhalten, Sprachen, Inhaltsverwaltung und neuen Bildern ab. Die Preisseite erläutert den Ausgangsumfang. Für Ihr Briefing erhalten Sie ein individuelles Angebot.']],
    cta:'Sprechen wir über Ihre Website.',ctaText:'Schicken Sie Ihre aktuelle Website, einige Projekte und Ihre Vorstellungen für die Veränderung.',email:'Projekt besprechen',nav:['Projekte','Leistungen','Preise','Studio','Kontakt'],languages:'Sprache dieser Seite',
  },
  {
    lang:'nb',file:'nettsider-for-arkitekter.html',locale:'nb_NO',label:'Norsk',
    title:'Nettsider for arkitekter og arkitektkontorer | Atmosferi',
    description:'Nettdesign og utvikling for arkitekter, arkitektkontorer og eiendomsutviklere. Prosjektporteføljer og arkitekturvisualisering fra en arkitekt i Praha. Samarbeid på avstand.',
    eyebrow:'Arkitektur · Nettdesign · Visualisering',heading:'Nettsider for arkitekter.',
    intro:'Byggene deres fortjener en nettside som også formidler tankene bak dem. Jeg designer og utvikler prosjektbaserte nettsider for selvstendige arkitekter, arkitektkontorer og eiendomsutviklere, med plass til fotografier, tegninger og detaljene som gjør hvert prosjekt forskjellig.',
    author:'Jeg er Michal Kašpárek, arkitekt og grunnlegger av Atmosferi. Mer enn ti års erfaring med arkitekturvisualisering preger arbeidet mitt med nettdesign og utvikling. Dere samarbeider direkte med personen som designer og bygger nettsiden.',
    audience:'Portefølje, arkitektkontor eller eiendomsprosjekt.',
    cards:[['Arkitektporteføljer','En oversiktlig prosjektliste, gjennomtenkt rekkefølge på bildene og egne prosjektsider. Plantegninger, sted, prosjektstatus, bidragsytere og en kort tekst gir sammenheng utover det et bilde kan vise.'],['Nettsider for arkitektkontorer','Knytt prosjektene til tjenester, mennesker og arbeidsmåte. Potensielle oppdragsgivere kan forstå hvilke oppdrag dere tar, og hvordan de kan komme i kontakt.'],['Nettsider for eiendomsutviklere','Presenter arkitektur, beliggenhet og tilgjengelig prosjektinformasjon. Visualiseringer og plantegninger kan forklare prosjektet før byggestart. Tilgjengelige enheter og en løsning for henvendelser kan inngå i oppdraget.']],
    deliver:'Design, utvikling og visuelle fremstillinger.',
    deliverText:'Samarbeidet kan omfatte sidestruktur, visuell utforming, responsiv utvikling, prosjektinnhold og en løsning for oppdateringer. Jeg kan arbeide med eksisterende fotografier og tegninger eller lage arkitekturvisualiseringer, filmer og 360°-visninger ved behov. Omfanget tilpasses innholdet og behovene deres.',
    process:'Slik samarbeider vi.',
    steps:[['01 · Innhold og oppgave','Vi gjennomgår dagens nettside, utvalgte prosjekter, målgrupper og ønskede henvendelser. Dette danner grunnlaget for sidestrukturen og avklarer hvilket materiale som mangler.'],['02 · Design og utvikling','Vi avklarer den visuelle retningen, og deretter bygger jeg nettsiden rundt faktiske prosjekter. Mobil og datamaskin planlegges sammen, inkludert navigasjon, typografi og lasting av bilder.'],['03 · Lansering og overlevering','Vi kontrollerer innhold, lenker, skjemaer og mobilvisning før lansering. Sidetitler, beskrivelser, tilgjengelige prosjektsider og bildebeskrivelser inngår i det tekniske grunnlaget.']],
    remote:'Fra Praha, på tvers av landegrenser.',
    remoteText:'Atmosferi holder til i Praha i Tsjekkia og samarbeider digitalt med arkitektkontorer over hele verden, også i Norge, Sveits og USA. Kommunikasjon, gjennomganger, språkversjoner og leveranser avtales ved prosjektstart. Språket i dialogen avklares i oppgaven.',
    proof:'Utforsk tilnærmingen.',proofText:'Porteføljen inneholder fungerende nettsidekonsepter for fiktive arkitektkontorer. Utforsk utforming, prosjektsider og funksjoner direkte i nettleseren.',
    work:'Se nettsidekonsepter på engelsk',pricing:'Priser og omfang på engelsk',visuals:'Se arkitekturvisualiseringer',
    faq:'Spørsmål før et prosjekt.',
    questions:[['Kan dere fornye en eksisterende arkitektnettside?','Ja. Vi begynner med prosjektarkivet, sidestrukturen og dagens presentasjon. Egnet materiale kan brukes videre. Omfanget avtales før arbeidet starter.'],['Kan nettsiden ha flere språk?','Ja. Vi kan planlegge egne språkadresser, oversatt innhold og lenker mellom språkene. Oppgaven avklarer hvilke språk som trengs, og hvem som leverer eller kontrollerer oversettelsene.'],['Lager dere også arkitekturvisualiseringer?','Ja. Visualiseringer, arkitekturfilmer og 360°-visninger kan inngå der de forklarer prosjektet. De kan også bestilles som et eget oppdrag.'],['Hva koster en nettside for et arkitektkontor?','Prisen avhenger av sidetyper, prosjektinnhold, språk, publiseringsløsning og nye bilder. Prissiden forklarer det grunnleggende omfanget. En konkret oppgave får et individuelt tilbud.']],
    cta:'La oss snakke om nettsiden deres.',ctaText:'Send dagens nettside, noen prosjekter og hva dere ønsker å endre.',email:'Diskuter et prosjekt',nav:['Prosjekter','Tjenester','Priser','Studio','Kontakt'],languages:'Les denne siden på',
  },
];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const alternates=pages.map(p=>`<link rel="alternate" hreflang="${p.lang}" href="${origin}/${p.file}">`).join('\n')+`\n<link rel="alternate" hreflang="x-default" href="${origin}/${pages[0].file}">`;
const languageLinks=p=>`<nav class="seo-languages" aria-label="${esc(p.languages)}"><span>${p.languages}</span>${pages.map(q=>`<a href="${q.file}" lang="${q.lang}" hreflang="${q.lang}"${p.lang===q.lang?' aria-current="page"':''}>${q.label}</a>`).join('')}</nav>`;
const destinations=['work.html','services.html','pricing.html','studio.html','contact.html'];
for(const p of pages){
 const url=`${origin}/${p.file}`;
 const langSuffix=['cs','de'].includes(p.lang)?`?lang=${p.lang}`:'';
 const links=p.nav.map((n,i)=>`<a class="navlink" href="${destinations[i]}${langSuffix}">${n}</a>`).join('');
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'WebPage','@id':`${url}#page`,url,name:p.title,description:p.description,inLanguage:p.lang,isPartOf:{'@id':`${origin}/#website`},about:{'@id':`${url}#service`}},
  {'@type':'Service','@id':`${url}#service`,name:p.heading,serviceType:'Website design and development for architecture practices',url,provider:{'@type':'Organization','@id':`${origin}/#org`,name:'Atmosferi°',url:`${origin}/`,email:'info@atmosferi.com',address:{'@type':'PostalAddress',addressLocality:'Prague',addressCountry:'CZ'}},areaServed:'Worldwide'},
 ]};
 const html=`<!DOCTYPE html>
<html lang="${p.lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">${alternates}
<meta property="og:type" content="website"><meta property="og:site_name" content="Atmosferi°"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${url}"><meta property="og:locale" content="${p.locale}"><meta property="og:image" content="${origin}/og.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:description" content="${esc(p.description)}"><meta name="twitter:image" content="${origin}/og.png">
<link rel="icon" href="/favicon-32.png"><link rel="stylesheet" href="assets/site.css"><link rel="stylesheet" href="assets/redesign.css?v=20261101-clean-lines"><link rel="stylesheet" href="assets/brand-header.css?v=20261101-aligned"><link rel="stylesheet" href="assets/seo-services.css?v=20261101">
<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script></head>
<body class="seo-service">
<nav class="nav" aria-label="Atmosferi"><div class="wrap nav__inner"><a href="index.html${langSuffix}" class="wordmark">atmosferi<sup>°</sup></a><div class="nav__links">${links}</div><a class="seo-header-contact" href="mailto:info@atmosferi.com">${p.email} ↗</a><button class="nav__burger" aria-label="${p.nav[4]} / Menu" aria-expanded="false"><span></span><span></span><span></span></button></div><div class="nav__mobile">${links}</div></nav>
<main><header class="seo-hero"><div class="wrap"><p class="eyebrow">${p.eyebrow}</p><h1>${p.heading}</h1><p class="seo-intro">${p.intro}</p><a class="arrow-link" href="mailto:info@atmosferi.com">${p.email} ↗</a></div></header>
<div class="wrap">${languageLinks(p)}</div>
<section class="wrap section seo-about"><p class="seo-author">${p.author}</p><h2>${p.audience}</h2><div class="seo-cards">${p.cards.map(([h,t])=>`<article><h3>${h}</h3><p>${t}</p></article>`).join('')}</div></section>
<section class="wrap section seo-split"><h2>${p.deliver}</h2><div><p>${p.deliverText}</p><a class="arrow-link" href="demos/atmosferi-viz/index.html">${p.visuals} ↗</a></div></section>
<section class="wrap section"><h2>${p.process}</h2><div class="seo-cards">${p.steps.map(([h,t])=>`<article><h3>${h}</h3><p>${t}</p></article>`).join('')}</div></section>
<section class="wrap section seo-split"><h2>${p.remote}</h2><p>${p.remoteText}</p></section>
<section class="wrap section seo-proof"><h2>${p.proof}</h2><p>${p.proofText}</p><div class="seo-links"><a class="arrow-link" href="work.html${langSuffix}">${p.work} →</a><a class="arrow-link" href="pricing.html${langSuffix}">${p.pricing} →</a></div></section>
${p.lang==='cs'?`<section class="wrap section seo-split"><h2>Jak sestavit přehledný web ateliéru?</h2><div><p>Co patří do hlavní navigace, kdy projekty rozdělovat podle kategorií a jak popsat služby tak, aby jim porozuměl také investor? Připravil jsem praktický návod na informační strukturu webu architektonického studia.</p><a class="arrow-link" href="struktura-webu-architektonickeho-atelieru.html">Přečíst návod na strukturu webu →</a></div></section>`:''}
${p.lang==='de'?`<section class="wrap section seo-split"><h2>Ihre Website wird neu gestaltet?</h2><div><p>Ein Relaunch betrifft nicht nur das Layout. Wie bleiben Projektseiten erreichbar, welche Bilder und Rechte sollten geprüft werden und was gehört zur technischen Abnahme? Die Checkliste führt durch die wichtigsten Schritte.</p><a class="arrow-link" href="architekturbuero-website-relaunch-checkliste.html">Checkliste zum Website-Relaunch lesen →</a></div></section>`:''}
${p.lang==='nb'?`<section class="wrap section seo-split"><h2>Kan alle bruke prosjektporteføljen?</h2><div><p>Store fotografier og plantegninger trenger gjennomtenkte beskrivelser, kontrast og navigasjon. Les den praktiske guiden til tilgjengelighet på arkitektnettsider, med eksempler for bilder, tegninger og mobilvisning.</p><a class="arrow-link" href="tilgjengelig-nettside-for-arkitektkontor.html">Se sjekklisten for tilgjengelighet →</a></div></section>`:''}
${p.lang==='en'?`<section class="wrap section seo-split"><h2>Preparing to launch a residential development website?</h2><div><p>Project imagery is only part of the brief. What should buyers see about the building, location, home types, availability and the enquiry process? This practical checklist helps organise the content before design and development begin.</p><a class="arrow-link" href="residential-development-website-content-checklist.html">Read the residential development website checklist →</a></div></section>`:''}
<section class="wrap section seo-faq"><h2>${p.faq}</h2>${p.questions.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
<section class="seo-cta"><div class="wrap"><h2>${p.cta}</h2><p>${p.ctaText}</p><a class="arrow-link" href="mailto:info@atmosferi.com">info@atmosferi.com ↗</a></div></section></main>
<footer class="wrap seo-footer"><a class="wordmark" href="index.html">atmosferi<sup>°</sup></a><span>Ing. arch. Michal Kašpárek · Praha / Prague</span>${languageLinks(p)}</footer><script src="assets/site.js"></script></body></html>\n`;
 fs.writeFileSync(p.file,html);
}
console.log(`Generated ${pages.length} static language pages.`);
