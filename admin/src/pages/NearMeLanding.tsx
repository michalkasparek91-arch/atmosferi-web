import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Target, Crosshair, Map, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { cityToSlug } from "@/lib/city-regions";
import JsonLd from "@/components/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

export default function NearMeLanding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLocate = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Váš prohlížeč nepodporuje geolokaci.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10&addressdetails=1`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.county;
          
          if (city) {
            navigate(`/mesta/${cityToSlug(city)}`);
          } else {
            navigate('/vsechny-sluzby');
          }
        } catch (err) {
          setError("Nepodařilo se zjistit město podle vaší polohy.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Přístup k poloze byl zamítnut.");
        setLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Řemeslníci blízko mě | Nejbližší služby v okolí na Zrobee</title>
        <meta name="description" content="Hledáte řemeslníka v bezprostředním okolí? Použijte náš lokátor a okamžitě zobrazte ověřené profesionály z vašeho města. Neplatíte žádné provize." />
      </Helmet>

      <JsonLd
        id="nearme-breadcrumbs-ld"
        data={buildBreadcrumbJsonLd([
          { name: "Domů", path: "/" },
          { name: "Řemeslníci v okolí" },
        ])}
      />

      <Header />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-12">
          <header>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
                Najděte řemeslníka <br /><span className="text-primary">blízko vás</span>
              </h1>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-2xl">
              Zadejte poptávku nebo se rovnou podívejte, jací profíci operují ve vaší bezprostřední blízkosti. Žádné zbytečné čekání a dojíždění z daleka.
            </p>
          </header>

          <div className="p-8 md:p-12 mt-12 bg-card border border-border rounded-3xl shadow-xl space-y-8 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-64 w-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-2xl font-bold relative z-10">Zobrazit služby v mém okolí</h2>
            
            <div className="flex flex-col items-center justify-center gap-4 relative z-10">
              <Button 
                onClick={handleLocate}
                size="lg" 
                className="h-16 px-8 rounded-full text-lg font-bold w-full md:w-auto min-w-[280px]"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Crosshair className="h-6 w-6 mr-2" />}
                Lokalizovat mou polohu
              </Button>
              
              {error && <p className="text-destructive font-medium text-sm mt-2">{error}</p>}
              
              <div className="flex items-center gap-4 w-full max-w-sm mt-4">
                <div className="h-px bg-border flex-1" />
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Nebo</span>
                <div className="h-px bg-border flex-1" />
              </div>
              
              <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-full text-base w-full md:w-auto min-w-[280px]">
                <Link to="/nova-poptavka">Chci zadat město ručně</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
            <div className="p-6 bg-muted/30 rounded-2xl border border-border/50 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto">
                <Target className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-lg">Lokální mistři</h3>
              <p className="text-sm text-muted-foreground">Spojíme vás výhradně s lidmi, kteří u vás běžně pracují.</p>
            </div>
            <div className="p-6 bg-muted/30 rounded-2xl border border-border/50 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto">
                <ShieldCheck className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-lg">Ověřené profily</h3>
              <p className="text-sm text-muted-foreground">Všichni registrovaní musí projít validací. Kvalita na prvním místě.</p>
            </div>
            <div className="p-6 bg-muted/30 rounded-2xl border border-border/50 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto">
                <Map className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-lg">Bez drahého dojíždění</h3>
              <p className="text-sm text-muted-foreground">Díky filtru polohy nebudete zbytečně platit za dopravu zdaleka.</p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
