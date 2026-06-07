import DetailLayout from "@/components/DetailLayout";
import { Briefcase, Users, TrendingUp, Heart, Globe, Zap } from "lucide-react";

const Careers = () => {
  return (
    <DetailLayout title="Kariéra">
      <div className="container mx-auto px-4 md:px-16 lg:px-24 py-8 md:py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Kariéra ve Fixit</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Připoj se k našemu dynamickému týmu a pomoz nám měnit způsob, 
            jakým lidé najdou a nabízejí služby. Hledáme talentované lidi, 
            kteří chtějí mít skutečný dopad.
          </p>
        </section>

        {/* Why Join Us */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Proč pracovat u nás</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, title: "Růst a rozvoj", desc: "Investujeme do vzdělávání našich zaměstnanců a podporujeme jejich profesní růst na všech úrovních." },
              { icon: Users, title: "Skvělý tým", desc: "Pracuj s talentovanými a motivovanými lidmi, kteří sdílejí tvoji vášeň pro inovace a excelenci." },
              { icon: Heart, title: "Work-life balance", desc: "Flexibilní pracovní doba, možnost home office a péče o duševní zdraví našich zaměstnanců." },
              { icon: Zap, title: "Inovace", desc: "Buď součástí inovativní společnosti, která aktivně mění trh a vytváří nové možnosti." },
              { icon: Briefcase, title: "Kariérní příležitosti", desc: "Jasné kariérní cesty a příležitosti k postupu v rychle rostoucí společnosti." },
              { icon: Globe, title: "Moderní prostředí", desc: "Pracuj v moderních kancelářích s nejnovější technologií a příjemnou atmosférou." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-card rounded-3xl p-6 shadow-md hover:shadow-lg transition-all">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Open Positions */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Aktuální pozice</h2>
          <div className="space-y-4 max-w-4xl mx-auto">
            {[
              { title: "Frontend Developer", loc: "Praha • Plný úvazek • Remote možný", tag: "React", desc: "Hledáme zkušeného frontend developera pro vývoj naší platformy. Ideální kandidát má zkušenosti s React, TypeScript a moderními frontend technologiemi.", email: "Frontend Developer" },
              { title: "Product Manager", loc: "Praha • Plný úvazek", tag: "Product", desc: "Staň se součástí produktového týmu a pomoz nám definovat směr naší platformy. Hledáme někoho s vášní pro UX a datově orientované rozhodování.", email: "Product Manager" },
              { title: "Customer Success Specialist", loc: "Praha • Plný úvazek", tag: "Support", desc: "Pomáhej našim zákazníkům a pracovníkům získat maximum z naší platformy. Ideální kandidát má zkušenosti v zákaznické podpoře a lásku k lidem.", email: "Customer Success Specialist" },
            ].map((pos, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 shadow-md hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-1">{pos.title}</h3>
                    <p className="text-muted-foreground text-sm">{pos.loc}</p>
                  </div>
                  <span className="bg-primary px-3 py-1 rounded-full text-sm font-medium text-primary-foreground">{pos.tag}</span>
                </div>
                <p className="text-muted-foreground mb-4">{pos.desc}</p>
                <a href={`mailto:kariera@fixit.cz?subject=Aplikace: ${pos.email}`} className="inline-flex items-center text-foreground font-medium hover:text-primary transition-colors">
                  Poslat žádost →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Spontaneous Application */}
        <section className="text-center bg-primary/10 rounded-3xl p-12 mb-20">
          <h2 className="text-3xl font-bold text-foreground mb-4">Nevidíš svoji pozici?</h2>
          <p className="text-lg text-foreground/80 mb-6 max-w-2xl mx-auto">
            Jsme vždy otevřeni talentovaným lidem. Pošli nám svou spontánní žádost a možná právě tebe hledáme!
          </p>
          <a href="mailto:kariera@fixit.cz?subject=Spontánní žádost" className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors">
            Poslat spontánní žádost
          </a>
        </section>

        {/* Process */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Náš výběrový proces</h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { n: 1, t: "Aplikace", d: "Pošli nám svůj životopis a motivační dopis" },
              { n: 2, t: "První hovor", d: "Telefonický rozhovor s HR týmem" },
              { n: 3, t: "Technické kolo", d: "Setkání s týmem a technická diskuze" },
              { n: 4, t: "Nabídka", d: "Finální rozhovor a nabídka práce" },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">{s.n}</div>
                <h3 className="font-semibold text-foreground mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DetailLayout>
  );
};

export default Careers;
