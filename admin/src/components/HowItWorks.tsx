import { CalendarCheck, CheckCircle2, FileText, Send } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      number: "1",
      title: "Popište úkol",
      description: "Vytvořte popis toho, co potřebujete udělat",
      icon: FileText,
    },
    {
      number: "2",
      title: "Porovnejte nabídky",
      description: "Pomočníci vám pošlou své nabídky s cenou a dostupností",
      icon: Send,
    },
    {
      number: "3",
      title: "Vyberte a naplánujte",
      description: "Vyberte nejlepší nabídku a dohodněte termín",
      icon: CalendarCheck,
    },
    {
      number: "4",
      title: "Máte hotovo",
      description: "Náš profesionál se postará o práci za vás",
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="py-16 md:py-24 px-4 md:px-8 lg:px-[150px] bg-background">
      <div>
        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl uppercase tracking-tight text-foreground mb-2 text-left font-extrablack">
            Jak to funguje
          </h2>
          <p className="text-left text-muted-foreground text-base font-normal">
            Získat pomoc nebylo nikdy jednodušší
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="relative bg-primary rounded-2xl p-5 md:p-6 min-h-[320px] md:min-h-[400px] flex flex-col justify-start overflow-hidden"
              >
                {/* Large step number */}
                <span className="text-4xl md:text-5xl font-extrablack text-primary-foreground/90">
                  {step.number}
                </span>

                {/* Content */}
                <div className="relative z-10 mt-4">
                  <h3 className="text-base md:text-lg font-bold text-primary-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-primary-foreground/70 font-normal leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Watermark icon */}
                <Icon
                  className="absolute bottom-3 right-3 h-20 w-20 md:h-24 md:w-24 text-primary-foreground/10"
                  strokeWidth={1}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
