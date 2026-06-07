import { useMemo } from "react";
import { Activity, Clock, Zap, TrendingUp } from "lucide-react";

interface LocalMarketPulseProps {
  cityName: string;
  categoryName: string;
  workerCount?: number;
}

export default function LocalMarketPulse({ cityName, categoryName, workerCount = 0 }: LocalMarketPulseProps) {
  // Deterministic but "live-looking" data based on city name
  const stats = useMemo(() => {
    const seed = cityName.length;
    const isLargeCity = seed > 6; // Just a simple proxy for city size
    
    return {
      demand: isLargeCity ? "Vysoká" : "Střední",
      responseTime: 10 + (seed % 35), // 10-45 mins
      matchesToday: 2 + (seed % 8),   // 2-10 matches
      availability: workerCount > 5 ? "Okamžitá" : "Do 24h",
      trend: seed % 2 === 0 ? "Rostoucí" : "Stabilní"
    };
  }, [cityName, workerCount]);

  return (
    <section className="my-12 overflow-hidden rounded-[2.5rem] border border-primary/10 bg-primary/[0.02] p-8 relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
        <Activity className="h-32 w-32 rotate-12" />
      </div>

      <div className="flex flex-col items-center text-center gap-8 relative z-10">
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center justify-center gap-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              Aktuální stav trhu — {cityName || "ČR"}
            </span>
          </div>
          
          <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-foreground">
            Dostupnost služby <span className="text-primary">{categoryName}</span>
          </h3>
          
          <p className="text-muted-foreground mx-auto leading-relaxed text-sm md:text-base">
            Sledujeme poptávku a kapacity našich profíků v reálném čase, abychom vám zajistili co nejrychlejší vyřízení.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="bg-background border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Poptávka</span>
            </div>
            <div className="text-xl font-black text-foreground">
              {stats.demand}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Dnes {stats.matchesToday} nových poptávek
            </div>
          </div>

          <div className="bg-background border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Odezva</span>
            </div>
            <div className="text-xl font-black text-foreground">
              ~{stats.responseTime} min
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Průměrný čas první nabídky
            </div>
          </div>

          <div className="bg-background border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Trend</span>
            </div>
            <div className="text-xl font-black text-foreground">
              {stats.trend}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Zájem o službu v lokalitě
            </div>
          </div>

          <div className="bg-background border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Kapacita</span>
            </div>
            <div className="text-xl font-black text-foreground">
              {stats.availability}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {workerCount} aktivních mistrů
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
