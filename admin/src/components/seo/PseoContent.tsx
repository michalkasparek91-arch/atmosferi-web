import { getLocativeForCity, getPreposition } from "@/lib/city-regions";
import { Clock, Shield, Star, Tag, Loader2, Sparkles, CheckCircle, Lightbulb, MapPin, DollarSign, ArrowRight, ClipboardCheck, Book } from "lucide-react";
import PricingEstimateCard, { type PricingEstimateItem } from "./PricingEstimateCard";
import LocalSeoFaq from "./LocalSeoFaq";
import AiOverviewSummary from "./AiOverviewSummary";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// Hero image now rendered at page level in CityServiceLanding
import LocalMarketPulse from "./LocalMarketPulse";

export interface PricingItem {
  service: string;
  priceRange: string;
  unit?: string;
  note?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface RichPseoContent {
  intro: string;
  howItWorks?: string;
  localPricing?: PricingItem[];
  hiringTips?: string[];
  faqs?: FaqItem[];
  localInsight?: string;
  checklist?: string[];
  glossary?: { term: string; definition: string }[];
  imageAlt?: string;
  imageTheme?: string;
  metaTitle?: string;
  metaDescription?: string;
  realReviews?: { rating: number; comment: string; customerName: string }[];
  localPhotos?: string[];
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  reviewerName: string;
}

interface PseoContentProps {
  categoryName: string;
  inflectedCategory?: string | null;
  cityName: string;
  region?: string;
  baseDescription?: string | null;
  isEmpty?: boolean;
  workerCount?: number;
  averageRating?: number | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  citySlug?: string | null;
  categorySlug?: string;
  reviews?: ReviewItem[];
  fallbackPricing?: PricingEstimateItem[];
  onContentFetched?: (content: RichPseoContent) => void;
  renderMode?: "full" | "intro" | "body";
}

const PseoContent = ({ 
  categoryName, 
  cityName, 
  region, 
  baseDescription,
  isEmpty,
  workerCount,
  averageRating,
  categoryId,
  subcategoryId,
  citySlug,
  categorySlug = "",
  reviews = [],
  fallbackPricing = [],
  onContentFetched,
  renderMode = "full"
}: PseoContentProps) => {
  const locativeCity = cityName ? (getLocativeForCity(cityName) || cityName) : "celé ČR";
  const prep = cityName ? (getPreposition(cityName) || "v") : "v";

  const safeCap = (str: string | null | undefined) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  // Deterministic seed based on category and city to ensure stable but varied content
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const seed = hashString(`${categoryName}-${cityName}`);
  const introIndex = seed % 12;
  const closingIndex = (seed >> 3) % 6;

  // 1. Intro Variants Pool (12) — neutral phrasing, no declension of category name
  const intros = [
    `Hledáte spolehlivé profesionály pro službu ${categoryName}? Na Zrobee vás spojíme s těmi nejlepšími v oboru přímo ${prep} ${locativeCity}.`,
    `Potřebujete spolehlivou službu ${categoryName}? Naše platforma vám pomůže najít ověřené experty, kteří působí ${prep} ${locativeCity} a blízkém okolí.`,
    `Plánujete projekt v oboru ${categoryName}? ${safeCap(prep)} ${locativeCity} spolupracujeme s řadou šikovných odborníků, kteří mají skvělá hodnocení.`,
    `Zrobee je největší české tržiště pro službu ${categoryName}. Najděte si svého profíka ${prep} ${locativeCity} během několika minut a bez zbytečného papírování.`,
    `Kvalitní službu ${categoryName} máte ${prep} ${locativeCity} na dosah ruky. Porovnejte si nabídky od místních expertů a vyberte si tu nejlepší pro váš rozpočet.`,
    `Stojíte před realizací a hledáte službu ${categoryName}? ${safeCap(prep)} ${locativeCity} máme komunitu prověřených řemeslníků, kteří odpoví obvykle do několika hodin.`,
    `Bez zbytečného volání po známých — službu ${categoryName} si ${prep} ${locativeCity} zařídíte přes Zrobee online. Nezávazně, transparentně a s reálnými recenzemi.`,
    `Místo hledání kontaktů na sociálních sítích zkuste Zrobee. Pro službu ${categoryName} ${prep} ${locativeCity} máme připravenou síť ověřených profesionálů s reálnými hodnoceními.`,
    `Ať jde o havárii nebo plánovanou rekonstrukci — službu ${categoryName} ${prep} ${locativeCity} obstaráte přes Zrobee bez zbytečných formalit.`,
    `Službu ${categoryName} ${prep} ${locativeCity} už nemusíte řešit hodinami telefonování. Popište poptávku a nechte si nabídky přijít přímo k vám.`,
    `Spojujeme zákazníky a profíky pro službu ${categoryName} po celé ČR — a ${prep} ${locativeCity} jich máme v aktivní síti hned několik desítek.`,
    `Důvěra, transparentnost a reálné recenze — to je Zrobee. Pro službu ${categoryName} ${prep} ${locativeCity} najdete profíka, který sedne vašemu projektu i rozpočtu.`
  ];

  const [richContent, setRichContent] = useState<RichPseoContent | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [loadingDynamic, setLoadingDynamic] = useState(false);

  useEffect(() => {
    const fetchDynamicContent = async () => {
      if (!citySlug) return;
      
      try {
        setLoadingDynamic(true);
        let query = supabase
          .from('pseo_contents')
          .select('content')
          .eq('city_slug', citySlug);

        if (categoryId) {
          query = query.eq('category_id', categoryId);
        } else {
          query = query.is('category_id', null);
        }

        if (subcategoryId) {
          query = query.eq('subcategory_id', subcategoryId);
        } else {
          query = query.is('subcategory_id', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing?.content) {
          try {
            const parsed = JSON.parse(existing.content);
            if (parsed.intro && parsed.faqs) {
              setRichContent(parsed);
              if (onContentFetched) onContentFetched(parsed);
            } else {
              setRawContent(existing.content);
            }
          } catch {
            // Legacy plain text content
            setRawContent(existing.content);
          }
        }
      } catch (err) {
        console.warn('PSEO dynamic content error:', err);
      } finally {
        setLoadingDynamic(false);
      }
    };

    fetchDynamicContent();
  }, [citySlug, categoryId, subcategoryId]);

  // 6 Closing variants — each is self-contained, no global append
  const closings = [
    `Proč si vybrat odborníky přes Zrobee? Všichni naši partneři procházejí procesem ověření a jejich kvalita je potvrzena hodnocením od skutečných zákazníků. ${safeCap(prep)} ${locativeCity} tak získáte přístup k lidem, na které se můžete skutečně spolehnout.`,
    `Zrobee staví na transparentnosti — vidíte recenze, fotky z předchozích zakázek i orientační ceny. Pro projekt ${prep} ${locativeCity} si tak vyberete s rozvahou a bez tlaku.`,
    `Místní znalost se vyplácí. Naši profíci pro službu ${categoryName} znají specifika lokality ${cityName} — od typických bytových dispozic po regionální ceny materiálu.`,
    `Co dělá Zrobee jiným? Žádné skryté poplatky pro zákazníky. Popíšete poptávku, dostanete nabídky a sami si vyberete profíka ${prep} ${locativeCity} podle hodnocení a komunikace.`,
    `Naše platforma roste díky doporučením. Většina nových profíků pro službu ${categoryName} ${prep} ${locativeCity} k nám přichází na základě reference od kolegů z oboru — což garantuje kvalitu.`,
    `Šetříme váš čas i peníze. Místo obvolávání pěti firem dostanete na Zrobee nabídky pro službu ${categoryName} ${prep} ${locativeCity} obvykle během jediného dne.`
  ];

  const trustHighlights = [
    {
      icon: Shield,
      title: "Ověření řemeslníci",
      text: "Všichni naši řemeslníci prochází naším pečlivým výběrem a hodnocením.",
    },
    {
      icon: Clock,
      title: "Rychlá domluva",
      text: "Stačí pár kliknutí a do několika minut máte domluvený termín.",
    },
    {
      icon: Tag,
      title: "Férové ceny",
      text: "Předem víte, kolik za práci zaplatíte. Žádné skryté poplatky.",
    },
  ];

  // ─── RICH CONTENT RENDER (Phase 3) ───────────────────────
  if (richContent) {
    const introSection = (
      <>
        <section className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <h2 className="text-3xl md:text-5xl font-extrablack uppercase tracking-tight text-foreground mb-8 max-w-3xl mx-auto">
            Ověření profesionálové pro službu {categoryName} {cityName ? `${prep} ${locativeCity}` : "v celé ČR"}
          </h2>
          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-4xl mx-auto">{richContent.intro}</p>
        </section>
        <AiOverviewSummary
          categoryName={categoryName}
          cityName={cityName}
          workerCount={workerCount}
          averageRating={averageRating}
        />
      </>
    );

    const bodySections = (
      <div className="max-w-4xl mx-auto space-y-24 text-muted-foreground leading-relaxed text-center">
        {/* Market Pulse Block */}
        <LocalMarketPulse 
          cityName={cityName} 
          categoryName={categoryName} 
          workerCount={workerCount} 
        />

        {/* How it works */}
        {richContent.howItWorks && (
          <section className="max-w-3xl mx-auto text-center">
            <div className="space-y-8">
              <p className="text-base md:text-lg leading-relaxed text-muted-foreground/80">{richContent.howItWorks}</p>
              <div className="flex flex-col items-center gap-4">
                <div className="space-y-3 text-left w-fit mx-auto">
                  <div className="flex items-start gap-4">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <p className="text-base font-medium">Zadání poptávky zdarma a bez registrace.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <p className="text-base font-medium">Oslovení ověřených specialistů {prep} {locativeCity}.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <p className="text-base font-medium">Výběr nejlepší nabídky podle ceny a referencí.</p>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 rounded-[2.5rem] p-8 md:p-10 border border-primary/10 mt-12">
                <h4 className="font-extrablack uppercase text-lg mb-3 text-foreground tracking-tight">Garantujeme kvalitu</h4>
                <p className="text-sm text-foreground/70 leading-relaxed max-w-2xl mx-auto">
                  Každý projekt {prep} {locativeCity} je pro nás důležitý. Pokud byste nebyli s průběhem domluvy spokojeni, 
                  náš tým podpory vám pomůže najít náhradní řešení. Většina zakázek {prep} {locativeCity} začíná obhlídkou místa do 48 hodin.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Real Customer Reviews */}
        {(reviews.length > 0 || (richContent.realReviews && richContent.realReviews.length > 0)) && (
          <section className="max-w-5xl mx-auto">
            <h3 className="text-3xl md:text-5xl font-extrablack uppercase tracking-tight text-foreground mb-12 flex items-center gap-4">
              <div className="w-16 h-16 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Star className="h-8 w-8 fill-current" strokeWidth={1} />
              </div>
              Zkušenosti zákazníků {cityName ? `z okolí (${cityName})` : ""}
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {(richContent.realReviews && richContent.realReviews.length > 0 
                ? richContent.realReviews.map((r, i) => ({ id: i.toString(), rating: r.rating, comment: r.comment, reviewerName: r.customerName, created_at: null })) 
                : reviews
              ).map((review) => (
                <div key={review.id} className="p-10 rounded-[3rem] bg-background border border-border/40 shadow-none flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-6 text-foreground/80">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i >= Math.round(review.rating) ? 'text-zinc-200' : 'fill-current'}`} strokeWidth={1} />
                      ))}
                    </div>
                    <p className="text-lg italic text-foreground/80 mb-8 leading-relaxed">"{review.comment}"</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/20">
                    <span className="text-base font-bold text-foreground">{review.reviewerName}</span>
                    <span className="text-sm text-muted-foreground">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString('cs-CZ') : 'Nedávno'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Local Photos */}
        {richContent.localPhotos && richContent.localPhotos.length > 0 && (
          <section className="max-w-5xl mx-auto">
            <h3 className="text-3xl md:text-5xl font-extrablack uppercase tracking-tight text-foreground mb-12 flex items-center gap-4">
              <div className="w-16 h-16 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-8 w-8 text-primary" strokeWidth={1.5} />
              </div>
              Ukázky práce {cityName ? `z okolí (${cityName})` : ""}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {richContent.localPhotos.map((photo, i) => (
                <div key={i} className="rounded-[2rem] overflow-hidden aspect-square border border-border/40">
                  <img src={photo} alt={`Ukázka práce ${categoryName} ${cityName}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}


        {/* Hiring Tips */}
        {richContent.hiringTips && richContent.hiringTips.length > 0 && (
          <section className="max-w-5xl mx-auto">
            <h3 className="text-3xl md:text-5xl font-extrablack uppercase tracking-tight text-foreground mb-12 flex items-center gap-4">
              <div className="w-16 h-16 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Lightbulb className="h-8 w-8 fill-current" strokeWidth={1} />
              </div>
              Tipy pro výběr
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              {richContent.hiringTips.map((tip, i) => (
                <div key={i} className="rounded-[3rem] bg-background border border-border/40 p-10 flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-lg font-extrablack text-primary">{i + 1}</span>
                  </div>
                  <p className="text-lg leading-relaxed text-foreground/80">{tip}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Local Insight */}
        {richContent.localInsight && (
          <section className="max-w-4xl mx-auto rounded-[3rem] border border-primary/20 bg-primary/5 p-10 md:p-16">
            <h3 className="text-2xl md:text-3xl font-extrablack uppercase tracking-tight text-foreground mb-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6 text-primary" strokeWidth={2} />
              </div>
              Místní vhled — {cityName}
            </h3>
            <p className="text-lg leading-loose text-foreground/80">{richContent.localInsight}</p>
          </section>
        )}
        
        {/* Checklist */}
        {richContent.checklist && richContent.checklist.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-extrablack uppercase tracking-tight text-foreground mb-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-6 w-6" strokeWidth={2} />
              </div>
              Příprava před realizací
            </h3>
            <div className="bg-emerald-50/30 border border-emerald-100 rounded-[3rem] p-8 md:p-12">
              <ul className="space-y-4">
                {richContent.checklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-lg text-emerald-900/80">
                    <CheckCircle className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Glossary */}
        {richContent.glossary && richContent.glossary.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-extrablack uppercase tracking-tight text-foreground mb-8 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Book className="h-6 w-6" strokeWidth={2} />
              </div>
              Slovníček pojmů
            </h3>
            <div className="grid gap-4">
              {richContent.glossary.map((item, i) => (
                <div key={i} className="bg-blue-50/30 border border-blue-100 rounded-3xl p-6 text-left">
                  <dt className="font-bold text-blue-900 mb-1">{item.term}</dt>
                  <dd className="text-blue-800/70">{item.definition}</dd>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trust & Safety Section */}
        <section className="max-w-5xl mx-auto grid gap-8 border-y border-zinc-200 py-16 md:grid-cols-3">
          {trustHighlights.map((item) => (
            <div key={item.title} className="text-left">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900">
                <item.icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-zinc-900">{item.title}</h3>
              <p className="text-base font-normal leading-relaxed text-zinc-600">{item.text}</p>
            </div>
          ))}
        </section>

        {/* AI FAQs */}
        {richContent.faqs && richContent.faqs.length > 0 && (
          <section className="max-w-4xl mx-auto">
            <div className="mb-12 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">Než zadáte poptávku</p>
              <h3 className="mt-3 text-3xl md:text-5xl font-extrablack uppercase tracking-tight text-foreground">Časté otázky</h3>
            </div>
            <div className="space-y-6">
              {richContent.faqs.map((item) => (
                <div key={item.q} className="rounded-[3rem] bg-background p-8 md:p-10 border border-border/40 shadow-none">
                  <h4 className="font-bold text-xl leading-snug text-foreground">{item.q}</h4>
                  <p className="mt-4 text-lg leading-relaxed text-foreground/80">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Closing + Tip */}
        <section className="max-w-4xl mx-auto">
          <p className="text-xl leading-loose text-foreground/80 text-center px-4 md:px-0 mb-12">{closings[closingIndex]}</p>
        </section>

        <section className="max-w-4xl mx-auto rounded-[3rem] bg-primary/5 border border-primary/20 p-10 md:p-14 text-center">
          <h4 className="text-foreground text-2xl font-extrablack uppercase mb-6">Tip pro {cityName ? `lokalitu ${cityName}` : "úspěšnou poptávku"}</h4>
          <p className="text-lg leading-relaxed text-foreground/80">
            Nezapomeňte při zadávání poptávky uvést co nejvíce detailů a nahrát fotografie. 
            Pomůže to odborníkům {cityName ? "z okolí" : ""} přesněji odhadnout cenu a časovou náročnost pro službu <strong className="text-foreground">{categoryName}</strong>. 
            Ušetříte tak čas při následné komunikaci a dříve získáte konkrétní nabídky.
          </p>
        </section>
      </div>
    );

    if (renderMode === "intro") return introSection;
    if (renderMode === "body") return bodySections;
    return (
      <div className="space-y-24">
        {introSection}
        {bodySections}
      </div>
    );
  }

  // ─── FALLBACK TEMPLATE RENDER (original) ─────────────────
  const intro = rawContent || baseDescription || intros[introIndex];
  const fallbackIntro = (
    <>
      <section className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <h2 className="text-3xl md:text-5xl font-extrablack uppercase tracking-tight text-foreground mb-8 max-w-3xl mx-auto">
          Ověření profesionálové pro službu {categoryName} {cityName ? `${prep} ${locativeCity}` : "v celé ČR"}
        </h2>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground mb-6">
            {intro} Pokud hledáte spolehlivou službu <strong>{categoryName}</strong> {cityName ? (
              <>přímo {prep} <strong>{locativeCity}</strong></>
            ) : (
              <>kdekoli v <strong>České republice</strong></>
            )}{region ? ` (${region})` : ""}, jste na správném místě. 
          </p>
          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground">
            Naše platforma sdružuje <strong>ověřené profesionály</strong>, kteří jsou připraveni pomoci s vaším projektem, ať už jde o drobnou opravu nebo rozsáhlou realizaci. 
            Všechny spolupracovníky pečlivě vybíráme, aby splňovali naše vysoké standardy kvality a spolehlivosti.
          </p>
        </div>
      </section>
      <AiOverviewSummary
        categoryName={categoryName}
        cityName={cityName}
        workerCount={workerCount}
        averageRating={averageRating}
      />
    </>
  );

  const fallbackBody = (
    <div className="max-w-4xl mx-auto space-y-16 text-muted-foreground leading-relaxed text-center">
      {/* Market Pulse Fallback */}
      <LocalMarketPulse 
        cityName={cityName} 
        categoryName={categoryName} 
        workerCount={workerCount} 
      />

      {/* Trust & Safety Section */}
      <section className="grid gap-8 border-y border-border/40 py-12 md:grid-cols-3">
        {trustHighlights.map((item) => (
          <div key={item.title} className="text-center">
            <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border text-foreground">
              <item.icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-base font-bold text-foreground">{item.title}</h3>
            <p className="text-sm font-normal leading-relaxed text-muted-foreground/80">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="text-left space-y-6">
        <h3 className="text-2xl font-bold text-foreground">Jak vybrat nejlepšího odborníka pro lokalitu {cityName || "ČR"}?</h3>
        <p className="text-base leading-relaxed">
          Při výběru specialisty na <strong>{categoryName}</strong> {cityName ? `přímo ${prep} ${locativeCity}` : "v České republice"} je klíčová především transparentnost a ověřené reference. 
          Na Zrobee klademe velký důraz na to, aby každý profil obsahoval skutečná hodnocení od zákazníků, kteří službu reálně využili. 
          Doporučujeme vždy porovnat alespoň 3 různé nabídky, které po zadání poptávky obdržíte.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="font-bold text-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Kontrola referencí</h4>
            <p className="text-sm">Vždy se dívejte na fotky z realizací a slovní hodnocení. Kvalitní řemeslník se svou prací rád pochlubí a má stabilně dobré výsledky.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Jasná komunikace</h4>
            <p className="text-sm">Rychlost a styl odpovědi na vaši poptávku napoví mnohé o profesionalitě. Seriózní profík se ptá na detaily a navrhne řešení.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Cena a termín</h4>
            <p className="text-sm">Nejlevnější nabídka nemusí být ta nejlepší. Sledujte poměr ceny a kvality a ověřte si, zda je v ceně zahrnut i materiál a doprava.</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-foreground flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Lokální dostupnost</h4>
            <p className="text-sm">Výběrem profíka z blízkého okolí {cityName ? `(${locativeCity})` : ""} ušetříte na dopravě a usnadníte případnou následnou údržbu či servis.</p>
          </div>
        </div>
        <p className="text-base leading-relaxed pt-4">
          Naším cílem je, aby pro vás byla služba <strong>{categoryName}</strong> synonymem pro bezstarostný průběh a perfektní výsledek. 
          Právě proto neustále rozšiřujeme naši síť o další šikovné ruce a chytré hlavy po celé zemi. 
          Vložením poptávky na Zrobee získáte přístup k těm nejlepším v oboru bez zbytečného obvolávání a hledání na vlastní pěst.
        </p>
      </section>

      <section>
        <p>
          {closings[closingIndex]}
          {isEmpty && (
            <span className="ml-1 italic font-medium text-primary/80">
              Aktuálně pro vás v této lokalitě nasmlouváme další experty, abychom zajistili co nejširší výběr.
            </span>
          )}
        </p>
      </section>

      <LocalSeoFaq categoryName={categoryName} cityName={cityName} />

      <section className="rounded-3xl border border-border/60 bg-card p-6 md:p-8">
        <h4 className="text-foreground font-bold mb-2">Tip pro {cityName ? `lokalitu ${cityName}` : "úspěšnou poptávku"}:</h4>
        <p className="text-sm">
          Nezapomeňte při zadávání poptávky uvést co nejvíce detailů a nahrát fotografie. 
          Pomůže to odborníkům {cityName ? "z okolí" : ""} přesněji odhadnout cenu a časovou náročnost pro službu <strong>{categoryName}</strong>. 
          Ušetříte tak čas při následné komunikaci a dříve získáte konkrétní nabídky.
        </p>
      </section>
    </div>
  );

  if (renderMode === "intro") return fallbackIntro;
  if (renderMode === "body") return fallbackBody;

  return (
    <div className="space-y-16">
      {fallbackIntro}
      {fallbackBody}
    </div>
  );
};


export default PseoContent;
