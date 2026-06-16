import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Stav úloh na pozadí
          </CardTitle>
          <CardDescription>
            Živý přehled automatického stahování a obohacování kontaktů.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs?.map((job) => (
              <div key={job.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{job.job_name}</h4>
                    {job.is_active ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Aktivní</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20">Pozastaveno</Badge>
                    )}
                    {job.last_run_status === 'running' && (
                      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 animate-pulse">Zpracovává se</Badge>
                    )}
                    {job.last_run_status === 'success' && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">OK</Badge>
                    )}
                    {job.last_run_status === 'failure' && (
                      <Badge variant="destructive">Chyba</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Frekvence: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{job.schedule}</code>
                    {job.last_run_at && (
                      <span className="ml-3">
                        Poslední běh: {formatDistanceToNow(new Date(job.last_run_at), { addSuffix: true, locale: cs })}
                      </span>
                    )}
                  </p>
                  
                  {job.last_run_error && (
                    <div className="mt-2 p-3 text-xs bg-red-500/10 text-red-700 border border-red-500/20 rounded-md whitespace-pre-wrap font-mono max-h-32 overflow-auto">
                      {job.last_run_error}
                    </div>
                  )}

                  {job.metadata && job.last_run_status === 'success' && (
                    <div className="mt-2 text-xs text-muted-foreground flex gap-3">
                      {job.metadata.processed !== undefined && <span>Zpracováno: {job.metadata.processed}</span>}
                      {job.metadata.updated !== undefined && <span>Aktualizováno: {job.metadata.updated}</span>}
                      {job.metadata.discovered_count !== undefined && <span>Nalezeno firem: {job.metadata.discovered_count}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {(!jobs || jobs.length === 0) && (
              <div className="text-center p-8 text-muted-foreground">
                Žádné úlohy nenalezeny.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
