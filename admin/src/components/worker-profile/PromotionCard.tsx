import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Info, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface PromotionCardProps {
  isPro: boolean;
  isPromoted: boolean;
  userId?: string;
  onToggle: (val: boolean) => void;
  onUpgradeClick: () => void;
}

export function PromotionCard({ isPro, isPromoted: initialIsPromoted, userId, onToggle, onUpgradeClick }: PromotionCardProps) {
  const [loading, setLoading] = useState(false);
  const [localPromoted, setLocalPromoted] = useState(initialIsPromoted);

  // Sync local state with prop
  useEffect(() => {
    setLocalPromoted(initialIsPromoted);
  }, [initialIsPromoted]);

  const handleToggle = async (checked: boolean) => {
    if (!isPro) {
      toast.error("Topování vyžaduje PRO členství");
      return;
    }

    setLocalPromoted(checked);
    setLoading(true);
    
    try {
      const targetId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetId) throw new Error("Nepodařilo se identifikovat uživatele");

      const { error } = await supabase
        .from('profiles')
        .update({ is_promoted: checked })
        .eq('id', targetId);

      if (error) throw error;
      
      onToggle(checked);
      toast.success(checked ? "Profil byl posunut nahoru v seznamu!" : "Topování profilu vypnuto");
    } catch (err: any) {
      setLocalPromoted(!checked); // Revert on error
      toast.error("Chyba při ukládání: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border-border/40 shadow-sm transition-all duration-300",
      localPromoted ? "bg-primary/5 border-primary/20" : "bg-card/50"
    )}>
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 opacity-[0.03] rotate-12 pointer-events-none">
        <TrendingUp className="w-32 h-32" />
      </div>

      <div className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              localPromoted ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-none mb-1">Zviditelnění profilu</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">TOP LISTING</span>
                {isPro && <Badge variant="secondary" className="text-[8px] h-3 px-1 bg-amber-500/10 text-amber-600 border-amber-500/20 uppercase font-black tracking-tighter">PRO</Badge>}
              </div>
            </div>
          </div>
          
          <Switch 
            checked={localPromoted} 
            onCheckedChange={handleToggle}
            disabled={!isPro || loading}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30 border border-border/20">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Zapnutím zviditelnění se váš profil bude zobrazovat na **horních pozicích** v seznamu profíků pro zákazníky. Zvýšíte tak šanci na oslovení až o **300%**.
            </p>
          </div>

          {!isPro ? (
            <Button 
              onClick={onUpgradeClick}
              variant="outline"
              className="w-full h-11 rounded-2xl border-dashed border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 group transition-all"
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">Odemknout s PRO členstvím</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2">
              <Sparkles className={cn("h-3 w-3", localPromoted ? "text-primary animate-pulse" : "text-muted-foreground/30")} />
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                localPromoted ? "text-primary" : "text-muted-foreground/40"
              )}>
                {localPromoted ? "Váš profil je v topu" : "Profil není topován"}
              </span>
              <Sparkles className={cn("h-3 w-3", localPromoted ? "text-primary animate-pulse" : "text-muted-foreground/30")} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
