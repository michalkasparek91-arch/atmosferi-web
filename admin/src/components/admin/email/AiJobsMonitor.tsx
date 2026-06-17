import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { ApiUsageStats } from "./ApiUsageStats";

export const AiJobsMonitor = () => {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["admin-ai-jobs-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_jobs")
        .select("*")
        .order("last_run_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-ai-leads-stats"],
    queryFn: async () => {
      // Get counts of enriched vs non-enriched
      const { count: totalCount } = await supabase
        .from("marketing_leads")
        .select("*", { count: "exact", head: true });

      const { count: enrichedCount } = await supabase
        .from("marketing_leads")
        .select("*", { count: "exact", head: true })
        .not("city", "is", null)
        .not("category", "is", null);

      const { count: webSniperCount } = await supabase
        .from("marketing_leads")
        .select("*", { count: "exact", head: true })
        .eq("source", "ai_web_sniper");

      return {
        total: totalCount || 0,
        enriched: enrichedCount || 0,
        pendingEnrichment: (totalCount || 0) - (enrichedCount || 0),
        sniperFound: webSniperCount || 0
      };
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Celkem kontaktů k obohacení</p>
                <h3 className="text-3xl font-bold mt-1">{stats?.pendingEnrichment || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Úspěšně obohaceno</p>
                <h3 className="text-3xl font-bold mt-1">{stats?.enriched || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Získáno z AI Sběrače</p>
                <h3 className="text-3xl font-bold mt-1">{stats?.sniperFound || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Stav úloh na pozadí
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jobs?.map((job) => (
                  <div key={job.id} className="flex flex-col md:flex-row md:items-center justify-between p-2.5 rounded border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{job.job_name}</h4>
                    {job.is_active ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1 py-0 h-4">Aktivní</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20 text-[10px] px-1 py-0 h-4">Pauza</Badge>
                    )}
                    {job.last_run_status === 'running' && (
                      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 animate-pulse text-[10px] px-1 py-0 h-4">Běží</Badge>
                    )}
                    {job.last_run_status === 'success' && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1 py-0 h-4">OK</Badge>
                    )}
                    {job.last_run_status === 'failure' && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Chyba</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <code className="bg-muted px-1 py-0.5 rounded text-[10px] mr-2">{job.schedule}</code>
                    {job.last_run_at && (
                      <span>
                        {formatDistanceToNow(new Date(job.last_run_at), { addSuffix: true, locale: cs })}
                      </span>
                    )}
                  </p>
                  
                  {job.last_run_error && (
                    <div className="mt-1 p-2 text-[10px] bg-red-500/10 text-red-700 border border-red-500/20 rounded font-mono max-h-24 overflow-auto">
                      {job.last_run_error}
                    </div>
                  )}

                  {job.metadata && job.last_run_status === 'success' && (
                    <div className="mt-1 text-[10px] text-muted-foreground flex gap-2">
                      {job.metadata.processed !== undefined && <span>Zpracováno: {job.metadata.processed}</span>}
                      {job.metadata.updated !== undefined && <span>Aktualizováno: {job.metadata.updated}</span>}
                      {job.metadata.discovered_count !== undefined && <span>Nalezeno: {job.metadata.discovered_count}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {(!jobs || jobs.length === 0) && (
              <div className="text-center p-4 text-xs text-muted-foreground">
                Žádné úlohy nenalezeny.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
      
      <div className="lg:col-span-1">
        <ApiUsageStats />
      </div>
    </div>
  </div>
);
};
