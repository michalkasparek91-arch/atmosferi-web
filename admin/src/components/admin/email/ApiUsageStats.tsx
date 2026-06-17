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
          geminiDaily: 0,
          geminiMonthly: 0,
          groqDaily: 0,
          groqMonthly: 0,
          services: {} as Record<string, number>
        };
      }

      let geminiDaily = 0;
      let geminiMonthly = 0;
      let groqDaily = 0;
      let groqMonthly = 0;
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
        }

        services[log.service_name] = (services[log.service_name] || 0) + count;
      });

      return { geminiDaily, geminiMonthly, groqDaily, groqMonthly, services };
    },
    refetchInterval: 60000 // refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Spotřeba API Limitů
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

  const geminiDailyPct = stats ? Math.min(100, Math.round((stats.geminiDaily / geminiLimitDaily) * 100)) : 0;
  const groqDailyPct = stats ? Math.min(100, Math.round((stats.groqDaily / groqLimitDaily) * 100)) : 0;

  return (
    <Card className="border-border/40 shadow-sm mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Spotřeba API Limitů (Free Tier)
        </CardTitle>
        <CardDescription>Aktuální čerpání denních limitů pro vyhledávání a obohacování dat.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Gemini Stats */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">Gemini (Google) - Dnes</span>
            <span className="font-mono text-muted-foreground">{stats?.geminiDaily} / {geminiLimitDaily} dotazů</span>
          </div>
          <Progress value={geminiDailyPct} className={`h-2 ${geminiDailyPct > 90 ? "bg-red-500/20" : ""}`} indicatorClassName={geminiDailyPct > 90 ? "bg-red-500" : ""} />
          <div className="text-[10px] text-muted-foreground text-right">
            Za tento měsíc celkem: {stats?.geminiMonthly} dotazů
          </div>
        </div>

        {/* Groq Stats */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold">Groq (Llama 3) - Dnes</span>
            <span className="font-mono text-muted-foreground">{stats?.groqDaily} / {groqLimitDaily} dotazů</span>
          </div>
          <Progress value={groqDailyPct} className={`h-2 ${groqDailyPct > 90 ? "bg-red-500/20" : ""}`} indicatorClassName={groqDailyPct > 90 ? "bg-red-500" : ""} />
          <div className="text-[10px] text-muted-foreground text-right">
            Za tento měsíc celkem: {stats?.groqMonthly} dotazů
          </div>
        </div>


        {/* Breakdown */}
        <div className="pt-4 border-t border-border/40">
          <p className="text-xs font-semibold mb-2">Měsíční spotřeba podle služeb:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {stats && Object.entries(stats.services).map(([service, count]) => (
              <div key={service} className="flex justify-between bg-muted/30 p-2 rounded border border-border/40">
                <span className="truncate pr-2" title={service}>{service}</span>
                <span className="font-mono font-bold">{count}</span>
              </div>
            ))}
            {stats && Object.keys(stats.services).length === 0 && (
              <span className="text-muted-foreground">Zatím žádné API hovory tento měsíc.</span>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
