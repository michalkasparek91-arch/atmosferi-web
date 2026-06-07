import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { MapPin, Calendar, User, Flame, Lock, Crown, Coins, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SwipeableImageGallery } from "./SwipeableImageGallery";
import { getCategoryIcon } from "@/utils/categoryIcons";

interface WorkerJobCardProps {
  job: any;
  userId?: string | null;
  hasApplied?: boolean;
  distance?: number | string;
  pointsCost?: number;
  isFullyClosed?: boolean;
  isStandardFull?: boolean;
  userIsPro?: boolean;
  onApply?: (job: any) => void;
  onViewDetail?: (job: any) => void;
  isDetailView?: boolean;
  isPublicView?: boolean;
  onImageClick?: (images: string[], index: number) => void;
  showFullDescription?: boolean;
}

export const WorkerJobCard = ({
  job,
  userId,
  hasApplied = false,
  distance,
  pointsCost = 3,
  isFullyClosed = false,
  isStandardFull = false,
  userIsPro = false,
  onApply,
  onViewDetail,
  isDetailView = false,
  isPublicView = false,
  onImageClick,
  showFullDescription = false
}: WorkerJobCardProps) => {
  const IconComponent = getCategoryIcon(job.service_categories?.icon || "");
  
  const offerCount = job.offers?.filter((o: any) => o.status === 'pending' || o.status === 'accepted').length || 0;
  const showProUpgrade = isStandardFull && !userIsPro && !isFullyClosed && !hasApplied;
  const isPrioritySlot = isStandardFull && userIsPro && !isFullyClosed && !hasApplied;

  // Scarcity simulation
  const seed = job.id ? (job.id.charCodeAt(0) + job.id.charCodeAt(job.id.length - 1)) : 0;
  const otherWorkersCount = (seed % 3) + 1; // 1, 2, or 3
  const showScarcity = (seed % 10) < 3; // Show only on ~30% of jobs

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApply) onApply(job);
  };

  const handleViewDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetail) onViewDetail(job);
  };

  const formattedDate = () => {
    if (job.deadline_type === 'asap') return 'Co nejdříve';
    if (job.deadline_type === 'agreement') return 'Dle dohody';
    if (job.deadline_type === 'specific' && job.deadline_date) {
      return format(new Date(job.deadline_date), 'd.M.yyyy', { locale: cs });
    }
    return job.created_at ? format(new Date(job.created_at), 'd.M.yyyy', { locale: cs }) : 'Neurčeno';
  };

  const profilesData = job.customer_profile || job.profiles;
  const customerProfile = Array.isArray(profilesData) ? profilesData[0] : profilesData;

  return (
    <div className={`bg-list-item-bg rounded-2xl overflow-hidden border border-border/30 transition-all shadow-md ${!isDetailView ? 'hover:shadow-lg' : ''} md:relative md:min-h-[340px] ${hasApplied || isFullyClosed ? 'opacity-60' : ''}`}>
      {/* Mobile: Photo First Row */}
      {job.photos && job.photos.length > 0 && (
        <div className="md:hidden overflow-hidden">
          <SwipeableImageGallery 
            images={job.photos} 
            className="w-full aspect-video !rounded-none" 
            showArrows={false} 
            onImageClick={(index) => onImageClick?.(job.photos, index)} 
          />
        </div>
      )}

      {/* Category Badge - Tab-like ribbon */}
      <div className="flex items-start justify-between">
        <div className="bg-[hsl(var(--list-item-header))] pl-3 pr-4 py-2 flex items-center gap-2 rounded-br-2xl">
          <IconComponent className="h-4 w-4 text-[hsl(var(--dark-green))] dark:text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--dark-green))] dark:text-primary">
            {job.service_categories?.name}
          </span>
          {job.is_urgent && (
            <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs font-semibold">
              <Flame className="h-3 w-3" />
              URGENTNÍ
            </span>
          )}
        </div>
        
        {/* Scarcity Badge Top Right */}
        {!hasApplied && !isFullyClosed && showScarcity && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-bl-2xl text-[10px] font-bold flex items-center gap-1.5 border-b border-l border-red-100 dark:border-red-500/20">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
            <span>{otherWorkersCount} další zvažují</span>
          </div>
        )}
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className={`hidden md:flex md:flex-col pl-3 pb-2.5 pt-4 ${isDetailView ? 'mr-3' : 'mr-[22rem]'} min-h-[300px]`}>
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Location & Date Line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-foreground" />
              <span>
                {job.city || 'Neuvedeno'}
                {distance !== undefined && distance !== Infinity && distance !== "Infinity" && (
                  <span> — {distance} km</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-foreground" />
              <span>{formattedDate()}</span>
            </div>
          </div>

          {/* Subcategory Title */}
          <h3 className="text-lg font-bold text-foreground leading-tight mb-2">
            {job.service_subcategories?.name}
          </h3>

          {/* Description */}
          <p className={`text-sm text-foreground leading-relaxed ${(!isDetailView && !showFullDescription) ? 'line-clamp-4' : ''} mb-3 whitespace-pre-wrap`}>
            {job.description || "Bez popisu"}
          </p>

          <div className="flex-1" />

          {/* Price note */}
          <div className="mb-3">
            <h4 className="text-sm font-bold text-foreground mb-0.5">Cena</h4>
            <p className="text-sm text-foreground">{job.price_note || 'Není stanovena.'}</p>
          </div>

          {/* Customer info */}
          <div className="flex gap-2 items-center flex-nowrap mt-1 mb-1">
            <Avatar className="h-6 w-6">
              <AvatarImage src={customerProfile?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-muted">
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {customerProfile?.full_name?.split(' ')[0] || 'Zákazník'}
            </span>
          </div>

          {/* Bottom Row: Action Buttons */}
          <div className="flex items-center gap-3 pt-0">
            {isPublicView ? (
              <Button className="h-11 rounded-full text-sm font-semibold relative w-full justify-center" onClick={handleApply}>
                Získat zakázku
              </Button>
            ) : (
              <>
                {(() => {
                  if (hasApplied) {
                    return <Badge variant="secondary" className="text-xs px-3 py-1.5 h-11 rounded-full">Nabídka podána</Badge>;
                  }
                  if (isFullyClosed) {
                    return (
                      <Button variant="outline" className="h-11 rounded-full px-5 gap-2 text-sm font-medium opacity-60" disabled>
                        <Lock className="h-4 w-4" />
                        Plná kapacita (8/8)
                      </Button>
                    );
                  }
                  if (showProUpgrade) {
                    return (
                      <Button variant="outline" className="h-11 rounded-full px-5 gap-2 text-sm font-medium border-amber-500/50 text-amber-600 dark:text-amber-400" onClick={handleApply}>
                        <Lock className="h-4 w-4" />
                        Kapacita ({offerCount}/6) — Odemknout s PRO
                      </Button>
                    );
                  }
                  if (isPrioritySlot) {
                    return (
                      <Button className="h-11 rounded-full px-5 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold" onClick={handleApply}>
                        <Crown className="h-4 w-4" />
                        Prioritní nabídka
                        <span className="bg-background text-foreground text-[10px] font-bold rounded-full ml-auto flex items-center gap-0.5 p-1 px-1.5">
                          {pointsCost} <Coins className="w-3 h-3" />
                        </span>
                      </Button>
                    );
                  }
                  return (
                    <Button className="h-11 rounded-full text-sm font-semibold relative w-full justify-center" onClick={handleApply}>
                      Podat nabídku
                      {!isDetailView && (
                        <span className="absolute right-3 opacity-70 text-xs font-bold flex items-center gap-0.5">
                          {pointsCost} <Coins className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </Button>
                  );
                })()}

                {!isDetailView && onViewDetail && (
                  <Button className="h-11 rounded-full text-sm font-medium bg-[hsl(var(--list-item-header))] hover:bg-[hsl(var(--list-item-header))]/80 text-foreground border-0 shadow-none w-full justify-center" onClick={handleViewDetail}>
                    Zobrazit detail
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Photo Gallery (Desktop) */}
      {!isDetailView && (
        <div className="hidden md:block absolute top-2.5 right-2.5 bottom-2.5 w-80">
          {job.photos && job.photos.length > 0 ? (
            <SwipeableImageGallery 
              images={job.photos} 
              className="w-full h-full rounded-xl" 
              onImageClick={(index) => onImageClick?.(job.photos, index)} 
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-[hsl(var(--job-image-placeholder))] flex items-center justify-center relative">
              <IconComponent className="h-16 w-16 text-muted-foreground/40" />
              <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-30">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </div>
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo Grid for Detail View (Desktop) */}
      {isDetailView && job.photos && job.photos.length > 0 && (
        <div className="hidden md:block px-3 pb-6 pt-2">
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Fotografie</h4>
          <div className="grid grid-cols-4 lg:grid-cols-5 gap-3">
            {job.photos.map((photo: string, index: number) => (
              <div 
                key={index} 
                className="aspect-square rounded-xl overflow-hidden border border-border/30 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                onClick={() => onImageClick?.(job.photos, index)}
              >
                <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="md:hidden px-3 pb-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground mb-3 mt-3">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-foreground" />
            <span>
              {job.city || 'Neuvedeno'}
              {distance !== undefined && distance !== Infinity && distance !== "Infinity" && (
                <span> — {distance} km</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-foreground" />
            <span>{formattedDate()}</span>
          </div>
        </div>

        <h3 className="text-base font-bold text-foreground leading-tight mb-2">
          {job.service_subcategories?.name}
        </h3>

        <p className={`text-xs text-foreground leading-relaxed ${(!isDetailView && !showFullDescription) ? 'line-clamp-3' : ''} py-[5px] whitespace-pre-wrap`}>
          {job.description || "Bez popisu"}
        </p>

        <div className="mt-2 mb-2">
          <h4 className="text-sm font-bold text-foreground mb-0.5">Cena</h4>
          <p className="text-xs text-foreground">{job.price_note || 'Není stanovena.'}</p>
        </div>

        {/* Customer info */}
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="h-5 w-5">
            <AvatarImage src={customerProfile?.avatar_url || undefined} />
            <AvatarFallback className="text-[9px] bg-muted">
              <User className="h-2.5 w-2.5" />
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {customerProfile?.full_name?.split(' ')[0] || 'Zákazník'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3">
          {isPublicView ? (
            <Button className="h-10 rounded-full px-4 flex-1 text-sm font-semibold justify-center" onClick={handleApply}>
              Získat zakázku
            </Button>
          ) : (
            <>
              {(() => {
                if (hasApplied) {
                  return <Badge variant="secondary" className="text-xs px-3 py-1.5 h-10 rounded-full flex-1 justify-center">Nabídka podána</Badge>;
                }
                if (isFullyClosed) {
                  return (
                    <Button variant="outline" className="h-10 rounded-full px-4 flex-1 gap-2 opacity-60" disabled>
                      <Lock className="h-4 w-4" />
                      Plné (8/8)
                    </Button>
                  );
                }
                if (showProUpgrade) {
                  return (
                    <Button variant="outline" className="h-10 rounded-full px-4 flex-1 gap-2 border-amber-500/50 text-amber-600 dark:text-amber-400" onClick={handleApply}>
                      <Lock className="h-4 w-4" />
                      Kapacita ({offerCount}/6)
                    </Button>
                  );
                }
                return (
                  <Button className="h-10 rounded-full px-4 flex-1 text-sm font-semibold justify-center" onClick={handleApply}>
                    Podat nabídku
                  </Button>
                );
              })()}
              
              {!isDetailView && onViewDetail && (
                <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={handleViewDetail}>
                  Detail
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
