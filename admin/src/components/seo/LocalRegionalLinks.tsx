import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { getRegionForCity, getCitiesInRegion, cityToSlug } from "@/lib/city-regions";

interface LocalRegionalLinksProps {
  cityName: string;
  currentCitySlug: string;
  categorySlug?: string;
  categoryName?: string;
}

const LocalRegionalLinks = ({ cityName, currentCitySlug, categorySlug, categoryName }: LocalRegionalLinksProps) => {
  const region = getRegionForCity(cityName);
  
  if (!region) return null;

  const regionalCities = getCitiesInRegion(region)
    .filter(city => cityToSlug(city) !== currentCitySlug)
    .slice(0, 16);

  if (regionalCities.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-border/40">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border text-foreground">
          <MapPin className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-foreground">
            Působíme i v dalších městech regionu {region}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Naše síť ověřených profíků pokrývá celé okolí. Vyberte si své město.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {regionalCities.map((city) => {
          const targetSlug = cityToSlug(city);
          const linkHref = categorySlug 
            ? `/sluzby/${categorySlug}/${targetSlug}`
            : `/mesta/${targetSlug}`;
          
          return (
            <Link
              key={city}
              to={linkHref}
              className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-muted/30"
            >
              <span className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                {categoryName ? `${categoryName} ${city}` : city}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/60 transition-all group-hover:translate-x-1 group-hover:text-primary" strokeWidth={1.75} />
            </Link>
          );
        })}
      </div>

      {categorySlug && (
        <div className="mt-8 flex justify-center">
          <Link
            to={`/sluzby/${categorySlug}/kraj/${cityToSlug(region)}`}
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary/20 bg-primary/5 px-6 py-3 text-sm font-bold text-primary transition-all hover:bg-primary/10 hover:border-primary/40 hover:scale-105"
          >
            Zobrazit celou nabídku v regionu {region}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
};

export default LocalRegionalLinks;
