import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import ostravaImage from "@/assets/ostrava_night_skyline.webp";

const OstravaLaunchSection = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-background py-12 md:py-0 px-4 md:px-8 lg:px-[150px]" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 500px' }}>
      <div>
        <div className="grid md:grid-cols-[1fr_0.7fr] gap-0 md:min-h-[500px] items-center">
          {/* Text content */}
          <div className="flex flex-col justify-center order-2 md:order-1 py-10 md:py-16 md:pr-12">
            <span className="inline-block text-xs font-medium text-primary uppercase tracking-wider mb-4">
              Nově v Ostravě
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl uppercase leading-[1.05] tracking-tight text-foreground mb-5 font-extrablack">
              Zrobee nyní
              <br />
              funguje v Ostravě
              <br />
              a okolí
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-sm mb-8 font-normal">
              Hledáte spolehlivé řemeslníky nebo profesionály v Ostravě?
              Jsme tu pro vás – najděte ověřené odborníky přímo ve vašem městě.
            </p>
            <div>
              <Button
                size="default"
                className="rounded-full px-6 h-11 text-sm font-medium"
                onClick={() => navigate('/nova-poptavka')}
              >
                <MapPin className="h-4 w-4 mr-1.5" />
                Najít profíka ve vašem okolí
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden order-1 md:order-2">
            <img
              src={ostravaImage}
              alt="Ostrava v noci"
              loading="lazy"
              width={420}
              height={350}
              className="w-full h-auto object-cover rounded-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default OstravaLaunchSection;
