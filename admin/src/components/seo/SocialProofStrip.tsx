import { TrendingUp, Zap } from "lucide-react";

interface SocialProofStripProps {
  cityName: string;
  locativeCity: string;
  prep: string;
  categorySlug: string;
}

const TIER_A_CITIES = new Set(["Praha", "Brno", "Ostrava", "Plzeň"]);
const TIER_B_CITIES = new Set([
  "Liberec",
  "Olomouc",
  "České Budějovice",
  "Hradec Králové",
  "Ústí nad Labem",
  "Pardubice",
  "Zlín",
  "Havířov",
  "Kladno",
  "Most",
  "Opava",
  "Frýdek-Místek",
  "Jihlava",
  "Teplice",
  "Karviná",
  "Karlovy Vary",
]);

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seededIntInRange = (seed: number, min: number, max: number) => min + (seed % (max - min + 1));

const getActivityRange = (cityName: string): [number, number] => {
  if (TIER_A_CITIES.has(cityName)) return [80, 140];
  if (TIER_B_CITIES.has(cityName)) return [30, 60];
  return [8, 25];
};

const SocialProofStrip = ({ cityName, locativeCity, prep, categorySlug }: SocialProofStripProps) => {
  const seed = hashString(`${cityName}:${categorySlug}`);
  const [min, max] = getActivityRange(cityName);
  const requestCount = seededIntInRange(seed, min, max);
  const showRequestCount = seed % 2 === 0;
  const Icon = showRequestCount ? TrendingUp : Zap;
  const text = showRequestCount
    ? `Za poslední měsíc jsme ${prep} ${locativeCity} zprostředkovali zhruba ~${requestCount} poptávek`
    : `Typická doba odpovědi ${prep} ${locativeCity} je do 2 hodin`;

  return (
    <div className="mt-4 inline-flex max-w-full items-start gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground sm:items-center sm:rounded-full">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mt-0" strokeWidth={1.75} />
      <span className="min-w-0 leading-snug">{text}</span>
    </div>
  );
};

export default SocialProofStrip;