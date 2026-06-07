import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RecipientsModal } from "./RecipientsModal";

const targetLabels: Record<string, string> = {
  all: "Všichni",
  workers: "Pracovníci",
  customers: "Zákazníci",
  pro: "PRO členové",
};

interface CampaignHistoryProps {
  onDuplicate: (campaign: any) => void;
}

export function CampaignHistory({ onDuplicate }: CampaignHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ["admin-broadcast-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const cancelCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("broadcast_notifications")
        .update({ status: 'cancelled' } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Zrušeno", description: "Kampaň byla úspěšně zrušena." });
      queryClient.invalidateQueries({ queryKey: ["admin-broadcast-notifications"] });
    },
  });

  const renderHistoryTable = (data: any[]) => (
    <div className="border-t border-border/50 bg-card overflow-x-auto shadow-none">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/50">
            <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70 pl-6">Datum</TableHead>
            <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Název kampaně</TableHead>
            <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Cílení</TableHead>
            <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">CTR</TableHead>
            <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70">Stav</TableHead>
            <TableHead className="text-[10px] h-9 font-medium text-muted-foreground/70 text-right pr-6">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((broadcast: any) => (
            <TableRow key={broadcast.id} className="group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <TableCell className="py-2.5 pl-6">
                {broadcast.scheduled_at ? (
                  <div className="text-[10px] font-medium text-blue-700 font-mono">
                    {format(new Date(broadcast.scheduled_at), "d. M. HH:mm")}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500">{format(new Date(broadcast.created_at), "d. M. HH:mm")}</span>
                )}
              </TableCell>
              <TableCell className="py-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-foreground tracking-tight truncate max-w-[200px]">{broadcast.title}</span>
                  <span className="text-[9px] text-muted-foreground/60 font-medium truncate max-w-[250px] italic">"{broadcast.body}"</span>
                </div>
              </TableCell>
              <TableCell className="py-2.5">
                <Badge variant="secondary" className="text-[9px] font-medium px-2 py-0 h-4 border-emerald-500/10 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 shadow-none">
                  {targetLabels[broadcast.target_audience] || broadcast.target_audience}
                </Badge>
              </TableCell>
              <TableCell className="py-2.5">
                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className="flex justify-between w-full text-[8px] font-bold">
                    <span className="text-muted-foreground/40">{broadcast.clicks_count || 0}</span>
                    <span className="text-emerald-600">{(broadcast.recipients_count > 0 ? (broadcast.clicks_count / broadcast.recipients_count * 100).toFixed(1) : "0")}%</span>
                  </div>
                  <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (broadcast.recipients_count > 0 ? (broadcast.clicks_count / broadcast.recipients_count * 100) : 0))}%` }} />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {broadcast.status === "scheduled" ? (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px]">Naplánováno</Badge>
                ) : broadcast.status === "sending" ? (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse text-[9px]">Odesílání</Badge>
                ) : broadcast.status === "draft" ? (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[9px]">Koncept</Badge>
                ) : broadcast.status === "failed" ? (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[9px]">Chyba</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px]">Dokončeno</Badge>
                )}
              </TableCell>
              <TableCell className="py-2.5 text-right pr-6">
                <div className="flex items-center justify-end gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    title="Duplikovat"
                    onClick={() => onDuplicate(broadcast)}
                    className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSelectedBroadcastId(broadcast.id); setIsRecipientsModalOpen(true); }}
                    className="h-7 text-[10px]"
                  >
                    Seznam
                  </Button>
                  {(broadcast.status === "scheduled" || broadcast.status === "draft") && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-[10px]"
                      onClick={() => cancelCampaignMutation.mutate(broadcast.id)}
                    >
                      Zrušit
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <Card className="border border-border/50 shadow-sm overflow-hidden bg-card rounded-xl">
        <CardContent className="p-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-orange-600" />
                Historie a fronta notifikací
              </h2>
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-full h-9">
                <TabsTrigger value="all" className="rounded-full px-4 text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Vše</TabsTrigger>
                <TabsTrigger value="scheduled" className="rounded-full px-4 text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Naplánované</TabsTrigger>
                <TabsTrigger value="drafts" className="rounded-full px-4 text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Koncepty</TabsTrigger>
                <TabsTrigger value="completed" className="rounded-full px-4 text-[10px] data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm">Dokončené</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="m-0">
              {renderHistoryTable(broadcasts || [])}
            </TabsContent>

            <TabsContent value="scheduled" className="m-0">
              {renderHistoryTable((broadcasts || []).filter((c: any) => c.status === 'scheduled' || c.status === 'sending'))}
            </TabsContent>

            <TabsContent value="drafts" className="m-0">
              {renderHistoryTable((broadcasts || []).filter((c: any) => c.status === 'draft'))}
            </TabsContent>

            <TabsContent value="completed" className="m-0">
              {renderHistoryTable((broadcasts || []).filter((c: any) => c.status === 'completed' || c.status === 'failed' || !c.status))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {selectedBroadcastId && (
        <RecipientsModal 
          isOpen={isRecipientsModalOpen} 
          onOpenChange={setIsRecipientsModalOpen} 
          broadcastId={selectedBroadcastId} 
        />
      )}
    </>
  );
}
