/**
 * Only public Atmosferi routes which support the browser's ?lang=... selector.
 * Do not attach a language to one-language SEO articles, media assets,
 * unsubscribe links or external sites. Treat template country codes as a
 * presentation locale only when the corresponding email is written in it.
 */
const MULTILINGUAL_PATHS = new Set([
  "/", "/index.html", "/for-agencies", "/for-agencies/",
  "/for-agencies.html", "/demos/atmosferi-viz/index.html",
  "/demos/atmosferi-viz/"
]);

export function emailLocale(language) {
  const code = String(language || "en").toLowerCase().trim();
  if (["cs", "cz", "sk"].includes(code)) return "cs";
  if (["de", "at", "ch"].includes(code)) return "de";
  // Finnish, Norwegian, Hungarian and US/AU campaigns currently use English copy.
  return "en";
}

export function localizeAtmosferiUrl(value, language) {
  if (!value || typeof value !== "string") return value;
  let parsed;
  try { parsed = new URL(value); } catch { return value; }
  if (!["https:", "http:"].includes(parsed.protocol)) return value;
  if (!["atmosferi.com", "www.atmosferi.com"].includes(parsed.hostname.toLowerCase())) return value;
  if (!MULTILINGUAL_PATHS.has(parsed.pathname)) return value;
  parsed.searchParams.set("lang", emailLocale(language));
  return parsed.toString();
}

/**
 * Normalize clickable URLs in the body, including bare www.atmosferi.com
 * often auto-linked by email clients. Keep punctuation and unrelated links.
 * Called before conversion to HTML AND on independently sent plain text.
 */
export function localizeEmailBody(text, language) {
  if (!text) return text;
  return String(text).replace(
    /(?<![\w@./-])(?:https?:\/\/)?(?:www\.)?atmosferi\.com(?:\/[^\s<>"')\]]*)?(?:\?[^\s<>"')\]]*)?/gi,
    (matched) => {
      const punctuation = matched.match(/[.,;!?]+$/)?.[0] || "";
      const raw = punctuation ? matched.slice(0, -punctuation.length) : matched;
      const full = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
      const localized = localizeAtmosferiUrl(full, language);
      return localized === full ? matched : localized + punctuation;
    }
  );
}
