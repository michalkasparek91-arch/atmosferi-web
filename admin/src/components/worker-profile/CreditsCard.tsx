import { useNavigate } from "react-router-dom";
import { Wallet, Gift, History, Plus, Sparkles, Crown, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface CreditsCardProps {
  points: number;
  isPro?: boolean;
  onTopUp?: () => void;
  onReferral?: () => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const duration = 800; // 0.8s animation
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(ease * value));
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    animationFrame = window.requestAnimationFrame(step);
    
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{new Intl.NumberFormat('cs-CZ').format(displayValue)}</>;
}

export const CreditsCard = ({ points, isPro = false, onTopUp, onReferral }: CreditsCardProps) => {
  const navigate = useNavigate();
  const isNativeApp = useIsNativeApp();

  return (
    <Card className="relative overflow-hidden border border-border/50 shadow-sm bg-card rounded-2xl transition-all duration-300 group">
      <CardContent className="p-5 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">Kreditový účet</span>
          </div>
          
          {isPro && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
              <Crown className="h-3 w-3" />
              <span className="text-[10px] font-bold tracking-wider uppercase">PRO Člen</span>
            </div>
          )}
        </div>

        {/* Credit Display & Action */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex flex-col">
            <div className="inline-flex items-baseline gap-1.5">
              <span className="text-4xl font-black tracking-tight text-foreground">
                <AnimatedNumber value={points} />
              </span>
              <span className="text-sm font-semibold text-muted-foreground line-clamp-1">kreditů</span>
            </div>
            {points < 50 && !isPro && (
              <p className="text-[10px] text-destructive mt-0.5 font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3 shrink-0" /> Nízký zůstatek
              </p>
            )}
          </div>

          {!isNativeApp && (
            <Button 
              onClick={onTopUp}
              size="sm"
              className="font-bold h-9 px-5 rounded-full shadow-sm transition-all hover:scale-[1.02] bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Dobít kredit
            </Button>
          )}
        </div>

        {isNativeApp ? (
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-center">
            <p className="text-xs text-muted-foreground font-medium">
              Kredity lze dobít ve webové verzi aplikace na zrobee.cz
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PRO Benefits List */}
            {isPro && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Vaše PRO výhody aktivní
                </p>
                <ul className="space-y-2.5">
                  <li className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">20 kreditů</strong> přidáno každý měsíc zdarma</span>
                  </li>
                  <li className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Prioritní přístup</strong> k zakázkám (uzamčené sloty 7-8)</span>
                  </li>
                  <li className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>Ověřený <strong className="text-foreground">PRO odznak</strong> pěstující důvěru</span>
                  </li>
                  <li className="text-[11px] text-muted-foreground flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Přednostní zobrazení</strong> vašeho profilu zákazníkům</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Secondary Actions move to bottom */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onReferral}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Gift className="h-3.5 w-3.5" />
                <span>Za doporučení</span>
              </button>
              
              <button
                onClick={() => navigate('/remeslnik/fakturace')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <History className="h-3.5 w-3.5" />
                <span>Historie</span>
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditsCard;
