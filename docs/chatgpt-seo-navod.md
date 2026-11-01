# Návod pro ChatGPT: další SEO stránky Atmosferi

Zkopíruj následující zadání do ChatGPT / Codexu s přístupem k tomuto repozitáři. Doplň téma, publikum a jazyk. Výsledkem má být hotová stránka v projektu, ne pouze text článku.

## Zadání ke zkopírování

```text
Pracuješ na webu Atmosferi (repozitář atmosferi-web).

Vytvoř a zapracuj jednu užitečnou SEO stránku:
TÉMA: [např. Jak připravit fotografie a půdorysy pro web architektonického ateliéru]
PUBLIKUM: [např. menší architektonické ateliéry]
JAZYK: [cs / en / de / nb]
ZÁMĚR HLEDÁNÍ: [co konkrétně návštěvník potřebuje vyřešit]
PODKLADY: [ověřené projekty, obrázky, zkušenosti nebo odkazy; nevymýšlej si je]

Nejdřív si přečti AGENTS.md, docs/international-seo.md a existující relevantní stránky. Projdi současný design a nedělej paralelní vizuální systém. Zkontroluj, že téma neřeší jiná stránka; pokud ano, rozšiř ji místo vytváření duplicity.

Atmosferi založil architekt Michal Kašpárek. Navrhuje a vyvíjí weby pro architekty, ateliéry a developery a vytváří architektonické vizualizace. Studio sídlí v Praze a pracuje na dálku. Nepřidávej zahraniční pobočky, klienty, výsledky, recenze, ceny ani zkušenosti bez doložených podkladů. Koncepty ve Work označ jako koncepty fiktivních studií. Nevydávej je za zakázky klientů.

1. Stránka musí řešit jeden skutečný problém. Napiš konkrétní originální obsah: jasný úvod, srozumitelné podnadpisy, praktické příklady a postup nebo kritéria rozhodování. Délku přizpůsob užitku. Neplň text klíčovými slovy a netvoř kopie měnící pouze názvy měst či zemí. Nezaručuj pozice ve vyhledávání.
2. Použij správný jazyk a přirozené oborové názvosloví. Německý text sám o sobě nepokrývá francouzsky či italsky mluvící Švýcarsko. Angličtina může obsloužit USA i další země bez samostatných kopií.
3. HTML musí obsahovat celý text už v souboru, bez závislosti na překladovém JavaScriptu. Použij jedno H1, logické H2/H3, správné html lang, unikátní title a meta description, index/follow a absolutní canonical https://www.atmosferi.com/[slug].html. Jedno téma = jedna canonical URL.
4. Vlož sociální metadata a validní JSON-LD: WebPage plus Article u skutečného článku nebo Service u popisu služby. Autor, data a tvrzení musí odpovídat realitě. Nepřidávej hodnocení nebo FAQ markup kvůli slibovaným rozšířeným výsledkům.
5. Hreflang přidej pouze mezi skutečně přeloženými ekvivalenty stejné stránky. Použij samostatné URL, vzájemné odkazy včetně sebe a x-default. Neodkazuj tak na homepage nebo jiné téma. Stránka bez překladů hreflang nepotřebuje.
6. Zachovej společný header, typografii a responzivitu. Použij existující assets/site.css, assets/redesign.css a assets/brand-header.css. Všechny odkazy a obrázky musí existovat; alt popisuje skutečný obrázek. Cizí obrázky nepoužívej bez oprávnění.
7. Přidej relevantní odkazy na služby, Work a kontakt. Současně přidej odkaz na novou stránku z alespoň jedné existující tematicky příbuzné stránky, aby nevznikla osiřelá stránka. Nové články nevkládej hromadně do hlavní navigace.
8. Novou veřejnou stránku ulož jako kořenový .html soubor, který současný build kopíruje. Sitemap se generuje automaticky ze skutečných canonical HTML stránek. Nevkládej URL ručně do seznamu ani neposílej do indexace preview nebo localhost.
9. Existující čtyři jazykové služby jsou generované skriptem scripts/build-international-seo.mjs: pokud upravuješ je, uprav zdrojová data ve skriptu a regeneruj výstup. Neupravuj pouze vygenerované HTML. Nové samostatné články mohou mít vlastní zdrojový HTML soubor. Pokud přidáš nový generátor, zapoj ho do prebuild před generováním sitemapy.
10. Spusť npm run prebuild a npm run seo:check. Ověř novou URL v sitemap.xml, canonical, JSON-LD, funkční interní odkazy a mobilní zobrazení. Při změně jazykového clusteru ověř vzájemné hreflang. Zkontroluj git diff a nezasahuj do nesouvisejících změn.

Nakonec napiš, které soubory jsi změnil, co jsi ověřil a zda je změna nasazená. Neoznačuj stránku za indexovanou jen proto, že je v sitemapě nebo IndexNow přijal oznámení. Publikování a změny účtů vyhledávačů dělej pouze v autorizovaném rozsahu.
```

## Co je automatické

- `npm run build` nejprve spustí `prebuild`: vytvoří čtyři jazykové stránky, znovu projde kořenové HTML soubory a sestaví sitemapu. Nová indexovatelná HTML stránka se správným canonical se přidá automaticky.
- `noindex`, interní exporty, tisková kopie a dynamická stránka `case.html` se vynechají. Záměrně se nepřidávají fiktivní demo značky.
- Chybějící nebo chybný canonical a rozbité hreflang zastaví build.
- Workflow `.github/workflows/search-discovery.yml` reaguje na úspěšný produkční deployment oznámený GitHubu. Ověří živý klíč, shodu živé sitemapy a dostupnost URL, potom odešle URL do IndexNow. Lze ho také spustit ručně přes GitHub Actions.
- Workflow je nutné dostat do výchozí větve repozitáře; Vercel Git integrace musí posílat události `deployment_status` s prostředím `Production` nebo `production`. Bez této události se automaticky nespustí. První úspěšný běh ověř v GitHub Actions. Produkční build musí publikovat i `indexnow-key.txt`; jde o veřejný ověřovací soubor, nikoli administrátorský nebo servisní klíč.
- `node scripts/notify-indexnow.mjs --dry-run` ověří lokální payload bez síťových požadavků. `npm run seo:notify` pracuje pouze s již nasazenou produkcí; nepouštěj ho před publikováním.

## Jednorázově v Google Search Console

1. Otevři https://search.google.com/search-console a vyber ověřenou doménu Atmosferi.
2. V části Soubory Sitemap odešli https://www.atmosferi.com/sitemap.xml.
3. Po nasazení ověř přes Kontrolu URL jednu novou stránku v každém jazyce. Případně požádej o indexování těchto hlavních URL.
4. Další URL se objevují v aktualizované sitemapě; není nutné ručně odesílat každou stránku. Sleduj přehled indexování a opravuj konkrétní příčiny vyloučení.

Google rozhoduje o procházení a indexování. Sitemap ani IndexNow nezaručují zařazení nebo konkrétní termín. IndexNow slouží podporovaným vyhledávačům; pro Google zde používáme sitemapu a Search Console, nikoli Indexing API určené jiným typům obsahu.

Dokumentace: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
Dokumentace: https://www.indexnow.org/documentation
