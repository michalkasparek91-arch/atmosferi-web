import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ArticleServicePatcherProps {
  serviceSlug?: string;
  serviceName?: string;
  articleContent?: string;
  className?: string;
}

const SERVICE_MAPPINGS: Record<string, { slug: string; name: string; priceSlug?: string }> = {
  "vymalovat": { slug: "stavby-rekonstrukce", name: "Malíře", priceSlug: "malovani-pokoju-bila" },
  "malování": { slug: "stavby-rekonstrukce", name: "Malíře", priceSlug: "malovani-pokoju-bila" },
  "instalatér": { slug: "instalater", name: "Instalatéra", priceSlug: "instalater-obecna-poptavka" },
  "trubky": { slug: "instalater", name: "Instalatéra", priceSlug: "instalater-obecna-poptavka" },
  "odpady": { slug: "instalater", name: "Instalatéra", priceSlug: "cisteni-odpadu" },
  "hliník": { slug: "elektro", name: "Elektrikáře", priceSlug: "vymena-elektroinstalace" },
  "elektřina": { slug: "elektro", name: "Elektrikáře", priceSlug: "revize-elektroinstalace" },
  "zásuvky": { slug: "elektro", name: "Elektrikáře", priceSlug: "oprava-zasuvek" },
  "jistič": { slug: "elektro", name: "Elektrikáře", priceSlug: "diagnostika-zavady-elektro" },
  "umakart": { slug: "stavby-rekonstrukce", name: "Specialistu na jádra", priceSlug: "rekonstrukce-koupelny" },
  "jádro": { slug: "stavby-rekonstrukce", name: "Specialistu na jádra", priceSlug: "rekonstrukce-koupelny" },
  "koupelna": { slug: "stavby-rekonstrukce", name: "Obkladače", priceSlug: "pokladka-obkladu-koupelna" },
  "vrtačka": { slug: "hodinovy-manzel", name: "hodinového manžela", priceSlug: "hodinovy-manzel-obecna-poptavka" },
  "police": { slug: "hodinovy-manzel", name: "hodinového manžela", priceSlug: "hodinovy-manzel-obecna-poptavka" },
  "podlaha": { slug: "stavby-rekonstrukce", name: "Podlaháře", priceSlug: "pokladka-podlah" },
  "střecha": { slug: "stavby-rekonstrukce", name: "Pokrývače" },
  "zahrada": { slug: "zahrada", name: "Zahradníka" },
  "bazén": { slug: "zahrada", name: "Zahradníka", priceSlug: "cisteni-bazenu" },
  "klimatizace": { slug: "montaz-a-oprava", name: "Servisního technika", priceSlug: "servis-klimatizace" },
  "klima": { slug: "montaz-a-oprava", name: "Servisního technika", priceSlug: "servis-klimatizace" },
  "kotel": { slug: "instalater", name: "Instalatéra", priceSlug: "servis-plynoveho-kotle" },
  "revize": { slug: "elektro", name: "Revizního technika", priceSlug: "revize-elektroinstalace" },
  "stěhování": { slug: "hodinovy-manzel", name: "Hodinové manžele", priceSlug: "stehovani-bytovych-prostor" },
  "stěhovat": { slug: "hodinovy-manzel", name: "Hodinové manžele", priceSlug: "stehovani-bytovych-prostor" },
  "chytrá": { slug: "elektro", name: "Specialistu na smart home" },
  "smart": { slug: "elektro", name: "Specialistu na smart home" },
  "byt": { slug: "stavby-rekonstrukce", name: "Specialistu na rekonstrukce" },
  "rekonstrukce": { slug: "stavby-rekonstrukce", name: "Specialistu na rekonstrukce" },
};

const ArticleServicePatcher = ({ 
  serviceSlug, 
  serviceName,
  articleContent = "",
  className = "" 
}: ArticleServicePatcherProps) => {
  
  // Try to determine service from content if not explicitly provided
  let finalSlug = serviceSlug;
  let finalName = serviceName;
  let finalPriceSlug = "";

  if (!finalSlug || finalSlug === "vsechny-sluzby") {
    const contentLower = articleContent.toLowerCase();
    for (const [keyword, mapping] of Object.entries(SERVICE_MAPPINGS)) {
      if (contentLower.includes(keyword)) {
        finalSlug = mapping.slug;
        finalName = mapping.name;
        finalPriceSlug = mapping.priceSlug || "";
        break;
      }
    }
  }

  // Fallbacks
  finalSlug = finalSlug || "vsechny-sluzby";
  finalName = finalName || "profesionála";

  return (
    <section className={`my-12 p-8 md:p-12 lg:p-16 rounded-[4rem] bg-[#1a2b15] text-white relative overflow-hidden group border border-white/5 shadow-none ${className}`}>
      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-12">
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="flex items-center justify-center lg:justify-start">
            <span className="px-4 py-1.5 rounded-full bg-white/10 text-[11px] font-bold text-white tracking-wider">Rychlé řešení</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] text-white">
            Nechcete to dělat sami?
          </h2>
          <p className="text-lg md:text-xl text-white/60 font-medium leading-relaxed max-w-xl">
            Místo studia návodů si raději pozvěte ověřeného <strong>{finalName}</strong>. 
            První nabídky dostanete často už do 24 hodin.
          </p>


        </div>

        <div className="flex flex-col gap-4 w-full lg:w-auto lg:min-w-[240px] items-center">
          <Button 
            size="lg"
            asChild
            className="w-full h-16 rounded-full text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-none transition-all"
          >
            <Link to={`/sluzby/${finalSlug}`}>
              Poptat službu
            </Link>
          </Button>
          {finalPriceSlug && (
            <Link 
              to={`/cenik/${finalPriceSlug}`}
              className="text-white/50 hover:text-white text-sm font-bold transition-colors underline underline-offset-8 decoration-white/20 hover:decoration-white"
            >
              Zobrazit orientační ceník
            </Link>
          )}
        </div>

      </div>
    </section>
  );
};

export default ArticleServicePatcher;
