import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePageSEO } from "@/hooks/use-page-seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, ArrowRight, Loader2, Search, Filter, MessageSquare, Tag, Clock } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import JsonLd from "@/components/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";



const ALL_CITIES = [
  "Praha", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", "České Budějovice", "Hradec Králové", "Pardubice", "Ústí nad Labem", "Zlín", "Havířov", "Kladno", "Most", "Opava"
];

const PublicDemandsFeed = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  usePageSEO({
    title: "Aktuální poptávky řemesel a služeb | Zrobee.cz",
    description: "Prohlédněte si nejnovější poptávky od zákazníků z celé ČR. Najděte si novou zakázku jako řemeslník nebo se inspirujte, co lidé nejčastěji řeší.",
    ogType: "website",
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("service_categories").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch public demands
  const { data: demands = [], isLoading } = useQuery({
    queryKey: ["public-demands", selectedCategory, selectedCity, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("public_demands")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }
      if (selectedCity !== "all") {
        query = query.eq("city", selectedCity);
      }
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <JsonLd
        id="demands-feed-breadcrumbs-ld"
        data={buildBreadcrumbJsonLd([
          { name: "Domů", path: "/" },
          { name: "Poptávky" },
        ])}
      />
      <Header />
      
      
      <main className="flex-grow w-full px-4 md:px-8 lg:px-[150px] pt-6 md:pt-10 pb-8 md:pb-12">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <MessageSquare className="h-3 w-3" />
              Veřejná nástěnka poptávek
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Aktuální <span className="text-primary">Poptávky</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sledujte v reálném čase, jaké služby lidé právě teď hledají. Jste profík? Získejte tyto zakázky pro sebe.
            </p>
          </div>

          {/* Filters Section */}
          <Card className="border shadow-lg rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative col-span-1 md:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Hledat v popisu..." 
                    className="pl-9 rounded-2xl h-12 bg-background/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="col-span-1">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background/50">
                      <div className="flex items-center gap-2 truncate">
                        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Kategorie" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all">Všechny kategorie</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background/50">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Město" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all">Celá ČR</SelectItem>
                      {ALL_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1">
                  <Button className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-sm">
                    Vyhledat zakázky
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demands Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
              <p className="text-muted-foreground font-medium">Načítáme nejnovější poptávky...</p>
            </div>
          ) : demands.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demands.map((demand) => (
                <Link 
                  key={demand.id} 
                  to={`/poptavka/${demand.slug}`}
                  className="group"
                >
                  <Card className="h-full border border-border/50 hover:border-primary/40 hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-card hover:bg-accent/5 cursor-pointer">
                    <CardContent className="p-6 flex flex-col h-full space-y-4">
                      <div className="flex justify-between items-start gap-2">
                        <div className="px-2.5 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/10">
                          {demand.subcategory_name || demand.category_name}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(demand.created_at), "d. M. yyyy", { locale: cs })}
                        </div>
                      </div>

                      <div className="space-y-2 flex-grow">
                        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                          {demand.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {demand.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary">
                            {demand.customer_name[0]}
                          </div>
                          <span className="text-foreground/80">{demand.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                          <MapPin className="h-3.5 w-3.5" />
                          {demand.city || "Celá ČR"}
                        </div>
                      </div>
                      
                      <Button variant="ghost" className="w-full justify-between h-10 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground">
                        Detail poptávky
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 space-y-4 bg-accent/5 rounded-3xl border-2 border-dashed border-border/50">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Žádné poptávky nenalezeny</h3>
                <p className="text-muted-foreground">Zkuste změnit filtry nebo vyhledávací dotaz.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => { setSelectedCategory("all"); setSelectedCity("all"); setSearchQuery(""); }}
                className="rounded-full"
              >
                Resetovat filtry
              </Button>
            </div>
          )}

          {/* Bottom CTA */}
          <section className="rounded-[2.5rem] bg-foreground text-background p-8 md:p-16 relative overflow-hidden text-center space-y-8">
            <div className="relative z-10 space-y-4">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                Máte také projekt, který <br className="hidden md:block" /> potřebuje <span className="text-primary italic">šikovné ruce?</span>
              </h2>
              <p className="text-background/70 text-lg max-w-2xl mx-auto">
                Zadejte svou poptávku během 2 minut. Oslovíme relevantní řemeslníky za vás a vy si jen vyberete toho nejlepšího. Zdarma a bez závazků.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  asChild
                  className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-xl hover:scale-105 transition-transform"
                >
                  <Link to="/zakaznik/nova-zakazka">Zadat poptávku zdarma</Link>
                </Button>
                <Button 
                  asChild
                  variant="outline"
                  className="h-14 px-8 rounded-full border-background/20 hover:bg-background/10 text-background font-bold text-lg"
                >
                  <Link to="/registrace-remeslnika">Chci získávat zakázky</Link>
                </Button>
              </div>
            </div>
            
            {/* Abstract Background Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -ml-32 -mb-32" />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicDemandsFeed;
