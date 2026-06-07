import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Plus, Ticket, Sparkles, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InsufficientPointsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredPoints: number;
  currentPoints: number;
  onTopUpClick?: () => void;
}

export const InsufficientPointsModal = ({
  open,
  onOpenChange,
  requiredPoints,
  currentPoints,
  onTopUpClick,
}: InsufficientPointsModalProps) => {
  const navigate = useNavigate();

  const handleBuyCredits = () => {
    onOpenChange(false);
    if (onTopUpClick) {
      onTopUpClick();
    } else {
      navigate("/remeslnik/profil");
      // Small timeout to give navigation time before potentially opening dialog there
      setTimeout(() => {
        const event = new CustomEvent("open-points-purchase");
        window.dispatchEvent(event);
      }, 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-[hsl(var(--dark-green))] to-[hsl(105,35%,15%)] p-8 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
            <Coins className="absolute -top-4 -left-4 w-24 h-24 rotate-12" />
            <Sparkles className="absolute bottom-4 right-4 w-16 h-16 -rotate-12" />
          </div>
          
          <div className="mx-auto w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/20 shadow-xl">
            <Coins className="h-10 w-10 text-primary" />
          </div>
          
          <DialogTitle className="text-2xl font-bold mb-2 text-white">Nedostatek kreditů</DialogTitle>
          <DialogDescription className="text-white/80 text-base leading-relaxed">
            Pro tuto akci potřebujete <span className="font-bold text-white">{requiredPoints} kreditů</span>.
            Aktuálně máte <span className="font-bold text-white">{currentPoints}</span>.
          </DialogDescription>
        </div>

        <div className="p-6 bg-card space-y-4">
          <div className="space-y-3">
            <Button 
              onClick={handleBuyCredits}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingCart className="h-5 w-5" />
              Dobít kredity
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate("/remeslnik/body-info")}
              className="w-full h-12 border-border/50 font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              <Ticket className="h-4 w-4" />
              Jak získat kredity?
            </Button>
          </div>
          
          <p className="text-[11px] text-center text-muted-foreground px-4">
            Kredity můžete získat také doporučením nových uživatelů nebo plněním výzev ve vašem profilu.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
