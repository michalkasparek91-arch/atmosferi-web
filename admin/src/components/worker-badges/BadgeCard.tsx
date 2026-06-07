import { useState } from "react";
import { Lock } from "lucide-react";
import { BadgeIcon } from "./BadgeIcon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'experience' | 'quality' | 'trust';
  earned: boolean;
}

interface BadgeCardProps {
  badge: BadgeData;
  onClick?: () => void;
}

export const BadgeCard = ({ badge, onClick }: BadgeCardProps) => {
  const { name, description, icon, earned } = badge;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={() => {
            setOpen(true);
            onClick?.();
          }}
          className={cn(
            "relative flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all duration-200",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            earned
              ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 hover:scale-110 hover:shadow-lg"
              : "bg-muted border-border text-muted-foreground grayscale cursor-default"
          )}
        >
          <BadgeIcon iconName={icon} size={24} />
          
          {/* Lock overlay for unearned badges */}
          {!earned && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center">
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-[200px] text-center p-3">
        <p className="font-semibold text-sm">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {!earned && (
          <p className="text-xs text-muted-foreground mt-1 italic">Zatím nezískáno</p>
        )}
      </PopoverContent>
    </Popover>
  );
};
