import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface CrawlRow {
  url: string;
  status_code: number | null;
  ok: boolean;
  error: string | null;
  response_ms: number | null;
  checked_at: string;
}

/**
 * Prerender / Bot crawl health widget.
 * Reads from public.seo_crawl_health_latest (one row per URL, latest probe).
 * Triggers the seo-crawl-monitor edge function to re-scan on demand.
 */
const PrerenderHealthWidget = () => {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["seo-crawl-health-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_crawl_health_latest" as any)
        .select("url,status_code,ok,error,response_ms,checked_at")
        .order("checked_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as unknown as CrawlRow[];
    },
    refetchOnWindowFocus: false,
  });

  const stats = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.ok).length;
    const failing = total - ok;
    const status: Record<string, number> = {};
    let avg = 0;
    let withMs = 0;
    rows.forEach((r) => {
      const k = r.status_code ? `${Math.floor(r.status_code / 100)}xx` : "err";
      status[k] = (status[k] || 0) + 1;
      if (r.response_ms != null) {
        avg += r.response_ms;
        withMs++;
      }
    });
    const lastCheck = rows.reduce<string | null>((acc, r) => (!acc || r.checked_at > acc ? r.checked_at : acc), null);
    return {
      total,
      ok,
      failing,
      failRate: total ? failing / total : 0,
      avgMs: withMs ? Math.round(avg / withMs) : 0,
      status,
      lastCheck,
    };
  }, [rows]);

  const failingRows = useMemo(
    () => rows.filter((r) => !r.ok).sort((a, b) => (b.checked_at > a.checked_at ? 1 : -1)).slice(0, 50),
    [rows],
  );

  const rescan = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-crawl-monitor", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Sken hotový: ${data?.passing ?? "?"} ok / ${data?.failing ?? "?"} chyb${data?.recovered_count ? `, ${data.recovered_count} obnoveno` : ""}.`,
      );
      qc.invalidateQueries({ queryKey: ["seo-crawl-health-latest"] });
    },
    onError: (e: any) => toast.error(`Sken selhal: ${e?.message || e}`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-8">
        <Loader2 className="h-4 w-4 animate-spin" /> Načítám crawl health…
      </div>
    );
  }

  const okPct = stats.total ? Math.round((stats.ok / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="URL pokryto"
          value={stats.total.toLocaleString("cs")}
          icon={<Activity className="h-4 w-4" />}
        />
        <Kpi
          label="Úspěšnost"
          value={`${okPct}%`}
          tone={okPct >= 98 ? "good" : okPct >= 90 ? "warn" : "bad"}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <Kpi
          label="Selhání"
          value={stats.failing.toLocaleString("cs")}
          tone={stats.failing === 0 ? "good" : stats.failing < 10 ? "warn" : "bad"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <Kpi
          label="Avg. odezva"
          value={`${stats.avgMs} ms`}
          tone={stats.avgMs < 800 ? "good" : stats.avgMs < 2000 ? "warn" : "bad"}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Status code breakdown */}
      <Card className="border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest">Status kódy</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.lastCheck
                  ? `Poslední sken: ${format(new Date(stats.lastCheck), "d. M. yyyy HH:mm", { locale: cs })}`
                  : "Zatím neproběhl žádný sken."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => rescan.mutate()}
              disabled={rescan.isPending}
            >
              {rescan.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
              )}
              Spustit sken
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.status)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([code, count]) => (
                <Badge
                  key={code}
                  variant="outline"
                  className={
                    code === "2xx" || code === "3xx"
                      ? "border-emerald-300 text-emerald-700 dark:text-emerald-300"
                      : code === "4xx"
                        ? "border-amber-300 text-amber-700 dark:text-amber-300"
                        : "border-red-300 text-red-700 dark:text-red-300"
                  }
                >
                  {code}: {count}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Failing list */}
      <Card className="border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-none">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest">
              Selhávající URL <span className="text-muted-foreground font-normal">({failingRows.length})</span>
            </h3>
          </div>
          {failingRows.length === 0 ? (
            <p className="text-sm text-emerald-600">Vše ok — žádné URL neselhává.</p>
          ) : (
            <div className="divide-y divide-border">
              {failingRows.map((r) => (
                <div key={r.url} className="py-2 flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300 shrink-0">
                    {r.status_code ?? "ERR"}
                  </Badge>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:text-primary"
                    title={r.url}
                  >
                    {r.url.replace("https://zrobee.cz", "")}
                  </a>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {r.error ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Kpi = ({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "neutral";
  icon?: React.ReactNode;
}) => {
  const toneCls =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "text-foreground";
  return (
    <Card className="border-zinc-200 dark:border-zinc-800/80 rounded-xl shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`mt-2 text-2xl font-black ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
};

export default PrerenderHealthWidget;
