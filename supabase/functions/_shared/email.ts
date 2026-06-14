import { render } from "react-email";
import { StandardAlert } from "./email-templates/StandardAlert.tsx";
import { MagazineTemplate } from "./email-templates/MagazineTemplate.tsx";
import { SniperTemplate } from "./email-templates/SniperTemplate.tsx";
import { SniperRecruitmentEmail } from "./email-templates/SniperRecruitmentEmail.tsx";
import { generateAtmosferiEmailHtml, EmailTemplateData } from "./EmailTemplateGenerator.ts";

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
  layoutType?: "standard" | "magazine" | "sniper" | "sniper_recruitment";
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
  carouselImages?: string[];
  articlesEnabled?: boolean;
  from?: string;
  segmentFilters?: any;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string; resendId?: string }> {
  try {
    const apiKey = Deno.env.get("BREVO_API_KEY") || Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
       console.error('[Email] Missing BREVO_API_KEY environment variable');
       return { success: false, error: 'Missing BREVO_API_KEY environment variable' };
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://uminqrrkflgldlfeaypn.supabase.co";
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/handle-unsubscribe?email=${encodeURIComponent(payload.to)}`;

    let html;
    if (payload.layoutType === "magazine") {
      html = render(MagazineTemplate({
        subject: payload.subject,
        heroImage: payload.heroImageUrl || "",
        heroTitle: payload.title,
        heroDescription: payload.body,
        heroCtaText: payload.ctaText || "Zobrazit",
        heroCtaUrl: payload.ctaUrl || "https://zrobee.cz",
        bannerText: payload.secondaryText || "Hledáte řemeslníka?",
        bannerCtaText: "Zadat poptávku",
        bannerCtaUrl: "https://zrobee.cz/zadat-poptavku",
        mainArticles: payload.magazineArticles || [],
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
    } else if (payload.layoutType === "atmosferi_studio" || payload.layoutType as string === "atmosferi_studio") {
      const emailData: EmailTemplateData = {
        subject: payload.subject,
        body: payload.body || "",
        heroImageEnabled: payload.heroImageUrl ? true : false,
        heroImageUrl: payload.heroImageUrl || "https://atmosferi.com/demos/atmosferi-viz/img/02-ascension.webp",
        heroCaption: payload.segmentFilters?.hero_caption,
        portfolioEnabled: payload.carouselImages && payload.carouselImages.length > 0 ? true : false,
        portfolioImages: payload.carouselImages || [],
        icebreakerEnabled: false,
        icebreakerText: "",
        signatureEnabled: true,
        signatureName: "Ing. arch. Michal Kašpárek",
        signatureRole: "Architektonické studio",
        signatureEmail: "info@atmosferi.com",
        psEnabled: payload.psFooterEnabled ?? true,
        psText: payload.psFooterText || "Pokud nyní nemáte kapacitu, stačí odepsat \"Ne\" a už vás nebudeme kontaktovat.",
        themeColor: "#D97757",
        servicesWidgetEnabled: payload.segmentFilters?.services_widget_enabled ?? false,
        servicesWidgetTitle: payload.segmentFilters?.services_widget_title,
        service1Title: payload.segmentFilters?.service_1_title,
        service2Title: payload.segmentFilters?.service_2_title,
        service3Title: payload.segmentFilters?.service_3_title,
        ctaButtonEnabled: payload.showCtaButton ?? true,
        ctaText: payload.ctaText,
        ctaUrl: payload.ctaUrl,
      };
      html = generateAtmosferiEmailHtml(emailData);
    } else if (payload.layoutType === "plain") {
      html = render(SniperTemplate({
        subject: payload.subject,
        title: payload.title,
        body: payload.body,
        ctaText: payload.ctaText,
        ctaUrl: payload.ctaUrl,
        emoji: payload.emoji,
      }));
    } else {
      html = render(StandardAlert({
        subject: payload.subject,
        title: payload.title,
        body: payload.body,
        ctaText: payload.ctaText,
        ctaUrl: payload.ctaUrl,
        secondaryText: payload.secondaryText,
        emoji: payload.emoji,
        unsubscribeUrl,
      }));
    }

    let senderName = "Atmosferi";
    let senderEmail = "info@atmosferi.com";
    if (payload.from) {
      const match = payload.from.match(/(.*)<(.*)>/);
      if (match) {
        senderName = match[1].trim();
        senderEmail = match[2].trim();
      } else {
        senderEmail = payload.from;
      }
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
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
    console.log('[Email] Sent successfully to:', payload.to);
    return { success: true, resendId: data.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
