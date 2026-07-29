// Hybridní webové vyhledávání pro AI extrakci (anti-halucinace).
// Princip: AI modely bez přístupu na net si firmy a e-maily VYMÝŠLEJÍ → hard bounces.
// Řešení: nejdřív stáhnout REÁLNÉ výsledky vyhledávání (zdarma, bez klíče),
// a AI nechat extrahovat STRIKTNĚ jen z nich. Díky tomu funguje JAKÝKOLI provider
// (nejen Gemini s groundingem) — což je klíč k odolnosti proti výpadkům kvót.
//
// SERPER_API_KEY (Supabase secret) je volitelný — bez něj se jede přes DDG/Bing.

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Lokalizace vyhledávání podle cílové země (atmosferi cílí CZ/SK/DE/AT/CH…).
function localeFor(country: string): { gl: string; hl: string; kl: string; cc: string } {
  const c = (country || "").toLowerCase();
  if (c.includes("nemeck") || c.includes("deutsch") || c.includes("german")) return { gl: "de", hl: "de", kl: "de-de", cc: "de" };
  if (c.includes("rakous") || c.includes("austria") || c.includes("sterreich")) return { gl: "at", hl: "de", kl: "at-de", cc: "at" };
  if (c.includes("slovensk") || c.includes("slovak")) return { gl: "sk", hl: "sk", kl: "sk-sk", cc: "sk" };
  if (c.includes("vcarsko") || c.includes("switzerland") || c.includes("schweiz")) return { gl: "ch", hl: "de", kl: "ch-de", cc: "ch" };
  return { gl: "cz", hl: "cs", kl: "cz-cs", cc: "cz" };
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function searchViaSerper(query: string, limit: number, loc: ReturnType<typeof localeFor>): Promise<WebSearchResult[]> {
  const key = Deno.env.get("SERPER_API_KEY");
  if (!key) return [];
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: loc.gl, hl: loc.hl, num: Math.min(limit, 20) }),
  });
  if (!res.ok) { console.warn(`[web-search] Serper ${res.status}`); return []; }
  const data = await res.json();
  return (data?.organic || [])
    .filter((r: any) => r?.link)
    .map((r: any) => ({ title: r.title || "", url: r.link, snippet: r.snippet || "" }));
}

// Bezplatný zdroj č.1: lite.duckduckgo.com (POST). Klasický html.duckduckgo.com
// vrací botům anti-bot stránku; lite endpoint funguje spolehlivě.
async function searchViaDuckDuckGoLite(query: string, limit: number, loc: ReturnType<typeof localeFor>, offset = 0): Promise<WebSearchResult[]> {
  const res = await fetch("https://lite.duckduckgo.com/lite/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: "q=" + encodeURIComponent(query) + "&kl=" + loc.kl + (offset > 0 ? `&s=${offset}&dc=${offset}` : ""),
  });
  if (!res.ok) { console.warn(`[web-search] DDG lite ${res.status}`); return []; }
  const html = await res.text();
  if (/anomaly|captcha/i.test(html)) { console.warn("[web-search] DDG lite anti-bot"); return []; }
  const results: WebSearchResult[] = [];
  const linkRe = /href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/g;
  const snips = [...html.matchAll(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g)].map(m => stripTags(m[1]));
  let m: RegExpExecArray | null; let i = 0;
  while ((m = linkRe.exec(html)) && results.length < limit) {
    let url = m[1];
    const uddg = url.match(/uddg=([^&]+)/);
    if (uddg) { try { url = decodeURIComponent(uddg[1]); } catch { /* keep */ } }
    if (!/^https?:\/\//.test(url)) { i++; continue; }
    results.push({ title: stripTags(m[2]), url, snippet: snips[i] || "" });
    i++;
  }
  return results;
}

// Bezplatný zdroj č.2: Bing HTML.
async function searchViaBing(query: string, limit: number, loc: ReturnType<typeof localeFor>, offset = 0): Promise<WebSearchResult[]> {
  const res = await fetch("https://www.bing.com/search?q=" + encodeURIComponent(query) + `&setlang=${loc.hl}&cc=${loc.cc}` + (offset > 0 ? `&first=${offset + 1}` : ""), {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) { console.warn(`[web-search] Bing ${res.status}`); return []; }
  const html = await res.text();
  const results: WebSearchResult[] = [];
  const blocks = html.split('class="b_algo"').slice(1, limit + 3);
  for (const block of blocks) {
    const linkM = block.match(/<h2[^>]*>\s*<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkM) continue;
    const url = linkM[1];
    if (/\.bing\.com|microsoft\.com/i.test(url)) continue;
    const snipM = block.match(/<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/) || block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    results.push({ title: stripTags(linkM[2]), url, snippet: snipM ? stripTags(snipM[1]) : "" });
    if (results.length >= limit) break;
  }
  return results;
}

// Firmy.cz — český katalog se strukturovanými JSON-LD daty (název, adresa, telefon,
// a v `sameAs` i VLASTNÍ web firmy). Jen pro CZ; jinde se přeskočí.
async function searchViaFirmyCz(query: string, limit: number): Promise<WebSearchResult[]> {
  const res = await fetch("https://www.firmy.cz/?q=" + encodeURIComponent(query), { headers: { "User-Agent": UA } });
  if (!res.ok) { console.warn(`[web-search] Firmy.cz ${res.status}`); return []; }
  const html = await res.text();
  const out: WebSearchResult[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let obj: any; try { obj = JSON.parse(m[1]); } catch { continue; }
    for (const o of (Array.isArray(obj) ? obj : [obj])) {
      if (!o || !/LocalBusiness|Organization|Store/i.test(o["@type"] || "")) continue;
      const a = o.address || {};
      const sameAs: string[] = ([] as string[]).concat(o.sameAs || [], o.url || []).filter(Boolean);
      const ownSite = sameAs.find((u) => u && !/firmy\.cz/i.test(u));
      const url = ownSite || sameAs[0] || "";
      if (!url) continue;
      const snippet = [o.name, a.streetAddress, a.addressLocality, a.postalCode, o.telephone ? "tel: " + o.telephone : ""]
        .filter(Boolean).join(", ");
      out.push({ title: o.name || "", url, snippet });
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return out;
}

// OpenStreetMap / Overpass — zdarma, bez klíče. Řada firem má v OSM přímo e-mail.
export interface OsmPlace { name: string; website: string; email: string; phone: string; address: string; }

// Mapovani oboru na OSM tagy. Dotaz podle TAGU (ne podle nazvu) funguje v kazdem
// jazyce — finska firma se jmenuje "arkkitehti", ne "architekt", takze puvodni
// hledani podle nazvu v cizich zemich nikdy nic nenaslo.
function osmTagsFor(keyword: string): string[] {
  const k = (keyword || "").toLowerCase();
  if (k.includes("interier") || k.includes("interiér") || k.includes("design")) return ['"shop"="interior_decoration"', '"office"="interior_design"'];
  if (k.includes("develop")) return ['"office"="property_management"', '"office"="estate_agent"'];
  if (k.includes("realit") || k.includes("makl")) return ['"office"="estate_agent"'];
  if (k.includes("stavebn") || k.includes("stavitel")) return ['"office"="construction_company"', '"craft"="builder"'];
  return ['"office"="architect"'];
}

export async function searchOsm(city: string, keyword: string): Promise<{ places: OsmPlace[]; status: string }> {
  const tags = osmTagsFor(keyword);
  const parts = tags.map((t) => `nwr(area.a)[${t}];`).join("");
  const q = `[out:json][timeout:15];
area["name"="${(city || "").replace(/["\\]/g, "")}"]["boundary"="administrative"]->.a;
( ${parts} );
out tags center 60;`;
  // Veřejná Overpass instance bývá přetížená (504) → zkoušíme i zrcadla.
  const MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];
  try {
    // Zrcadla bezi PARALELNE jako zavod. Drive sekvencne 3x20 s = az minuta na
    // jednu kombinaci, coz pretahovalo casovy limit edge funkce a beh nikdy nedobehl.
    const attempt = async (url: string): Promise<Response> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "AtmosferiHarvester/1.0 (atmosferi.com)" },
          body: "data=" + encodeURIComponent(q),
          signal: ctrl.signal,
        });
        if (!r.ok) throw new Error(`OSM ${r.status}`);
        return r;
      } finally { clearTimeout(t); }
    };
    let res: Response;
    try { res = await Promise.any(MIRRORS.map(attempt)); }
    catch { return { places: [], status: "OSM nedostupne" }; }
    const data = await res.json();
    const places: OsmPlace[] = (data.elements || []).map((el: any) => ({
      name: el.tags?.name || "",
      website: el.tags?.website || el.tags?.["contact:website"] || "",
      email: el.tags?.email || el.tags?.["contact:email"] || "",
      phone: el.tags?.phone || el.tags?.["contact:phone"] || "",
      address: [el.tags?.["addr:street"], el.tags?.["addr:housenumber"], el.tags?.["addr:city"] || city].filter(Boolean).join(" "),
    })).filter((p: OsmPlace) => p.name && (p.website || p.email));
    return { places, status: "OK" };
  } catch (e) {
    return { places: [], status: `OSM error: ${(e as Error).message}` };
  }
}

const hostKey = (u: string) => { try { return new URL(/^https?:\/\//.test(u) ? u : "https://" + u).hostname.replace(/^www\./, ""); } catch { return (u || "").toLowerCase(); } };

/**
 * Reálné výsledky vyhledávání — všechny zdroje BĚŽÍ PARALELNĚ a slévají se
 * (dedup dle domény). Nikdy nevyhazuje výjimku.
 */
export async function searchWeb(query: string, limit = 10, country = "Ceska republika", pages = 2): Promise<{ results: WebSearchResult[]; engine: string }> {
  const loc = localeFor(country);
  const isCz = loc.cc === "cz";
  const wrap = (name: string, p: Promise<WebSearchResult[]>) =>
    p.then((r) => ({ name, r })).catch((e) => { console.warn(`[web-search] ${name} selhal: ${(e as Error).message}`); return { name, r: [] as WebSearchResult[] }; });

  const tasks = [wrap("serper", searchViaSerper(query, limit, loc))];
  // Strankovani: kazda dalsi strana prinasi dalsi firmy (zdarma, bez klice).
  for (let p = 0; p < Math.max(1, pages); p++) {
    tasks.push(wrap(p === 0 ? "ddg-lite" : `ddg-p${p + 1}`, searchViaDuckDuckGoLite(query, limit, loc, p * 20)));
    tasks.push(wrap(p === 0 ? "bing" : `bing-p${p + 1}`, searchViaBing(query, limit, loc, p * 10)));
  }
  if (isCz) tasks.unshift(wrap("firmy", searchViaFirmyCz(query, limit)));

  const settled = await Promise.all(tasks);
  const seen = new Set<string>();
  const merged: WebSearchResult[] = [];
  const engines: string[] = [];
  for (const { name, r } of settled) {
    if (r.length > 0) engines.push(name);
    for (const item of r) {
      const k = hostKey(item.url);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      merged.push(item);
    }
  }
  return { results: merged.slice(0, Math.max(limit * 2, 30)), engine: engines.join("+") || "none" };
}

// ── Extrakce e-mailů z webu (search najde firmu, tady dotáhneme e-mail) ──
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BAD_SUFFIX = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.pdf', '.css', '.js'];

export function extractEmails(text: string): string[] {
  const m = (text || "").match(EMAIL_RE);
  if (!m) return [];
  return [...new Set(m.map(e => e.toLowerCase().trim()))].filter(e =>
    e.length >= 5 && e.length <= 80 &&
    !BAD_SUFFIX.some(x => e.endsWith(x)) &&
    !/(example|domain\.com|yourdomain|sentry|wixpress|\.png@)/.test(e)
  );
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; AtmosferiBot/1.0)" }, signal: ctrl.signal });
    if (!res.ok) return "";
    return await res.text();
  } catch { return ""; } finally { clearTimeout(t); }
}

/** Stáhne homepage (a kontaktní podstránku) a vytáhne e-maily. Nikdy nevyhazuje. */
export async function fetchSiteEmails(website: string): Promise<string[]> {
  if (!website) return [];
  let base = website.trim();
  if (!/^https?:\/\//.test(base)) base = "https://" + base;
  let origin = "";
  try { origin = new URL(base).origin; } catch { return []; }

  const home = await fetchText(base);
  let emails = extractEmails(home);
  if (emails.length > 0) return emails;

  const linkM = home.match(/href="([^"]*(?:kontakt|contact|impressum)[^"]*)"/i);
  const candidates = new Set<string>();
  if (linkM) { try { candidates.add(new URL(linkM[1], origin).href); } catch { /* skip */ } }
  for (const p of ["/kontakt", "/kontakty", "/contact", "/impressum", "/kontakt.html"]) candidates.add(origin + p);

  for (const c of candidates) {
    const html = await fetchText(c);
    emails = extractEmails(html);
    if (emails.length > 0) return emails;
  }
  return [];
}

/** Výsledky zformátované pro prompt (číslované bloky s URL a úryvkem). */
export function formatResultsForPrompt(results: WebSearchResult[]): string {
  return results.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n");
}
