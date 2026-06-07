// Single source of truth for SUPERPROMINENT ("Oblíbené služby") cards
// Keep this in sync with DB names.

import elektroInstallationBg from "@/assets/elektro-installation-bg.webp";
import plumberServiceBg from "@/assets/plumber-service-bg.webp";

// Keep existing choices for the rest (can be adjusted to match popup one-by-one)
import roomPaintingWhiteBg from "@/assets/room-painting-white-bg.webp";
import locksmithGeneralBg from "@/assets/locksmith-general-bg.webp";
import masonBg from "@/assets/mason-bg.webp";
import handymanBg from "@/assets/handyman-bg.webp";
import autoMechanicBg from "@/assets/auto-mechanic-bg.webp";
import cleaningServiceBg from "@/assets/cleaning-service-bg.webp";
import hairdresserBg from "@/assets/hairdresser-bg.webp";
import nannyBg from "@/assets/nanny-bg.webp";
import phoneRepairBg from "@/assets/phone-repair-bg.webp";
import architectVisualizationBg from "@/assets/architect-visualization-bg.webp";
import englishLessonBg from "@/assets/english-lesson-bg.webp";
import massageBg from "@/assets/massage-bg.webp";
import lawnMowingBg from "@/assets/lawn-mowing-bg.webp";
import personalTrainerBg from "@/assets/personal-trainer-bg.webp";

// New superprominents
import yogaClassBg from "@/assets/yoga-class-bg.webp";
import manicurePedicureBg from "@/assets/manicure-pedicure-bg.webp";
import photographerBg from "@/assets/photographer-bg.webp";
import tutoringBg from "@/assets/tutoring-bg.webp";
import accountingBg from "@/assets/accounting-bg.webp";
import dogWalkingBg from "@/assets/dog-walking-bg.webp";
import lawyerBg from "@/assets/lawyer-bg.webp";
import shoeRepairBg from "@/assets/shoe-repair-bg.webp";
import cateringBg from "@/assets/catering-bg.webp";
import applianceRepairBg from "@/assets/appliance-repair-bg.webp";
import furnitureAssemblyBg from "@/assets/furniture-assembly-bg.webp";
import windowCleaningBg from "@/assets/window-cleaning-bg.webp";
import movingServiceBg from "@/assets/moving-service-bg.webp";
import interiorDesignBg from "@/assets/interior-design-bg.webp";
import parquetSandingBg from "@/assets/parquet-sanding-bg.webp";

// New superprominents - batch 2
import heatingTechnicianBg from "@/assets/heating-technician-bg.webp";
import gasTechnicianBg from "@/assets/gas-technician-bg.webp";
import gardenerBg from "@/assets/gardener-bg.webp";
import tilerBg from "@/assets/tiler-bg.webp";
import carpenterBg from "@/assets/carpenter-bg.webp";
import kitchenCabinetBg from "@/assets/kitchen-cabinet-bg.webp";
import wardrobeBg from "@/assets/wardrobe-bg.webp";

const IMAGE_CACHE_BUSTER = "2026-01-30-superprominent-v2";
const withImageCacheBust = (url: string) => {
  if (!url || url.startsWith('data:')) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${IMAGE_CACHE_BUSTER}`;
};

export type SuperprominentItem = {
  name: string;
  image: string;
};

export const SUPERPROMINENT_SUBCATEGORIES: SuperprominentItem[] = [
  // Important: these two MUST match the create-work subcategory popup
  { name: "Elektrikář", image: withImageCacheBust(elektroInstallationBg) },
  { name: "Instalatér", image: withImageCacheBust(plumberServiceBg) },

  { name: "Malíř pokojů", image: withImageCacheBust(roomPaintingWhiteBg) },
  { name: "Zámečník", image: withImageCacheBust(locksmithGeneralBg) },
  { name: "Zedník", image: withImageCacheBust(masonBg) },
  { name: "Hodinový manžel", image: withImageCacheBust(handymanBg) },
  { name: "Automechanik", image: withImageCacheBust(autoMechanicBg) },
  { name: "Uklízečka", image: withImageCacheBust(cleaningServiceBg) },
  { name: "Kadeřnice", image: withImageCacheBust(hairdresserBg) },
  { name: "Chůva", image: withImageCacheBust(nannyBg) },
  { name: "Servis mobilů", image: withImageCacheBust(phoneRepairBg) },
  { name: "Architektonická vizualizace", image: withImageCacheBust(architectVisualizationBg) },
  { name: "Výuka angličtiny (začátečníci/pokročilí)", image: withImageCacheBust(englishLessonBg) },
  { name: "Celotělová masáž", image: withImageCacheBust(massageBg) },
  { name: "Sekání trávy", image: withImageCacheBust(lawnMowingBg) },
  { name: "Osobní trenér (fitness)", image: withImageCacheBust(personalTrainerBg) },
  
  // New superprominents (matching exact DB subcategory names)
  { name: "Jóga (lekce)", image: withImageCacheBust(yogaClassBg) },
  { name: "Manikérka / Pedikérka", image: withImageCacheBust(manicurePedicureBg) },
  { name: "Fotograf / Kameraman", image: withImageCacheBust(photographerBg) },
  { name: "Doučování", image: withImageCacheBust(tutoringBg) },
  { name: "Účetní (obecná poptávka)", image: withImageCacheBust(accountingBg) },
  { name: "Venčení psů", image: withImageCacheBust(dogWalkingBg) },
  { name: "Advokát / Právník", image: withImageCacheBust(lawyerBg) },
  { name: "Oprava obuvi (podpatky, lepení)", image: withImageCacheBust(shoeRepairBg) },
  
  // New superprominents - batch 2 (matching exact DB subcategory names)
  { name: "Topenář", image: withImageCacheBust(heatingTechnicianBg) },
  { name: "Plynař", image: withImageCacheBust(gasTechnicianBg) },
  { name: "Zahradník", image: withImageCacheBust(gardenerBg) },
  { name: "Dlaždič / Stavitel", image: withImageCacheBust(tilerBg) },
  { name: "Truhlář", image: withImageCacheBust(carpenterBg) },
  { name: "Výroba kuchyňské linky", image: withImageCacheBust(kitchenCabinetBg) },
  { name: "Výroba vestavěné skříně", image: withImageCacheBust(wardrobeBg) },
  
  // New prominent items to fill rows to match grid-cols (10 or 12)
  { name: "Catering", image: withImageCacheBust(cateringBg) },
  { name: "Oprava domácích spotřebičů (AGD)", image: withImageCacheBust(applianceRepairBg) },
  { name: "Skládání / Montáž nábytku", image: withImageCacheBust(furnitureAssemblyBg) },
  { name: "Úklid bytů a domů", image: withImageCacheBust(cleaningServiceBg) },
  { name: "Mytí oken", image: withImageCacheBust(windowCleaningBg) },
  { name: "Stěhování", image: withImageCacheBust(movingServiceBg) },
  { name: "Navrhování interiérů", image: withImageCacheBust(interiorDesignBg) },
  { name: "Broušení parket (cyklování)", image: withImageCacheBust(parquetSandingBg) },
];

const SUPERPROMINENT_IMAGE_BY_NAME = new Map(
  SUPERPROMINENT_SUBCATEGORIES.map((i) => [i.name.toLowerCase(), i.image] as const)
);

// Used by SubcategoryDialog to guarantee the same images are used everywhere.
export const getSuperprominentBackgroundImage = (name: string): string | null => {
  return SUPERPROMINENT_IMAGE_BY_NAME.get(name.toLowerCase()) ?? null;
};
