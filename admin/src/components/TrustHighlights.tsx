import { Shield, Clock, Tag } from "lucide-react";

const highlights = [
  {
    icon: Shield,
    title: "Ověření řemeslníci",
    text: "Všichni naši řemeslníci prochází naším pečlivým výběrem a hodnocením.",
  },
  {
    icon: Clock,
    title: "Rychlá domluva",
    text: "Stačí pár kliknutí a do několika minut máte domluvený termín.",
  },
  {
    icon: Tag,
    title: "Férové ceny",
    text: "Předem víte, kolik za práci zaplatíte. Žádné skryté poplatky.",
  },
];

const TrustHighlights = () => {
  return (
    <section className="py-10 md:py-14 px-4 md:px-8 lg:px-[150px] bg-background">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {highlights.map((item, index) => (
          <div key={index} className="text-left">
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-3">
              <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground font-normal leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrustHighlights;
