import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gauge, Loader2, PlayCircle, Smartphone, Monitor } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CwvRow {
  id: string;
  url: string;
  strategy: "mobile" | "desktop";
  measured_at: string;
  performance_score: number | null;
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  error: string | null;
}

function scoreColor(score: number | null) {
  if (score === null) return "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  if (score >= 90) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (score >= 50) return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
}

function metricColor(value: number | null, good: number, bad: number, lowerBetter = true) {
  if (value === null) return "text-zinc-400";
  const isGood = lowerBetter ? value <= good : value >= good;
  const isBad = lowerBetter ? value >= bad : value <= bad;
  if (isGood) return "text-emerald-600 dark:text-emerald-400";
  if (isBad) return "text-rose-600 dark:text-rose-400";
  return "text-amber-600 dark:text-amber-400";
}

function fmtMs(v: number | null) {
  if (v === null) return "—";
  if (v >= 1000) return `${(v / 1000).toFixed(2)} s`;
  return `${Math.round(v)} ms`;
}

function fmtCls(v: number | null) {
  if (v === null) return "—";
  return v.toFixed(3);
}

export function CwvDashboard() {
  const qc = useQueryClient();
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["seo-cwv-latest", strategy],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_cwv" as any)
        .select("*")
        .eq("strategy", strategy)
        .order("measured_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const seen = new Set<string>();
      const out: CwvRow[] = [];
      for (const r of (data as any[]) ?? []) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        out.push(r as CwvRow);
      }
      return out;
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("cwv-collector", {
        body: { strategies: ["mobile", "desktop"] },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Změřeno ${data?.measured ?? 0} URL párů`);
      qc.invalidateQueries({ queryKey: ["seo-cwv-latest"] });
    },
    onError: (e: any) => toast.error(`Měření selhalo: ${e?.message ?? "neznámá chyba"}`),
  });

  return (
    <Card className="border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 shadow-none rounded-xl">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Gauge className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Core Web Vitals</h3>
              <p className="text-xs text-muted-foreground">PageSpeed Insights — nejnovější měření na URL</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-full">
              <button
                onClick={() => setStrategy("mobile")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold flex items-center gap-1.5 transition",
                  strategy === "mobile"
                    ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Smartphone className="h-3 w-3" strokeWidth={1.75} /> Mobile
              </button>
              <button
                onClick={() => setStrategy("desktop")}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold flex items-center gap-1.5 transition",
                  strategy === "desktop"
                    ? "bg-white dark:bg-zinc-900 shadow-sm text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Monitor className="h-3 w-3" strokeWidth={1.75} /> Desktop
              </button>
            </div>
            <Button
              size="sm"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="rounded-full h-8 text-xs"
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Měřím…
                </>
              ) : (
                <>
                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} /> Spustit měření
                </>
              )}
            </Button>
          </div>
        </div>

        {rows.length > 0 && rows.every((r) => r.error?.includes("429") || r.error?.toLowerCase().includes("quota")) && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-900/15 p-3 text-xs text-rose-700 dark:text-rose-300">
            <strong>PageSpeed quota vyčerpaná.</strong> Všechna poslední měření vrátila HTTP 429.
            Ujisti se, že je nastavený <code className="bg-rose-100 dark:bg-rose-900/40 px-1 rounded">PAGESPEED_API_KEY</code> secret
            (Google Cloud → APIs → PageSpeed Insights API, zdarma 25 000 req/den).
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Zatím žádná měření. Klikněte na <strong>Spustit měření</strong> (trvá ~1 min).
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40">
                  <th className="py-2 px-2">URL</th>
                  <th className="py-2 px-2 text-center">Skóre</th>
                  <th className="py-2 px-2 text-right">LCP</th>
                  <th className="py-2 px-2 text-right">CLS</th>
                  <th className="py-2 px-2 text-right">INP</th>
                  <th className="py-2 px-2 text-right">FCP</th>
                  <th className="py-2 px-2 text-right">TTFB</th>
                  <th className="py-2 px-2 text-right">Měřeno</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="py-2 px-2 max-w-[280px] truncate">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground hover:text-primary truncate inline-block max-w-full"
                        title={r.url}
                      >
                        {r.url.replace(/^https?:\/\/zrobee\.cz/, "") || "/"}
                      </a>
                      {r.error && (
                        <div className="text-[10px] text-rose-500 mt-0.5 truncate">{r.error}</div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <Badge className={cn("rounded-full font-bold tabular-nums", scoreColor(r.performance_score))}>
                        {r.performance_score ?? "—"}
                      </Badge>
                    </td>
                    <td className={cn("py-2 px-2 text-right tabular-nums", metricColor(r.lcp_ms, 2500, 4000))}>
                      {fmtMs(r.lcp_ms)}
                    </td>
                    <td className={cn("py-2 px-2 text-right tabular-nums", metricColor(r.cls, 0.1, 0.25))}>
                      {fmtCls(r.cls)}
                    </td>
                    <td className={cn("py-2 px-2 text-right tabular-nums", metricColor(r.inp_ms, 200, 500))}>
                      {fmtMs(r.inp_ms)}
                    </td>
                    <td className={cn("py-2 px-2 text-right tabular-nums", metricColor(r.fcp_ms, 1800, 3000))}>
                      {fmtMs(r.fcp_ms)}
                    </td>
                    <td className={cn("py-2 px-2 text-right tabular-nums", metricColor(r.ttfb_ms, 800, 1800))}>
                      {fmtMs(r.ttfb_ms)}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground tabular-nums">
                      {new Date(r.measured_at).toLocaleDateString("cs-CZ", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span><strong className="text-emerald-600">Zelená</strong> = Google "Good"</span>
          <span><strong className="text-amber-600">Oranžová</strong> = "Needs Improvement"</span>
          <span><strong className="text-rose-600">Červená</strong> = "Poor"</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default CwvDashboard;
