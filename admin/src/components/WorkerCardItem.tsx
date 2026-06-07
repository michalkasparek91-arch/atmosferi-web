import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface WorkerCardItemProps {
  worker: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    city?: string | null;
    rating?: number | null;
    review_count?: number;
    is_pro?: boolean;
    business_name?: string | null;
    slug: string;
    distance?: number;
  };
  categoryName: string;
  cityName: string;
  variant?: "primary" | "dark" | "default";
  isPast?: boolean;
}

const WorkerCardItem = ({ worker, categoryName, cityName, variant = "default", isPast = false }: WorkerCardItemProps) => {
  const navigate = useNavigate();
  
  // Defensive initials helper
  const getInitials = (name: string | null) => {
    if (!name || typeof name !== 'string') return "Z";
    const trimmed = name.trim();
    if (!trimmed) return "Z";
    return trimmed.charAt(0).toUpperCase();
  };

  const displayName = worker.business_name || (worker.full_name?.split(' ')[0]) || "Profík";
  const initials = getInitials(worker.full_name || worker.business_name || "Z");

  const isPrimary = variant === "primary";
  const isDark = variant === "dark";
  const isSliderMode = isPrimary || isDark;

  // Determine colors based on variant
  const bgColorClass = isPrimary ? "bg-primary" : isDark ? "bg-dark-green" : "bg-card border border-border/50 hover:border-primary/30";
  const textColorClass = isSliderMode ? (isPrimary ? "text-primary-foreground" : "text-white") : "text-foreground";
  const mutedTextColorClass = isSliderMode ? (isPrimary ? "text-primary-foreground/70" : "text-white/70") : "text-muted-foreground";
  const starFillClass = isSliderMode ? (isPrimary ? "fill-primary-foreground text-primary-foreground" : "fill-white text-white") : "fill-yellow-500 text-yellow-500";
  
  return (
    <div 
      className={`rounded-[2.5rem] p-6 md:p-8 min-h-[420px] md:min-h-[500px] flex flex-col justify-between transition-all duration-500 select-none ${bgColorClass}`}
      style={{
        transform: isPast ? 'scale(0.85)' : 'scale(1)',
        opacity: isPast ? 0.5 : 1,
      }}
    >
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-shrink-0">
            <Avatar className={`h-16 w-16 border-2 ${isSliderMode ? 'border-white/20' : 'border-primary/10'}`}>
              <AvatarImage src={worker.avatar_url || undefined} alt={worker.full_name || "Odborník"} className="object-cover" />
              <AvatarFallback className={isSliderMode ? "bg-white/20 text-dark-green text-xl font-black" : "bg-primary/5 text-primary text-xl font-bold"}>
                {initials}
              </AvatarFallback>
            </Avatar>
            {worker.is_pro && (
              <div className="absolute -bottom-1 -right-1 bg-white text-dark-green rounded-full p-1 shadow-sm">
                <ShieldCheck className="h-3 w-3" />
              </div>
            )}
          </div>
          
          <div>
            <h3 className={`font-bold text-2xl truncate ${textColorClass}`}>
              {displayName}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(worker.rating || 5) ? starFillClass : 'fill-transparent text-white/30'}`} />
              ))}
              {worker.review_count !== undefined && worker.review_count > 0 && (
                <span className={`text-sm ml-1 ${mutedTextColorClass}`}>({worker.review_count})</span>
              )}
            </div>
          </div>
        </div>

        <p className={`text-xl leading-relaxed italic font-normal mb-8 ${textColorClass}`}>
          "{worker.bio || `Specialista na službu ${categoryName} a související řemesla. Připraven pomoci s vaším projektem.`}"
        </p>
      </div>

      <div>
        <div className={`flex items-center gap-2 mb-6 ${mutedTextColorClass}`}>
          <MapPin className="h-5 w-5" />
          <span className="text-base">{worker.city || cityName}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="default" 
            size="lg" 
            className={`rounded-full px-6 h-14 font-bold flex-1 text-base ${isPrimary ? 'bg-dark-green text-primary hover:bg-dark-green/90' : isDark ? 'bg-primary text-primary-foreground hover:bg-primary-hover' : ''}`}
            onClick={() => navigate(`/nova-poptavka?category=${encodeURIComponent(categoryName)}&worker=${worker.id}`)}
          >
            Poptat napřímo
          </Button>
          <Button 
            variant="default" 
            size="lg" 
            className={`rounded-full w-14 h-14 p-0 shrink-0 ${isPrimary ? 'bg-dark-green text-primary hover:bg-dark-green/90 border-none' : isDark ? 'bg-primary text-primary-foreground border-none' : ''}`}
            onClick={() => navigate(`/remeslnik/${worker.slug}`)}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkerCardItem;
