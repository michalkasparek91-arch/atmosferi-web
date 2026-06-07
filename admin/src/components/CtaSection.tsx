import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CtaSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 px-4 md:px-8 lg:px-[150px] bg-background">
      <div>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left card - Dark green */}
          <div className="bg-dark-green rounded-3xl p-10 md:p-12 flex flex-col justify-between min-h-[220px]">
            <div>
              <h3 className="text-xl md:text-2xl uppercase tracking-tight text-white mb-2">
                Máte otázky?
              </h3>
              <p className="text-sm text-white/70 font-normal">
                Náš tým podpory je tu pro vás 24/7. Rádi vám pomůžeme s čímkoliv.
              </p>
            </div>
            <div className="mt-6">
              <Button
                className="rounded-full px-6 bg-primary text-primary-foreground hover:bg-primary/90 border-0"
                onClick={() => navigate("/kontakt")}
              >
                Kontaktujte nás
              </Button>
            </div>
          </div>

          {/* Right card - Light green */}
          <div className="bg-primary rounded-3xl p-10 md:p-12 flex flex-col justify-between min-h-[220px]">
            <div>
              <h3 className="text-xl md:text-2xl uppercase tracking-tight text-primary-foreground mb-2">
                Nevíte si rady?
              </h3>
              <p className="text-sm text-primary-foreground/70 font-normal">
                Zadejte svou poptávku zdarma a vyberte si z nabídek ověřených odborníků během několika minut.
              </p>
            </div>
            <div className="mt-6">
              <Button
                className="rounded-full px-6 bg-dark-green text-white hover:bg-dark-green/90 border-0"
                onClick={() => navigate("/nova-poptavka")}
              >
                Nezávazně poptat
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;
