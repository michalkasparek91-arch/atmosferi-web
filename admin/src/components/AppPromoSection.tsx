import { useState } from "react";
import { Download, ChevronRight } from "lucide-react";
import phoneMockup from "@/assets/phone_mockup.webp";
import { usePwaInstallPrompt, triggerInstall } from "@/hooks/use-pwa-install-prompt";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";
import { hapticTap } from "@/utils/haptics";
import { toast } from "sonner";

const AppPromoSection = () => {
  const { isInstalled, isIOSDevice } = usePwaInstallPrompt(true);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    if (isInstalling) return;

    hapticTap();
    if (isIOSDevice) {
      setShowIosModal(true);
      return;
    }

    setIsInstalling(true);
    try {
      const result = await triggerInstall();
      if (!result.success) {
        // Only show iOS modal for actual iOS devices; show retry toast for Android/desktop
        if (isIOSDevice) {
          setShowIosModal(true);
        } else {
          toast.info("Zkuste to znovu za chvíli", {
            description: "Prohlížeč zatím nepřipravil instalaci. Zkuste to prosím za okamžik.",
          });
        }
      }
    } finally {
      setIsInstalling(false);
    }
  };

  // Don't show the promo if already installed
  if (isInstalled) return null;

  return (
    <section className="bg-primary pt-12 md:pt-16 md:py-20 pb-0 md:pb-20 px-4 md:px-8 lg:px-[150px]">
      <div>
        <div className="grid md:grid-cols-2 gap-0 md:gap-8 items-center">
          {/* Left: Text */}
          <div className="space-y-0 text-left">
            <h2 className="text-3xl md:text-5xl lg:text-6xl uppercase opacity-100 leading-tight tracking-tighter text-primary-foreground mb-3 md:mb-6 font-extrablack">
              Hotovo za
              <br />
              pár kliknutí.
            </h2>
            <p className="text-sm md:text-base text-primary-foreground/70 mb-6 md:mb-8 max-w-sm font-normal leading-relaxed">
              Stáhněte si Zrobee a mějte vše po ruce. Jednoduše a rychle.
            </p>
            
            <div className="flex justify-start">
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                aria-busy={isInstalling}
                className="flex items-center justify-between py-2.5 px-4 bg-dark-green hover:bg-dark-green/90 transition-all text-background rounded-full shadow-lg active:scale-[0.98] w-full max-w-[260px] border border-background/10 disabled:pointer-events-none disabled:opacity-80"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-background/10 flex items-center justify-center border border-background/10 shadow-inner">
                    <Download className="h-4 w-4 text-background" />
                  </div>
                  <div className="flex flex-col items-start leading-none text-left">
                    <span className="text-[13px] font-bold tracking-tight">
                      {isInstalling ? "Kontroluji..." : "Nainstalovat aplikaci"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-background/40" />
              </button>
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div className="flex justify-center md:justify-end overflow-hidden md:overflow-visible">
            <div className="relative w-[340px] md:w-[380px] lg:w-[420px] -mt-2 md:-mt-10 lg:-mt-16">
              <img
                src={phoneMockup}
                alt="Zrobee mobilní aplikace"
                loading="lazy"
                width={420}
                height={840}
                className="w-full h-auto drop-shadow-2xl translate-y-[5%] mb-[-5%] md:translate-y-[5%] md:mb-[-5%]"
              />
            </div>
          </div>
        </div>
      </div>

      <AddToHomeScreenModal 
        open={showIosModal} 
        onOpenChange={setShowIosModal} 
      />
    </section>
  );
};

export default AppPromoSection;
