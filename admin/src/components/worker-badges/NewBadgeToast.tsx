import { useState, useEffect } from "react";
import { BadgeIcon } from "./BadgeIcon";
import type { BadgeData } from "./BadgeCard";
import { cn } from "@/lib/utils";
import { X, PartyPopper } from "lucide-react";

interface NewBadgeToastProps {
  badge: BadgeData | null;
  open: boolean;
  onClose: () => void;
}

export const NewBadgeToast = ({ badge, open, onClose }: NewBadgeToastProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Small delay for animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  if (!open || !badge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Toast Card */}
      <div
        className={cn(
          "relative bg-card border-2 border-yellow-300 dark:border-yellow-600 rounded-2xl p-6 shadow-xl max-w-sm w-full",
          "transform transition-all duration-500 ease-out",
          isVisible 
            ? "scale-100 opacity-100 translate-y-0" 
            : "scale-90 opacity-0 translate-y-4"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Confetti decoration */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <PartyPopper className="w-8 h-8 text-yellow-500 animate-bounce" />
        </div>

        {/* Content */}
        <div className="text-center pt-4">
          {/* Badge icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 border-4 border-yellow-300 dark:border-yellow-600 flex items-center justify-center mb-4 shadow-md">
            <BadgeIcon iconName={badge.icon} size={36} className="text-yellow-600 dark:text-yellow-400" />
          </div>

          {/* Text */}
          <p className="text-sm text-muted-foreground mb-1">
            🎉 Gratulujeme!
          </p>
          <h3 className="text-lg font-bold text-foreground mb-1">
            Získal jste nový odznak
          </h3>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
            {badge.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {badge.description}
          </p>

          {/* Sparkle decorations */}
          <div className="absolute top-6 left-6 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
          <div className="absolute top-12 right-8 w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping delay-150" />
          <div className="absolute bottom-8 left-10 w-1 h-1 bg-yellow-500 rounded-full animate-ping delay-300" />
        </div>
      </div>
    </div>
  );
};
