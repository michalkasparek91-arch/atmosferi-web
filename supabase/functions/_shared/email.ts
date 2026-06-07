import { render } from "react-email";
import { StandardAlert } from "./email-templates/StandardAlert.tsx";
import { MagazineTemplate } from "./email-templates/MagazineTemplate.tsx";
import { SniperTemplate } from "./email-templates/SniperTemplate.tsx";
import { SniperRecruitmentEmail } from "./email-templates/SniperRecruitmentEmail.tsx";

export interface EmailPayload {
  to: string;
  subject: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  greeting?: string;
  secondaryText?: string;
  emoji?: string;
  layoutType?: "standard" | "magazine" | "sniper" | "sniper_recruitment" | "plain";
  heroImageUrl?: string;
  magazineArticles?: Array<{
    title: string;
    description: string;
    image: string;
    url: string;
  }>;
  jobCity?: string;
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
  fromName?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string; brevoId?: string }> {
  try {
    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) {
      console.error('[Email] Missing BREVO_API_KEY environment variable');
      return { success: false, error: 'Missing BREVO_API_KEY environment variable' };
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://tuuzehvlcpooatajyxdx.supabase.co";
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/handle-unsubscribe?email=${encodeURIComponent(payload.to)}`;

    let html;
    if (payload.layoutType === "magazine") {
      html = render(MagazineTemplate({
        subject: payload.subject,
        heroImage: payload.heroImageUrl || "",
        heroTitle: payload.title,
        heroDescription: payload.body,
        heroCtaText: payload.ctaText || "Zobrazit",
        heroCtaUrl: payload.ctaUrl || "https://atmosferi.com",
        bannerText: payload.secondaryText || "Hledáte architekta?",
        bannerCtaText: "Kontakt",
        bannerCtaUrl: "https://atmosferi.com/contact",
        mainArticles: payload.magazineArticles || [],
        unsubscribeUrl,
      }));
    } else if (payload.layoutType === "sniper_recruitment" || payload.layoutType === "sniper") {
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
        workerName: payload.workerName || (payload.greeting ? payload.greeting.replace("Dobrý den", "").replace(",", "") : ""),
        greeting: payload.greeting,
        buttonText: payload.ctaText,
        urgencyBannerEnabled: payload.urgencyBannerEnabled ?? true,
        urgencyBannerText: payload.urgencyBannerText || "Atmosferi: Architektura & Interiéry",
        promoBannerEnabled: payload.promoBannerEnabled ?? true,
        promoBannerText: payload.promoBannerText || "Spojujeme špičkové dodavatele s architekty.",
        psFooterEnabled: payload.psFooterEnabled ?? false,
        psFooterText: payload.psFooterText || "P.S. Pokud si nepřejete dostávat další e-maily, napište 'Ne'.",
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
    } else if (payload.layoutType === "plain") {
      html = render(SniperTemplate({
        subject: payload.subject,
        title: payload.title,
        body: payload.body,
        ctaText: payload.ctaText,
        ctaUrl: payload.ctaUrl,
        greeting: payload.greeting,
        emoji: payload.emoji,
      }));
    } else {
      html = render(StandardAlert({
        subject: payload.subject,
        title: payload.title,
        body: payload.body,
        ctaText: payload.ctaText,
        ctaUrl: payload.ctaUrl,
        greeting: payload.greeting,
        secondaryText: payload.secondaryText,
        emoji: payload.emoji,
        unsubscribeUrl,
      }));
    }

    const fromEmail = payload.from || "info@atmosferi.com";
    const fromName = payload.fromName || "Atmosferi";

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Email] Failed to send via Brevo:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    console.log('[Email] Sent successfully via Brevo to:', payload.to);
    return { success: true, brevoId: data.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
