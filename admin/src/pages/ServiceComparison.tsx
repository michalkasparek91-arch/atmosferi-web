import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ChevronLeft, GitCompare, Loader2, Check, Minus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import RelatedLinks from "@/components/seo/RelatedLinks";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { safeGoBack } from "@/utils/navigation";

const SITE_URL = "https://zrobee.cz";

interface SideData {
  id: string;
  name: string;
  slug: string;
  price_range: string | null;
  unit: string | null;
  description: string | null;
  category_slug: string | null;
  category_name: string | null;
}

const ServiceComparison = () => {
  const { slugs = "" } = useParams<{ slugs: string }>();
  const navigate = useNavigate();

  // Parse "slug-a-vs-slug-b" — split on the literal token "-vs-".
  const parts = slugs.split("-vs-");
  const slugA = parts[0] || "";
  const slugB = parts[1] || "";

  const { data, isLoading } = useQuery({
    queryKey: ["service-comparison", slugA, slugB],
    enabled: !!slugA && !!slugB,
    queryFn: async () => {
      const load = async (slug: string): Promise<SideData | null> => {
        const { data: sub } = await supabase
          .from("service_subcategories")
          .select("id, name, slug, price_range, unit, description, category_id")
          .eq("slug", slug)
          .maybeSingle();
        if (sub) {
          const { data: cat } = await supabase
            .from("service_categories")
            .select("slug, name")
            .eq("id", sub.category_id)
            .maybeSingle();
          return {
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            price_range: sub.price_range,
            unit: sub.unit,
            description: sub.description,
            category_slug: cat?.slug ?? null,
            category_name: cat?.name ?? null,
          };
        }
        const { data: cat } = await supabase
          .from("service_categories")
          .select("id, name, slug, description")
          .eq("slug", slug)
          .maybeSingle();
        if (!cat) return null;
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          price_range: null,
          unit: null,
          description: cat.description ?? null,
          category_slug: cat.slug,
          category_name: cat.name,
        };
      };
      const [a, b] = await Promise.all([load(slugA), load(slugB)]);
      return { a, b };
    },
  });

  const a = data?.a;
  const b = data?.b;
  const canonicalUrl = `${SITE_URL}/porovnani/${slugA}-vs-${slugB}`;
  const headlineName = a && b ? `${a.name} vs ${b.name}` : "Porovnání služeb";
  const title = a && b ? `${a.name} vs ${b.name} — porovnání cen a kdy si vybrat | Zrobee` : "Porovnání služeb | Zrobee";
  const description = a && b
    ? `Porovnání ${a.name.toLowerCase()} a ${b.name.toLowerCase()}: orientační ceny, kdy se hodí každá služba a jak rychle najít ověřeného profíka.`
    : "Porovnejte dvě řemeslné služby vedle sebe — ceny, vhodné použití a typický termín realizace.";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Domů", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Porovnání", item: canonicalUrl },
    ],
  };

  const faqLd = a && b ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Jaký je rozdíl mezi ${a.name.toLowerCase()} a ${b.name.toLowerCase()}?`,
        acceptedAnswer: { "@type": "Answer", text: `${a.name} se hodí především pro ${a.description?.split(".")[0]?.toLowerCase() || "specifické řemeslné zásahy"}, zatímco ${b.name} cílí na ${b.description?.split(".")[0]?.toLowerCase() || "jiný typ práce"}. Konkrétní doporučení dostanete od ověřeného profíka po zadání bezplatné poptávky.` },
      },
      {
        "@type": "Question",
        name: `Co je dražší — ${a.name.toLowerCase()} nebo ${b.name.toLowerCase()}?`,
        acceptedAnswer: { "@type": "Answer", text: `Orientační rozpětí: ${a.name} ${a.price_range || "se počítá individuálně"}${a.unit ? ` / ${a.unit}` : ""}, ${b.name} ${b.price_range || "se počítá individuálně"}${b.unit ? ` / ${b.unit}` : ""}. Finální cenu vždy potvrdí profík podle stavu objektu.` },
      },
      {
        "@type": "Question",
        name: "Jak rychle dostanu nabídku?",
        acceptedAnswer: { "@type": "Answer", text: "Po zadání poptávky obvykle dostáváte první nabídky během několika hodin — záleží na lokalitě a aktuální vytíženosti profíků." },
      },
    ],
  } : null;

  if (isLoading) {
    return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;
  }

  if (!a || !b) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 pt-32 text-center">
          <h1 className="text-2xl font-black uppercase">Porovnání nenalezeno</h1>
          <p className="mt-3 text-muted-foreground">Zkuste vybrat jinou kombinaci služeb v katalogu.</p>
          <Button onClick={() => navigate("/vsechny-sluzby")} className="mt-6 rounded-full">Zobrazit služby</Button>
        </main>
      </div>
    );
  }

  const rows: Array<{ label: string; aVal: string; bVal: string }> = [
    { label: "Orientační cena", aVal: a.price_range ? `${a.price_range}${a.unit ? ` / ${a.unit}` : ""}` : "individuální", bVal: b.price_range ? `${b.price_range}${b.unit ? ` / ${b.unit}` : ""}` : "individuální" },
    { label: "Kategorie", aVal: a.category_name || "—", bVal: b.category_name || "—" },
    { label: "Vhodné pro", aVal: a.description?.split(".")[0] || "univerzální použití", bVal: b.description?.split(".")[0] || "univerzální použití" },
  ];

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
      <JsonLd data={breadcrumbLd} id="comparison-breadcrumb" />
      {faqLd && <JsonLd data={faqLd} id="comparison-faq" />}
      <Header />
      <main className="w-full px-4 pb-20 pt-6 md:px-8 md:pt-10 lg:px-[150px]">
        <Button variant="ghost" size="sm" onClick={() => safeGoBack(navigate, "/vsechny-sluzby")} className="mb-6 -ml-2 rounded-full">
          <ChevronLeft className="mr-1 h-4 w-4" /> Zpět
        </Button>

        <header className="border-b border-border/50 pb-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GitCompare className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h1 className="max-w-4xl text-3xl font-black uppercase tracking-tight md:text-5xl">{headlineName}</h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Rychlé porovnání obou služeb vedle sebe — ceny, kdy se která hodí a jak rychle dostanete nabídku od ověřeného profíka.
          </p>
        </header>

        {/* AI Overviews TL;DR — explicit dl Q&A for ChatGPT/Google AI extraction */}
        <section aria-label="Stručné porovnání" className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Stručně</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight">TL;DR — {a.name} vs {b.name}</h2>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm font-bold text-foreground">Kdy {a.name.toLowerCase()}?</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{a.description?.split(".")[0] || `Hodí se pro ${a.name.toLowerCase()}.`}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-foreground">Kdy {b.name.toLowerCase()}?</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{b.description?.split(".")[0] || `Hodí se pro ${b.name.toLowerCase()}.`}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-foreground">Cena {a.name.toLowerCase()}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{a.price_range || "individuální"}{a.unit ? ` / ${a.unit}` : ""}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-foreground">Cena {b.name.toLowerCase()}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{b.price_range || "individuální"}{b.unit ? ` / ${b.unit}` : ""}</dd>
            </div>
          </dl>
        </section>

        {/* Side-by-side comparison table */}
        <section className="mt-10 rounded-3xl border border-border/60 bg-card p-6 md:p-8">
          <h2 className="text-xl font-black uppercase tracking-tight">Porovnání bod po bodu</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border/60">
            <div className="grid grid-cols-3 bg-muted/50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Parametr</span>
              <span>{a.name}</span>
              <span>{b.name}</span>
            </div>
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-3 items-start gap-4 border-t border-border/60 px-4 py-4 text-sm">
                <span className="font-medium text-muted-foreground">{row.label}</span>
                <span className="font-medium">{row.aVal}</span>
                <span className="font-medium">{row.bVal}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Dual CTAs */}
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {[a, b].map((side) => (
            <div key={side.id} className="rounded-3xl border border-border/60 bg-card p-6">
              <div className="flex items-center gap-2 text-primary"><Check className="h-4 w-4" strokeWidth={1.75} /><span className="text-xs font-bold uppercase tracking-widest">Vybrat tuto službu</span></div>
              <h3 className="mt-3 text-2xl font-black uppercase tracking-tight">{side.name}</h3>
              {side.description && <p className="mt-2 text-sm text-muted-foreground">{side.description.split(".")[0]}.</p>}
              <Button asChild className="mt-5 rounded-full">
                <Link to={`/nova-poptavka?subcategory=${side.id}`}>Získat nabídku <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              {side.category_slug && (
                <Link to={`/cenik/${side.slug}`} className="ml-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
                  Ceník <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </section>

        {/* FAQ */}
        {faqLd && (
          <section className="mt-16 pt-12 border-t border-border">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-8">Časté dotazy</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {faqLd.mainEntity.map((item, i) => (
                <div key={i} className="bg-card rounded-[2rem] p-8 border border-border/50 shadow-sm">
                  <h4 className="font-bold text-lg mb-3">{item.name}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <RelatedLinks
          links={[
            { to: `/cenik/${a.slug}`, label: `Ceník ${a.name}`, description: "Detailní ceny a faktory rozpočtu" },
            { to: `/cenik/${b.slug}`, label: `Ceník ${b.name}`, description: "Detailní ceny a faktory rozpočtu" },
            ...(a.category_slug ? [{ to: `/sluzby/${a.category_slug}`, label: a.category_name || a.name, description: "Všichni profíci v kategorii" }] : []),
            ...(b.category_slug && b.category_slug !== a.category_slug ? [{ to: `/sluzby/${b.category_slug}`, label: b.category_name || b.name, description: "Všichni profíci v kategorii" }] : []),
            { to: "/vsechny-sluzby", label: "Všechny služby", description: "Kompletní katalog řemesel" },
          ]}
        />
      </main>
      <Footer />
    </div>
  );
};

export default ServiceComparison;
