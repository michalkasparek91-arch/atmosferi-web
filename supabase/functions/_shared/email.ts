import { Resend } from "npm:resend@2.0.0";
import { render } from "react-email";
import { StandardAlert } from "./email-templates/StandardAlert.tsx";
import { MagazineTemplate } from "./email-templates/MagazineTemplate.tsx";
import { SniperTemplate } from "./email-templates/SniperTemplate.tsx";
import { SniperRecruitmentEmail } from "./email-templates/SniperRecruitmentEmail.tsx";
import { generateAtmosferiEmailHtml, EmailTemplateData } from "./EmailTemplateGenerator.ts";

// Lazily initialized to prevent Edge Function worker crashes on boot if secret is missing
let resendClient: InstanceType<typeof Resend> | null = null;

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
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string; resendId?: string }> {
  try {
    if (!resendClient) {
      const apiKey = Deno.env.get("RESEND_API_KEY");
      if (!apiKey) {
         console.error('[Email] Missing RESEND_API_KEY environment variable');
         return { success: false, error: 'Missing RESEND_API_KEY environment variable' };
      }
      resendClient = new Resend(apiKey);
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
        portfolioEnabled: payload.carouselImages && payload.carouselImages.length > 0 ? true : false,
        portfolioImages: payload.carouselImages || [],
        icebreakerEnabled: payload.greeting ? true : false,
        icebreakerText: payload.greeting || "",
        signatureEnabled: true,
        signatureName: "Ing. arch. Michal Kašpárek",
        signatureRole: "Architektonické studio",
        signatureEmail: "info@atmosferi.com",
        psEnabled: payload.psFooterEnabled ?? true,
        psText: payload.psFooterText || "Pokud nyní nemáte kapacitu, stačí odepsat \"Ne\" a už vás nebudeme kontaktovat.",
        themeColor: "#D97757"
      };
      html = generateAtmosferiEmailHtml(emailData);
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

    const { data, error } = await resendClient.emails.send({
      from: payload.from || "Zrobee <noreply@zrobee.cz>",
      to: [payload.to],
      subject: payload.subject,
      html,
    });

    if (error) {
      console.error('[Email] Failed to send:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent successfully to:', payload.to);
    return { success: true, resendId: data?.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
