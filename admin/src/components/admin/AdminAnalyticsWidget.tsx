import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Users, MousePointerClick, TrendingUp } from "lucide-react";

export function AdminAnalyticsWidget() {
  const [stats, setStats] = useState({
    totalViews: 0,
    uniqueVisitors: 0,
    topPages: [] as { path: string; count: number }[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data, error } = await supabase.from("page_views").select("*").order("created_at", { ascending: false }).limit(1000);
        if (error) throw error;
        
        if (data) {
          const uniqueSessions = new Set(data.map(d => d.session_id)).size;
          
          const pagesMap: Record<string, number> = {};
          data.forEach(d => {
            const p = d.path || "/";
            pagesMap[p] = (pagesMap[p] || 0) + 1;
          });
          
          const topPages = Object.entries(pagesMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([path, count]) => ({ path, count }));
            
          setStats({
            totalViews: data.length,
            uniqueVisitors: uniqueSessions,
            topPages
          });
        }
      } catch (err) {
        console.error("Error fetching analytics", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  return (
    <Card className="rounded-xl border border-emerald-500/20 shadow-sm md:col-span-2 lg:col-span-3 bg-emerald-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-600" />
          <CardTitle className="text-lg">Návštěvnost webu (Živě)</CardTitle>
        </div>
        <CardDescription>Přehled aktivity na Atmosferi.com za poslední období.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground animate-pulse py-4">Načítám data...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <MousePointerClick className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Zobrazení stránek</p>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Unikátní návštěvníci</p>
                  <p className="text-2xl font-bold">{stats.uniqueVisitors}</p>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Nejnavštěvovanější stránky
              </p>
              <div className="space-y-2">
                {stats.topPages.length > 0 ? stats.topPages.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50">
                    <span className="text-sm font-medium truncate max-w-[200px]" title={p.path}>{p.path}</span>
                    <span className="text-xs font-bold bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full">{p.count}x</span>
                  </div>
                )) : (
                  <div className="text-xs text-muted-foreground p-2">Zatím žádná data o návštěvnosti. Běžte se podívat na svůj web!</div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
