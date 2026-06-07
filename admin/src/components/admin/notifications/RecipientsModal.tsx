import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface RecipientsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  broadcastId: string;
}

const PAGE_SIZE = 25;

export function RecipientsModal({ isOpen, onOpenChange, broadcastId }: RecipientsModalProps) {
  const [recipientsPage, setRecipientsPage] = useState(0);

  const { data: recipientsData, isLoading } = useQuery({
    queryKey: ["admin-broadcast-recipients", broadcastId, recipientsPage],
    enabled: !!broadcastId && isOpen,
    queryFn: async () => {
      const { count } = await supabase
        .from("broadcast_recipients")
        .select("*", { count: "exact", head: true })
        .eq("broadcast_id", broadcastId);
      
      const { data, error } = await supabase
        .from("broadcast_recipients")
        .select(`
          id, 
          status, 
          error_message, 
          created_at,
          profiles (
            full_name,
            email,
            user_type
          )
        `)
        .eq("broadcast_id", broadcastId)
        .order("created_at", { ascending: false })
        .range(recipientsPage * PAGE_SIZE, (recipientsPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      return { data, total_count: count || 0 };
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white dark:bg-slate-900">
        <DialogHeader className="p-6 border-b border-border/40">
          <DialogTitle className="text-xl font-bold tracking-tight">Přehled doručení kampaně</DialogTitle>
        </DialogHeader>
        <div className="min-h-[400px] max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50 sticky top-0 z-10">
                <TableHead className="text-[10px] h-9 font-bold px-6">Uživatel</TableHead>
                <TableHead className="text-[10px] h-9 font-bold">Email</TableHead>
                <TableHead className="text-[10px] h-9 font-bold">Stav</TableHead>
                <TableHead className="text-[10px] h-9 font-bold px-6">Poslední aktualizace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4} className="py-4 px-6"><div className="h-4 w-full bg-muted animate-pulse rounded-full" /></TableCell></TableRow>
                ))
              ) : recipientsData?.data?.map((r: any) => (
                <TableRow key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group">
                  <TableCell className="py-3 px-6"><span className="text-[11px] font-bold text-foreground">{r.profiles?.full_name || "Neznámý"}</span></TableCell>
                  <TableCell className="py-3"><span className="text-[11px] font-medium text-muted-foreground/60">{r.profiles?.email}</span></TableCell>
                  <TableCell className="py-3">
                    <Badge className={cn(
                      "text-[9px] font-bold px-1.5 h-4 w-fit border-none",
                      r.status === 'sent' ? "bg-emerald-500 text-white" : 
                      r.status === 'cleaned_up' ? "bg-amber-500 text-white" : "bg-red-500 text-white"
                    )}>
                      {r.status === 'sent' ? 'OK' : r.status === 'cleaned_up' ? 'CLEANED' : 'ERR'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-6 text-[10px] font-medium text-muted-foreground/40">{format(new Date(r.created_at), "d.M.yyyy HH:mm:ss")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 border-t border-border/40 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground/60 px-2 italic">
            Zobrazeno {recipientsData?.data?.length || 0} z {recipientsData?.total_count || 0} příjemců
          </span>
          <Pagination className="w-auto m-0">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if (recipientsPage > 0) setRecipientsPage(p => p - 1); }}
                  className={cn("h-8 px-3 text-[10px] font-bold rounded-full border-border/40", recipientsPage === 0 && "pointer-events-none opacity-40")}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-[10px] font-bold px-3">Strana {recipientsPage + 1}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); if ((recipientsPage + 1) * PAGE_SIZE < (recipientsData?.total_count || 0)) setRecipientsPage(p => p + 1); }}
                  className={cn("h-8 px-3 text-[10px] font-bold rounded-full border-border/40", (recipientsPage + 1) * PAGE_SIZE >= (recipientsData?.total_count || 0) && "pointer-events-none opacity-40")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </DialogContent>
    </Dialog>
  );
}
