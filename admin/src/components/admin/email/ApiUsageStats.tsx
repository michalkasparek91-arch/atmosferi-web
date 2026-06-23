import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Activity } from "lucide-react";

export const ApiUsageStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-api-usage-stats"],
    queryFn: async () => {
      // Fetch stats for current day and current month
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("engine, service_name, requests_count, created_at")
        .gte("created_at", firstDayOfMonth.toISOString());

      if (error) {
        console.error("Error fetching API usage:", error);
        return {
          geminiDaily: 0, geminiMonthly: 0,
          groqDaily: 0, groqMonthly: 0,
          openrouterDaily: 0, openrouterMonthly: 0,
          deepseekDaily: 0, deepseekMonthly: 0,
          siliconflowDaily: 0, siliconflowMonthly: 0,
          services: {} as Record<string, number>,
          error: error.message || "Unknown error"
        };
      }

      let geminiDaily = 0, geminiMonthly = 0;
      let groqDaily = 0, groqMonthly = 0;
      let openrouterDaily = 0, openrouterMonthly = 0;
      let deepseekDaily = 0, deepseekMonthly = 0;
      let siliconflowDaily = 0, siliconflowMonthly = 0;
      const services: Record<string, number> = {};

      data.forEach(log => {
        const count = log.requests_count || 1;
        const logDate = new Date(log.created_at);
        const isToday = logDate >= today;

        if (log.engine === "gemini") {
          geminiMonthly += count;
          if (isToday) geminiDaily += count;
        } else if (log.engine === "groq") {
          groqMonthly += count;
          if (isToday) groqDaily += count;
        } else if (log.engine === "openrouter") {
          openrouterMonthly += count;
          if (isToday) openrouterDaily += count;
        } else if (log.engine === "deepseek") {
          deepseekMonthly += count;
          if (isToday) deepseekDaily += count;
        } else if (log.engine === "siliconflow") {
          siliconflowMonthly += count;
          if (isToday) siliconflowDaily += count;
        }

        services[log.service_name] = (services[log.service_name] || 0) + count;
      });

      return { geminiDaily, geminiMonthly, groqDaily, groqMonthly, openrouterDaily, openrouterMonthly, deepseekDaily, deepseekMonthly, siliconflowDaily, siliconflowMonthly, services, error: null };
    },
    refetchInterval: 60000 // refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="border-border/40 shadow-sm mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Spotřeba API Limitů (Free Tier)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const geminiLimitDaily = 1500;
  const groqLimitDaily = 14400; // Typical free tier limit
  const openrouterLimitDaily = 200;
  const deepseekLimitDaily = 1000;
  const siliconflowLimitDaily = 10000;

  const geminiDailyPct = stats ? Math.min(100, Math.round((stats.geminiDaily / geminiLimitDaily) * 100)) : 0;
  const groqDailyPct = stats ? Math.min(100, Math.round((stats.groqDaily / groqLimitDaily) * 100)) : 0;
  const openrouterDailyPct = stats ? Math.min(100, Math.round((stats.openrouterDaily / openrouterLimitDaily) * 100)) : 0;
  const deepseekDailyPct = stats ? Math.min(100, Math.round((stats.deepseekDaily / deepseekLimitDaily) * 100)) : 0;
  const siliconflowDailyPct = stats ? Math.min(100, Math.round((stats.siliconflowDaily / siliconflowLimitDaily) * 100)) : 0;

  return (
    <Card className="border-border/40 shadow-sm mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Spotřeba API Limitů (Free Tier)
        </CardTitle>
        <CardDescription>
          Aktuální čerpání denních limitů pro vyhledávání a obohacování dat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats?.error && (
          <div className="text-red-500 text-sm font-medium mb-4">
            Data nelze načíst (možná chybí SQL tabulka): {stats.error}
          </div>
        )}
        
        {/* Gemini Stats */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">Gemini (Google) - Dnes</span>
            <span className="font-mono text-muted-foreground">{stats?.geminiDaily || 0} / {geminiLimitDaily} dotazů</span>
          </div>
          <Progress value={geminiDailyPct} className={`h-2 ${geminiDailyPct > 90 ? "bg-red-500/20" : ""}`} indicatorClassName={geminiDailyPct > 90 ? "bg-red-500" : ""} />
          <div className="text-[10px] text-muted-foreground text-right">
            Za tento měsíc celkem: {stats?.geminiMonthly || 0} dotazů
          </div>
        </div>

        {/* Groq Stats */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">Groq (Llama 3) - Dnes</span>
            <span className="font-mono text-muted-foreground">{stats?.groqDaily || 0} / {groqLimitDaily} dotazů</span>
          </div>
          <Progress value={groqDailyPct} className={`h-2 ${groqDailyPct > 90 ? "bg-red-500/20" : ""}`} indicatorClassName={groqDailyPct > 90 ? "bg-red-500" : ""} />
          <div className="text-[10px] text-muted-foreground text-right">
            Za tento měsíc celkem: {stats?.groqMonthly || 0} dotazů
          </div>
        </div>

        {/* OpenRouter Stats */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">OpenRouter (Free modely) - Dnes</span>
            <span className="font-mono text-muted-foreground">{stats?.openrouterDaily || 0} / {openrouterLimitDaily} dotazů</span>
          </div>
          <Progress value={openrouterDailyPct} className={`h-2 ${openrouterDailyPct > 90 ? "bg-red-500/20" : ""}`} indicatorClassName={openrouterDailyPct > 90 ? "bg-red-500" : ""} />
          <div className="text-[10px] text-muted-foreground text-right">
            Za tento měsíc celkem: {stats?.openrouterMonthly || 0} dotazů
          </div>
        </div>

        {/* DeepSeek Stats */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">DeepSeek - Dnes</span>
            <span className="font-mono text-muted-foreground">{stats?.deepseekDaily || 0} / {deepseekLimitDaily} dotazů</span>
          </div>
          <Progress value={deepseekDailyPct} className={`h-2 ${deepseekDailyPct > 90 ? "bg-red-500/20" : ""}`} indicatorClassName={deepseekDailyPct > 90 ? "bg-red-500" : ""} />
          <div className="text-[10px] text-muted-foreground text-right">
            Za tento měsíc celkem: {stats?.deepseekMonthly || 0} dotazů
          </div>
        </div>

        {/* SiliconFlow Stats */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">SiliconFlow - Dnes</span>
            <span className="font-mono text-muted-foreground">{stats?.siliconflowDaily || 0} / {siliconflowLimitDaily} dotazů</span>
          </div>
          <Progress value={siliconflowDailyPct} className={`h-2 ${siliconflowDailyPct > 90 ? "bg-red-500/20" : ""}`} indicatorClassName={siliconflowDailyPct > 90 ? "bg-red-500" : ""} />
          <div className="text-[10px] text-muted-foreground text-right">
            Za tento měsíc celkem: {stats?.siliconflowMonthly || 0} dotazů
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <h4 className="font-bold text-xs mb-2">Měsíční spotřeba podle služeb:</h4>
          {stats?.services && Object.keys(stats.services).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(stats.services).map(([service, count]) => (
                <div key={service} className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="uppercase">{service.replace(/-/g, ' ')}</span>
                  <span className="font-mono">{count} dotazů</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">Zatím žádné API hovory tento měsíc.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
