import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getPageTitle, getPageDescription } from "@/lib/page-titles";

const BASE_TITLE = "Zrobee";
const SITE_ORIGIN = "https://zrobee.cz";
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/oCPGyyk46uboNosKsHsfhCvC3i02/social-images/social-1776146784229-Zrobee_Social_image.webp";

function upsertMeta(selector: string, attr: "name" | "property", attrValue: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

const OG_ENDPOINT = "https://uminqrrkflgldlfeaypn.supabase.co/functions/v1/og-image";

interface PageSEOOverride {
  title?: string;
  description?: string;
  ogType?: string;
  canonicalPath?: string;
  image?: string;
}

function dynamicOgImage(pathname: string, title: string, description: string): string {
  // Worker profile → use the worker slug for richer OG
  const workerMatch = pathname.match(/^\/remeslnik\/([^/]+)\/?$/);
  if (workerMatch) {
    return `${OG_ENDPOINT}?worker=${encodeURIComponent(workerMatch[1])}`;
  }
  // City × service landing
  const cityMatch = pathname.match(/^\/sluzby\/([^/]+)\/([^/]+)\/?$/);
  if (cityMatch) {
    const cat = cityMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const city = cityMatch[2].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${OG_ENDPOINT}?title=${encodeURIComponent(`${cat} ${city}`)}&badge=${encodeURIComponent(city)}&subtitle=${encodeURIComponent("Ověření řemeslníci ve vašem okolí")}`;
  }
  // Other non-root pages → render with title/description for unique social previews
  if (pathname !== "/" && title) {
    return `${OG_ENDPOINT}?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(description.slice(0, 100))}`;
  }
  return DEFAULT_OG_IMAGE;
}

// Routes that should never be indexed (private dashboards, settings, etc.).
// Defence in depth alongside robots.txt — if a stray internal link leaks
// the URL, the meta tag still blocks indexing.
const NOINDEX_PREFIXES = [
  "/admin",
  "/zakaznik",
  "/remeslnik/hledej",
  "/remeslnik/nabidky",
  "/remeslnik/zakazka",
  "/remeslnik/probihajici",
  "/remeslnik/profil/detail",
  "/remeslnik/profil/upravit",
  "/remeslnik/nastaveni",
  "/remeslnik/fakturace",
  "/remeslnik/zpravy",
  "/remeslnik/kalendar",
  "/remeslnik/verifikace",
  "/remeslnik/body-info",
  "/prihlaseni",
  "/registrace",
  "/reset-hesla",
  "/onboarding",
];

function shouldNoindex(pathname: string): boolean {
  // Defence in depth: never let preview/staging hosts index, even if a stray
  // sitemap or link leaks. Only the canonical zrobee.cz host is indexable.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "zrobee.cz" && host !== "www.zrobee.cz") return true;
  }
  return NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function upsertRobots(value: string) {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", "robots");
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function usePageSEO(override?: PageSEOOverride) {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = override?.title ?? getPageTitle(pathname);
    const fullTitle = title
      ? (title.includes(BASE_TITLE) ? title : `${title} | ${BASE_TITLE}`)
      : `${BASE_TITLE} - Kvalitní řemeslníci na jedné adrese`;
    document.title = fullTitle;

    const description =
      override?.description ??
      getPageDescription(pathname) ??
      (pathname.startsWith("/remeslnik/")
        ? `Profil řemeslníka na Zrobee. Prohlédněte si hodnocení, portfolio a zkušenosti profesionála pro vaše potřeby.`
        : "Najděte kvalitní řemeslníky a profesionály pro všechny vaše potřeby na Zrobee.");

    // Build canonical URL — strip trailing slash except for root, drop query/hash, all lowercase.
    const cleanPath = (override?.canonicalPath ?? pathname).replace(/\/+$/, "").toLowerCase() || "/";
    const canonical = `${SITE_ORIGIN}${cleanPath === "/" ? "/" : cleanPath}`;

    const ogImage = override?.image ?? dynamicOgImage(cleanPath, title || "", description);

    // Standard description
    upsertMeta('meta[name="description"]', "name", "description", description);

    // Robots: noindex private routes, otherwise default index,follow
    upsertRobots(shouldNoindex(pathname) ? "noindex,nofollow" : "index,follow");

    // Canonical
    upsertCanonical(canonical);

    // Hreflang (self-referencing for Czech-only site)
    let hreflang = document.head.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="cs"]');
    if (!hreflang) {
      hreflang = document.createElement("link");
      hreflang.setAttribute("rel", "alternate");
      hreflang.setAttribute("hreflang", "cs");
      document.head.appendChild(hreflang);
    }
    hreflang.setAttribute("href", canonical);

    // Open Graph
    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    upsertMeta('meta[property="og:type"]', "property", "og:type", override?.ogType ?? "website");
    upsertMeta('meta[property="og:locale"]', "property", "og:locale", "cs_CZ");
    upsertMeta('meta[property="og:image"]', "property", "og:image", ogImage);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", BASE_TITLE);

    // Twitter
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
  }, [pathname, override?.canonicalPath, override?.description, override?.image, override?.ogType, override?.title]);
}
