import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_EMAILS = ["michal.kasparek91@gmail.com", "info@pixl-viz.cz"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { slug, overrideData, targetEmail, jobId } = await req.json();

    let tpl: any = { name: overrideData?.name || "Testovací šablona", slug: "custom" };
    if (slug && slug !== "custom") {
      const { data, error } = await supabaseAdmin
        .from("email_templates")
        .select("*")
        .eq("slug", slug)
        .single();
      if (!error && data) tpl = data;
    }

    // Use overrideData if provided (for unsaved edits), otherwise use DB values
    const template = overrideData ? { ...tpl, ...overrideData } : tpl;

    // Load job data if jobId is specified and valid
    let jobData: any = null;
    if (jobId && jobId !== "default") {
      try {
        const { data: job, error: jobErr } = await supabaseAdmin
          .from("jobs")
          .select(`id, title, city, description, budget_min, budget_max, price_note, customer_id, service_subcategories(name, category_form)`)
          .eq("id", jobId)
          .single();
        
        if (!jobErr && job) {
          let custName = "Zákazník";
          if (job.customer_id) {
            const { data: p } = await supabaseAdmin
              .from("profiles")
              .select("full_name")
              .eq("id", job.customer_id)
              .single();
            if (p?.full_name) {
              custName = p.full_name;
            }
          }
          jobData = {
            ...job,
            customer_name: custName
          };
        }
      } catch (err) {
        console.error("Error loading job details for preview:", err);
      }
    }

    const previewData = (() => {
      if (!jobData) {
        return {
          osloveni: "Michale",
          jmeno: "Michal Kašpárek",
          mesto: "Praha",
          mesto_v_meste: "v Praze",
          obor: "Architektura a design",
          obor_2pad: "architekta",
          nazev_zakazky: "Návrh rodinného domu",
          popis_zakazky: "Hledám spolehlivého architekta na kompletní návrh RD.",
          cena_rozpocet: "150 000 Kč",
          rozpocet: "150 000 Kč",
          zakaznik: "Jan",
          odkaz_zakazky: "https://atmosferi.com/sdilena-zakazka/123",
          icebreaker: "Všimli jsme si vašeho skvělého portfolia na Atmosferi."
        };
      }

      const custFullName = jobData.customer_name || "Zákazník";
      const custFirstName = custFullName !== "Zákazník" && custFullName ? custFullName.split(" ")[0] : "Jan";
      const jobCat = jobData.service_subcategories?.name || "Řemeslné práce";
      const jobCatForm = jobData.service_subcategories?.category_form || jobData.service_subcategories?.name || "řemeslníka";
      const budget = jobData.price_note || (jobData.budget_min ? `${jobData.budget_min.toLocaleString('cs-CZ')} Kč` : "Není stanovena");

      // Dynamic city declension helper
      let cityIn = jobData.city ? `v ${jobData.city}` : "v okolí";
      if (jobData.city) {
        const cityLower = jobData.city.toLowerCase().trim();
        if (cityLower === "praha") {
          cityIn = "v Praze";
        } else if (cityLower === "brno") {
          cityIn = "v Brně";
        } else if (cityLower === "ostrava") {
          cityIn = "v Ostravě";
        } else if (cityLower === "plzeň") {
          cityIn = "v Plzni";
        } else if (cityLower === "liberec") {
          cityIn = "v Liberci";
        } else if (cityLower === "olomouc") {
          cityIn = "v Olomouci";
        } else if (cityLower === "hradec králové") {
          cityIn = "v Hradci Králové";
        } else if (cityLower === "české budějovice") {
          cityIn = "v Českých Budějovicích";
        } else if (cityLower === "pardubice") {
          cityIn = "v Pardubicích";
        } else if (cityLower === "ústí nad labem") {
          cityIn = "v Ústí nad Labem";
        }
      }

      return {
        osloveni: "Michale",
        jmeno: "Michal Kašpárek",
        mesto: jobData.city || "Celá ČR",
        mesto_v_meste: cityIn,
        obor: jobCat,
        obor_2pad: jobCatForm,
        nazev_zakazky: jobData.title || "Nová zakázka",
        popis_zakazky: jobData.description || "",
        cena_rozpocet: budget,
        rozpocet: budget,
        zakaznik: custFirstName,
        odkaz_zakazky: `https://atmosferi.com/sdilena-zakazka/${jobData.id}`,
        icebreaker: `Všimli jsme si vašeho skvělého profilu v oboru ${jobCat.toLowerCase()}.`
      };
    })();

    const replaceVars = (txt: string | null | undefined) => {
      if (!txt) return "";
      return txt
        .replace(/{{osloveni}}/g, previewData.osloveni)
        .replace(/{{jmeno}}/g, previewData.jmeno)
        .replace(/{{mesto_v_meste}}/g, previewData.mesto_v_meste)
        .replace(/{{mesto}}/g, previewData.mesto)
        .replace(/{{obor_2pad}}|{{podkategorie_2pad}}/g, previewData.obor_2pad)
        .replace(/{{obor}}/g, previewData.obor)
        .replace(/{{nazev_zakazky}}/g, previewData.nazev_zakazky)
        .replace(/{{popis_zakazky}}/g, previewData.popis_zakazky)
        .replace(/{{cena_rozpocet}}|{{rozpocet}}/g, previewData.cena_rozpocet)
        .replace(/{{zakaznik}}/g, previewData.zakaznik)
        .replace(/{{odkaz_zakazky}}/g, previewData.odkaz_zakazky)
        .replace(/{{icebreaker}}/g, previewData.icebreaker);
    };

    // Load magazine articles if enabled
    let magazineArticles: any[] = [];
    if (template.segment_filters?.articles_enabled) {
      try {
        const { data: articles } = await supabaseAdmin
          .from("articles")
          .select("title, excerpt, image_url, slug")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(2);
        
        if (articles && articles.length > 0) {
          magazineArticles = articles.map(a => ({
            title: a.title,
            description: a.excerpt || "",
            image: a.image_url || "https://atmosferi.com/default-article.jpg",
            url: `https://atmosferi.com/magazin/${a.slug}`
          }));
        }
      } catch (e) {
        console.error("Error loading articles for preview:", e);
      }
      
      if (magazineArticles.length === 0) {
        magazineArticles = [
          {
            title: "Jak vybrat správného architekta",
            description: "5 klíčových tipů, jak poznat profíka...",
            image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=300&q=80",
            url: "https://atmosferi.com/magazin/jak-vybrat-architekta"
          },
          {
            title: "Návrh interiéru krok za krokem",
            description: "Kompletní průvodce od plánu po realizaci...",
            image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80",
            url: "https://atmosferi.com/magazin/navrh-interieru"
          }
        ];
      }
    }

    // Parse carousel images if enabled
    let carouselImages: string[] = [];
    if (template.segment_filters?.carousel_enabled && template.segment_filters?.carousel_images) {
      carouselImages = template.segment_filters.carousel_images
        .split(",")
        .map((url: string) => url.trim())
        .filter((url: string) => url.startsWith("http"));
    }

    // Set Hero Image URL if enabled
    const heroImageUrl = template.segment_filters?.hero_image_enabled ? (template.hero_image_url || template.heroImageUrl) : undefined;

    const results: { email: string; success: boolean; error?: string }[] = [];
    const recipients = targetEmail ? [targetEmail] : (user.email ? [user.email] : TEST_EMAILS);

    for (const email of recipients) {
      const greeting = template.greeting !== undefined && template.greeting !== null
        ? (template.greeting === "" ? "none" : replaceVars(template.greeting))
        : "Ahoj Michale!";

      let ctaUrl = template.cta_url || template.ctaUrl || "https://atmosferi.com";
      if (ctaUrl.includes("/zakazka/")) {
        ctaUrl = ctaUrl.replace("/zakazka/", "/sdilena-zakazka/");
      }
      ctaUrl = replaceVars(ctaUrl);
      
      // Use the template's layout type or default to standard
      const layoutType = template.layout_type || "standard";

      const result = await sendEmail({
        from: template.sender_email,
        to: email,
        subject: `[TEST] ${replaceVars(template.subject || template.name)}`,
        title: replaceVars(template.heading || template.title || template.name),
        body: replaceVars(template.body || ""),
        emoji: template.emoji || "",
        greeting,
        ctaText: replaceVars(template.cta_text || template.ctaText || "Zobrazit"),
        ctaUrl: ctaUrl,
        secondaryText: template.secondary_text ? replaceVars(template.secondary_text) : undefined,
        layoutType: layoutType as any,
        jobCity: replaceVars(template.job_city || template.jobCity || previewData.mesto),
        jobCategory: replaceVars(template.job_category || template.jobCategory || previewData.obor),
        jobDescription: replaceVars(template.job_description || template.jobDescription || previewData.popis_zakazky),
        jobDescriptionSnippet: replaceVars(template.job_description_snippet || template.jobDescriptionSnippet || ""),
        priceNote: replaceVars(template.price_note || template.priceNote || previewData.cena_rozpocet),
        customerName: replaceVars(template.customer_name || template.customerName || previewData.zakaznik),
        urgencyBannerEnabled: template.urgency_banner_enabled ?? true,
        urgencyBannerText: replaceVars(template.urgency_banner_text || "Spěchá: Zákazník čeká na rychlou reakci. Tuto zakázku jsme právě odeslali pouze vybraným specialistům ve vašem okolí."),
        promoBannerEnabled: template.promo_banner_enabled ?? true,
        promoBannerText: replaceVars(template.promo_banner_text || "Atmosferi: Architektura & Interiéry"),
        psFooterEnabled: template.ps_footer_enabled ?? false,
        psFooterText: replaceVars(template.ps_footer_text || "P.S. Pokud si nepřejete dostávat další e-maily, napište 'Ne'."),
        showJobWidget: template.show_job_widget ?? true,
        showCtaButton: template.show_cta_button ?? true,
        
        // Modular fields
        heroImageUrl,
        carouselImages,
        articlesEnabled: template.segment_filters?.articles_enabled || false,
        magazineArticles,

        // Persisted modular attributes in segment_filters
        graphicGreetingEnabled: template.segment_filters?.graphic_greeting_enabled ?? false,
        showSubjectInBody: template.segment_filters?.show_subject_in_body ?? false,
        textAlign: template.segment_filters?.text_align || "left",
        secondaryTextBelowJob: replaceVars(template.segment_filters?.secondary_text_below_job || ""),
        previewTheme: template.segment_filters?.preview_theme || "light",
      });

      results.push({ email, ...result });
      console.log(`[TemplateTest] ${slug} → ${email}: ${result.success ? "OK" : result.error}`);
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[TemplateTest] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
