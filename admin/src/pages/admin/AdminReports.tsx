import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, RotateCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function AdminReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [tab, setTab] = useState("pending");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*, reporter:public_profiles!reports_reporter_id_fkey(full_name), worker:public_profiles!reports_worker_id_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("reports")
        .update({ status, resolved_at: new Date().toISOString(), resolved_by: user?.id, details: resolutionNote || undefined })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Hlášení aktualizováno" });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setExpandedId(null);
      setResolutionNote("");
    },
    onError: (error) => {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    },
  });

  const filtered = reports?.filter((r: any) => {
    if (tab === "pending") return r.status === "pending";
    if (tab === "resolved") return r.status !== "pending";
    return true;
  });

  function statusBadge(status: string) {
    if (status === "pending") return <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shadow-none">Čeká</Badge>;
    if (status === "resolved") return <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border-green-500/20 shadow-none">Vyřešeno</Badge>;
    return <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground border-border/40 shadow-none">Zamítnuto</Badge>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <AdminPageHeader
        icon={AlertTriangle}
        title="Hlášení"
        subtitle="Správa nahlášených problémů a uživatelů"
        actions={
          <Button
            variant="default"
            size="icon"
            className="h-8 w-8 rounded-full shadow-sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-reports"] })}
            disabled={isLoading}
          >
            <RotateCw className={cn("h-3.5 w-3.5", isLoading ? "animate-spin" : "")} />
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="transition-all">
        <TabsList className="h-8 p-0 bg-transparent rounded-none flex gap-1 border-none shadow-none">
          <TabsTrigger 
            value="pending"
            className="h-7 rounded-full px-3 text-[10px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground outline-none"
          >
            Čekající {reports?.filter((r: any) => r.status === "pending").length ? `(${reports.filter((r: any) => r.status === "pending").length})` : ""}
          </TabsTrigger>
          <TabsTrigger 
            value="resolved"
            className="h-7 rounded-full px-3 text-[10px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground outline-none"
          >
            Vyřešené
          </TabsTrigger>
          <TabsTrigger 
            value="all"
            className="h-7 rounded-full px-3 text-[10px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground outline-none"
          >
            Vše
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !filtered?.length ? (
            <p className="text-muted-foreground text-center py-12">Žádná hlášení.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((r: any) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {statusBadge(r.status)}
                        <span className="text-[11px] font-semibold text-foreground">{r.reason}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-2">
                        <span className="opacity-60">Nahlásil:</span> <span className="text-foreground">{r.reporter?.full_name || "Neznámý"}</span>
                        <span className="opacity-30">•</span>
                        {r.worker?.full_name && (
                          <>
                            <span className="opacity-60">Pracovník:</span> <span className="text-foreground">{r.worker.full_name}</span>
                            <span className="opacity-30">•</span>
                          </>
                        )} 
                        <span className="opacity-60">{format(new Date(r.created_at), "d. M. yyyy", { locale: cs })}</span>
                      </p>
                    </div>
                    {expandedId === r.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>

                  {expandedId === r.id && (
                    <div className="mt-4 space-y-3 pl-2 border-l-2 border-primary/20">
                      {r.details && <p className="text-[10px] leading-relaxed italic">"{r.details}"</p>}
                      {r.job_id && <p className="text-[10px] text-muted-foreground/60">Job ID: {r.job_id}</p>}
                      {r.status === "pending" && (
                        <>
                          <Textarea
                            placeholder="Poznámka k vyřešení..."
                            value={resolutionNote}
                            onChange={(e) => setResolutionNote(e.target.value)}
                            className="text-[10px]"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 rounded-full text-[10px] font-medium shadow-sm active:scale-95 transition-all"
                              onClick={() => resolveMutation.mutate({ id: r.id, status: "resolved" })}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1.5 opacity-70" /> Vyřešit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 rounded-full text-[10px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 active:scale-95 transition-all"
                              onClick={() => resolveMutation.mutate({ id: r.id, status: "dismissed" })}
                              disabled={resolveMutation.isPending}
                            >
                              <XCircle className="h-3 w-3 mr-1.5 opacity-70" /> Zamítnout
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
