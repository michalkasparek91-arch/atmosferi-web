import { useEffect } from "react";
import DetailLayout from "@/components/DetailLayout";
import { CalendarCheck, CheckCircle2, FileText, Send, Users, Shield, Star, Clock } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const faqItems = [
  { q: "Kolik stojí vložení zakázky?", a: "Vložení zakázky je zcela zdarma. Zákazníci neplatí žádné poplatky za používání platformy." },
  { q: "Jak funguje systém bodů pro řemeslníky?", a: "Řemeslníci používají body k odemčení detailů zakázky a odeslání nabídky. Body si mohou dokoupit v aplikaci." },
  { q: "Jak poznám kvalitního řemeslníka?", a: "Každý řemeslník má veřejný profil s hodnocením od předchozích zákazníků, popisem služeb a portfoliem prací." },
  { q: "Co když nejsem spokojený s prací?", a: "Doporučujeme nejprve komunikovat přímo s řemeslníkem. V případě problémů nás kontaktujte na podpoře." },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems.map(item => ({
    "@type": "Question",
    "name": item.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.a,
    },
  })),
};

const HowItWorks = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-jsonld";
    script.textContent = JSON.stringify(faqJsonLd);
    document.head.appendChild(script);
    return () => { document.getElementById("faq-jsonld")?.remove(); };
  }, []);

  const customerSteps = [
    { number: "01", title: "Popište úkol", description: "Vytvořte popis toho, co potřebujete udělat. Zadejte kategorii, lokalitu a další detaily.", icon: FileText },
    { number: "02", title: "Získejte nabídky", description: "Řemeslníci z vaší oblasti vám pošlou své nabídky s cenou a dostupností.", icon: Send },
    { number: "03", title: "Vyberte a naplánujte", description: "Porovnejte nabídky, prohlédněte si profily a vyberte nejlepší řešení pro vás.", icon: CalendarCheck },
    { number: "04", title: "Hotovo", description: "Řemeslník se postará o práci za vás. Po dokončení můžete ohodnotit jeho služby.", icon: CheckCircle2 },
  ];

  const workerSteps = [
    { number: "01", title: "Vytvořte profil", description: "Zaregistrujte se a vytvořte si profesionální profil s vašimi službami a zkušenostmi.", icon: Users },
    { number: "02", title: "Najděte zakázky", description: "Prohlížejte dostupné zakázky ve vašem okolí podle vašich specializací.", icon: FileText },
    { number: "03", title: "Pošlete nabídku", description: "Reagujte na zakázky s vaší cenou, dostupností a popisem jak můžete pomoci.", icon: Send },
    { number: "04", title: "Rostěte svůj byznys", description: "Získávejte pozitivní hodnocení a budujte si reputaci pro více zakázek.", icon: Star },
  ];

  const features = [
    { title: "Ověření řemeslníci", description: "Každý řemeslník prochází procesem ověření a je hodnocen zákazníky.", icon: Shield },
    { title: "Rychlé reakce", description: "Většina zákazníků obdrží první nabídku do několika hodin.", icon: Clock },
    { title: "Transparentní ceny", description: "Porovnejte nabídky a vyberte si tu nejlepší pro váš rozpočet.", icon: Star },
  ];

  return (
    <DetailLayout title="Jak to funguje">
      <JsonLd
        id="howitworks-breadcrumbs-ld"
        data={buildBreadcrumbJsonLd([
          { name: "Domů", path: "/" },
          { name: "Jak to funguje" },
        ])}
      />
      <div className="container mx-auto px-4 md:px-16 lg:px-24 py-8 md:py-16">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Jak to funguje</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Spojujeme zákazníky s kvalitními řemeslníky rychle a jednoduše.
            Ať už hledáte pomoc nebo nabízíte své služby, tady najdete cestu.
          </p>
        </section>

        {/* Features */}
        <section className="mb-20">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center p-6 bg-card rounded-2xl border border-border">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* For Customers */}
        <section className="mb-20">
          <div className="bg-primary/10 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Pro zákazníky</h2>
            <div className="grid md:grid-cols-4 gap-8">
              {customerSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
                    </div>
                    <div className="text-sm text-primary font-bold mb-2">{step.number}</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10">
              <a href="/nova-poptavka" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary-hover transition-colors">
                Vložit zakázku
              </a>
            </div>
          </div>
        </section>

        {/* For Workers */}
        <section className="mb-20">
          <div className="bg-card rounded-3xl p-8 md:p-12 border border-border">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Pro řemeslníky</h2>
            <div className="grid md:grid-cols-4 gap-8">
              {workerSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-7 w-7 text-foreground" aria-hidden="true" />
                    </div>
                    <div className="text-sm text-muted-foreground font-bold mb-2">{step.number}</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10">
              <a href="/registrace-remeslnika" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors">
                Registrovat se jako řemeslník
              </a>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Časté otázky</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqItems.map((item, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                <p className="text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-primary rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Začněte ještě dnes</h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Připojte se k tisícům spokojených zákazníků a profesionálů.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/nova-poptavka" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-card text-foreground font-medium hover:bg-card/90 transition-colors">
              Najít řemeslníka
            </a>
            <a href="/registrace-remeslnika" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors">
              Nabízet služby
            </a>
          </div>
        </section>
      </div>
    </DetailLayout>
  );
};

export default HowItWorks;
