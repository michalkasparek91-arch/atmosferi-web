import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

interface ProBadgeProps {
  variant?: "default" | "small" | "inline";
  className?: string;
}

export const ProBadge = ({ variant = "default", className }: ProBadgeProps) => {
  if (variant === "small") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 bg-primary/15 text-accent text-[9px] font-normal tracking-wide px-2 py-0.5 rounded-full",
          className
        )}
      >
        PRACOVNÍK
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 bg-primary/15 text-accent text-[10px] font-normal tracking-wide px-2.5 py-0.5 rounded-full",
          className
        )}
      >
        PRACOVNÍK
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 bg-primary/15 text-accent text-xs font-normal tracking-wide px-3 py-1.5 rounded-full",
        className
      )}
    >
      PRACOVNÍK
    </div>
  );
};

// Priority Application Badge for when PRO members use priority slots
export const PrioritySlotBadge = ({ className }: { className?: string }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 bg-primary/15 text-accent text-[10px] font-normal tracking-wide px-2 py-1 rounded-full animate-pulse",
        className
      )}
    >
      <Zap className="h-3 w-3" />
      Prioritní
    </span>
  );
};
