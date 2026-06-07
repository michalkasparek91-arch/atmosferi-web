import { 
  Footprints, 
  Star, 
  Zap, 
  Trophy, 
  ShieldCheck, 
  Hammer, 
  Clock, 
  ThumbsUp,
  Award,
  Heart,
  MessageCircle,
  CheckCircle,
  Phone as PhoneIcon,
  Sparkles,
  type LucideIcon
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  footprints: Footprints,
  star: Star,
  zap: Zap,
  trophy: Trophy,
  'shield-check': ShieldCheck,
  hammer: Hammer,
  clock: Clock,
  'thumbs-up': ThumbsUp,
  award: Award,
  heart: Heart,
  'message-circle': MessageCircle,
  'check-circle': CheckCircle,
  phone: PhoneIcon,
  sparkles: Sparkles,
};

interface BadgeIconProps {
  iconName: string;
  className?: string;
  size?: number;
}

export const BadgeIcon = ({ iconName, className, size = 20 }: BadgeIconProps) => {
  const Icon = iconMap[iconName] || Award;
  return <Icon className={className} size={size} />;
};
