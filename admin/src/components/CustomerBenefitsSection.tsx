import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import yogaImage from "@/assets/yoga_training.webp";

const CustomerBenefitsSection = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-background px-4 md:px-8 lg:px-[150px] py-12 md:py-20" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 500px' }}>
      <div>
        <div className="grid md:grid-cols-2 gap-0 items-stretch md:min-h-[480px] relative md:rounded-3xl md:overflow-hidden">
          {/* White background that extends behind the image on desktop */}
          <div className="hidden md:block absolute top-0 right-0 bottom-0 left-[40%] bg-white rounded-3xl" />
          {/* White background that extends behind the image on mobile */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 h-1/2 bg-white rounded-b-3xl" />

          {/* Left: Image */}
          <div className="relative z-10 min-h-[280px] md:min-h-[480px]">
            <img
              src={yogaImage}
              alt="Spokojená zákaznice"
              loading="lazy"
              width={600}
              height={480}
              className="w-full h-full object-cover rounded-3xl"
            />
          </div>

          {/* Right: Text content */}
          <div className="flex flex-col justify-center relative z-10 bg-white rounded-b-3xl rounded-t-none md:rounded-l-none md:rounded-r-3xl p-8 md:p-12">
            <span className="inline-block text-xs font-medium text-primary uppercase tracking-wider mb-4">
              Pro zákazníky
            </span>
            <h2 className="text-3xl md:text-4xl uppercase leading-[1.05] tracking-tight text-foreground mb-5 font-extrablack">
              Vyřešte své
              <br />
              starosti
              <br />
              s profíky
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm mb-8 font-normal">
              Už žádné nekonečné hledání. Získejte nabídky od prověřených
              specialistů přímo do vaší schránky.
            </p>
            <div>
              <Button
                size="default"
                className="rounded-full px-6 h-11 text-sm font-bold bg-dark-green text-white hover:bg-dark-green/90 border-0"
                onClick={() => navigate('/nova-poptavka')}
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

export default CustomerBenefitsSection;
