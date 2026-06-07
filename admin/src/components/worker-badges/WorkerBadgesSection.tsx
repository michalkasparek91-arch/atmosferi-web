import { Award } from "lucide-react";
import { BadgeCard, type BadgeData } from "./BadgeCard";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkerBadgesSectionProps {
  badges: BadgeData[];
  onBadgeClick?: (badge: BadgeData) => void;
}

export const WorkerBadgesSection = ({ badges, onBadgeClick }: WorkerBadgesSectionProps) => {
  const earnedCount = badges.filter(b => b.earned).length;
  const totalCount = badges.length;
  const progressPercent = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Award className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Získané odznaky</p>
              <p className="text-xs text-muted-foreground">{earnedCount} / {totalCount} odznaků</p>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2">
          <Progress 
            value={progressPercent} 
            className="h-2 bg-muted"
          />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Badges grid */}
        <div className="flex flex-wrap gap-3 justify-start">
          {badges.map((badge) => (
            <BadgeCard 
              key={badge.id} 
              badge={badge}
              onClick={() => onBadgeClick?.(badge)}
            />
          ))}
        </div>
        
        {badges.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádné odznaky
          </p>
        )}
      </CardContent>
    </Card>
  );
};
