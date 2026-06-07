import { useMemo } from "react";

interface PseoHeroImageProps {
  categorySlug: string;
  categoryName: string;
  cityName: string;
  imageAlt?: string;
  imageTheme?: string;
}

import constructionImg from "@/assets/house-construction-bg.webp";
import cleaningImg from "@/assets/cleaning-service-bg.webp";
import autoImg from "@/assets/auto-mechanic-bg.webp";
import gardenImg from "@/assets/garden-bg.webp";
import electroImg from "@/assets/electrical-bg.webp";
import plumbingImg from "@/assets/plumbing-bg.webp";
import movingImg from "@/assets/moving-service-bg.webp";
import handymanImg from "@/assets/handyman-bg.webp";
import languageImg from "@/assets/language-teacher-bg.webp";
import healthImg from "@/assets/physiotherapy-rehab-bg.webp";
import gastroImg from "@/assets/catering-bg.webp";
import furnitureImg from "@/assets/carpenter-bg.webp";
import pcImg from "@/assets/oprava-pc-bg.webp";
import businessImg from "@/assets/accounting-bg.webp";
import locksmithImg from "@/assets/locksmith-bg.webp";
import designImg from "@/assets/interior-design-bg.webp";
import financeImg from "@/assets/financial-advisor-bg.webp";
import nannyImg from "@/assets/nanny-bg.webp";
import petImg from "@/assets/dog-walking-bg.webp";
import legalImg from "@/assets/legal-services-bg.webp";

const CATEGORY_IMAGES: Record<string, string> = {
  "stavby-rekonstrukce": constructionImg,
  "uklid": cleaningImg,
  "auto-moto": autoImg,
  "zahrada": gardenImg,
  "elektro": electroImg,
  "instalater": plumbingImg,
  "doprava-logistika": movingImg,
  "hodinovy-manzel": handymanImg,
  "vyuka-jazyky": languageImg,
  "zdravi-sport": healthImg,
  "gastro-akce": gastroImg,
  "truharstvo": furnitureImg,
  "pc-a-mobile": pcImg,
  "pro-firmy": businessImg,
  "zamecnik": locksmithImg,
  "projektovani": designImg,
  "finance-dane": financeImg,
  "hlidani-a-pece": nannyImg,
  "mazlicci": petImg,
  "pravni-sluzby": legalImg,
  "ostatni": handymanImg,
};

const DEFAULT_IMAGES = [handymanImg, constructionImg, cleaningImg];

export default function PseoHeroImage({ 
  categorySlug, 
  categoryName, 
  cityName, 
  imageAlt, 
  imageTheme 
}: PseoHeroImageProps) {
  
  const imageUrl = useMemo(() => {
    if (CATEGORY_IMAGES[categorySlug]) return CATEGORY_IMAGES[categorySlug];
    // Deterministic fallback based on slug hash
    const hash = categorySlug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return DEFAULT_IMAGES[hash % DEFAULT_IMAGES.length];
  }, [categorySlug]);

  const finalAlt = useMemo(() => {
    if (imageAlt) return imageAlt;
    return `${categoryName} ${cityName ? `v lokalitě ${cityName}` : "po celé ČR"} - ověření řemeslníci na Zrobee`;
  }, [imageAlt, categoryName, cityName]);

  return (
    <div className="relative group overflow-hidden rounded-[2.5rem] md:rounded-[3rem] border border-border/40 bg-muted shadow-none aspect-square md:aspect-[4/5] w-full">
      <img
        src={imageUrl}
        alt={finalAlt}
        loading="lazy"
        className="object-cover object-center w-full h-full transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          const img = e.currentTarget;
          img.src = handymanImg; // Last resort fallback
        }}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent pointer-events-none" />
      
      {/* Category badge */}
      <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 pointer-events-none">
        <div className="backdrop-blur-xl bg-background/20 border border-background/30 rounded-full px-4 py-1.5">
          <p className="text-[10px] md:text-xs font-bold text-background uppercase tracking-widest drop-shadow-sm">
            {imageTheme || categoryName}
          </p>
        </div>
      </div>
    </div>
  );
}
