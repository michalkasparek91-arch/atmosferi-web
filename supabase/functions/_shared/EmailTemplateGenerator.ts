// Atmosferi° e-mail: a short personal letter in the website's style
// (white sheet on #f4f4f4, black text, grey details, no banners or buttons).
// Light HTML on purpose: it reads like a real message and stays out of the Promotions tab.

export interface EmailTemplateData {
  subject: string;
  body: string;
  heroImageEnabled: boolean;
  heroImageUrl: string;
  portfolioEnabled: boolean;
  portfolioImages: string[];
  icebreakerEnabled: boolean;
  icebreakerText: string;
  signatureEnabled: boolean;
  signatureGreeting: string;
  signatureName: string;
  signatureRole: string;
  signatureEmail: string;
  psEnabled: boolean;
  psText: string;
  themeColor: string; // kept for compatibility; the letter is monochrome
  heroCaption?: string;
  heroTagline?: string;
  signatureAvatarUrl?: string;
  isPlainText?: boolean;
  servicesWidgetEnabled?: boolean;
  servicesWidgetTitle?: string;
  service1Title?: string;
  service2Title?: string;
  service3Title?: string;
  ctaButtonEnabled?: boolean;
  ctaText?: string;
  ctaUrl?: string;
  greeting?: string;
  language?: string;
  heading?: string;      // optional title line (system e-mails); outreach letters leave it empty
}

const INK = "#0b0b0b";
const MUTE = "#6b6b6b";
const SOFT = "#9a9a9a";
const LINE = "#ececec";
const FONT = "'Geist', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function generateAtmosferiEmailHtml(data: EmailTemplateData): string {
  const t = copyFor(data.language);
  const greeting = (data.greeting || "").trim();
  const showGreeting = greeting !== "" && greeting.toLowerCase() !== "none" && !startsWithSameWord(data.body, greeting);
  const p = (html: string, extra = "") => `<p style="margin: 0 0 16px 0;${extra}">${html}</p>`;

  const heroUrl = (data.heroImageUrl || "").trim();
  const heroHtml = data.heroImageEnabled && heroUrl && heroUrl !== "none" ? `
              <img src="${heroUrl}" alt="" width="528" style="display: block; width: 100%; max-width: 528px; height: auto; border: 0; border-radius: 8px;" />
              ${data.heroCaption ? `<p style="margin: 8px 0 24px 0; font-size: 12px; line-height: 1.4; color: ${SOFT};">${data.heroCaption}</p>` : `<div style="height: 24px; line-height: 24px;">&nbsp;</div>`}` : "";

  const headingHtml = data.heading && data.heading.trim()
    ? `<h1 style="margin: 0 0 18px 0; font-family: ${FONT}; font-size: 22px; line-height: 1.25; font-weight: 600; letter-spacing: -0.02em; color: ${INK};">${data.heading}</h1>` : "";

  const icebreakerHtml = data.icebreakerEnabled && data.icebreakerText ? p(data.icebreakerText) : "";

  const servicesHtml = data.servicesWidgetEnabled ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 4px 0 20px 0;">
                <tr><td style="padding: 0 0 6px 0; font-size: 13px; color: ${MUTE};">${data.servicesWidgetTitle || t.services}</td></tr>
                ${[data.service1Title || t.s1, data.service2Title || t.s2, data.service3Title || t.s3].map(s =>
                  `<tr><td style="padding: 8px 0; border-top: 1px solid ${LINE}; font-size: 15px; color: ${INK};">${s}</td></tr>`).join("")}
              </table>` : "";

  const imgs = (data.portfolioImages || []).slice(0, 3);
  const portfolioHtml = data.portfolioEnabled && imgs.length ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 4px 0 22px 0;">
                <tr>${imgs.map((url, i) => `
                  <td width="${Math.floor(100 / imgs.length)}%" style="padding: 0 ${i < imgs.length - 1 ? 6 : 0}px 0 0; vertical-align: top;">
                    <img src="${url}" alt="" width="172" style="display: block; width: 100%; height: auto; border: 0; border-radius: 6px;" />
                  </td>`).join("")}
                </tr>
              </table>` : "";

  const ctaHtml = data.ctaButtonEnabled && data.ctaText && data.ctaUrl
    ? p(`<a href="${data.ctaUrl}" style="color: ${INK}; font-weight: 600; text-decoration: underline; text-underline-offset: 3px;">${data.ctaText}&nbsp;&rarr;</a>`, " margin-top: 4px;") : "";

  const sigEmail = data.signatureEmail || "michal@atmosferi.com";
  const signatureHtml = data.signatureEnabled ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; border-top: 1px solid ${LINE};">
                <tr>
                  <td width="56" style="padding: 20px 14px 0 0; vertical-align: top;">
                    <img src="${data.signatureAvatarUrl || "https://www.atmosferi.com/img/michal-card.jpg"}" width="44" height="44" alt="" style="display: block; width: 44px; height: 44px; border-radius: 50%; border: 0;" />
                  </td>
                  <td style="padding: 20px 0 0 0; vertical-align: top; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: ${MUTE};">
                    ${data.signatureGreeting ? `<span style="display: block;">${data.signatureGreeting}</span>` : ""}
                    <span style="display: block; font-size: 14px; font-weight: 600; color: ${INK};">${data.signatureName}</span>
                    Atmosferi&deg; &middot; ${data.signatureRole}<br />
                    <a href="mailto:${sigEmail}" style="color: ${MUTE}; text-decoration: none;">${sigEmail}</a> &middot; <a href="https://www.atmosferi.com" style="color: ${MUTE}; text-decoration: none;">atmosferi.com</a>
                  </td>
                </tr>
              </table>` : "";

  const psHtml = data.psEnabled && data.psText
    ? `<p style="margin: 22px 0 0 0; font-size: 13px; line-height: 1.5; color: ${MUTE};">P.S. ${data.psText}</p>` : "";

  const bodyHtml = (showGreeting ? p(greeting) : "") + parseBodyText(data.body);

  return `<!DOCTYPE html>
<html lang="${t.lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<title>${data.subject}</title>
<style>@media only screen and (max-width: 480px) { .at-sheet { padding: 26px 20px 22px 20px !important; } .at-wrap { padding: 12px 6px !important; } }</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td class="at-wrap" align="center" style="padding: 28px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px;">
          <tr>
            <td class="at-sheet" style="padding: 36px 36px 30px 36px; font-family: ${FONT}; font-size: 15px; line-height: 1.6; color: ${INK}; text-align: left;">
              ${heroHtml}
              ${headingHtml}
              ${icebreakerHtml}
              ${bodyHtml}
              ${servicesHtml}
              ${portfolioHtml}
              ${ctaHtml}
              ${signatureHtml}
              ${psHtml}
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0 0; font-family: ${FONT}; font-size: 12px; line-height: 1.5; color: ${SOFT};">
          atmosfer&#305;&deg; &middot; ${t.optOut} <a href="mailto:${sigEmail}?subject=${encodeURIComponent(t.optOutSubject)}" style="color: ${SOFT}; text-decoration: underline;">${t.optOutLink}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Labels in the recipient's language (templates can still override most of them).
function copyFor(language?: string) {
  const l = (language || "cz").toLowerCase();
  if (l === "cz" || l === "cs" || l === "sk") return {
    lang: "cs", services: "Co dělám", s1: "Webové stránky", s2: "3D vizualizace", s3: "Filmy a 360° prohlídky",
    optOut: "Nechcete další e-maily?", optOutLink: "Odhlásit se", optOutSubject: "Odhlásit",
  };
  if (l === "de" || l === "at" || l === "ch") return {
    lang: "de", services: "Was ich mache", s1: "Websites", s2: "3D-Visualisierung", s3: "Filme und 360°-Touren",
    optOut: "Keine weiteren E-Mails?", optOutLink: "Abmelden", optOutSubject: "Abmelden",
  };
  return {
    lang: "en", services: "What I do", s1: "Websites", s2: "3D visualisation", s3: "Films and 360° tours",
    optOut: "Prefer not to hear from me?", optOutLink: "Unsubscribe", optOutSubject: "Unsubscribe",
  };
}

// True when the body already opens with the greeting (older templates kept it inside the body).
function startsWithSameWord(body: string, greeting: string): boolean {
  const first = (s: string) => (s || "").trim().split(/[\s,!]+/)[0]?.toLowerCase() || "";
  return first(body) !== "" && first(body) === first(greeting);
}

function parseBodyText(text: string): string {
  if (!text) return "";
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\b_(.*?)_\b/g, "<em>$1</em>");
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, `$1<a href="$2" style="color: ${INK}; text-decoration: underline;">$2</a>`);

  return html.split(/\n\s*\n/).map(par => {
    const lines = par.split("\n");
    const isList = lines.some(l => l.trim().startsWith("- ") || l.trim().startsWith("• "));
    if (isList) {
      const items = lines.map(l => (l.trim().startsWith("- ") || l.trim().startsWith("• "))
        ? `<li style="margin-bottom: 6px;">${l.trim().substring(2).trim()}</li>` : l).join("");
      return `<ul style="margin: 0 0 16px 0; padding-left: 20px;">${items}</ul>`;
    }
    return `<p style="margin: 0 0 16px 0;">${par.replace(/\n/g, "<br />")}</p>`;
  }).join("\n");
}
