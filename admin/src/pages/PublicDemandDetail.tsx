import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePageSEO } from "@/hooks/use-page-seo";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Calendar, 
  Tag, 
  User, 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  Briefcase,
  CheckCircle2,
  Lock,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import JsonLd from "@/components/JsonLd";
import { getCategoryIconBySlug } from "@/utils/categoryIcons";
import { safeGoBack } from "@/utils/navigation";

const PublicDemandDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: job, isLoading, error } = useQuery({
    queryKey: ["public-demand", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("public_demands")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  usePageSEO({
    title: job ? `${job.title} - ${job.city || "ČR"} | Zrobee.cz` : "Poptávka | Zrobee.cz",
    description: job 
      ? `Detail poptávky: ${job.description.substring(0, 160)}... Poptává ${job.customer_name} z lokality ${job.city || "ČR"}.`
      : "Prohlédněte si detail poptávky na Zrobee.cz.",
    ogType: "article",
    canonicalPath: job ? `/poptavka/${job.slug}` : undefined
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground flex flex-col items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 animate-spin border-2 border-primary border-t-transparent" />
            Načítáme detail poptávky...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Helmet>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center p-4 text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center text-muted-foreground">
            <Tag className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tight">Tato poptávka už není aktivní</h1>
            <p className="text-muted-foreground max-w-md mx-auto text-lg">
              Poptávka byla pravděpodobně již obsazena nebo ji zákazník smazal.
            </p>
          </div>
          <div className="pt-4 space-y-4">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/nova-poptavka">Vložit novou poptávku zdarma</Link>
            </Button>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/poptavky">Procházet všechny poptávky</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-full">
                <Link to="/vsechny-sluzby">Prohlížet řemeslníky</Link>
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isExpired = job.status !== 'open';

  const Icon = getCategoryIconBySlug(job.category_slug || "");

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": job.created_at,
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Zrobee.cz",
        "logo": "https://zrobee.cz/zrobee-logo.svg"
    },
      ...(job.deadline_date && { "validThrough": new Date(job.deadline_date).toISOString() }),
      ...(job.budget_max && {
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "CZK",
          "value": {
            "@type": "QuantitativeValue",
            "value": Number(job.budget_max),
            "unitText": "JOB"
          }
        }
      }),
      "employmentType": "CONTRACTOR",
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.city || "Česká republika",
        "addressCountry": "CZ"
      }
    }
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Domů", "item": "https://zrobee.cz/" },
      { "@type": "ListItem", "position": 2, "name": "Poptávky", "item": "https://zrobee.cz/poptavky" },
      { "@type": "ListItem", "position": 3, "name": job.title, "item": `https://zrobee.cz/poptavka/${job.slug}` }
    ]
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isExpired && (
        <Helmet>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
      )}
      <Header />
      {!isExpired && (
        <>
          <JsonLd data={schemaData} id="demand-schema" />
          <JsonLd data={breadcrumbData} id="demand-breadcrumb" />
        </>
      )}
      
      <main className="flex-grow w-full px-4 md:px-8 lg:px-[150px] pt-6 md:pt-10 pb-8 md:pb-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Navigation */}
          <Button 
            variant="ghost" 
            onClick={() => safeGoBack(navigate, '/poptavky')}
            className="-ml-2 text-muted-foreground hover:text-foreground rounded-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na poptávky
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 bg-primary/10 text-primary border-none font-bold uppercase tracking-wider text-[10px]">
                    {job.category_name}
                  </Badge>
                  <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 border-border font-medium text-[10px]">
                    {job.subcategory_name}
                  </Badge>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                  {job.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{job.city || "Celá ČR"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Zadáno {format(new Date(job.created_at), "d. MMMM yyyy", { locale: cs })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>
                      Status: 
                      {isExpired ? (
                        <strong className="text-muted-foreground ml-1">Neaktivní</strong>
                      ) : (
                        <strong className="text-green-600 ml-1">Aktivní</strong>
                      )}
                    </span>
                  </div>
                </div>

                {isExpired && (
                  <div className="p-6 bg-accent/5 border border-border rounded-3xl space-y-3 mt-6">
                    <div className="flex items-center gap-2 text-destructive font-bold">
                      <Lock className="h-5 w-5" />
                      Tato poptávka už není aktivní
                    </div>
                    <p className="text-muted-foreground">
                      Zákazník již vybral dodavatele nebo byla poptávka ukončena. Podívejte se na podobné služby a poptávky.
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <Button asChild size="sm" className="rounded-full">
                        <Link to="/nova-poptavka">Vytvořit vlastní poptávku zdarma</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="rounded-full">
                        <Link to={`/sluzby/${job.category_slug}`}>
                          Zobrazit {job.category_name} {job.city ? `v okolí ${job.city}` : ''}
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Card className="border-border shadow-sm rounded-3xl overflow-hidden bg-card">
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Popis poptávky
                    </h2>
                    <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-lg">
                      {job.description}
                    </div>
                  </div>

                  {job.price_note && (
                    <div className="p-4 rounded-2xl bg-accent/5 border border-border/50">
                      <h4 className="text-sm font-bold text-foreground mb-1">Poznámka k rozpočtu:</h4>
                      <p className="text-sm text-muted-foreground">{job.price_note}</p>
                    </div>
                  )}

                  {job.photos && job.photos.length > 0 && (
                    <div className="space-y-4 pt-4">
                      <h2 className="text-xl font-bold">Přiložené fotografie</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {job.photos.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-2xl overflow-hidden border">
                            <img src={photo} alt={`Foto zakázky ${i+1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Safety & Trust block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm">Ověřený proces</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Všechny poptávky na Zrobee procházejí základní validací e-mailu a telefonu.</p>
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-accent/5 border border-border/50 flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-accent/10 flex items-center justify-center text-foreground">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm">Bez poplatků</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">Zákazníci u nás neplatí za zadání poptávky ani za kontaktování řemeslníkem.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Sidebar */}
            <div className="space-y-6">
              <Card className="border-primary/20 shadow-xl rounded-3xl overflow-hidden bg-primary/5 sticky top-24">
                <CardContent className="p-6 md:p-8 space-y-6 text-center">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight">Chcete tuto zakázku?</h3>
                    <p className="text-sm text-muted-foreground">
                      Zobrazujeme pouze část informací. Pro zaslání nabídky se prosím zaregistrujte jako řemeslník.
                    </p>
                  </div>

                  <div className="space-y-3 pt-4">
                    <Button asChild className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg">
                      <Link to="/registrace-remeslnika">Chci tuhle práci</Link>
                    </Button>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <Lock className="h-3 w-3" />
                      Bezpečné a rychlé přihlášení
                    </p>
                  </div>

                  <div className="pt-6 border-t border-primary/10 space-y-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Zákazník</span>
                        <span className="text-sm font-bold">{job.customer_name}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-background/50 border border-border/40 text-xs italic text-muted-foreground">
                      &quot;Příjmení a přesnou adresu uvidíte až po přijetí vaší nabídky zákazníkem.&quot;
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Related/Explore block */}
              <div className="p-6 rounded-3xl border border-dashed border-border flex flex-col items-center text-center space-y-4">
                <Tag className="h-8 w-8 text-muted-foreground/30" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">Hledáte něco jiného?</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">Máme stovky dalších aktivních poptávek v kategorii {job.category_name}.</p>
                </div>
                <Button variant="outline" asChild className="h-10 rounded-full text-xs">
                  <Link to="/poptavky" className="flex items-center gap-2">
                    Prohlížet všechny poptávky
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicDemandDetail;
