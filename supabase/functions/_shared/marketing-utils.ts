import { createClient } from "npm:@supabase/supabase-js@2";

export interface NewsletterContent {
  subject: string;
  emoji: string;
  greeting: string;
  body: string;
  cta_text: string;
  cta_url: string;
  hero_image_url: string;
  layout_type: string;
  audience_type: string;
  articles: Array<{
    title: string;
    description: string;
    image: string;
    url: string;
  }>;
}

export async function generateNewsletterContent(supabase: any, geminiApiKey: string): Promise<NewsletterContent> {
  // 1. Gather Context (Recent Magazine Articles & Demands)
  let { data: articles } = await supabase
    .from("radce_articles")
    .select("title, content_html, slug, image_url")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!articles || articles.length === 0) {
    const { data: oldArticles } = await supabase
      .from("articles")
      .select("title, excerpt, slug, image_url")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(3);
    
    articles = (oldArticles || []).map((a: any) => ({
      title: a.title,
      content_html: a.excerpt,
      slug: a.slug,
      image_url: a.image_url
    }));
  }

  const { data: demands } = await supabase
    .from("public_demands")
    .select("title, city, description")
    .order("created_at", { ascending: false })
    .limit(3);

  // 1b. Fetch High-Performing PSEO Hubs for conversion
  const { data: pseoHubs } = await supabase
    .from("pseo_contents")
    .select("city_slug, category_id")
    .order("created_at", { ascending: false })
    .limit(3);

  const context = {
    articles: (articles || []).map((a: any) => ({
      title: a.title,
      excerpt: a.content_html?.substring(0, 150) + "...",
      image: a.image_url || `https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1200&auto=format&fit=crop`,
      url: `https://zrobee.cz/radce/${a.slug}`
    })),
    demands: demands || [],
    trendingPseo: (pseoHubs || []).map((p: any) => ({
      city: p.city_slug
    })),
    date: new Date().toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })
  };

  // 2. Call Gemini to generate newsletter
  const systemPrompt = `Jsi seniorní marketingový expert platformy Zrobee.cz. 
Tvým úkolem je vygenerovat měsíční newsletter v prémiovém "Magazine" formátu.

PRAVIDLA PRO OBRÁZKY:
- Pro hero_image_url i obrázky článků hledej vysoce kvalitní, estetické fotografie z Unsplash.
- Formát URL: https://images.unsplash.com/photo-[ID]?q=80&w=1200&auto=format&fit=crop
- Témata: Moderní interiéry, detailní záběry řemeslné práce (dřevo, barvy, cihly), minimalistická architektura, spokojení lidé v čistém domově.
- Vyhýbej se: Klišé stock fotkám, nekvalitním záběrům, chaosu.
- OBRÁZEK MUSÍ PŘÍMO ODPOVÍDAT TÉMATU NEWSLETTERU.
- TRENDING PSEO: Pokud jsou v kontextu trendingPseo, zmiň v body, že máme nové prověřené profíky v těchto městech.

Vrať POUZE validní JSON objekt:
{
  "subject": "Poutavý předmět",
  "emoji": "Vhodný emoji",
  "greeting": "Oslovení",
  "body": "Hlavní text",
  "cta_text": "Text tlačítka",
  "cta_url": "https://zrobee.cz",
  "hero_image_url": "URL z Unsplash",
  "layout_type": "magazine",
  "audience_type": "all",
  "articles": [
    { "title": "Název", "description": "Shrnutí", "image": "URL", "url": "URL" }
  ]
}

Využij tento kontext:
Články: ${JSON.stringify(context.articles)}
Poptávky: ${JSON.stringify(context.demands)}
Měsíc: ${context.date}`;

  const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4000, response_mime_type: "application/json" },
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    throw new Error(`Gemini API error ${geminiRes.status}: ${errText}`);
  }

  const geminiData = await geminiRes.json();
  const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawContent) throw new Error("AI nevrátila obsah.");

  let cleaned = rawContent.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return JSON.parse(cleaned);
}
