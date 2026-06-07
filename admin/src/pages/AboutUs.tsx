import DetailLayout from "@/components/DetailLayout";
import { CheckCircle2, Users, Shield, TrendingUp } from "lucide-react";

const AboutUs = () => {
  return (
    <DetailLayout title="O nás">
      <div className="container mx-auto px-4 md:px-16 lg:px-24 py-8 md:py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            O nás
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Spojujeme zákazníky s kvalitními řemeslníky a profesionály. 
            Naše mise je učinit hledání a nabízení služeb jednoduché, 
            bezpečné a efektivní.
          </p>
        </section>

        {/* Mission Section */}
        <section className="mb-20">
          <div className="bg-primary/10 rounded-3xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Naše vize
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed mb-4">
              Věříme, že každý zaslouží přístup ke kvalitním službám a každý 
              profesionál si zaslouží férovou příležitost růst svůj byznys. 
              Proto jsme vytvořili platformu, která propojuje lidi s důvěrou 
              a transparentností.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed">
              Naším cílem je stát se první volbou pro každého, kdo hledá 
              nebo nabízí profesionální služby v České republice.
            </p>
          </div>
        </section>

        {/* Values Grid */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Proč si vybrat nás
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Ověření profesionálové</h3>
              <p className="text-muted-foreground">Každý pracovník je pečlivě prověřen a hodnocen zákazníky</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Bezpečná platforma</h3>
              <p className="text-muted-foreground">Vaše data jsou chráněna a platby jsou zabezpečené</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Komunita</h3>
              <p className="text-muted-foreground">Spojujeme tisíce spokojených zákazníků a profesionálů</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Růst</h3>
              <p className="text-muted-foreground">Pomáháme profesionálům růst jejich podnikání</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Jak to funguje
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-card rounded-3xl p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-foreground mb-6">Pro zákazníky</h3>
              <div className="space-y-4">
                {[
                  { n: 1, t: "Popište práci", d: "Zadejte detaily vaší zakázky" },
                  { n: 2, t: "Obdržte nabídky", d: "Profesionálové vám zašlou své nabídky" },
                  { n: 3, t: "Vyberte si", d: "Porovnejte nabídky a vyberte nejlepšího" },
                  { n: 4, t: "Hotovo", d: "Práce je dokončena, ohodnoťte profesionála" },
                ].map(s => (
                  <div key={s.n} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">{s.n}</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{s.t}</h4>
                      <p className="text-muted-foreground text-sm">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card rounded-3xl p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-foreground mb-6">Pro pracovníky</h3>
              <div className="space-y-4">
                {[
                  { n: 1, t: "Vytvořte profil", d: "Představte své služby a portfolio" },
                  { n: 2, t: "Najděte zakázky", d: "Prohlížejte dostupné práce ve vašem okolí" },
                  { n: 3, t: "Zašlete nabídku", d: "Napište svou cenu a dostupnost" },
                  { n: 4, t: "Rosťte", d: "Získejte pozitivní hodnocení a více zakázek" },
                ].map(s => (
                  <div key={s.n} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">{s.n}</div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{s.t}</h4>
                      <p className="text-muted-foreground text-sm">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center bg-primary rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Připojte se k nám ještě dnes
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Ať už hledáte služby nebo je nabízíte, jsme tu pro vás.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="/nova-poptavka" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-card text-foreground font-medium hover:bg-card/90 transition-colors">
              Najít pracovníka
            </a>
            <a href="/registrace-remeslnika" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors">
              Stát se pracovníkem
            </a>
          </div>
        </section>
      </div>
    </DetailLayout>
  );
};

export default AboutUs;
