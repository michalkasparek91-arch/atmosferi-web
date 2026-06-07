import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Ticket, Plus, Loader2, Copy, RotateCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [creditAmount, setCreditAmount] = useState("5");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("promo_codes").insert({
        code: code.toUpperCase().trim(),
        credit_amount: parseInt(creditAmount) || 5,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
        created_by: userData.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Kupón vytvořen");
      setCode("");
      setCreditAmount("5");
      setMaxUses("");
      setExpiresAt("");
    },
    onError: (e: any) => toast.error(e.message?.includes("duplicate") ? "Kód již existuje" : "Chyba při vytváření"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("promo_codes").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Kód zkopírován");
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Ticket}
        title="Kupóny"
        subtitle="Správa slevových kódů a akcí"
        actions={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted/60 transition-all active:scale-95"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] })}
            disabled={isLoading}
          >
            <RotateCw className={cn("h-3.5 w-3.5", isLoading ? "animate-spin" : "")} />
          </Button>
        }
      />

      {/* Create form */}
      <Card className="rounded-xl shadow-sm border border-border/60">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 py-3 px-5 border-b border-border/50">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" />
            Nový slevový kupón
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div>
              <Label className="text-[10px] font-medium tracking-widest text-muted-foreground opacity-60 mb-1.5 block">Kód kupónu</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="ZROBEE2026"
                className="uppercase h-8 text-[10px] font-mono"
              />
            </div>
            <div>
              <Label className="text-[10px] font-medium tracking-widest text-muted-foreground opacity-60 mb-1.5 block">Kreditů</Label>
              <Input
                type="number"
                value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
                className="h-8 text-[10px]"
              />
            </div>
            <div>
              <Label className="text-[10px] font-medium tracking-widest text-muted-foreground opacity-60 mb-1.5 block">Max. použití</Label>
              <Input
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="Neomezeno"
                className="h-8 text-[10px]"
              />
            </div>
            <div>
              <Label className="text-[10px] font-medium tracking-widest text-muted-foreground opacity-60 mb-1.5 block">Platnost do</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                className="h-8 text-[10px]"
              />
            </div>
          </div>
          <Button
            onClick={() => createCoupon.mutate()}
            disabled={!code.trim() || createCoupon.isPending}
            size="sm"
            className="mt-6 rounded-full h-8 text-[10px] font-medium px-6 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            {createCoupon.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2 opacity-70" /> : <Plus className="h-3.5 w-3.5 mr-2 opacity-80" />}
            Vytvořit kupón
          </Button>
        </CardContent>
      </Card>

      {/* Coupons list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !coupons?.length ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Ticket className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Žádné kupóny</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon: any) => (
            <Card key={coupon.id} className={`rounded-xl shadow-sm border border-border/50 ${!coupon.is_active ? "opacity-60 bg-slate-50" : "bg-white dark:bg-slate-900"}`}>
              <CardContent className="p-3 px-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => copyCode(coupon.code)}
                      className="font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors flex items-center gap-2 group"
                    >
                      <span className="opacity-80 group-hover:opacity-100">{coupon.code}</span>
                      <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </button>
                    <Badge variant="outline" className="text-[10px] font-medium bg-primary/5 text-primary border-primary/20 rounded-sm">
                      {coupon.credit_amount} kreditů
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-medium text-muted-foreground opacity-40 leading-none mb-1">Využití</span>
                      <span className="text-[10px] font-bold">
                        {coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : " / ∞"}
                      </span>
                    </div>
                    {coupon.expires_at && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-medium text-muted-foreground opacity-40 leading-none mb-1">Expirace</span>
                        <span className="text-[10px] font-bold text-amber-600">
                          {format(new Date(coupon.expires_at), "d. M. yyyy", { locale: cs })}
                        </span>
                      </div>
                    )}
                    <div className="h-8 w-[1px] bg-border/40 mx-1" />
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={val => toggleActive.mutate({ id: coupon.id, is_active: val })}
                      className="data-[state=checked]:bg-emerald-500 scale-90"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
