import { Link } from "react-router-dom";
import { ArrowRight, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PricingEstimateItem {
  name: string;
  priceRange: string;
  unit?: string | null;
  note?: string | null;
}

interface PricingEstimateCardProps {
  prep: string;
  locativeCity: string;
  categoryId?: string | null;
  serviceSlug?: string;
  items: PricingEstimateItem[];
  onCtaClick?: () => void;
}

const PricingEstimateCard = ({ prep, locativeCity, categoryId, serviceSlug, items, onCtaClick }: PricingEstimateCardProps) => {
  if (items.length === 0) return null;

  const ctaHref = categoryId ? `/nova-poptavka?category=${categoryId}` : "/nova-poptavka";

  return (
    <section className="mt-8" aria-labelledby="pricing-estimate-heading">
      <div className="rounded-[2.5rem] border border-border/40 bg-background p-6 md:p-8 shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Coins className="h-6 w-6" strokeWidth={2} />
            </div>
            <div>
              <h2 id="pricing-estimate-heading" className="text-2xl font-extrablack uppercase tracking-tight text-foreground md:text-3xl">
                Orientační ceny {prep} {locativeCity}
              </h2>
              <p className="mt-1 text-foreground/80 text-sm max-w-xl">
                Vstupní odhady podle běžných typů poptávek na Zrobee.
              </p>
            </div>
          </div>
          <div className="hidden lg:block">
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Aktualizováno {new Date().getFullYear()}
            </span>
          </div>
        </div>

        <div className="overflow-hidden bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Služba / Úkon</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Odhad ceny</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hidden md:table-cell">Poznámka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {items.slice(0, 6).map((item, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-muted/10">
                    <td className="px-4 py-4">
                      <span className="text-base font-bold text-foreground">{item.name}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-lg font-extrablack text-foreground">
                        {item.priceRange}
                        {item.unit && <span className="ml-1 text-muted-foreground font-bold text-sm">/ {item.unit}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-foreground/70 leading-relaxed">
                        {item.note || "Dle domluvy"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 items-center">
          <p className="text-sm leading-relaxed text-muted-foreground italic">
            * Uvedené částky jsou průměrné tržní ceny {prep} {locativeCity}. 
            Konkrétní nabídka může být nižší i vyšší v závislosti na složitosti projektu a použitých materiálech.
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-4">
            {serviceSlug && (
              <Button asChild variant="ghost" className="rounded-full font-bold">
                <Link to={`/cenik/${serviceSlug}`}>Celý ceník</Link>
              </Button>
            )}
            <Button asChild className="rounded-full shadow-sm h-12 px-8 text-base group">
              <Link to={ctaHref} onClick={onCtaClick}>
                Získat přesnou cenu
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingEstimateCard;