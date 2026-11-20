import { render } from "react-email";
import { SniperRecruitmentEmail } from "./email-templates/SniperRecruitmentEmail.tsx";
import { generateAtmosferiEmailHtml, EmailTemplateData } from "./EmailTemplateGenerator.ts";
import { sendViaSes } from "./ses.ts";
import { sendViaSmtp } from "./smtp.ts";

export interface EmailPayload {
  to: string;
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  greeting?: string;
  language?: string;
  secondaryText?: string;
  emoji?: string;
  layoutType?: "standard" | "magazine" | "sniper" | "sniper_recruitment" | "atmosferi_studio" | "plain";
  heroImageUrl?: string;
  magazineArticles?: Array<{
    title: string;
    description: string;
    image: string;
    url: string;
  }>;
  jobCity?: string;
  signatureGreeting?: string;
  signatureRole?: string;
  signatureEmail?: string;
  jobCategory?: string;
  jobDescription?: string;
  jobDescriptionSnippet?: string;
  priceNote?: string;
  customerName?: string;
  workerName?: string;
  urgencyBannerEnabled?: boolean;
  urgencyBannerText?: string;
  promoBannerEnabled?: boolean;
  promoBannerText?: string;
  psFooterEnabled?: boolean;
  psFooterText?: string;
  showJobWidget?: boolean;
  showCtaButton?: boolean;
  graphicGreetingEnabled?: boolean;
  showSubjectInBody?: boolean;
  textAlign?: "left" | "center";
  secondaryTextBelowJob?: string;
  previewTheme?: "light" | "dark";
  carouselImages?: string[];
  articlesEnabled?: boolean;
  from?: string;
  segmentFilters?: any;
  heroCaption?: string;
  heroTagline?: string;
  provider?: 'brevo' | 'ses' | 'smtp';
  bcc?: string;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(head|style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const l = label.replace(/<[^>]+>/g, "").trim();
      return href.startsWith("mailto:") || l === href ? l : `${l} (${href})`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&deg;/g, "°").replace(/&mdash;/g, "—")
    .replace(/&middot;/g, "·").replace(/&rarr;/g, "→")
    .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string; messageId?: string; html?: string; recipientRejected?: boolean }> {
  try {
    const apiKey = Deno.env.get("BREVO_API_KEY") || Deno.env.get("RESEND_API_KEY");
    if (!apiKey && (!payload.provider || payload.provider === 'brevo')) {
       console.error('[Email] Missing BREVO_API_KEY environment variable');
       return { success: false, error: 'Missing BREVO_API_KEY environment variable' };
    }


    // Every Atmosferi e-mail uses the same light letter. Only the job-recruitment
    // layout (with a job card) keeps its own template.
    let html;
    if (payload.layoutType === "sniper_recruitment" || payload.layoutType === "sniper") {
      html = render(SniperRecruitmentEmail({
        jobTitle: payload.title,
        jobCity: payload.jobCity,
        jobCategory: payload.jobCategory,
        jobDescription: payload.jobDescription,
        jobDescriptionSnippet: payload.jobDescriptionSnippet,
        body: payload.body,
        jobPublicUrl: payload.ctaUrl,
        previewText: payload.subject,
        priceNote: payload.priceNote,
        customerName: payload.customerName,
        workerName: payload.workerName || "",
        buttonText: payload.ctaText,
        urgencyBannerEnabled: payload.urgencyBannerEnabled ?? true,
        urgencyBannerText: payload.urgencyBannerText || "Spěchá: Zákazník čeká na rychlou reakci. Tuto zakázku jsme právě odeslali pouze vybraným specialistům ve vašem okolí.",
        promoBannerEnabled: payload.promoBannerEnabled ?? true,
        promoBannerText: payload.promoBannerText || "Zaváděcí akce: Protože Zrobee právě spouštíme, první registrovaní profíci od nás získávají 100 kreditů zdarma do začátku.",
        psFooterEnabled: payload.psFooterEnabled ?? false,
        psFooterText: payload.psFooterText || "P.S. Pokud už máte plno a další zakázky teď nepotřebujete, stačí mi odepsat 'Ne' a už Vás nebudu nabídkami rušit.",
        showJobWidget: payload.showJobWidget ?? true,
        showCtaButton: payload.showCtaButton ?? true,
        secondaryText: payload.secondaryText,
        heroImageUrl: payload.heroImageUrl,
        carouselImages: payload.carouselImages,
        articlesEnabled: payload.articlesEnabled,
        magazineArticles: payload.magazineArticles,
        graphicGreetingEnabled: payload.graphicGreetingEnabled,
        showSubjectInBody: payload.showSubjectInBody,
        emoji: payload.emoji,
        textAlign: payload.textAlign,
        secondaryTextBelowJob: payload.secondaryTextBelowJob,
        previewTheme: payload.previewTheme,
      }));
    } else {
      const lang = String(payload.language || "cz").toLowerCase();
      const cs = ["cz", "cs", "sk"].includes(lang), de = ["de", "at", "ch"].includes(lang);
      const sf = payload.segmentFilters || {};
      const hero = (payload.heroImageUrl || "").trim();
      const isOutreach = payload.layoutType === "atmosferi_studio" || !!payload.greeting;
      const emailData: EmailTemplateData = {
        subject: payload.subject,
        body: payload.body || "",
        // The image is a per-template choice: shown only when the template has one.
        heroImageEnabled: !!hero && hero !== "none",
        heroImageUrl: hero,
        heroCaption: sf.hero_caption,
        heroTagline: payload.heroTagline || sf.hero_tagline,
        portfolioEnabled: (payload.carouselImages || []).length > 0,
        portfolioImages: payload.carouselImages || [],
        icebreakerEnabled: false,
        icebreakerText: "",
        signatureEnabled: true,
        signatureGreeting: payload.signatureGreeting ?? (cs ? "S pozdravem" : de ? "Mit freundlichen Grüßen" : "Best regards"),
        signatureName: payload.workerName ?? "Ing. arch. Michal Kašpárek",
        signatureRole: payload.signatureRole ?? (cs ? "web a vizualizace pro architekturu" : de ? "Web und Visualisierung für Architektur" : "web & visualisation for architecture"),
        signatureEmail: payload.signatureEmail ?? "michal@atmosferi.com",
        signatureAvatarUrl: sf.signature_avatar_url || "",
        psEnabled: payload.psFooterEnabled ?? false,
        psText: payload.psFooterText ?? "",
        themeColor: "#0b0b0b",
        servicesWidgetEnabled: sf.services_widget_enabled ?? false,
        servicesWidgetTitle: sf.services_widget_title,
        service1Title: sf.service_1_title,
        service2Title: sf.service_2_title,
        service3Title: sf.service_3_title,
        ctaButtonEnabled: payload.showCtaButton ?? true,
        ctaText: payload.ctaText,
        ctaUrl: payload.ctaUrl,
        isPlainText: sf.is_plain_text,
        greeting: payload.greeting,
        language: payload.language,
        // System e-mails carry a title line; outreach letters read as plain letters.
        heading: isOutreach ? "" : (payload.title && payload.title !== payload.subject ? payload.title : ""),
      };
      html = generateAtmosferiEmailHtml(emailData);
    }

    // Plain-text alternative: HTML-only mail scores worse with spam filters.
    const text = htmlToText(html);

    let senderName = "Atmosferi";
    let senderEmail = "michal@atmosferi.com";
    if (payload.from) {
      const match = payload.from.match(/(.*)<(.*)>/);
      if (match) {
        senderName = match[1].trim();
        senderEmail = match[2].trim();
      } else {
        senderEmail = payload.from;
      }
    }

    if (payload.provider === 'smtp') {
      const result = await sendViaSmtp({
        from: payload.from || `${senderName} <${senderEmail}>`,
        to: payload.to, subject: payload.subject, html, text,
        ...(payload.bcc ? { bcc: payload.bcc } : {}),
      });
      return { ...result, html };
    }

    // ─── Provider Routing: SES or Brevo ───
    if (payload.provider === 'ses') {
      console.log(`[Email] Routing via Amazon SES to: ${payload.to}`);
      const sesResult = await sendViaSes({
        from: payload.from || `${senderName} <${senderEmail}>`,
        to: payload.to,
        ...(payload.bcc ? { bcc: payload.bcc } : {}),
        subject: payload.subject,
        html: html,
        text,
      });
      return { success: sesResult.success, error: sesResult.error, messageId: sesResult.messageId, html: html };
    }

    // ─── Default: Brevo API ───
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: payload.to }],
        ...(payload.bcc ? { bcc: [{ email: payload.bcc }] } : {}),
        subject: payload.subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Email] Failed to send via Brevo:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log('[Email] Sent successfully via Brevo to:', payload.to);
    return { success: true, messageId: data.messageId, html: html };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
