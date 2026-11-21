import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity, AlertCircle, ArrowUpRight, BarChart3, CheckCircle2, Clock3,
  ExternalLink, FileSearch, Search, ShieldCheck
} from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { buildInspectionHistory, isInspectionIssue, summarizeInspectionHistory, type InspectionOutcome } from "@/lib/gsc-inspection-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Inspection = InspectionOutcome;
type PerformanceRow = {
  query?: string;
  url?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  average_position: number;
};
type GscReport = {
  id: string;
  checked_at: string;
  site: string;
  period_start: string;
  period_end: string;
  clicks: number;
  impressions: number;
  ctr: number;
  average_position: number;
  inspected_urls: number;
  indexed_urls: number;
  inspection_errors: number;
  inspections: Inspection[];
  queries: PerformanceRow[];
  pages: PerformanceRow[];
};

const number = new Intl.NumberFormat("cs-CZ");
const dateTime = (s: string) => new Date(s).toLocaleString("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
const percent = (n: number) => (n * 100).toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + " %";
const position = (n: number) => n.toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const verdictLabel: Record<string, string> = {
  PASS: "Indexováno", FAIL: "Neindexováno", NEUTRAL: "Nerozhodné",
  PARTIAL: "Částečně", ERROR: "Chyba kontroly", UNKNOWN: "Neznámé"
};

export default function AdminSeo() {
  const [filter, setFilter] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const { data: reports = [], isLoading, error, refetch, isFetching } = useQuery<GscReport[]>({
    queryKey: ["atmosferi-gsc-admin-reports"],
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
    queryFn: async () => {
      // Database policy independently restricts reading to public.is_admin(auth.uid()).
      // The frontend never receives Google credentials or the Supabase service role key.
      const { data, error } = await (supabase as any)
        .from("gsc_reports")
        .select("id,checked_at,site,period_start,period_end,clicks,impressions,ctr,average_position,inspected_urls,indexed_urls,inspection_errors,inspections,queries,pages")
        .order("checked_at", { ascending: false })
        .limit(90);
      if (error) throw error;
      return (data || []) as GscReport[];
    }
  });

  const latest = reports[0];
  const trends = useMemo(() => [...reports].slice(0, 30).reverse().map((r) => ({
    day: new Date(r.checked_at).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }),
    clicks: r.clicks, impressions: r.impressions,
    date: dateTime(r.checked_at)
  })), [reports]);

  const inspectionHistory = useMemo(() => buildInspectionHistory(reports), [reports]);
  const inspectionSummary = useMemo(() => summarizeInspectionHistory(inspectionHistory), [inspectionHistory]);
  const isSyncStale = Boolean(latest && Date.now() - new Date(latest.checked_at).getTime() > 12 * 60 * 60 * 1000);
  const inspections = useMemo(() => inspectionHistory.filter((item) =>
    (!onlyIssues || isInspectionIssue(item)) &&
    (item.url.toLowerCase().includes(filter.trim().toLowerCase()) ||
      (item.coverage_state || "").toLowerCase().includes(filter.trim().toLowerCase()))
  ), [inspectionHistory, filter, onlyIssues]);

  const cards = latest ? [
    { name: "Kliknutí z Googlu", value: number.format(latest.clicks), description: "Organické vyhledávání · sledované období", Icon: Activity },
    { name: "Zobrazení ve vyhledávání", value: number.format(latest.impressions), description: "Search Console · nikoli počet návštěv", Icon: BarChart3 },
    { name: "Průměrné CTR", value: percent(latest.ctr), description: "Poměr kliknutí a zobrazení", Icon: ArrowUpRight },
    { name: "Průměrná pozice", value: position(latest.average_position), description: "Nižší číslo znamená vyšší pozici", Icon: FileSearch }
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[.15em] font-semibold uppercase text-muted-foreground mb-2">Atmosferi / Search performance</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">SEO & Google Search Console</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Skutečný výkon ve vyhledávání, indexace jednotlivých článků a technické problémy na jednom místě.</p>
        </div>
        <button type="button" onClick={() => refetch()} disabled={isFetching} className="text-sm border border-zinc-300 rounded-full px-4 py-2 hover:bg-white disabled:opacity-50">
          {isFetching ? "Načítám…" : "Obnovit přehled"}
        </button>
      </div>

      {isLoading ? <div className="rounded-xl border p-8 text-muted-foreground">Načítám zabezpečené SEO reporty…</div> :
      error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-center gap-2 font-medium text-red-800"><AlertCircle size={19}/> Data zatím nelze načíst.</div>
          <p className="mt-2 text-sm text-red-700">Ověř nasazení databázové migrace a přihlášení administrátora. Žádné statistiky nevymýšlíme.</p>
        </div>
      ) : !latest ? (
        <Card className="rounded-2xl border border-zinc-200 shadow-none">
          <CardContent className="p-8 md:p-12">
            <div className="flex items-center gap-2 text-amber-700 font-medium"><Clock3 size={20}/> Čeká na první přímou synchronizaci</div>
            <h2 className="text-2xl font-semibold tracking-tight mt-5">Přehled je připravený. Google zatím není propojený.</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              Po dokončení jednorázového nastavení Google Cloud a GitHubu se reporty budou ukládat do soukromé databáze každých šest hodin. Není potřeba Google Sheet ani otevřený prohlížeč.
            </p>
            <a className="inline-flex items-center gap-2 mt-6 text-sm font-medium underline underline-offset-4" target="_blank" rel="noopener noreferrer"
              href="https://github.com/michalkasparek91-arch/atmosferi-web/blob/main/docs/gsc-direct-connection.md">
              Nastavení trvalého napojení <ExternalLink size={15}/>
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600"/> Poslední synchronizace: <strong className="text-foreground">{dateTime(latest.checked_at)}</strong></span>
            <span>Data za období {latest.period_start} až {latest.period_end}</span>
            <span className="inline-flex gap-1 items-center"><ShieldCheck size={15}/> Soukromý report</span>
            {isSyncStale && <span role="status" className="inline-flex gap-2 items-center text-amber-700"><AlertCircle size={15}/> Synchronizace je starší než 12 hodin. Ověř běh GitHub Actions.</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map(({ name, value, description, Icon }) => (
              <Card key={name} className="rounded-2xl shadow-none">
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{name}</CardTitle>
                  <Icon size={17} className="text-muted-foreground"/>
                </CardHeader>
                <CardContent><p className="text-3xl font-semibold tracking-tight">{value}</p><p className="text-xs text-muted-foreground mt-2">{description}</p></CardContent>
              </Card>
            ))}
          </div>

          <div className="grid xl:grid-cols-[1.4fr_1fr] gap-5">
            <Card className="rounded-2xl shadow-none">
              <CardHeader><CardTitle className="text-xl font-semibold">Vývoj organické návštěvnosti</CardTitle><p className="text-xs text-muted-foreground">Posledních {trends.length} synchronizací. Každý bod je klouzavý přehled za 28 dní, nikoli výkon jediného dne.</p></CardHeader>
              <CardContent>
                <div className="h-64 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 10, right: 14, bottom: 5, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 4" stroke="#e6e6e6"/>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }}/>
                      <YAxis tick={{ fontSize: 11 }}/>
                      <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""}/>
                      <Line type="monotone" dataKey="clicks" name="Kliknutí (28 dní)" stroke="#161616" strokeWidth={2.5} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-none">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Poslední známý stav indexace</CardTitle>
                <p className="text-xs text-muted-foreground">Sloučený výsledek až 90 synchronizací, nikoli jen poslední vzorek a nikoli úplný Google index.</p>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-semibold tracking-tight">{inspectionSummary.indexed}<span className="text-xl text-muted-foreground font-normal"> / {inspectionSummary.known}</span></div>
                <p className="text-sm text-muted-foreground mt-2">Indexované URL z těch, které už náš monitor kontroloval</p>
                <div className="grid grid-cols-2 gap-3 mt-6 text-sm">
                  <div className="border-t pt-3"><strong className="text-xl">{inspectionSummary.nonIndexed}</strong><p className="text-muted-foreground text-xs mt-1">Neindexované podle Googlu</p></div>
                  <div className="border-t pt-3"><strong className="text-xl">{inspectionSummary.unknown}</strong><p className="text-muted-foreground text-xs mt-1">Neurčený stav / chyba</p></div>
                  <div className="border-t pt-3"><strong className="text-xl">{inspectionSummary.canonicalMismatches}</strong><p className="text-muted-foreground text-xs mt-1">Odlišná Google canonical URL</p></div>
                  <div className="border-t pt-3"><strong className="text-xl">{inspectionSummary.recentErrors}</strong><p className="text-muted-foreground text-xs mt-1">Poslední pokus skončil chybou</p></div>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden mt-6">
                  <div className="bg-zinc-900 h-full rounded-full" style={{ width: (inspectionSummary.known ? Math.min(100, inspectionSummary.indexed / inspectionSummary.known * 100) : 0) + "%" }}/>
                </div>
                <p className="text-xs text-muted-foreground mt-4">Aktuální vzorek: {latest.inspected_urls} URL, z toho {latest.indexed_urls} indexovaných. Nikdy nevydáváme pokrytí monitoru za kompletní indexaci webu.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl shadow-none">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Historie indexace článků</CardTitle>
              <p className="text-sm text-muted-foreground">Poslední známý výsledek každé dosud kontrolované URL napříč až 90 synchronizacemi. Chyba API sama o sobě neznamená odstranění stránky z indexu.</p>
              <div className="flex flex-wrap items-center gap-2 pt-3">
                <button type="button" onClick={() => setOnlyIssues(false)} aria-pressed={!onlyIssues}
                  className={onlyIssues ? "rounded-full border px-4 py-2 text-xs hover:bg-zinc-50" : "rounded-full bg-zinc-900 text-white px-4 py-2 text-xs"}>
                  Všechny kontrolované ({inspectionSummary.known})
                </button>
                <button type="button" onClick={() => setOnlyIssues(true)} aria-pressed={onlyIssues}
                  className={onlyIssues ? "rounded-full bg-zinc-900 text-white px-4 py-2 text-xs" : "rounded-full border px-4 py-2 text-xs hover:bg-zinc-50"}>
                  Jen problémy ({inspectionHistory.filter(isInspectionIssue).length})
                </button>
              </div>
              <div className="relative max-w-lg pt-3">
                <Search className="absolute left-3 top-6 text-muted-foreground" size={18}/>
                <input aria-label="Filtrovat URL podle adresy nebo problému" value={filter} onChange={e => setFilter(e.target.value)}
                  placeholder="Hledat článek nebo důvod…" className="w-full border bg-transparent rounded-lg py-2 pl-10 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-black"/>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead><tr className="border-b text-xs text-muted-foreground"><th scope="col" className="py-3 pr-4">Stránka</th><th scope="col" className="py-3 pr-4">Stav</th><th scope="col" className="py-3 pr-4">Podrobnost</th><th scope="col" className="py-3 whitespace-nowrap">Ověřeno</th></tr></thead>
                <tbody>{inspections.map(row => (
                  <tr key={row.url} className="border-b last:border-none align-top">
                    <td className="py-3 pr-4 max-w-lg break-all"><a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-2">{row.url.replace("https://www.atmosferi.com/","/")} ↗</a></td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className={row.verdict === "PASS" ? "text-emerald-700 font-medium" : row.verdict === "ERROR" ? "text-amber-700 font-medium" : "text-zinc-600"}>
                        {verdictLabel[row.verdict] || row.verdict}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.coverage_state || row.error || "Bez podrobnosti"}
                      {row.canonical_mismatch && <p className="text-amber-700 text-xs mt-1">Google vybral jinou canonical: {row.google_canonical}</p>}
                      {row.latest_attempt_error && row.verdict !== "ERROR" && <p className="text-amber-700 text-xs mt-1">Poslední pokus selhal, zobrazen starší platný výsledek.</p>}
                    </td>
                    <td className="py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {dateTime(row.checked_at)}
                      {Date.now() - new Date(row.checked_at).getTime() > 14 * 24 * 60 * 60 * 1000 && <p className="text-amber-700 mt-1">Starší než 14 dní</p>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              {!inspections.length && <p className="py-6 text-sm text-muted-foreground">Žádné odpovídající URL v uložených kontrolách.</p>}
            </CardContent>
          </Card>

          <div className="grid xl:grid-cols-2 gap-5">
            {([
              { key: "queries" as const, title: "Vyhledávací dotazy", field: "query" as const },
              { key: "pages" as const, title: "Nejúspěšnější vstupní stránky", field: "url" as const }
            ]).map(section => (
              <Card key={section.key} className="rounded-2xl shadow-none">
                <CardHeader><CardTitle className="text-xl font-semibold">{section.title}</CardTitle><p className="text-xs text-muted-foreground">28denní období · maximálně 25 položek</p></CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-muted-foreground text-xs">
                      <th scope="col" className="py-3 text-left pr-3">{section.key === "queries" ? "Dotaz" : "URL"}</th>
                      <th scope="col" className="text-right p-2">Kliknutí</th><th scope="col" className="text-right p-2">Zobrazení</th><th scope="col" className="text-right py-2">Pozice</th>
                    </tr></thead>
                    <tbody>{(latest[section.key] || []).map((entry, i) => (
                      <tr key={i} className="border-b last:border-none">
                        <td className="py-3 pr-3 max-w-[22rem] break-words">{section.key === "pages" ? (entry.url || "").replace("https://www.atmosferi.com/","/") : entry.query}</td>
                        <td className="p-2 text-right">{number.format(entry.clicks)}</td>
                        <td className="p-2 text-right">{number.format(entry.impressions)}</td>
                        <td className="py-2 text-right">{position(entry.average_position)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {!(latest[section.key] || []).length && <p className="text-muted-foreground text-sm py-5">Google pro tuto část nevrátil žádné výsledky.</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Zdrojem je Google Search Console API. Metriky jsou agregované, opožděné obvykle o několik dní a nepředstavují počty získaných poptávek ani potvrzení indexace celého webu. <Link to="/statistiky" className="underline underline-offset-2">Další statistiky adminu</Link>.
          </p>
        </>
      )}
    </div>
  );
}
