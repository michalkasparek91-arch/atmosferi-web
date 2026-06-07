import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calculator, ArrowRight, Sparkles, Check, Sliders as SliderIcon, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface CalculatorPricingItem {
  service: string;
  priceRange: string;
  unit?: string | null;
  note?: string | null;
}

interface InteractivePriceCalculatorProps {
  prep: string;
  locativeCity: string;
  categoryId?: string | null;
  categoryName?: string;
  items: CalculatorPricingItem[];
}

const extractPriceRange = (str: string) => {
  const matches = str.match(/\d+/g);
  if (!matches || matches.length === 0) return { min: 350, max: 700 };
  if (matches.length === 1) return { min: parseInt(matches[0], 10), max: parseInt(matches[0], 10) * 1.5 };
  return { min: parseInt(matches[0], 10), max: parseInt(matches[1], 10) };
};

const InteractivePriceCalculator = ({ prep, locativeCity, categoryId, categoryName, items }: InteractivePriceCalculatorProps) => {
  if (!items || items.length === 0) return null;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quantity, setQuantity] = useState(15);

  const selectedItem = items[selectedIndex] || items[0];

  const { min, max } = useMemo(() => extractPriceRange(selectedItem.priceRange), [selectedItem.priceRange]);

  const minTotal = Math.round(min * quantity);
  const maxTotal = Math.round(max * quantity);

  const laborTotal = Math.round((minTotal + maxTotal) / 2 * 0.75);
  const materialTotal = Math.round((minTotal + maxTotal) / 2 * 0.25);

  const unitLabel = selectedItem.unit || "jednotek";

  const ctaUrl = categoryId 
    ? `/nova-poptavka?category=${categoryId}&service=${encodeURIComponent(selectedItem.service)}&qty=${quantity}`
    : `/nova-poptavka?service=${encodeURIComponent(selectedItem.service)}&qty=${quantity}`;

  return (
    <section className="mt-16 my-12" aria-labelledby="calculator-heading">
      <div className="rounded-[3rem] border border-primary/20 bg-gradient-to-b from-background via-primary/5 to-background p-8 md:p-12 relative overflow-hidden shadow-lg">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-primary/20 text-primary border-none rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest gap-1.5">
                <Calculator className="h-3.5 w-3.5" />
                Interaktivní rozpočet
              </Badge>
              <span className="text-xs text-muted-foreground font-semibold">Tržní data 2026</span>
            </div>
            <h2 id="calculator-heading" className="text-3xl md:text-5xl font-extrablack uppercase tracking-tight text-foreground">
              Kalkulačka ceny {prep} {locativeCity}
            </h2>
            <p className="mt-2 text-muted-foreground text-base max-w-2xl leading-relaxed">
              Vyberte úkon a zadejte rozsah pro okamžitý odhad nákladů na práci a materiál v lokalitě {locativeCity}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          {/* Left Column: Service Selector */}
          <div className="lg:col-span-6 space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">1. Vyberte požadovaný úkon</label>
            <div className="grid gap-3">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-300 ${
                    selectedIndex === idx
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.01]"
                      : "bg-background border-border/60 hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3 pr-4">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                      selectedIndex === idx ? "bg-white text-primary" : "bg-primary/10 text-primary"
                    }`}>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </div>
                    <span className="font-bold text-base">{item.service}</span>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="text-sm font-bold">{item.priceRange}</span>
                    {item.unit && <span className="text-xs opacity-80 block font-sans">/ {item.unit}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Quantity Input & Total Breakdown */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-3xl bg-card border border-border/80 p-8 space-y-8 shadow-md">
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <SliderIcon className="h-4 w-4 text-primary" />
                  2. Zadejte rozsah ({unitLabel})
                </label>
                <span className="text-2xl font-black text-primary font-mono">{quantity} {unitLabel}</span>
              </div>
              <div className="space-y-4">
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  <span>1 {unitLabel}</span>
                  <span>50 {unitLabel}</span>
                  <span>100 {unitLabel}</span>
                  <span>200 {unitLabel}</span>
                </div>
              </div>
            </div>

            {/* Price Output Card */}
            <div className="rounded-2xl bg-muted/50 p-6 border border-border/60 space-y-6">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground block mb-1">
                  Odhad celkové ceny {prep} {locativeCity}
                </span>
                <div className="text-3xl md:text-5xl font-extrablack text-foreground font-mono tracking-tight">
                  {minTotal.toLocaleString("cs-CZ")} – {maxTotal.toLocaleString("cs-CZ")} Kč
                </div>
                {selectedItem.note && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 italic">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    {selectedItem.note}
                  </p>
                )}
              </div>

              {/* Progress bars breakdown */}
              <div className="space-y-3 pt-4 border-t border-border/60">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Práce řemeslníka (odhad ~75%)</span>
                    <span className="font-mono text-foreground font-bold">~ {laborTotal.toLocaleString("cs-CZ")} Kč</span>
                  </div>
                  <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Materiál & doprava v okolí (odhad ~25%)</span>
                    <span className="font-mono text-foreground font-bold">~ {materialTotal.toLocaleString("cs-CZ")} Kč</span>
                  </div>
                  <div className="h-2 w-full bg-border/60 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary text-secondary-foreground bg-zinc-400 rounded-full" style={{ width: "25%" }} />
                  </div>
                </div>
              </div>
            </div>

            <Button asChild size="lg" className="w-full rounded-2xl h-14 font-bold text-lg shadow-sm group">
              <Link to={ctaUrl}>
                <Sparkles className="h-5 w-5 mr-2 animate-pulse text-primary-foreground" />
                Zadat poptávku s touto kalkulací
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractivePriceCalculator;
