import { Shield, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | null;

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  unverified: {
    icon: Shield,
    label: 'Neověřeno',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  pending: {
    icon: Clock,
    label: 'Čeká na schválení',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  verified: {
    icon: ShieldCheck,
    label: 'Ověřeno',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  rejected: {
    icon: ShieldX,
    label: 'Zamítnuto',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
};

const sizeConfig = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function VerificationBadge({ 
  status, 
  size = 'md', 
  showLabel = false,
  className 
}: VerificationBadgeProps) {
  const config = statusConfig[status || 'unverified'];
  const Icon = config.icon;

  const badge = (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
      config.bgColor,
      className
    )}>
      <Icon className={cn(sizeConfig[size], config.color)} />
      {showLabel && (
        <span className={cn("text-sm font-medium", config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );

  if (showLabel) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
