import React from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getPageTitle, getPageDescription } from "@/lib/page-titles";

/**
 * SEOManager handles global SEO defaults and dynamic metadata based on the current route.
 * It uses react-helmet-async to manage the document head.
 * Specific pages can still override these values by using their own <Helmet> or usePageSEO hook.
 */
const SEOManager = () => {
  const { pathname } = useLocation();
  
  // Build canonical URL — strip trailing slash except for root, drop query/hash, all lowercase.
  const cleanPath = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  const canonicalUrl = `https://zrobee.cz${cleanPath}`;
  
  const title = getPageTitle(pathname);
  const description = getPageDescription(pathname);
  
  const BASE_TITLE = "Zrobee";
  const fullTitle = title
    ? (title.includes(BASE_TITLE) ? title : `${title} | ${BASE_TITLE}`)
    : `${BASE_TITLE} - Kvalitní řemeslníci na jedné adrese`;

  const defaultDescription = description || (pathname.startsWith("/remeslnik/")
    ? `Profil řemeslníka na Zrobee. Prohlédněte si hodnocení, portfolio a zkušenosti profesionála pro vaše potřeby.`
    : "Najděte kvalitní řemeslníky a profesionály pro všechny vaše potřeby na Zrobee.");

  // Dynamic OG image — rendered per-route by the og-image edge function (1200×630 PNG).
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  const ogTitle = (title || BASE_TITLE).replace(` | ${BASE_TITLE}`, "").slice(0, 110);
  const ogSubtitle = (defaultDescription || "").slice(0, 140);
  const kicker = pathname === "/" ? "ZROBEE" : (pathname.split("/").filter(Boolean)[0] || "ZROBEE").toUpperCase();
  const ogImageUrl = projectId
    ? `https://${projectId}.supabase.co/functions/v1/og-image?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(ogSubtitle)}&kicker=${encodeURIComponent(kicker)}`
    : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={defaultDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang — mono-locale signal to Google */}
      <link rel="alternate" hrefLang="cs-CZ" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={defaultDescription} />
      <meta property="og:site_name" content="Zrobee" />
      <meta property="og:locale" content="cs_CZ" />
      {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
      {ogImageUrl && <meta property="og:image:width" content="1200" />}
      {ogImageUrl && <meta property="og:image:height" content="630" />}
      {ogImageUrl && <meta property="og:image:type" content="image/png" />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={defaultDescription} />
      {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
    </Helmet>
  );
};

export default SEOManager;

