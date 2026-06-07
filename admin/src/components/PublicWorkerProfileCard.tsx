import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, X, Clock, MessageCircle, Sparkles, Award, ArrowLeft, ChevronRight, ChevronLeft, Zap, ShieldCheck, Building2, Phone as PhoneIcon, Pencil, Trophy, Heart, CheckCircle, Share2, ExternalLink, type LucideIcon, Plus } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useHistoryState } from "@/hooks/use-history-state";
import { toast } from "sonner";

import { BadgeData } from "./worker-profile/ReputationCard";

interface PublicWorkerProfileCardProps {
  workerId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isEmbedded?: boolean;
  showShadow?: boolean;
  badges?: BadgeData[];
  showEditButton?: boolean;
  onOfferJob?: (workerId: string, workerName: string) => void;
  deferLoading?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
}

export const PublicWorkerProfileCard = ({ 
  workerId, 
  open = false, 
  onOpenChange = () => {}, 
  isEmbedded = false,
  showShadow = true,
  badges = [],
  showEditButton = false,
  onNext,
  onPrev,
  onOfferJob,
  deferLoading = false
}: PublicWorkerProfileCardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState<number | null>(null);
  const [isFlicking, setIsFlicking] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lastFlickDirection, setLastFlickDirection] = useState<'left' | 'right' | null>(null);
  
  const swipeThreshold = 100;

  // Reset offset when worker changes with entrance animation
  useEffect(() => {
    if (lastFlickDirection) {
      // Teleport to entrance position without transition
      const entrancePos = lastFlickDirection === 'right' ? -600 : 600;
      setIsDragging(true);
      setDragOffset(entrancePos);
      setIsFlicking(false);
      
      // Settle in with transition
      const timer = setTimeout(() => {
        setIsDragging(false);
        setDragOffset(0);
        setLastFlickDirection(null);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setDragOffset(0);
      setIsDragging(false);
      setStartX(null);
      setIsFlicking(false);
      setLightboxIndex(0);
    }
  }, [workerId]);

  const handleDragStart = (clientX: number) => {
    if (isFlicking) return;
    setStartX(clientX);
    setIsDragging(true);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || startX === null || isFlicking) return;
    const offset = clientX - startX;
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging || isFlicking) return;
    setIsDragging(false);
    
    if (dragOffset > swipeThreshold && onPrev) {
      setLastFlickDirection('right');
      setIsFlicking(true);
      setDragOffset(600);
      setTimeout(() => onPrev(), 250);
    } else if (dragOffset < -swipeThreshold && onNext) {
      setLastFlickDirection('left');
      setIsFlicking(true);
      setDragOffset(-600);
      setTimeout(() => onNext(), 250);
    } else {
      setDragOffset(0);
      setLastFlickDirection(null);
    }
    setStartX(null);
  };

  const onTouchStart = (e: React.TouchEvent) => handleDragStart(e.targetTouches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleDragMove(e.targetTouches[0].clientX);
  const onTouchEnd = () => handleDragEnd();

  const onMouseDown = (e: React.MouseEvent) => handleDragStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX);
  const onMouseUp = () => handleDragEnd();
  const onMouseLeave = () => handleDragEnd();
  const [profile, setProfile] = useState<any>(null);
  const [workerServices, setWorkerServices] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasFastResponseBadge, setHasFastResponseBadge] = useState(false);

  // Sync with browser history for native back button support
  useHistoryState(open && !isEmbedded, () => onOpenChange(false), "worker-profile");
  useHistoryState(isFlipped, () => setIsFlipped(false), "worker-profile-flipped");
  useHistoryState(lightboxOpen, () => setLightboxOpen(false), "worker-profile-lightbox");

  useEffect(() => {
    if ((open || isEmbedded) && workerId && !deferLoading) {
      setIsFlipped(false);
      loadProfile();
    }
  }, [open, isEmbedded, workerId, deferLoading]);

  const loadProfile = async () => {
    setLoading(true);

    try {
      const [
        { data: profileData },
        { data: verificationData }
      ] = await Promise.all([
        supabase
          .from('public_profiles')
          .select('*')
          .eq('id', workerId)
          .single(),
        supabase
          .from('worker_verifications')
          .select('status')
          .eq('worker_id', workerId)
          .single()
      ]);

      if (profileData) {
        setProfile(profileData);
        
        // Check if favorited
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: fav } = await supabase
            .from('favorite_workers')
            .select('id')
            .eq('user_id', user.id)
            .eq('worker_id', workerId)
            .maybeSingle();
          setIsFavorite(!!fav);
        }
      }
      setVerification(verificationData);
      
      setLoading(false);

      Promise.all([
        supabase
          .from('worker_services')
          .select('*, service_subcategories(*, service_categories(*))')
          .eq('worker_id', workerId),
        supabase
          .from('reviews')
          .select('*, jobs(title, completion_photos, final_price, subcategory_id, service_subcategories:subcategory_id(name, service_categories(name)))')
          .eq('reviewee_id', workerId)
          .order('created_at', { ascending: false }),
        supabase
          .from('offers')
          .select('created_at, updated_at')
          .eq('worker_id', workerId)
          .eq('status', 'accepted')
      ]).then(([{ data: servicesData }, { data: reviewsData }, { data: offersData }]) => {
        if (servicesData) setWorkerServices(servicesData);
        if (reviewsData) setCompletedJobs(reviewsData);
        if (offersData && offersData.length >= 2) {
          const totalMs = offersData.reduce((acc, offer) => {
            if (!offer.created_at || !offer.updated_at) return acc;
            return acc + (new Date(offer.updated_at).getTime() - new Date(offer.created_at).getTime());
          }, 0);
          const avgMs = totalMs / offersData.length;
          if (avgMs > 0 && avgMs < 3600000) { // Under 1 hour
            setHasFastResponseBadge(true);
          }
        }
      });
    } catch (error) {
      console.error("Error loading worker profile:", error);
      setLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = (profile?.full_name || "").split(' ')?.[0] || "";
    return firstName.charAt(0).toUpperCase() || "?";
  };

  const BADGE_ICON_MAP: Record<string, LucideIcon> = {
    'shield-check': ShieldCheck,
    'phone': PhoneIcon,
    'star': Star,
    'zap': Zap,
    'trophy': Trophy,
    'award': Award,
    'heart': Heart,
    'check-circle': CheckCircle,
    'message-circle': MessageCircle,
    'sparkles': Sparkles,
  };

  const getBadgeIcon = (iconName: string): LucideIcon => {
    return BADGE_ICON_MAP[iconName] || Award;
  };

  const calcMedian = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const overallRatings = completedJobs.map(j => j.rating).filter(Boolean);
  const medianRating = calcMedian(overallRatings)?.toFixed(1) || (profile?.google_rating ? Number(profile.google_rating).toFixed(1) : null);
  const reviewCount = completedJobs.length > 0 ? completedJobs.length : (profile?.google_reviews_count || 0);
  const isGoogleRating = completedJobs.length === 0 && profile?.google_rating != null;

  const punctualityRatings = completedJobs.map(j => j.quality_punctuality).filter(Boolean);
  const communicationRatings = completedJobs.map(j => j.quality_communication).filter(Boolean);
  const cleanlinessRatings = completedJobs.map(j => j.quality_cleanliness).filter(Boolean);
  const professionalismRatings = completedJobs.map(j => j.quality_professionalism).filter(Boolean);

  const qualityStats = [
    { key: 'punctuality', label: 'Dochvilnost', icon: <Clock className="h-3 w-3" />, median: calcMedian(punctualityRatings) },
    { key: 'communication', label: 'Komunikace', icon: <MessageCircle className="h-3 w-3" />, median: calcMedian(communicationRatings) },
    { key: 'cleanliness', label: 'Čistota', icon: <Sparkles className="h-3 w-3" />, median: calcMedian(cleanlinessRatings) },
    { key: 'professionalism', label: 'Profesionalita', icon: <Award className="h-3 w-3" />, median: calcMedian(professionalismRatings) },
  ];

  const hasQualityRatings = qualityStats.some(q => q.median !== null);
  const isVerified = verification?.status === 'verified';

  const displayCompanyType = profile?.company_type === 'self_employed' ? 'OSVČ' :
    profile?.company_type === 'company' ? 'Firma (s.r.o.)' :
    profile?.company_type || '';

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Pro uložení řemeslníka se nejprve přihlaste.");
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('favorite_workers')
        .delete()
        .eq('user_id', user.id)
        .eq('worker_id', workerId);
      
      if (!error) {
        setIsFavorite(false);
        toast.success("Odebráno z oblíbených");
      }
    } else {
      const { error } = await supabase
        .from('favorite_workers')
        .insert({ user_id: user.id, worker_id: workerId });
      
      if (!error) {
        setIsFavorite(true);
        toast.success("Uloženo do oblíbených");
      }
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const profileUrl = `${window.location.origin}/remeslnik/${profile.slug || profile.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${profile.business_name || profile.full_name} | Zrobee.cz`,
        text: profile.bio || `Podívejte se na profil řemeslníka na Zrobee.cz`,
        url: profileUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success("Odkaz zkopírován");
    }
  };

  // Shared card classes for consistent aspect ratio
  const cardClasses = cn(
    "overflow-hidden relative rounded-3xl border-0 bg-[hsl(var(--list-item-header))] flex flex-col aspect-[9/14] w-full",
    showShadow && "shadow-2xl"
  );

  if (!profile) {
    const loadingCard = (
      <Card className={cardClasses}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );

    if (isEmbedded) return <div className="p-0">{loadingCard}</div>;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[80vw] sm:w-[400px] max-w-[400px] p-0 bg-transparent border-none shadow-none overflow-visible [&>button]:hidden focus:outline-none">
          <div className="p-4 relative">
            {!isEmbedded && (
              <button
                onClick={() => onOpenChange(false)}
                className="absolute -top-3 -right-3 z-[100] w-8 h-8 flex items-center justify-center rounded-full bg-foreground hover:opacity-90 transition-colors shadow-lg"
              >
                <X className="h-4 w-4 text-background" />
              </button>
            )}
            {loadingCard}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const frontCard = (
    <Card className={cardClasses}>
      <CardContent className="p-4 space-y-3 pt-4 scrollbar-none overflow-y-auto flex-1">
        {/* Action Buttons Top Right */}
        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center transition-colors border border-border"
          >
            <Share2 className="h-3.5 w-3.5 text-foreground" />
          </button>
          
          <button
            onClick={handleToggleFavorite}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-colors border border-border",
              isFavorite ? "bg-red-50 dark:bg-red-900/20 border-red-200" : "bg-white/60 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite ? "fill-red-500 text-red-500" : "text-foreground")} />
          </button>

          {showEditButton && (
            <button
              onClick={() => navigate('/remeslnik/profil/upravit')}
              className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 flex items-center justify-center transition-colors border border-border"
            >
              <Pencil className="h-3.5 w-3.5 text-foreground" />
            </button>
          )}
        </div>
        {/* Header: Avatar + Name + Rating + Location */}
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-14 w-14 border-2 border-primary/30">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-base bg-muted text-muted-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {/* PRACOVNÍK badge removed */}
          </div>

          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground">{profile.full_name?.split?.(" ")?.[0] || "Jméno"}</h2>
              {medianRating && (
                <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold", isGoogleRating ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-primary text-primary-foreground")}>
                  {isGoogleRating && <img src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" alt="Google" className="w-2.5 h-2.5" />}
                  {medianRating} <Star className={cn("h-2.5 w-2.5", isGoogleRating ? "text-amber-600 fill-amber-600" : "fill-current")} />
                </span>
              )}
            </div>

            {profile.display_as_company && profile.business_name && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="font-medium">{profile.business_name}</span>
                {profile.ico && (
                  <span className="text-muted-foreground/60 ml-1">IČO: {profile.ico}</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span>{profile.city && profile.country ? `${profile.city}, ${profile.country}` : profile.city || "Umístění nenastaveno"}</span>
            </div>

            {displayCompanyType && !(profile.display_as_company && profile.business_name) && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span>{displayCompanyType}</span>
              </div>
            )}
            {/* Link to full profile */}
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1">
              <Link 
                to={`/remeslnik/${profile.slug || profile.id}`} 
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                Zobrazit plný profil <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Services / Categories */}
        {workerServices.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Array.from(new Set(workerServices.map((s: any) => s.service_subcategories?.service_categories?.id)))
              .filter(Boolean)
              .map((categoryId) => {
                const firstService = workerServices.find((s: any) => s.service_subcategories?.service_categories?.id === categoryId);
                const category = firstService?.service_subcategories?.service_categories;
                const subcategories = workerServices.filter((s: any) => s.service_subcategories?.service_categories?.id === categoryId);
                const count = subcategories.length;

                if (!category) return null;

                const Icon = getCategoryIcon(category.icon);

                return (
                  <Popover key={categoryId as string}>
                    <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-white/40 dark:bg-white/10 text-[10px] hover:bg-white/60 dark:hover:bg-white/20 transition-colors text-foreground">
                        <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                        <span>{category.name}</span>
                        <span className="text-muted-foreground">({count})</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground px-2 pb-1 border-b mb-1">
                          {category.name}
                        </p>
                        {subcategories.map((service: any) => (
                          <div key={service.id} className="px-2 py-1 text-xs rounded hover:bg-muted">
                            {service.service_subcategories?.name}
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
          </div>
        )}

        {/* Achievement Badges */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {badges && badges.length > 0 ? (
            badges.filter(b => b.earned).map((badge) => {
              const Icon = getBadgeIcon(badge.icon);
              return (
                <div key={badge.id} className="flex flex-col items-center gap-1 group cursor-default">
                  <div className="w-10 h-10 rounded-full bg-[hsl(105,35%,15%)] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                    <Icon className="h-5 w-5 text-background" />
                  </div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">
                    {badge.name.split(' ')[0]}
                  </span>
                </div>
              );
            })
          ) : (
            <>
              {isVerified && (
                <div className="flex flex-col items-center gap-1 group cursor-default">
                  <div className="w-10 h-10 rounded-full bg-[hsl(105,35%,15%)] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                    <ShieldCheck className="h-5 w-5 text-background" />
                  </div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">Ověřeno</span>
                </div>
              )}
              
              {medianRating && Number(medianRating) >= 4.5 && (
                <div className="flex flex-col items-center gap-1 group cursor-default">
                  <div className="w-10 h-10 rounded-full bg-[hsl(105,35%,15%)] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                    <Star className="h-5 w-5 text-background" />
                  </div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">TOP</span>
                </div>
              )}
 
              {completedJobs.length >= 10 && (
                <div className="flex flex-col items-center gap-1 group cursor-default">
                  <div className="w-10 h-10 rounded-full bg-[hsl(105,35%,15%)] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                    <Award className="h-5 w-5 text-background" />
                  </div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">Expert</span>
                </div>
              )}
 
              {completedJobs.length >= 1 && completedJobs.length < 10 && medianRating && Number(medianRating) >= 4.0 && (
                <div className="flex flex-col items-center gap-1 group cursor-default">
                  <div className="w-10 h-10 rounded-full bg-[hsl(105,35%,15%)] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                    <Award className="h-5 w-5 text-background" />
                  </div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">Hvězda</span>
                </div>
              )}
              
              {hasFastResponseBadge && (
                <div className="flex flex-col items-center gap-1 group cursor-default">
                  <div className="w-10 h-10 rounded-full bg-[hsl(105,35%,15%)] flex items-center justify-center shadow-md transition-transform hover:scale-110">
                    <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  </div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">Do 1 hod</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-xs text-muted-foreground leading-relaxed py-3">
            {profile.bio}
          </p>
        )}

        {/* Portfolio Photos */}
        {profile.portfolio_photos && profile.portfolio_photos.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {profile.portfolio_photos.map((photo: string, index: number) => (
              <button
                key={index}
                onClick={() => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
                className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer border border-border"
              >
                <img
                  src={photo}
                  alt={`Portfolio ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Quality Ratings */}
        {hasQualityRatings && (
          <div className="grid grid-cols-2 gap-1.5">
            {qualityStats.map((q) => (
              q.median !== null && (
                <div key={q.key} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/50 dark:bg-white/10 border border-border text-[10px]">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {q.icon}
                    <span>{q.label}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="font-semibold text-foreground">{q.median.toFixed(1)}</span>
                    <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                  </div>
                </div>
              )
            ))}
          </div>
        )}

      </CardContent>

      <div className="p-4 pt-0 flex-shrink-0">
        <button
          onClick={() => completedJobs.length > 0 ? setIsFlipped(true) : undefined}
          className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
            completedJobs.length > 0
              ? 'bg-[hsl(105,35%,15%)] hover:opacity-90 cursor-pointer text-background shadow-sm'
              : 'bg-white/40 dark:bg-white/10 cursor-default text-muted-foreground'
          }`}
          style={{ height: '58px' }}
        >
          <div className="flex flex-col items-start gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <Star className={`h-4 w-4 ${completedJobs.length > 0 ? 'fill-current text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-bold truncate">
                {completedJobs.length > 0 ? 'Dokončené zakázky' : 'Zatím žádné recenze'}
              </span>
              {completedJobs.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">{completedJobs.length}</span>
              )}
            </div>
            {completedJobs.length > 0 && (
              <span className="text-[10px] text-primary/80 font-medium ml-6">
                Zobrazit recenze zákazníků
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {medianRating && reviewCount > 0 && (
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-primary flex items-center gap-1">
                  {isGoogleRating && <img src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" alt="Google" className="w-3.5 h-3.5" />}
                  {medianRating} ★
                </span>
                <span className="text-[8px] text-background/60 leading-none">PRŮMĚR ({reviewCount})</span>
              </div>
            )}
            {reviewCount > 0 && <ChevronRight className="h-5 w-5 opacity-70" />}
          </div>
        </button>
      </div>
    </Card>
  );

  const backCard = (
    <Card className={cardClasses}>
      <div className="scrollbar-none overflow-y-auto flex-1">
        <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setIsFlipped(false)}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:opacity-80 transition-opacity rounded-full px-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Recenze</span>
            </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-foreground">{medianRating || "5.0"}</div>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3.5 w-3.5 ${
                    star <= Math.round(Number(medianRating) || 5)
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Celkem {completedJobs.length} hodnocení</p>
          </div>
          {isVerified && (
            <div className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase">
              Ověřený Expert
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {completedJobs.map((review: any) => (
          <div key={review.id} className="p-3 rounded-2xl bg-white/60 dark:bg-white/10 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/20 text-foreground">
                      {review.jobs?.title?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {review.jobs?.service_subcategories?.name || "Zákazník"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
              </div>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {review.rating.toFixed(1)} <Star className="h-2.5 w-2.5 fill-current" />
              </span>
            </div>

            {review.comment && (
              <p className="text-xs text-muted-foreground mb-2">{review.comment}</p>
            )}

            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {review.quality_punctuality && (
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span className="uppercase">Dochvilnost</span>
                  <span className="font-semibold text-foreground">{review.quality_punctuality.toFixed(1)}</span>
                </div>
              )}
              {review.quality_communication && (
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span className="uppercase">Komunikace</span>
                  <span className="font-semibold text-foreground">{review.quality_communication.toFixed(1)}</span>
                </div>
              )}
              {review.quality_cleanliness && (
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span className="uppercase">Čistota</span>
                  <span className="font-semibold text-foreground">{review.quality_cleanliness.toFixed(1)}</span>
                </div>
              )}
              {review.quality_professionalism && (
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span className="uppercase">Odbornost</span>
                  <span className="font-semibold text-foreground">{review.quality_professionalism.toFixed(1)}</span>
                </div>
              )}
            </div>

            {review.jobs?.completion_photos && review.jobs.completion_photos.length > 0 && (
              <div className="flex gap-1.5">
                {review.jobs.completion_photos.slice(0, 4).map((photo: string, index: number) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 relative"
                  >
                    <img
                      src={photo}
                      alt={`Completion ${index + 1}`}
                      className="w-full h-full object-cover"
                  loading="lazy"
                    />
                    {index === 3 && review.jobs.completion_photos.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                        +{review.jobs.completion_photos.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

      <div className="p-4 pt-0 flex-shrink-0">
        <Button
          onClick={() => setIsFlipped(false)}
          className="w-full rounded-full bg-[hsl(105,35%,15%)] text-background hover:opacity-90 shadow-sm font-bold text-sm h-[58px]"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Zpět na profil
        </Button>
      </div>
    </Card>
  );

  const content = (
    <>
      <div className="relative w-full max-h-[calc(100dvh-80px)]" style={{ perspective: '1000px' }}>
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          <div
            className="w-full"
            style={{
              backfaceVisibility: 'hidden',
              display: isFlipped ? 'none' : 'block',
            }}
          >
            {frontCard}
          </div>

          <div
            className="w-full"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: isFlipped ? 'block' : 'none',
            }}
          >
            {backCard}
          </div>
        </div>
      </div>

      {/* Photo Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-none">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-2 right-2 z-50 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {profile.portfolio_photos && profile.portfolio_photos.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev === 0 ? profile.portfolio_photos.length - 1 : prev - 1))}
                className="absolute left-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            )}

            {profile.portfolio_photos && profile.portfolio_photos[lightboxIndex] && (
              <img
                src={profile.portfolio_photos[lightboxIndex]}
                alt={`Portfolio ${lightboxIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain"
              />
            )}

            {profile.portfolio_photos && profile.portfolio_photos.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev === profile.portfolio_photos.length - 1 ? 0 : prev + 1))}
                className="absolute right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            )}
          </div>

          {profile.portfolio_photos && profile.portfolio_photos.length > 1 && (
            <div className="flex gap-2 p-3 justify-center overflow-x-auto">
              {profile.portfolio_photos.map((photo: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setLightboxIndex(index)}
                  className={`w-12 h-12 rounded overflow-hidden flex-shrink-0 transition-opacity ${
                    index === lightboxIndex ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <img src={photo} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  if (isEmbedded) return content;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[80vw] sm:w-[400px] max-w-[400px] p-0 bg-transparent border-none shadow-none overflow-visible [&>button]:hidden focus:outline-none">
          <div 
            className="p-0 sm:p-4 relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
          >
            {!isEmbedded && (
              <button
                onClick={() => onOpenChange(false)}
                className="absolute -top-3 -right-3 z-[100] w-8 h-8 flex items-center justify-center rounded-full bg-foreground hover:opacity-90 transition-colors shadow-lg"
              >
                <X className="h-4 w-4 text-background" />
              </button>
            )}

            {onPrev && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                className="absolute -left-14 top-1/2 -translate-y-1/2 w-10 h-10 hidden md:flex items-center justify-center rounded-full bg-[#a6d16f] hover:bg-[#b8e081] text-foreground shadow-lg transition-all z-50"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {onNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                className="absolute -right-14 top-1/2 -translate-y-1/2 w-10 h-10 hidden md:flex items-center justify-center rounded-full bg-[#a6d16f] hover:bg-[#b8e081] text-foreground shadow-lg transition-all z-50"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            <div 
              className="cursor-grab active:cursor-grabbing select-none relative z-10"
              style={{ 
                transform: `translateX(${dragOffset}px)`,
                opacity: isFlicking ? 0 : 1,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease-in-out'
              }}
            >
              {content}
            </div>

          {onOfferJob && (
            <div className="mt-4">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onOfferJob(workerId, profile.full_name);
                }}
                className="w-full h-12 rounded-full bg-[#a6d16f] hover:bg-[#b8e081] text-foreground font-bold text-sm shadow-lg transition-all gap-2"
              >
                <Plus className="h-4 w-4" />
                Nabídnout práci
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
