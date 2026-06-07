import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCheck, Star, Zap, CheckCircle2, XCircle } from "lucide-react";

export default function WhyZrobee() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Proč Zrobee? | Ověření řemeslníci a garance kvality</title>
        <meta name="description" content="Hledáte řemeslníka? Zjistěte, proč je Zrobee bezpečnější a efektivnější než hledání na Facebooku nebo Googlu. U nás najdete jen ověřené profesionály." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          
          <div className="text-center space-y-6 mb-16">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-flex">
              Konec starostí s řemeslníky
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
              Proč hledat přes <span className="text-primary">Zrobee</span>?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Zapomeňte na anonymní diskuze a riskování s neznámými lidmi. Na Zrobee budujeme komunitu, kde se hraje na kvalitu, rychlost a férové jednání.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {/* Facebook / Klasika */}
            <div className="p-8 rounded-3xl bg-destructive/5 border border-destructive/10 space-y-6">
              <div className="flex items-center gap-3 text-destructive font-bold text-xl">
                <XCircle className="h-6 w-6" />
                Facebookové skupiny a Google
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Odepíší vám lidé bez historie a s nulovou garancí.</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Nemáte jak si ověřit reálné recenze předchozích zákazníků.</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Často ztrácíte hodiny filtrováním irelevantních odpovědí.</span>
                </li>
              </ul>
            </div>

            {/* Zrobee */}
            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 space-y-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 text-primary font-bold text-xl relative z-10">
                <CheckCircle2 className="h-6 w-6" />
                Zrobee.cz
              </div>
              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">Všichni registrovaní řemeslníci prochází validací kontaktu.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">Vidíte autentická hodnocení, portfolio a statistiky kvality.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground font-medium">Zadáte poptávku jednou a sami si vyberete z nabídek. Zcela zdarma.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20 text-center">
            <div className="p-6 rounded-2xl border border-border/50 bg-card">
              <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Ověřené kontakty</h3>
              <p className="text-xs text-muted-foreground">Žádní anonymové. Víme, s kým máte čest.</p>
            </div>
            <div className="p-6 rounded-2xl border border-border/50 bg-card">
              <UserCheck className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Napřímo</h3>
              <p className="text-xs text-muted-foreground">Nepřeprodáváme vaše kontakty dalším agenturám.</p>
            </div>
            <div className="p-6 rounded-2xl border border-border/50 bg-card">
              <Star className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Reálné recenze</h3>
              <p className="text-xs text-muted-foreground">Hodnotit může jen zákazník, kterému byla práce reálně odvedena.</p>
            </div>
            <div className="p-6 rounded-2xl border border-border/50 bg-card">
              <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">Rychlost</h3>
              <p className="text-xs text-muted-foreground">Automaticky notifikujeme relevantní mistry v okolí.</p>
            </div>
          </div>

          <div className="p-10 md:p-16 rounded-[3rem] bg-card border border-primary/20 text-center shadow-2xl">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Přesvědčili jsme vás?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Vložte svou první poptávku ještě dnes. Zabere to přesně 2 minuty a nic vás to nestojí.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8 h-14 text-base font-bold">
                <Link to="/nova-poptavka">Vložit poptávku zdarma</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-14 text-base">
                <Link to="/vsechny-sluzby">Prozkoumat katalog služeb</Link>
              </Button>
            </div>
          </div>
          
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
