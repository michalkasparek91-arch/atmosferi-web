import { BarChart3, ExternalLink, Info, SearchCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  prioritizeGscPages, prioritizeGscQueries, hasIndependentComparison,
  countGoogleUnknownInspections, type GscPrioritySnapshot
} from "@/lib/gsc-priorities";
import type { InspectionHistoryRow } from "@/lib/gsc-inspection-history";

const fmt = new Intl.NumberFormat("cs-CZ");
const oneDecimal = (n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
function pageLabel(raw: string) {
  try {
    const url = new URL(raw);
    return (url.hostname === "www.atmosferi.com" ? "" : url.hostname) + (url.pathname === "/" ? "/" : url.pathname);
  } catch { return raw; }
}
export function GscPriorities({
  reports, inspections
}: {
  reports: readonly GscPrioritySnapshot[];
  inspections: readonly InspectionHistoryRow[];
}) {
  const latest = reports[0];
  if (!latest) return null;
  const pages = prioritizeGscPages(latest.pages || []);
  const queries = prioritizeGscQueries(latest.queries || []);
  const unknownToGoogle = countGoogleUnknownInspections(inspections);
  const comparable = hasIndependentComparison(reports);
  const hasAny = pages.length > 0 || queries.length > 0 || unknownToGoogle > 0;
  return (
    <Card className="rounded-2xl shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-medium">
          <SearchCheck size={16} aria-hidden="true"/> Podle reálných dat
        </div>
        <CardTitle className="text-xl font-semibold mt-2">Co řešit v SEO jako první</CardTitle>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Doporučení vycházejí z posledního 28denního reportu Search Console a dosud kontrolovaných URL.
          Vysoké zobrazení při nízké pozici znamená příležitost zlepšit relevanci a interní odkazy,
          nikoli automaticky problém s titulkem nebo mírou prokliku.
        </p>
      </CardHeader>
      <CardContent className="space-y-7">
        {!comparable && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-start gap-2 text-sm text-zinc-700">
            <Info className="shrink-0 mt-0.5" size={17} aria-hidden="true"/>
            <span>Zatím nemáme dvě nezávislá 28denní období. Šestihodinové reporty se téměř celé překrývají, takže z nich nevypočítáváme zdánlivý růst ani pokles.</span>
          </div>
        )}
        {hasAny ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-7 gap-y-7">
            <section className="min-w-0 space-y-3" aria-labelledby="gsc-pages-title">
              <div className="flex items-center gap-2">
                <TrendingUp size={17} aria-hidden="true"/>
                <h3 id="gsc-pages-title" className="font-semibold">Stránky s potenciálem</h3>
              </div>
              <p className="text-xs text-muted-foreground">Zahrnujeme až pět URL z výsledků s dostatečným počtem zobrazení. Pozice je průměrná za celé období.</p>
              {pages.length ? pages.map(page => (
                <div key={page.url} className="border-t border-zinc-200 pt-3">
                  <a href={page.url} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-sm break-all inline-flex items-start gap-1 hover:underline underline-offset-4">
                    {pageLabel(page.url)} <ExternalLink className="shrink-0 mt-0.5" size={13} aria-hidden="true"/>
                  </a>
                  <p className="text-xs mt-2 text-muted-foreground">
                    {fmt.format(page.impressions)} zobrazení · {fmt.format(page.clicks)} kliknutí · pozice {oneDecimal(page.position)}
                  </p>
                  <p className="text-xs mt-2">
                    {page.kind === "visibility"
                      ? "V Googlu už se zobrazuje, ale nízko. Ověř vyhledávací záměr, obsah a odkazy ze souvisejících stránek."
                      : "Dobrá průměrná pozice, dost zobrazení a nízký proklik. Prověř nadpis a popisek ve výsledcích."}
                  </p>
                </div>
              )) : <p className="text-sm text-muted-foreground">Zatím žádná stránka nepřekročila stanovený práh zobrazení a pozice.</p>}
            </section>
            <section className="min-w-0 space-y-3" aria-labelledby="gsc-queries-title">
              <div className="flex items-center gap-2">
                <BarChart3 size={17} aria-hidden="true"/>
                <h3 id="gsc-queries-title" className="font-semibold">Dotazy, které stojí za prověření</h3>
              </div>
              <p className="text-xs text-muted-foreground">Není zde automatické přiřazení dotazu ke konkrétní stránce. Google data dotazů a stránek jsou samostatné agregace.</p>
              {queries.length ? queries.map(query => (
                <div key={query.query} className="flex flex-wrap items-start justify-between gap-3 border-t border-zinc-200 pt-3">
                  <span className="text-sm font-medium min-w-0 break-words flex-1">{query.query}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmt.format(query.impressions)} zobr. · poz. {oneDecimal(query.position)}
                  </span>
                </div>
              )) : <p className="text-sm text-muted-foreground">Prozatím není dost zobrazení na rozumné doporučení.</p>}
            </section>
          </div>
        ) : <p className="text-sm text-muted-foreground">Zatím není dost důkazů pro konkrétní SEO zásah. Pokračuje sběr dat.</p>}
        <div className="border-t pt-4 space-y-2">
          <h3 className="font-semibold text-sm">Objevování nových stránek</h3>
          <p className="text-sm text-muted-foreground">
            {unknownToGoogle > 0
              ? `${unknownToGoogle} kontrolovaných URL Google při poslední známé URL Inspection neznal. U nově publikovaných stránek nejdřív ověř jejich dostupnost, canonical, sitemapu a interní odkazy; samotná kontrola není důkaz chyby na celém webu.`
              : "V dosud kontrolovaných URL není uložen výsledek „URL is unknown to Google“. Neznamená to, že jsou indexované všechny stránky webu."}
          </p>
          <p className="text-xs text-muted-foreground">Google Search Console má několikadenní zpoždění. Vzorek URL Inspection není úplná statistika indexace. Doporučení nejsou předpovědí výsledků ani získaných poptávek.</p>
        </div>
      </CardContent>
    </Card>
  );
}
