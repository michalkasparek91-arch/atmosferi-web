// Jediný zdroj pravdy pro rozpoznání katalogů, portálů a žebříčků.
// Používá ho sběrač (aby se balast neuložil) i kvalifikace (aby ho AI
// nepustila dál). Deterministické pravidlo má přednost před úsudkem AI —
// test ukázal, že model označil "Top 20 Architekten Wels, 2026" jako
// skutečnou firmu, takže samotné AI na tohle nestačí.

export const BLOCKED_DOMAINS = [
  "immobilienscout24", "immowelt", "immonet", "willhaben", "edireal", "remax", "century21",
  "engelvoelkers", "sreality", "bezrealitky", "reality.idnes", "firmy.cz", "zlatestranky",
  "herold.at", "gelbeseiten", "11880", "yelp", "yellowpages", "panoramafirm", "gecheckt",
  "google.", "facebook.", "instagram.", "linkedin.", "pinterest.", "youtube.", "twitter.", "x.com",
  "wikipedia.", "booking.", "tripadvisor.", "indeed.", "jobs.", "archdaily", "dezeen", "houzz",
  "medium.com", "seznam.cz", "mapy.cz", "wko.at", "europages", "kompass.com",
];

const DIRECTORY_WORDS =
  /(^home \[|top\s?\d+|nejlep|best\s|finden|vergleich|ranking|seznam\s|katalog|directory|portál|portal|übersicht|prehled|přehled|liste\b|list of|srovn)/i;

// Žebříčky a přehledy mívají v názvu letopočet ("Top 20 Architekten Wels, 2026").
const LISTICLE = /\b(19|20)\d{2}\b/;

export function looksLikeDirectory(name: string, website: string, email: string): boolean {
  const hay = `${website} ${email}`.toLowerCase();
  if (BLOCKED_DOMAINS.some((d) => hay.includes(d))) return true;

  const n = (name || "").trim();
  if (!n || n.length > 80) return true;            // titulek stránky, ne název firmy
  if (DIRECTORY_WORDS.test(n)) return true;
  if (LISTICLE.test(n)) return true;               // název s letopočtem = článek/žebříček
  if (/^(kauf|verkauf|prodej|pronájem|miete)/i.test(n)) return true;
  return false;
}
