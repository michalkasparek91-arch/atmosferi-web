import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export function SubscribersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subscribersPage, setSubscribersPage] = useState(0);

  const { data: subscribersData, isLoading: subscribersLoading } = useQuery({
    queryKey: ["admin-push-subscribers", subscribersPage],
    queryFn: async () => {
      const { count } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select(`
          id,
          endpoint,
          user_agent,
          created_at,
          profiles (
            full_name,
            email,
            user_type
          )
        `)
        .order("created_at", { ascending: false })
        .range(subscribersPage * PAGE_SIZE, (subscribersPage + 1) * PAGE_SIZE - 1);
      
      if (error) throw error;
      return { data, total_count: count || 0 };
    },
  });

  const invalidateTokenMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Odstraněno", description: "Zařízení bylo odebráno ze seznamu odběratelů." });
      queryClient.invalidateQueries({ queryKey: ["admin-push-subscribers"] });
    },
    onError: (err: any) => toast({ title: "Chyba", description: err.message, variant: "destructive" })
  });

  return (
    <Card className="border border-border/50 shadow-none overflow-hidden bg-card rounded-xl m-0">
      <CardHeader className="p-6 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500" />
          <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Aktivní odběratelé ({subscribersData?.total_count || 0})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50">
              <TableHead className="text-[10px] h-9 font-bold px-6">Uživatel</TableHead>
              <TableHead className="text-[10px] h-9 font-bold">Email</TableHead>
              <TableHead className="text-[10px] h-9 font-bold">Zařízení / Prohlížeč</TableHead>
              <TableHead className="text-[10px] h-9 font-bold">Registrace</TableHead>
              <TableHead className="text-[10px] h-9 font-bold text-right px-6">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribersLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5} className="py-4 px-6"><div className="h-4 w-full bg-muted animate-pulse rounded-full" /></TableCell></TableRow>
              ))
            ) : subscribersData?.data?.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group">
                <TableCell className="py-3 px-6"><span className="text-[11px] font-bold text-foreground">{r.profiles?.full_name || "Neznámý"}</span></TableCell>
                <TableCell className="py-3"><span className="text-[11px] font-medium text-muted-foreground/60">{r.profiles?.email}</span></TableCell>
                <TableCell className="py-3">
                  <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[200px] block" title={r.user_agent}>
                    {r.user_agent || "Neznámé zařízení"}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-[10px] font-medium text-muted-foreground/40">{format(new Date(r.created_at), "d.M.yyyy HH:mm")}</TableCell>
                <TableCell className="py-3 px-6 text-right">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => invalidateTokenMutation.mutate(r.endpoint)}
                    disabled={invalidateTokenMutation.isPending}
                    className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                    title="Odebrat odběr (Invalidovat token)"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="p-4 border-t border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground/60 px-2 italic">
            Zobrazeno {subscribersData?.data?.length || 0} z {subscribersData?.total_count || 0} odběratelů
          </span>
          <Pagination className="w-auto m-0">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (subscribersPage > 0) setSubscribersPage(p => p - 1); }}
                  className={cn("h-8 px-3 text-[10px] font-bold rounded-full border-border/40", subscribersPage === 0 && "pointer-events-none opacity-40")}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-[10px] font-bold px-3">Strana {subscribersPage + 1}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if ((subscribersPage + 1) * PAGE_SIZE < (subscribersData?.total_count || 0)) setSubscribersPage(p => p + 1); }}
                  className={cn("h-8 px-3 text-[10px] font-bold rounded-full border-border/40", (subscribersPage + 1) * PAGE_SIZE >= (subscribersData?.total_count || 0) && "pointer-events-none opacity-40")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  );
}
