import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Coffee } from "lucide-react";

export const WittyRescueBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="my-20 rounded-[4rem] bg-[#1a2b15] p-10 md:p-16 text-white relative overflow-hidden group border border-white/5 shadow-none">
      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-12">
        <div className="max-w-2xl text-center lg:text-left space-y-6">
          <div className="flex items-center justify-center lg:justify-start">
            <span className="px-4 py-1.5 rounded-full bg-white/10 text-[11px] font-bold text-white tracking-wider">Záchranná brzda</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] text-white">
            Už vás to čtení <span className="italic font-black text-white">přestává bavit?</span>
          </h2>
          <p className="text-lg md:text-xl text-white/60 font-medium leading-relaxed max-w-xl">
            Nešetřete na špatném místě. Zadejte poptávku zdarma a my to odřeme za vás, zatímco vy si dáte zasloužené kafe.
          </p>

        </div>

        <div className="flex flex-col gap-4 w-full lg:w-auto lg:min-w-[240px] items-center">
          <Button
            size="lg"
            className="w-full h-16 rounded-full text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-none transition-all"
            onClick={() => navigate('/nova-poptavka')}
          >
            Poptat službu
          </Button>
          <button
            onClick={() => navigate('/cenik')}
            className="text-white/50 hover:text-white text-sm font-bold transition-colors underline underline-offset-8 decoration-white/20 hover:decoration-white"
          >
            Zobrazit orientační ceník
          </button>
        </div>

      </div>
    </section>

  );
};
