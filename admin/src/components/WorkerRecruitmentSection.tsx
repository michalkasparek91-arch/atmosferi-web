import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import handymanImage from "@/assets/workshop_handyman_phone.webp";

const WorkerRecruitmentSection = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-background px-4 md:px-8 lg:px-[150px] pt-8 md:pt-16 pb-12 md:pb-20" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 500px' }}>
      <div>
        <div className="grid md:grid-cols-2 gap-0 items-stretch md:min-h-[480px] relative md:rounded-3xl md:overflow-hidden">
          {/* White background that extends behind the image on desktop */}
          <div className="hidden md:block absolute top-0 left-0 bottom-0 right-[40%] bg-white rounded-3xl" />
          {/* White background that extends behind the image on mobile */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 h-1/2 bg-white rounded-b-3xl" />

          {/* Left: Text content */}
          <div className="flex flex-col justify-center order-2 md:order-1 relative z-10 bg-white rounded-b-3xl rounded-t-none md:rounded-r-none md:rounded-l-3xl p-8 md:p-12">
            <span className="inline-block text-xs font-medium text-primary uppercase tracking-wider mb-4">
              Pro řemeslníky a profesionály
            </span>
            <h2 className="text-3xl md:text-4xl uppercase leading-[1.05] tracking-tight text-foreground mb-5 font-extrablack">
              Více zakázek,
              <br />
              bez starostí
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm mb-8 font-normal">
              Buďte mezi prvními a získejte 20 kreditů zdarma!
              Žádné poplatky za registraci, platíte pouze za úspěšné kontakty.
            </p>
            <div>
              <Button
                size="default"
                className="rounded-full px-6 h-11 text-sm font-bold bg-dark-green text-white hover:bg-dark-green/90 border-0"
                onClick={() => navigate('/registrace-remeslnika')}
              >
                Chci více zakázek
              </Button>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative z-10 min-h-[280px] md:min-h-[480px] order-1 md:order-2">
            <img
              src={handymanImage}
              alt="Řemeslník s mobilem"
              loading="lazy"
              width={600}
              height={480}
              className="w-full h-full object-cover rounded-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerRecruitmentSection;
