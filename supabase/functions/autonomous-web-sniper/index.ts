import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { getApiKeys } from "../_shared/api_keys.ts";
import { checkEmailDeliverable } from "../_shared/email_validation.ts";
import { callAIWithFallback, parseJsonArray } from "../_shared/ai-router.ts";
import { searchWeb, searchOsm, fetchSiteEmails, formatResultsForPrompt } from "../_shared/web-search.ts";

// ─────────────────────────────────────────────────────────────────────────────
// PRINCIP (převzato ze Zrobee, nahrazuje původní "AI si vzpomeň na firmy"):
// 1. Reálné vyhledávání zdarma (Firmy.cz / DuckDuckGo / Bing / Serper) + OSM.
// 2. AI extrahuje kontakty STRIKTNĚ jen z nalezeného textu → nehalucinuje
//    a funguje s JAKÝMKOLIV providerem (ne jen Gemini s groundingem).
// 3. Chybějící e-maily se dotáhnou crawlem webu firmy (regex, bez AI).
// 4. Ověření domény (MX) → do DB jdou jen doručitelné adresy.
// Díky Pollinations na konci AI řetězce běh nespadne ani při vyčerpaných kvótách.
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(p: string): string {
  if (!p) return "";
  let clean = p.replace(/\s+/g, "");
  if (!clean.startsWith("+")) {
    if (clean.length === 9) clean = "+420" + clean;
  }
  return clean;
}

async function logJobStart(supabase: any, jobName: string) {
  return await supabase.from("automation_jobs").update({
      last_run_at: new Date().toISOString(), last_run_status: "running", last_run_error: null
  }).eq("job_name", jobName);
}
async function logJobSuccess(supabase: any, jobName: string, metadata: any) {
  return await supabase.from("automation_jobs").update({
      last_run_status: "success", metadata, updated_at: new Date().toISOString()
  }).eq("job_name", jobName);
}
async function logJobFailure(supabase: any, jobName: string, error: string) {
  return await supabase.from("automation_jobs").update({
      last_run_status: "failure", last_run_error: error, updated_at: new Date().toISOString()
  }).eq("job_name", jobName);
}

async function logApiUsage(supabase: any, engine: string, serviceName: string) {
  try {
    const { error } = await supabase.from("api_usage_logs").insert({
      engine, service_name: serviceName, requests_count: 1
    });
    if (error) console.error(`Chyba pri zapisu do api_usage_logs (${engine}):`, error);
  } catch(e) { console.error("Vyjimka pri zapisu api_usage_logs:", e); }
}

function deduplicateByEmail(list: any[]): any[] {
  const seen = new Set<string>();
  return list.filter(item => {
    if (!item.email || !item.email.includes("@")) return false;
    const key = item.email.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const EXTRACT_SYSTEM =
  "Jsi precizni extraktor firemnich kontaktu. Odpovidas VZDY pouze validnim JSON polem objektu, bez markdownu a bez komentaru.";

// Celosvetovy zasobnik mest. Cim vic mest, tim vic UNIKATNICH kombinaci obor×mesto
// → tim vic novych firem za den. Klice odpovidaji nazvum zemi v CESTINE (jak je
// uklada scraper_config / jak je vraci obohacovani).
const WORLD_CITIES: Record<string, string[]> = {
  "Ceska republika": ["Praha", "Brno", "Ostrava", "Plzen", "Liberec", "Olomouc", "Ceske Budejovice", "Hradec Kralove", "Pardubice", "Zlin", "Usti nad Labem", "Jihlava", "Karlovy Vary", "Kladno", "Opava", "Mlada Boleslav", "Prostejov", "Trebic", "Tabor", "Znojmo"],
  "Slovensko": ["Bratislava", "Kosice", "Presov", "Zilina", "Nitra", "Banska Bystrica", "Trnava", "Martin", "Trencin", "Poprad", "Prievidza", "Michalovce"],
  "Nemecko": ["Berlin", "Hamburg", "Munchen", "Koln", "Frankfurt", "Stuttgart", "Dusseldorf", "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden", "Hannover", "Nurnberg", "Duisburg", "Bochum", "Wuppertal", "Bonn", "Munster", "Karlsruhe"],
  "Rakousko": ["Wien", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach", "Wels", "St. Polten", "Dornbirn"],
  "Svycarsko": ["Zurich", "Genf", "Basel", "Bern", "Lausanne", "Winterthur", "Luzern", "St. Gallen", "Lugano", "Zug"],
  "Polsko": ["Warszawa", "Krakow", "Lodz", "Wroclaw", "Poznan", "Gdansk", "Szczecin", "Bydgoszcz", "Lublin", "Katowice"],
  "Madarsko": ["Budapest", "Debrecen", "Szeged", "Miskolc", "Pecs", "Gyor", "Nyiregyhaza", "Kecskemet"],
  "Velka Britanie": ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Bristol", "Edinburgh", "Sheffield", "Cardiff", "Newcastle", "Nottingham"],
  "Irsko": ["Dublin", "Cork", "Galway", "Limerick", "Waterford"],
  "Francie": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"],
  "Spanelsko": ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Malaga", "Bilbao", "Alicante", "Palma"],
  "Italie": ["Roma", "Milano", "Napoli", "Torino", "Firenze", "Bologna", "Venezia", "Genova", "Verona", "Padova"],
  "Portugalsko": ["Lisboa", "Porto", "Braga", "Coimbra", "Faro"],
  "Nizozemsko": ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Groningen", "Tilburg"],
  "Belgie": ["Brussel", "Antwerpen", "Gent", "Charleroi", "Liege", "Brugge"],
  "Dansko": ["Kobenhavn", "Aarhus", "Odense", "Aalborg"],
  "Svedsko": ["Stockholm", "Goteborg", "Malmo", "Uppsala", "Vasteras", "Linkoping"],
  "Norsko": ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen"],
  "Finsko": ["Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku"],
  "Chorvatsko": ["Zagreb", "Split", "Rijeka", "Osijek", "Zadar", "Dubrovnik"],
  "Slovinsko": ["Ljubljana", "Maribor", "Celje", "Kranj"],
  "Rumunsko": ["Bucuresti", "Cluj-Napoca", "Timisoara", "Iasi", "Constanta", "Brasov"],
  "Recko": ["Athina", "Thessaloniki", "Patra", "Iraklio"],
  "Turecko": ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya"],
  "USA": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin", "San Francisco", "Seattle", "Denver", "Boston", "Miami", "Atlanta", "Portland", "Nashville"],
  "Kanada": ["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa", "Edmonton", "Quebec City", "Winnipeg"],
  "Australie": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Hobart"],
  "Novy Zeland": ["Auckland", "Wellington", "Christchurch", "Hamilton"],
  "Spojene arabske emiraty": ["Dubai", "Abu Dhabi", "Sharjah"],
  "Singapur": ["Singapore"],
  "Japonsko": ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Fukuoka", "Kyoto"],
  "Brazilie": ["Sao Paulo", "Rio de Janeiro", "Brasilia", "Belo Horizonte", "Curitiba", "Porto Alegre"],
  "Mexiko": ["Ciudad de Mexico", "Guadalajara", "Monterrey", "Puebla"],
  "Jizni Afrika": ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
};

// Jazykove varianty dotazu podle zeme — "kontakt e-mail" v CZ, "Kontakt E-Mail"
// v DE, "contact email" jinde. Vic ruznych dotazu = vic ruznych firem.
function queryVariants(keyword: string, city: string, country: string): string[] {
  const c = (country || "").toLowerCase();
  // 1. dotaz je ZAMERNE holy — katalogy (Firmy.cz) na nej vraci nejvic firem.
  // Dalsi dotazy cili na kontaktni stranky ve fulltextu (DDG/Bing).
  let suffixes: string[];
  if (c.includes("cesk") || c.includes("slovensk")) suffixes = ["", "kontakt e-mail", "ateliér"];
  else if (c.includes("nemeck") || c.includes("rakous") || c.includes("vcarsko")) suffixes = ["", "Kontakt E-Mail", "Impressum"];
  else if (c.includes("polsko")) suffixes = ["", "kontakt e-mail", "biuro"];
  else suffixes = ["", "contact email", "office"];
  return suffixes.map((s) => `${keyword} ${city} ${s}`.trim());
}

/**
 * Jeden harvest = jedna kombinace obor + mesto.
 * Vraci nalezene firmy + diagnostiku (aby bylo videt, PROC pripadne 0).
 */
async function harvestOne(
  supabase: any,
  keys: Record<string, string>,
  allowed: string[],
  models: Record<string, string>,
  keyword: string,
  city: string,
  country: string,
): Promise<{ list: any[]; debug: string; attempts: { provider: string; ok: boolean; error?: string }[] }> {
  // 1. Realne vysledky (zdarma, paralelne) + OSM.
  // Vic jazykovych variant dotazu × strankovani = vyrazne vic unikatnich firem.
  const variants = queryVariants(keyword, city, country);
  // POZOR: DDG/Bing/Firmy.cz pri prilis rychlem palbe zacnou vracet prazdno (throttling).
  // Varianty proto jedou SEKVENCNE s malou pauzou — pomaleji, ale s vyrazne vyssim vytezkem.
  const osmPromise = searchOsm(city, keyword);
  const searches: { results: { title: string; url: string; snippet: string }[]; engine: string }[] = [];
  for (let i = 0; i < variants.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1200));
    searches.push(await searchWeb(variants[i], 10, country, 2).catch(() => ({ results: [], engine: "err" })));
  }
  const osm = await osmPromise;

  const seenUrl = new Set<string>();
  const web = { results: [] as { title: string; url: string; snippet: string }[], engine: "" };
  const engineNames = new Set<string>();
  for (const s of searches) {
    if (s.engine && s.engine !== "none" && s.engine !== "err") engineNames.add(s.engine);
    for (const r of s.results) {
      let host = ""; try { host = new URL(r.url).hostname.replace(/^www\./, ""); } catch { continue; }
      if (!host || seenUrl.has(host)) continue;
      seenUrl.add(host);
      web.results.push(r);
    }
  }
  web.engine = [...engineNames].join("+") || "none";

  const osmDirect = (osm.places || [])
    .filter((p) => p.email)
    .map((p) => ({
      company_name: p.name, brand_name: p.name, email: p.email, phone: p.phone,
      website: p.website, city, country, language: "", full_address: p.address,
      description: "", decision_maker_name: "", last_project: "", premium_score: 50,
      _src: "osm",
    }));

  if (web.results.length === 0 && osmDirect.length === 0) {
    return { list: [], debug: `${keyword}/${city}: vyhledavani nevratilo nic (web=${web.engine}, osm=${osm.status})`, attempts: [] };
  }

  let aiList: any[] = [];
  let attempts: { provider: string; ok: boolean; error?: string }[] = [];
  let aiNote = "AI preskocena (zadne webove vysledky)";

  if (web.results.length > 0) {
    const prompt = `Nize jsou REALNE vysledky webasoveho vyhledavani pro dotaz "${keyword} ${city}".
Extrahuj z nich firmy z oboru "${keyword}" pusobici v meste ${city} (${country}).

PRISNA PRAVIDLA:
- Pouzivej VYHRADNE informace doslova obsazene v textu nize. NIC si nedomyslej.
- E-mail uved JEN pokud je v textu doslova napsany. NIKDY ho nekonstruuj z nazvu domeny.
- Web uved jen z pole URL. Pokud udaj chybi, dej prazdny retezec.
- Ignoruj katalogove/agregatorove stranky bez konkretni firmy.

Pro kazdou firmu vrat objekt s poli: company_name, brand_name (kratky hovorovy nazev bez s.r.o. a privlastku typu 'stavebni spolecnost'), email, phone, website, city, country, language (cs/de/sk/en), full_address, description (1-2 vety), decision_maker_name, last_project, premium_score (1-100).
Odpovez POUZE validnim JSON polem. Kdyz nic vhodneho nenajdes, vrat [].

VYSLEDKY VYHLEDAVANI:
${formatResultsForPrompt(web.results)}`;

    try {
      const res = await callAIWithFallback({
        supabase, keys, allowed, models,
        system: EXTRACT_SYSTEM, user: prompt, jsonMode: true,
      });
      attempts = res.attempts;
      aiList = parseJsonArray(res.text);
      await logApiUsage(supabase, res.provider, "autonomous-web-sniper");
      aiNote = `AI extrakce pres ${res.provider} → ${aiList.length}`;
    } catch (e: any) {
      aiNote = `AI selhala: ${String(e.message).slice(0, 200)}`;
    }
  }

  // 2. Slouceni AI + OSM (OSM ma prednost, ma e-mail primo ze zdroje)
  const merged: any[] = [...osmDirect];
  const seenSite = new Set(osmDirect.map((p) => (p.website || p.company_name).toLowerCase()));
  for (const a of aiList) {
    const k = String(a.website || a.company_name || "").toLowerCase();
    if (k && seenSite.has(k)) continue;
    seenSite.add(k);
    merged.push({ ...a, _src: "ai" });
  }

  // 2b. BEZ-AI ZALOHA: kdyz AI selhala (vycerpane kvoty), postavime kandidaty
  // primo z vysledku vyhledavani — nazev z titulku, e-mail z crawlu webu.
  // Diky tomu sber NIKDY neskonci na nule jen kvuli AI limitum.
  if (aiList.length === 0) {
    for (const r of web.results.slice(0, 12)) {
      const k = String(r.url || "").toLowerCase();
      const host = (() => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
      if (!host || seenSite.has(k) || seenSite.has(host)) continue;
      seenSite.add(host);
      merged.push({
        company_name: (r.title || host).replace(/\s*[|–-]\s*.*$/, "").trim().slice(0, 120),
        brand_name: "", email: "", phone: "", website: r.url, city, country,
        language: "", full_address: "", description: (r.snippet || "").slice(0, 300),
        decision_maker_name: "", last_project: "", premium_score: 50, _src: "search",
      });
    }
  }

  // 3. Dotazeni chybejicich e-mailu crawlem webu (regex, bez AI a bez kvot)
  let crawled = 0;
  // Crawl je zdarma a bez kvot (jen sitovy cas) → bezi paralelne pro vic kandidatu.
  const needEmail = merged.filter((m) => (!m.email || !String(m.email).includes("@")) && m.website).slice(0, 12);
  await Promise.all(needEmail.map(async (m) => {
    const found = await fetchSiteEmails(m.website);
    if (found.length > 0) { m.email = found[0]; crawled++; }
  }));

  // Obor si neseme s sebou — insert z nej urcuje kategorii/subkategorii leadu.
  for (const m of merged) { m._keyword = keyword; m._country = country; if (!m.city) m.city = city; }

  const withEmail = merged.filter((m) => m.email && String(m.email).includes("@"));
  const debug = `${keyword}/${city}: web=${web.engine}(${web.results.length}) osm=${osmDirect.length} ${aiNote}, crawl+${crawled} → ${withEmail.length} s e-mailem`;
  return { list: withEmail, debug, attempts };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const jobName = "Continuous Web Discovery";
  let supabase: any;

  try {
    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    await logJobStart(supabase, jobName);
    const body = await req.json().catch(() => ({}));
    const forceSearch = body.forceSearch === true;

    const { data: configData } = await supabase.from("app_settings").select("value").eq("key", "scraper_config").maybeSingle();

    const defaultConfig = {
      is_enabled: false,
      keywords: ["architekt", "interierovy design", "developer"],
      cities: [],
      countries: ["Ceska republika", "Nemecko"]
    };

    const config = configData?.value || defaultConfig;

    if (!forceSearch && config.is_enabled !== true) {
      return new Response(JSON.stringify({ ok: true, message: "Autonomous scraping is disabled." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activeKeywords = (config.active_keywords && config.active_keywords.length > 0) ? config.active_keywords : config.keywords;
    const keywords = (activeKeywords && activeKeywords.length > 0) ? activeKeywords : defaultConfig.keywords;
    const targetKeywords = body.targetKeywords && body.targetKeywords.length > 0 ? body.targetKeywords : keywords;

    const activeCountries = (config.active_countries && config.active_countries.length > 0) ? config.active_countries : config.countries;
    const countries = (activeCountries && activeCountries.length > 0) ? activeCountries : defaultConfig.countries;
    const targetCountries = body.targetCountries && body.targetCountries.length > 0 ? body.targetCountries : countries;
    const targetCountry = targetCountries[Math.floor(Math.random() * targetCountries.length)] || "Ceska republika";

    const activeCities = (config.active_cities && config.active_cities.length > 0) ? config.active_cities : config.cities;
    const configuredCities: string[] = body.targetCities && body.targetCities.length > 0 ? body.targetCities : (activeCities || []);

    const countryCities = WORLD_CITIES[targetCountry] || [];
    // Bez nakonfigurovaneho mesta se drive hledalo "naslepo" a vracelo 0.
    // Nove vzdy padneme na seznam mest dane zeme → kazdy beh neco hleda.
    let targetCities = configuredCities.filter((c: string) => countryCities.length === 0 || countryCities.includes(c));
    if (targetCities.length === 0) targetCities = countryCities;

    // Kolik kombinaci obor×mesto zpracovat v jednom behu (vic = vic kontaktu/den).
    const combosPerRun = Math.max(1, Math.min(Number(config.combos_per_run ?? 6), 15));

    // Povolene AI providery (v poradi). Pollinations doplni router vzdy na konec.
    const engineOverride = body.engine;
    const allowed: string[] = [];
    if (engineOverride) {
      allowed.push(engineOverride === "groq_places" ? "groq" : engineOverride);
    } else {
      if (config.use_gemini_engine !== false)      allowed.push("gemini");
      if (config.use_groq_places_engine === true)  allowed.push("groq");
      if (config.use_cerebras_engine === true)     allowed.push("cerebras");
      if (config.use_nvidia_engine === true)       allowed.push("nvidia");
      if (config.use_openrouter_engine === true)   allowed.push("openrouter");
      if (config.use_mistral_engine === true)      allowed.push("mistral");
      if (config.use_deepseek_engine === true)     allowed.push("deepseek");
      if (config.use_siliconflow_engine === true)  allowed.push("siliconflow");
    }

    const models: Record<string, string> = {
      gemini: config.gemini_model || "gemini-2.0-flash",
      groq: config.groq_model || "llama-3.3-70b-versatile",
      openrouter: config.openrouter_model || "nvidia/nemotron-3-ultra-550b-a55b:free",
      deepseek: config.deepseek_model || "deepseek-chat",
      siliconflow: config.siliconflow_model || "Qwen/Qwen2.5-7B-Instruct",
      cerebras: config.cerebras_model || "gpt-oss-120b",
      mistral: config.mistral_model || "mistral-large-latest",
      nvidia: config.nvidia_model || "meta/llama-3.3-70b-instruct",
    };

    const keys = await getApiKeys(supabase);

    // SYSTEMATICKE POKRYTI: drive se kombinace losovaly nahodne → stejna mesta
    // se opakovala a nove firmy dochazely. Ted projizdime CELY prostor
    // zeme×mesto×obor po poradku pomoci ulozeneho kurzoru → maximum unikatu.
    const comboSpace: { keyword: string; city: string; country: string }[] = [];
    for (const ctry of targetCountries) {
      const cities = (configuredCities.length > 0
        ? configuredCities.filter((c: string) => (WORLD_CITIES[ctry] || []).includes(c))
        : []);
      const useCities = cities.length > 0 ? cities : (WORLD_CITIES[ctry] || []);
      for (const city of useCities) {
        for (const kw of targetKeywords) comboSpace.push({ keyword: kw, city, country: ctry });
      }
    }
    // Zaloha, kdyby zeme nebyla v mape mest.
    if (comboSpace.length === 0) {
      for (const kw of targetKeywords) comboSpace.push({ keyword: kw, city: targetCities[0] || "", country: targetCountry });
    }

    let cursor = 0;
    try {
      const { data: curData } = await supabase.from("app_settings").select("value").eq("key", "harvest_cursor").maybeSingle();
      cursor = Number(curData?.value?.index ?? 0) || 0;
    } catch { /* zacneme od nuly */ }

    const combos: { keyword: string; city: string; country: string }[] = [];
    for (let i = 0; i < combosPerRun; i++) combos.push(comboSpace[(cursor + i) % comboSpace.length]);
    const nextCursor = (cursor + combosPerRun) % comboSpace.length;
    try {
      await supabase.from("app_settings").upsert(
        { key: "harvest_cursor", value: { index: nextCursor, space: comboSpace.length, updated_at: new Date().toISOString() } },
        { onConflict: "key" }
      );
    } catch (e) { console.error("harvest_cursor upsert selhal", e); }

    console.log(`Harvest: ${combos.length}/${comboSpace.length} kombinaci (kurzor ${cursor}→${nextCursor}), retezec: ${allowed.join(">") || "(bez klicu)"}`);

    // Davky po 2 kombinacich — dost paralelismu na rychlost, ale ne tolik,
    // aby nas vyhledavace zablokovaly (pak by vracely prazdno).
    const results: { list: any[]; debug: string; attempts: any[] }[] = [];
    for (let i = 0; i < combos.length; i += 2) {
      const batch = combos.slice(i, i + 2);
      const settled = await Promise.all(
        batch.map((c) => harvestOne(supabase, keys, allowed, models, c.keyword, c.city, c.country)
          .catch((e) => ({ list: [] as any[], debug: `${c.keyword}/${c.city}: chyba ${e.message}`, attempts: [] })))
      );
      results.push(...settled);
    }

    let allDiscovered: any[] = [];
    const debugParts: string[] = [];
    const allAttempts: { provider: string; ok: boolean; error?: string }[] = [];
    for (const r of results) {
      allDiscovered = allDiscovered.concat(r.list);
      debugParts.push(r.debug);
      allAttempts.push(...r.attempts);
    }

    // Zdravi providera podle toho, jak dopadl v routeru (drzi UI karty aktualni).
    try {
      const { data: healthData } = await supabase.from("app_settings").select("value").eq("key", "api_health").maybeSingle();
      const currentHealth = healthData?.value || {};
      const nowIso = new Date().toISOString();
      const okProviders = new Set(allAttempts.filter(a => a.ok).map(a => a.provider));
      const seenProv = new Set<string>();
      for (const a of allAttempts) {
        if (seenProv.has(a.provider)) continue;
        seenProv.add(a.provider);
        const prev = currentHealth[a.provider] || {};
        const discovered = allDiscovered.length;
        if (okProviders.has(a.provider)) {
          currentHealth[a.provider] = { ...prev, status: "ok", message: "OK", updated_at: nowIso, last_success_at: nowIso, last_run_discovered: discovered };
        } else {
          currentHealth[a.provider] = { ...prev, status: "error", message: a.error || "selhalo", updated_at: nowIso };
        }
      }
      await supabase.from("app_settings").upsert({ key: "api_health", value: currentHealth }, { onConflict: "key" });
    } catch (e) {
      console.error("Failed to update api_health", e);
    }

    const discoveredList = deduplicateByEmail(allDiscovered);

    if (discoveredList.length === 0) {
      await logJobSuccess(supabase, jobName, { discovered_count: 0, combos: combos.length, debug_output: debugParts.join(" | ") });
      return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: debugParts.join(" | ") }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let newSavedCount = 0;
    let missingEmailCount = 0;
    let duplicateCount = 0;
    let invalidEmailCount = 0;
    let lastInsertError = null;

    for (const item of discoveredList) {
      if (!item.email || !item.email.includes("@")) {
          missingEmailCount++;
          continue;
      }
      const cleanEmail = item.email.toLowerCase().trim();

      // Overeni doruicitelnosti (syntax + MX) — chrani reputaci odesilatele.
      const emailCheck = await checkEmailDeliverable(cleanEmail);
      if (!emailCheck.valid) { invalidEmailCount++; continue; }

      const { data: pExist } = await supabase.from("profiles").select("id").eq("email", cleanEmail).maybeSingle();
      if (pExist) { duplicateCount++; continue; }
      const { data: lExist } = await supabase.from("marketing_leads").select("id").eq("email", cleanEmail).maybeSingle();
      if (lExist) { duplicateCount++; continue; }

      // Zeme se bere z konkretni kombinace (jeden beh miva vic zemi).
      const itemCountry = String(item._country || targetCountry);
      let marketId = "cz";
      const tc = itemCountry.toLowerCase();
      if (tc.includes("cesk") || tc.includes("czech")) marketId = "cz";
      else if (tc.includes("nemeck") || tc.includes("deutsch") || tc.includes("german")) marketId = "de";
      else if (tc.includes("rakous") || tc.includes("austria") || tc.includes("sterreich")) marketId = "at";
      else if (tc.includes("slovensko") || tc.includes("slovak")) marketId = "sk";
      else if (tc.includes("australi")) marketId = "au";
      else if (tc.includes("finsko") || tc.includes("finland")) marketId = "f";
      else if (tc.includes("usa") || tc.includes("united states")) marketId = "us";
      else if (tc.includes("vcarsko") || tc.includes("switzerland") || tc.includes("schweiz")) marketId = "ch";
      else if (tc.includes("norsko") || tc.includes("norway")) marketId = "no";
      // Vsechny ostatni zeme sveta → univerzalni anglicka sada sablon ("en").
      // Drive se sem dosazoval jazyk od AI (fr/it/ja…), na ktery neexistovala
      // zadna sablona → lead se nikdy neoslovil.
      else marketId = "en";

      const kwForCat = String(item._keyword || "").toLowerCase();
      let categoryId = "architekti";
      if (kwForCat.includes("interier") || kwForCat.includes("design")) categoryId = "interiery";
      else if (kwForCat.includes("develop")) categoryId = "developeri";
      else if (kwForCat.includes("urban") || kwForCat.includes("verejn")) categoryId = "urbanismus";
      else if (kwForCat === "samostatny architekt") categoryId = "architekt";

      const { data: newLead, error: insertErr } = await supabase.from("marketing_leads").insert({
          email: cleanEmail,
          full_name: item.company_name || "B2B Partner",
          company_name: item.company_name || "B2B Partner",
          phone: normalizePhone(item.phone || ""),
          website: item.website || "",
          city: item.city || "Nezname mesto",
          country: item.country || itemCountry,
          language: marketId,
          ai_icebreaker: null,
          decision_maker_name: item.decision_maker_name || null,
          last_project: item.last_project || null,
          premium_score: item.premium_score ? parseInt(item.premium_score) : null,
          full_address: item.full_address || `${item.city || ""}, ${itemCountry}`,
          category: categoryId,
          subcategory: item._keyword || null,
          description: item.description || "Nalezeno autonomne",
          company_description: item.description || "Nalezeno autonomne",
          source: "ai_web_sniper",
      }).select().single();

      if (!insertErr && newLead) newSavedCount++;
      else if (insertErr) lastInsertError = insertErr.message;
    }

    const skipReport = `(zahozeno: ${missingEmailCount} bez mailu, ${invalidEmailCount} neplatnych/bez MX, ${duplicateCount} duplicit)`;
    const finalDebug = `${debugParts.join(" | ")} | ${skipReport}`;

    await logJobSuccess(supabase, jobName, { discovered_count: newSavedCount, combos: combos.length, debug_output: finalDebug });

    if (newSavedCount === 0 && discoveredList.length > 0) {
       return new Response(JSON.stringify({
         ok: true, discovered_count: 0, total_found_by_ai: discoveredList.length,
         message: `Nalezeno, ale preskoceno ${skipReport}.`,
         debug_output: `${finalDebug} | DB chyba: ${lastInsertError || "zadna"}`
       }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, discovered_count: newSavedCount, message: "Hotovo.", debug_output: finalDebug }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    if (supabase) await logJobFailure(supabase, jobName, err.message);
    return new Response(JSON.stringify({ ok: true, discovered_count: 0, debug_output: `INTERNI CHYBA FUNKCE: ${String(err.message || err)}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
