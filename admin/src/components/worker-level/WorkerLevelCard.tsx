import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkerLevelCardProps {
  currentXp: number;
  currentLevel: number;
}

interface LevelConfig {
  name: string;
  minXp: number;
  maxXp: number;
  colorClass: string;
  badgeClass: string;
  progressClass: string;
}

const LEVEL_CONFIG: Record<number, LevelConfig> = {
  1: {
    name: "Novic",
    minXp: 0,
    maxXp: 300,
    colorClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
    progressClass: "[&>div]:bg-muted-foreground",
  },
  2: {
    name: "Ověřený",
    minXp: 300,
    maxXp: 1000,
    colorClass: "text-blue-600",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-300",
    progressClass: "[&>div]:bg-blue-500",
  },
  3: {
    name: "Profesionál",
    minXp: 1000,
    maxXp: 2500,
    colorClass: "text-yellow-600",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-400",
    progressClass: "[&>div]:bg-yellow-500",
  },
  4: {
    name: "Elita",
    minXp: 2500,
    maxXp: 2500,
    colorClass: "text-foreground",
    badgeClass: "bg-foreground text-background border-foreground",
    progressClass: "[&>div]:bg-foreground",
  },
};

export const WorkerLevelCard = ({ currentXp, currentLevel }: WorkerLevelCardProps) => {
  const config = LEVEL_CONFIG[currentLevel] || LEVEL_CONFIG[1];
  const isMaxLevel = currentLevel >= 4;
  
  // Calculate progress within current level
  const xpInCurrentLevel = currentXp - config.minXp;
  const xpNeededForNextLevel = config.maxXp - config.minXp;
  const progressPercent = isMaxLevel 
    ? 100 
    : Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

  const xpToNextLevel = isMaxLevel ? 0 : config.maxXp - currentXp;

  return (
    <Card className="overflow-hidden border-border">
      <CardContent className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl",
              currentLevel === 4 ? "bg-foreground" : "bg-muted"
            )}>
              <TrendingUp className={cn(
                "h-5 w-5",
                currentLevel === 4 ? "text-background" : config.colorClass
              )} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Úroveň {currentLevel}
              </p>
              <p className="text-xs text-muted-foreground">
                {config.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{currentXp}</p>
            <p className="text-xs text-muted-foreground">celkem XP</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={progressPercent} 
            className={cn("h-2 bg-muted", config.progressClass)}
          />
          
          {/* Stats Row */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {currentXp} XP
            </span>
            {!isMaxLevel ? (
              <span className="text-muted-foreground">
                {config.maxXp} XP <span className="text-xs">(Další úroveň)</span>
              </span>
            ) : (
              <span className="font-medium text-foreground">
                Maximální úroveň dosažena! 🎉
              </span>
            )}
          </div>
        </div>

        {/* Motivation Text */}
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-lg",
          isMaxLevel ? "bg-foreground/5" : "bg-primary/5"
        )}>
          <Zap className={cn(
            "w-4 h-4 mt-0.5 flex-shrink-0",
            isMaxLevel ? "text-foreground" : "text-primary"
          )} />
          <p className="text-sm text-muted-foreground">
            {isMaxLevel ? (
              "Gratulujeme! Jste na vrcholu. Pokračujte v skvělé práci!"
            ) : (
              <>
                <span className="font-medium text-foreground">Tip:</span> Dokončete další zakázku{" "}
                <span className="text-primary font-medium">(+30 XP)</span> a posuňte se dál!
                {xpToNextLevel > 0 && (
                  <span className="block mt-1">
                    Zbývá {xpToNextLevel} XP do další úrovně.
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkerLevelCard;
