import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/utils/haptics";

import slide1 from "@/assets/onboarding-slide-1.png";
import slide2 from "@/assets/onboarding-slide-2.png";
import slide3 from "@/assets/onboarding-slide-3.png";

const slides = [
  {
    image: slide1,
    headline: "Jedna aplikace na všechno",
    subtext:
      "Najděte experty od zedníka a instalatéra až po účetní, lektora jazyků nebo trenéra.",
  },
  {
    image: slide2,
    headline: "Zadejte poptávku zdarma",
    subtext: "Popište, co potřebujete. Nabídky přijdou samy.",
  },
  {
    image: slide3,
    headline: "Jeden účet pro všechno",
    subtext:
      "Poptávejte služby nebo přepněte na profil řemeslníka a vydělávejte.",
  },
];

const NativeOnboarding = () => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  // Auto-advance every 4s
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
    }, 4000);
    const stop = () => clearInterval(interval);
    emblaApi.on("pointerDown", stop);
    return () => { clearInterval(interval); emblaApi.off("pointerDown", stop); };
  }, [emblaApi]);

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Full-bleed carousel */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="flex-[0_0_100%] min-w-0 relative h-full"
            >
              <div className="absolute inset-0 flex items-center justify-center pb-[330px]">
                <img
                  src={slide.image}
                  alt=""
                  className="w-[95%] max-w-[420px] object-contain mix-blend-multiply"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section — flush with page background */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-8">
        {/* Text content */}
        <div className="text-center mb-6 min-h-[100px]">
          <h2 className="text-[22px] font-extrabold uppercase tracking-tight text-foreground leading-tight mb-2">
            {slides[selectedIndex].headline}
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed max-w-[280px] mx-auto">
            {slides[selectedIndex].subtext}
          </p>
        </div>

        {/* Pill dot indicators */}
        <div className="flex justify-center items-center gap-2 mb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === selectedIndex
                  ? "w-7 bg-primary"
                  : "w-2 bg-muted-foreground/25"
              )}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full h-12 text-base font-semibold rounded-full text-foreground hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground"
            onClick={() => { hapticTap(); navigate("/prihlaseni"); }}
          >
            Registrace
          </Button>
          <Button
            className="w-full h-12 text-base font-semibold rounded-full"
            onClick={() => { hapticTap(); navigate("/prihlaseni"); }}
          >
            Přihlásit se
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NativeOnboarding;
