import { Award, TrendingUp, Zap, Crown, ShieldCheck, Phone, FileText, Camera, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BadgeIcon } from "@/components/worker-badges/BadgeIcon";
import { CircularProgress } from "./CircularProgress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'experience' | 'quality' | 'trust';
  earned: boolean;
}

interface TodoItem {
  label: string;
  done: boolean;
  icon: React.ReactNode;
  action?: () => void;
}

interface ReputationCardProps {
  currentXp: number;
  currentLevel: number;
  badges: BadgeData[];
  todoItems?: TodoItem[];
}

interface LevelConfig {
  name: string;
  minXp: number;
  maxXp: number;
  colorClass: string;
  progressClass: string;
  bgClass: string;
}

const LEVEL_CONFIG: Record<number, LevelConfig> = {
  1: {
    name: "Novic",
    minXp: 0,
    maxXp: 300,
    colorClass: "text-muted-foreground",
    progressClass: "[&>div]:bg-muted-foreground",
    bgClass: "bg-muted",
  },
  2: {
    name: "Ověřený",
    minXp: 300,
    maxXp: 1000,
    colorClass: "text-blue-600",
    progressClass: "[&>div]:bg-blue-500",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
  },
  3: {
    name: "Profesionál",
    minXp: 1000,
    maxXp: 2500,
    colorClass: "text-amber-600",
    progressClass: "[&>div]:bg-amber-500",
    bgClass: "bg-amber-100 dark:bg-amber-900/30",
  },
  4: {
    name: "Elita",
    minXp: 2500,
    maxXp: 2500,
    colorClass: "text-foreground",
    progressClass: "[&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500",
    bgClass: "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
  },
};

export const ReputationCard = ({ currentXp, currentLevel, badges, todoItems }: ReputationCardProps) => {
  const config = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[1];
  const isMaxLevel = currentLevel >= 4;
  
  const xpInCurrentLevel = currentXp - config.minXp;
  const xpNeededForNextLevel = config.maxXp - config.minXp;
  const progressPercent = isMaxLevel 
    ? 100 
    : Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;

  const pendingTodos = todoItems?.filter(t => !t.done) || [];

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden rounded-2xl">
      <CardContent className="p-5 space-y-4">
        {/* Header with Level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CircularProgress percent={progressPercent} size={44} strokeWidth={3} colorClass={config.colorClass}>
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full shadow-sm transition-all duration-300",
                "bg-[hsl(var(--dark-green))] text-[hsl(var(--list-item-header))]"
              )}>
                {currentLevel === 4 ? (
                  <Crown className="h-5 w-5" />
                ) : (
                  <TrendingUp className="h-5 w-5" />
                )}
              </div>
            </CircularProgress>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">
                  Úroveň {currentLevel}
                </p>
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-semibold rounded-full",
                  config.bgClass,
                  config.colorClass
                )}>
                  {config.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentXp} XP {!isMaxLevel && `· ${config.maxXp - currentXp} XP do další úrovně`}
              </p>
            </div>
          </div>
          
          {/* Badge Counter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-full">
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-foreground">{earnedCount}/{totalCount}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress 
            value={progressPercent} 
            className={cn("h-2 bg-muted/50 rounded-full", config.progressClass)}
          />
          {!isMaxLevel && (
            <p className="text-[10px] text-muted-foreground text-right">
              {Math.round(progressPercent)}% dokončeno
            </p>
          )}
        </div>

        {/* Badges Row */}
        <div className="pt-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
            Odznaky
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <CompactBadge key={badge.id} badge={badge} />
            ))}
          </div>
        </div>

        {/* Todo List - suggestions to earn more badges */}
        {pendingTodos.length > 0 && (
          <div className="pt-3 border-t border-border/30 space-y-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Co můžete udělat
            </p>
            {pendingTodos.map((todo, i) => (
              <button
                key={i}
                onClick={todo.action}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors text-left group"
              >
                <span className="text-muted-foreground">{todo.icon}</span>
                <span className="text-xs text-foreground flex-1">{todo.label}</span>
                {todo.action && <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function CompactBadge({ badge }: { badge: BadgeData }) {
  const [open, setOpen] = useState(false);
  const { name, description, icon, earned } = badge;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            earned
              ? "bg-[hsl(var(--dark-green))] border-[hsl(var(--dark-green))] text-[hsl(var(--list-item-header))] hover:scale-110 shadow-md"
              : "bg-muted/30 border-dashed border-muted-foreground/20 text-muted-foreground/30 grayscale"
          )}
        >
          <BadgeIcon iconName={icon} size={20} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="max-w-[200px] text-center p-3 bg-popover border border-border shadow-lg">
        <p className="font-semibold text-sm text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        {!earned && (
          <p className="text-[10px] text-muted-foreground mt-2 italic border-t border-border pt-2">Zatím nezískáno</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default ReputationCard;
