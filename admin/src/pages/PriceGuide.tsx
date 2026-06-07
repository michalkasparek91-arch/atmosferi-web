import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ChevronLeft, Coins, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/seo/RelatedLinks";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { safeGoBack } from "@/utils/navigation";

const SITE_URL = "https://zrobee.cz";

interface PriceGuideData {
  category: { id: string; name: string; slug: string; description?: string | null } | null;
  subcategory: { id: string; name: string; slug: string; price_range?: string | null; unit?: string | null; description?: string | null; category_id: string } | null;
  items: Array<{ name: string; slug: string; price_range: string | null; unit: string | null }>;
}

const PriceGuide = () => {
  const { serviceSlug = "" } = useParams<{ serviceSlug: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<PriceGuideData>({
    queryKey: ["price-guide", serviceSlug],
    enabled: !!serviceSlug,
    queryFn: async () => {
      const { data: category } = await supabase
        .from("service_categories")
        .select("id, name, slug, description")
        .eq("slug", serviceSlug)
        .maybeSingle();

      if (category) {
        const { data: items } = await supabase
          .from("service_subcategories")
          .select("name, slug, price_range, unit, sort_order")
          .eq("category_id", category.id)
          .neq("display_level", "HIDDEN")
          .not("price_range", "is", null)
          .order("sort_order", { ascending: true })
          .limit(12);

        return { category, subcategory: null, items: (items || []) as PriceGuideData["items"] };
      }

      const { data: subcategory } = await supabase
        .from("service_subcategories")
        .select("id, name, slug, price_range, unit, description, category_id")
        .eq("slug", serviceSlug)
        .maybeSingle();

      if (!subcategory) return { category: null, subcategory: null, items: [] };

      const { data: parent } = await supabase
        .from("service_categories")
        .select("id, name, slug, description")
        .eq("id", subcategory.category_id)
        .maybeSingle();

      return {
        category: parent,
        subcategory,
        items: subcategory.price_range ? [{ name: subcategory.name, slug: subcategory.slug, price_range: subcategory.price_range, unit: subcategory.unit }] : [],
      };
    },
  });

  const category = data?.category;
  const subcategory = data?.subcategory;
  const items = data?.items || [];
  const YEAR = new Date().getFullYear();
  const serviceName = subcategory?.name || category?.name || "Ceník služeb";
  const canonicalUrl = `${SITE_URL}/cenik/${serviceSlug}`;
  const title = `Ceník ${serviceName.toLowerCase()} ${YEAR} | Aktuální ceny řemeslníků`;
  const description = `Aktuální orientační ceník ${serviceName.toLowerCase()} pro rok ${YEAR}. Porovnejte běžné ceny, zjistěte, co ovlivňuje rozpočet, a získejte přesnou nabídku zdarma.`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domů", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Ceník", item: `${SITE_URL}/cenik/${serviceSlug}` },
    ],
  };

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonicalUrl}#service`,
    name: serviceName,
    url: canonicalUrl,
    provider: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Zrobee" },
    ...(items.length > 0 ? { priceRange: items.map((item) => item.price_range).filter(Boolean).join("; ") } : {}),
    hasOfferCatalog: items.length > 0 ? {
      "@type": "OfferCatalog",
      name: `Ceník ${serviceName}`,
      itemListElement: items.map((item) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: item.name },
        priceSpecification: item.price_range ? { "@type": "PriceSpecification", priceCurrency: "CZK", description: item.unit && !item.price_range.includes("/") ? `${item.price_range} / ${item.unit}` : item.price_range } : undefined,
      })),
    } : undefined,
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": `Kolik stojí ${serviceName.toLowerCase()}?`, "acceptedAnswer": { "@type": "Answer", "text": `Cena za ${serviceName.toLowerCase()} se liší podle rozsahu práce a použitých materiálů. Pro přesný odhad doporučujeme zdarma zadat poptávku na Zrobee.` } },
      { "@type": "Question", "name": "Jsou tyto ceny závazné?", "acceptedAnswer": { "@type": "Answer", "text": "Uvedené ceny jsou orientační a vycházejí z průměrných tržních hodnot. Finální cenu vždy určuje konkrétní nabídka od vybraného řemeslníka." } },
      { "@type": "Question", "name": "Jak získám přesnou cenovou nabídku?", "acceptedAnswer": { "@type": "Answer", "text": "Stačí kliknout na tlačítko 'Získat přesnou cenu', vyplnit detaily vaší poptávky a počkat na nabídky od ověřených profíků." } }
    ]
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;
  }

  if (!category && !subcategory) {
    return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-3xl px-4 pt-32 text-center"><h1 className="text-2xl font-black uppercase">Ceník nenalezen</h1><Button onClick={() => navigate("/vsechny-sluzby")} className="mt-6 rounded-full">Zobrazit služby</Button></main></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
      </Helmet>
      <JsonLd data={breadcrumbLd} id="price-guide-breadcrumb" />
      <JsonLd data={serviceLd} id="price-guide-service" />
      <JsonLd data={faqLd} id="price-guide-faq" />
      <Header />
      <main className="w-full px-4 pb-20 pt-6 md:px-8 md:pt-10 lg:px-[150px]">
        <Button variant="ghost" size="sm" onClick={() => safeGoBack(navigate, "/vsechny-sluzby")} className="mb-6 -ml-2 rounded-full">
          <ChevronLeft className="mr-1 h-4 w-4" /> Zpět
        </Button>
        <header className="border-b border-border/50 pb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Coins className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h1 className="max-w-4xl text-3xl font-black uppercase tracking-tight md:text-5xl">Ceník {serviceName.toLowerCase()} {YEAR}</h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">Aktuální orientační ceny pro rok {YEAR}. Finální rozpočet závisí na rozsahu, materiálu a termínu — přesnou nabídku získáte zdarma od ověřených profíků.</p>
          <Button asChild className="mt-6 rounded-full">
            <Link to={`/nova-poptavka${category?.id ? `?category=${category.id}${subcategory?.id ? `&subcategory=${subcategory.id}` : ""}` : ""}`}>Získat přesnou cenu <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </header>

        {/* AI Overviews TL;DR — dl Q&A block for Google AI Overviews / ChatGPT extraction */}
        <section aria-label="Stručně o cenách" className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Stručně</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">TL;DR — kolik stojí {serviceName.toLowerCase()} v roce {YEAR}?</h2>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm font-bold text-foreground">Orientační cena</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{items[0]?.price_range ? `${items[0].price_range}${items[0].unit ? ` / ${items[0].unit}` : ""}` : "Individuální podle rozsahu zakázky."}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-foreground">Co cenu ovlivní nejvíc?</dt>
              <dd className="mt-1 text-sm text-muted-foreground">Rozsah a náročnost, materiál, dostupnost lokality a požadovaný termín.</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-foreground">Jak rychle dostanu nabídku?</dt>
              <dd className="mt-1 text-sm text-muted-foreground">Obvykle během několika hodin — záleží na lokalitě a vytíženosti profíků.</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-foreground">Jak získat přesnou cenu zdarma?</dt>
              <dd className="mt-1 text-sm text-muted-foreground">Zadejte bezplatnou poptávku na Zrobee — ověření profíci vám pošlou závazné nabídky.</dd>
            </div>
          </dl>
        </section>

        {items.length > 0 && (
          <section className="mt-10 rounded-3xl border border-border/60 bg-card p-6 md:p-8">
            <h2 className="text-xl font-black uppercase tracking-tight">Orientační položky</h2>
            <div className="mt-6 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-background/60">
              {items.map((item) => (
                <div key={item.slug} className="flex items-start justify-between gap-4 px-4 py-3">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="shrink-0 text-right text-sm font-bold">{item.price_range}{item.unit && item.price_range && !item.price_range.includes("/") ? ` / ${item.unit}` : ""}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {["Rozsah a náročnost", "Materiál a doprava", "Termín realizace"].map((factor) => (
            <div key={factor} className="rounded-2xl border border-border/60 bg-card p-5">
              <h3 className="font-bold">{factor}</h3>
              <p className="mt-2 text-sm text-muted-foreground">Finální cena se vždy potvrzuje podle konkrétní poptávky a dohody s vybraným profíkem.</p>
            </div>
          ))}
        </section>

        <section className="mt-16 pt-12 border-t border-border">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Časté dotazy k cenám</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {faqLd.mainEntity.map((item, i) => (
              <div key={i} className="bg-card rounded-[2rem] p-8 border border-border/50 shadow-sm">
                <h4 className="font-bold text-lg mb-3">{item.name}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 pt-12 border-t border-border">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Hledáte {serviceName.toLowerCase()}?</h2>
          <p className="text-muted-foreground mb-6">Vyberte si město a získejte nabídky od ověřených profíků ve vašem okolí.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {["Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", "České Budějovice", "Hradec Králové"].map((city) => (
              <Link
                key={city}
                to={`/sluzby/${category?.slug || serviceSlug}/${city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`}
                className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:text-primary transition-all shadow-sm"
              >
                <span className="text-xs font-bold">{city}</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>

        {category && (
          <RelatedLinks
            links={[
              { to: `/sluzby/${category.slug}`, label: category.name, description: `Všichni profíci v kategorii ${category.name.toLowerCase()}` },
              { to: `/sluzby/${category.slug}/praha`, label: `${category.name} Praha`, description: "Profíci v hlavním městě" },
              { to: `/sluzby/${category.slug}/brno`, label: `${category.name} Brno`, description: "Profíci v Brně" },
              { to: `/sluzby/${category.slug}/ostrava`, label: `${category.name} Ostrava`, description: "Profíci v Ostravě" },
              { to: "/vsechny-sluzby", label: "Všechny služby", description: "Procházet kompletní katalog" },
              { to: "/radce", label: "Rádce a tipy", description: "Praktické články ke stavbě a domácnosti" },
            ]}
          />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PriceGuide;