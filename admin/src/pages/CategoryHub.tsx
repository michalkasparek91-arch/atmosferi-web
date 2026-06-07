import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Wrench } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CITY_COORDINATES, TOP_CITIES, cityToSlug, PRIORITY_PSEO_CITIES } from "@/lib/city-regions";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import JsonLd from "@/components/JsonLd";

const SITE_URL = "https://zrobee.cz";

const CategoryHub = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();

  const { data: category, isLoading: catLoading } = useQuery({
    queryKey: ["category-hub", categorySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!categorySlug,
  });

  const { data: subcategories = [], isLoading: subLoading } = useQuery({
    queryKey: ["category-subcategories", category?.id],
    queryFn: async () => {
      if (!category?.id) return [];
      const { data, error } = await supabase
        .from("service_subcategories")
        .select("*")
        .eq("category_id", category.id)
        .neq("display_level", "HIDDEN")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!category?.id,
  });

  const { data: relatedCategories = [] } = useQuery({
    queryKey: ["related-categories", category?.id],
    queryFn: async () => {
      if (!category?.id) return [];
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .neq("id", category.id)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!category?.id,
  });

  const Icon = getCategoryIcon(category?.icon);

  if (catLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 pt-32 text-center space-y-4">
          <h1 className="text-2xl font-black uppercase">Kategorie nenalezena</h1>
          <Button asChild>
            <Link to="/vsechny-sluzby">Zpět na služby</Link>
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domů", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Služby", item: `${SITE_URL}/vsechny-sluzby` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${SITE_URL}/sluzby/${categorySlug}` },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} podle města`,
    itemListElement: Object.keys(CITY_COORDINATES).sort().map((city, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${category.name} ${city}`,
      url: `${SITE_URL}/sluzby/${categorySlug}/${cityToSlug(city)}`,
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: `Jak najdu odborníka na ${category.name.toLowerCase()} ve svém městě?`, acceptedAnswer: { "@type": "Answer", text: "Vyberte město v katalogu Zrobee, vytvořte poptávku zdarma a porovnejte nabídky ověřených profíků z okolí." } },
      { "@type": "Question", name: "Je poptávka na Zrobee zdarma?", acceptedAnswer: { "@type": "Answer", text: "Ano, zadání poptávky je pro zákazníky zdarma a nezávazné." } },
    ],
  };

  const title = `${category.name} | Ověření řemeslníci po celé České republice`;
  const description = `Hledáte odborníka na ${category.name.toLowerCase()}? Najděte ověřené řemeslníky ve vašem městě. Mapujeme celou ČR od Prahy po Ostravu.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}/sluzby/${categorySlug}`} />
      </Helmet>

      <Header />
      <JsonLd data={breadcrumbLd} id="cat-hub-breadcrumb" />
      <JsonLd data={itemListLd} id="cat-hub-itemlist" />
      <JsonLd data={faqLd} id="cat-hub-faq" />

      <main className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-20">
        <nav className="text-[10px] md:text-xs text-muted-foreground mb-6 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-foreground">Domů</Link>
          <span>/</span>
          <Link to="/vsechny-sluzby" className="hover:text-foreground">Služby</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{category.name}</span>
        </nav>

        <header className="mb-16 md:mb-20 max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">
            Kategorie · Po celé ČR
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrablack uppercase tracking-tight leading-[1.02] text-foreground mb-5">
            {category.name}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Platforma Zrobee vám umožňuje snadno a rychle poptat <strong className="text-foreground/80 font-semibold">{category.name.toLowerCase()}</strong> kdekoli v České republice. Všechny profily jsou ověřené a obsahují reálná hodnocení od předchozích zákazníků.
          </p>
        </header>

        <div className="grid gap-16 md:grid-cols-[1fr_280px]">
          <div className="space-y-16">
            <section>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                Nejhledanější lokality
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {TOP_CITIES.map((city) => (
                  <Link
                    key={city}
                    to={`/sluzby/${categorySlug}/${cityToSlug(city)}`}
                    className="group p-4 rounded-2xl border border-border/60 bg-card hover:border-foreground/30 transition-colors flex items-center justify-between"
                  >
                    <span className="font-semibold text-foreground">{category.name} {city}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </section>

            {subcategories.length > 0 && (
              <section>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                  Specializace v kategorii
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                  {subcategories.map(sub => (
                    <li key={sub.id}>
                      <Link
                        to={`/sluzby/${categorySlug}/${sub.slug}`}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4 inline-flex items-center gap-1.5"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                Regionální přehled
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-2 gap-x-6">
                {[
                  { name: "Praha", slug: "praha" },
                  { name: "Středočeský", slug: "stredocesky" },
                  { name: "Jihočeský", slug: "jihocesky" },
                  { name: "Plzeňský", slug: "plzensky" },
                  { name: "Karlovarský", slug: "karlovarsky" },
                  { name: "Ústecký", slug: "ustecky" },
                  { name: "Liberecký", slug: "liberecky" },
                  { name: "Královéhradecký", slug: "kralovehradecky" },
                  { name: "Pardubický", slug: "pardubicky" },
                  { name: "Vysočina", slug: "vysocina" },
                  { name: "Jihomoravský", slug: "jihomoravsky" },
                  { name: "Olomoucký", slug: "olomoucky" },
                  { name: "Zlínský", slug: "zlinsky" },
                  { name: "Moravskoslezský", slug: "moravskoslezsky" }
                ].map(reg => (
                  <li key={reg.slug}>
                    <Link
                      to={`/sluzby/${categorySlug}/kraj/${reg.slug}`}
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                    >
                      {reg.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {relatedCategories.length > 0 && (
              <section>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                  Příbuzné služby
                </div>
                <div className="flex flex-wrap gap-2">
                  {relatedCategories.map(rel => (
                    <Link
                      key={rel.id}
                      to={`/sluzby/${rel.slug}`}
                      className="px-4 py-2 rounded-full border border-border/60 bg-card hover:border-foreground/30 transition-colors text-sm font-semibold"
                    >
                      {rel.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                Oblíbená města pro {category.name.toLowerCase()}
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-2 gap-x-6">
                {PRIORITY_PSEO_CITIES.map(city => (
                  <li key={city}>
                    <Link
                      to={`/sluzby/${categorySlug}/${cityToSlug(city)}`}
                      className="text-sm font-semibold text-foreground/90 hover:text-foreground hover:underline underline-offset-4"
                    >
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-5">
                Další lokality
              </div>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-1.5 gap-x-6">
                {Object.keys(CITY_COORDINATES).filter(city => !PRIORITY_PSEO_CITIES.includes(city)).sort().map(city => (
                  <li key={city}>
                    <Link
                      to={`/sluzby/${categorySlug}/${cityToSlug(city)}`}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                    >
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pt-12 border-t border-border/60">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">FAQ</div>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">Časté dotazy</h3>
              <div className="divide-y divide-border/60">
                {faqLd.mainEntity.map((item, i) => (
                  <div key={i} className="py-6">
                    <h4 className="font-semibold text-foreground text-base mb-2">{item.name}</h4>
                    <p className="text-muted-foreground leading-relaxed text-base">
                      {item.acceptedAnswer.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="sticky top-24 space-y-4">
              <div className="p-6 rounded-2xl border border-border/60 bg-card">
                <h4 className="font-semibold mb-2 text-foreground">Potřebujete pomoc hned?</h4>
                <p className="text-sm text-muted-foreground mb-5">Vložte poptávku a my ji rozešleme vhodným řemeslníkům.</p>
                <Button asChild className="w-full rounded-full font-bold">
                  <Link to={`/nova-poptavka?category=${category.id}`}>
                    Poptat zdarma
                  </Link>
                </Button>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
                <div className="px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Statistiky
                </div>
                <div className="px-6 py-3 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Ověřeno</span>
                  <span className="font-semibold text-foreground">100 %</span>
                </div>
                <div className="px-6 py-3 flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Prům. odezva</span>
                  <span className="font-semibold text-foreground">do 2 hod.</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CategoryHub;
