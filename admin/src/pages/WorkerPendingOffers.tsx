import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Briefcase, Pencil, Calendar, Coins, MessageSquare, ChevronRight, MapPin } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import ContentLoader from "@/components/ContentLoader";
import { WorkerOfferEditDialog } from "@/components/WorkerOfferEditDialog";
import { ImageLightbox } from "@/components/SwipeableImageGallery";
import { JobDetailsPopup } from "@/components/JobDetailsPopup";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useProfile } from "@/hooks/use-profile";
import { InsufficientPointsModal } from "@/components/InsufficientPointsModal";
import { toast } from "@/hooks/use-toast";
import { Check, X as CloseX, Crown, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { checkAndNotifyLowCredits } from "@/lib/low-credits-notification";
import { hapticTap } from "@/utils/haptics";
import { triggerConfetti } from "@/utils/confetti";

const WorkerPendingOffers = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobIdFromQuery = searchParams.get('job');
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const { profile, invalidateProfile } = useProfile();
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [requiredPoints, setRequiredPoints] = useState(0);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Auth session query via global hook
  const { session, isLoading: sessionLoading, isAuthReady } = useAuthSession();

  const user = session?.user;

  // Redirect if not authenticated
  useEffect(() => {
    if (isAuthReady && !session) {
      navigate('/prihlaseni');
    }
  }, [session, isAuthReady, navigate]);

  // Pending offers query with React Query
  const { data: pendingOffers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['worker-pending-offers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*, jobs:job_id(*, photos, customer_id, public_profiles!jobs_customer_id_fkey(full_name, avatar_url, email), service_categories:category_id(name, icon), service_subcategories:subcategory_id(name, points_cost))')
        .eq('worker_id', user!.id)
        .in('status', ['pending', 'direct_pending'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  useEffect(() => {
    if (jobIdFromQuery && pendingOffers.length > 0) {
      const element = document.getElementById(`offer-job-${jobIdFromQuery}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 3000);
      }
    }
  }, [jobIdFromQuery, pendingOffers]);

  const openLightbox = (photos: string[], index: number) => {
    setLightboxImages(photos);
    setLightboxInitialIndex(index);
    setLightboxOpen(true);
  };

  const handleSendMessage = async (offer: any) => {
    navigate(`/remeslnik/zpravy?offer=${offer.id}`);
  };

  const handleHeaderClick = (offer: any) => {
    // Prepare job data for JobDetailsPopup
    const customerProfile = offer.jobs?.public_profiles;
    const jobData = {
      ...offer.jobs,
      customer_profile: customerProfile,
      profiles: customerProfile,
      service_categories: offer.jobs?.service_categories,
      service_subcategories: offer.jobs?.service_subcategories,
    };
    setSelectedOffer(offer);
    setSelectedJob(jobData);
    setShowJobDetails(true);
  };

  const handleAcceptDirectJob = async (offer: any) => {
    if (!profile || isProcessing) return;

    const pointsCost = offer.jobs?.service_subcategories?.points_cost ?? 3;

    if (profile.points < pointsCost) {
      setRequiredPoints(pointsCost);
      setShowPointsModal(true);
      return;
    }

    try {
      setIsProcessing(offer.id);
      
      // 1. Deduct points
      const { data: newBalance, error: pointsError } = await supabase
        .rpc('deduct_points' as any, { p_user_id: user!.id, p_amount: pointsCost });

      if (pointsError) throw pointsError;

      // 2. Update job status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', offer.job_id);

      if (jobError) throw jobError;

      // 3. Update offer status
      const { error: offerError } = await supabase
        .from('offers')
        .update({ status: 'accepted' })
        .eq('id', offer.id);

      if (offerError) throw offerError;

      const finalBalance = (newBalance as number) ?? (profile.points - pointsCost);
      
      // 4. Notify customer
      try {
        await supabase.functions.invoke('notify-customer-offer-accepted', {
          body: {
            jobId: offer.job_id,
            workerName: profile.full_name,
            jobTitle: offer.jobs?.title || 'Vaše poptávka'
          }
        });
      } catch (notifyError) {
        console.error('Failed to notify customer:', notifyError);
      }

      // 5. Notify about low credits if needed
      await checkAndNotifyLowCredits(user!.id, finalBalance, profile.full_name, profile.email);

      hapticTap();
      triggerConfetti();
      toast({
        title: "Zakázka přijata! 🎉",
        description: "Kontakt na zákazníka byl odemčen. Přejeme hodně štěstí!",
        variant: "default",
        className: "bg-green-500 text-white border-none",
      });

      invalidateProfile();
      queryClient.invalidateQueries({ queryKey: ['worker-pending-offers'] });
      queryClient.invalidateQueries({ queryKey: ['worker-ongoing-jobs'] });
      
      navigate('/remeslnik/probihajici');
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeclineDirectJob = async (offerId: string, jobId: string) => {
    if (isProcessing) return;

    try {
      setIsProcessing(offerId);
      
      // Update offer to rejected
      await supabase.from('offers').update({ status: 'rejected' }).eq('id', offerId);
      
      // Notify customer
      try {
        const { data: offerData } = await supabase
          .from('offers')
          .select('*, jobs:job_id(*)')
          .eq('id', offerId)
          .single();

        if (offerData && offerData.jobs) {
          await supabase.functions.invoke('notify-customer-offer-rejected', {
            body: {
              customerId: offerData.jobs.customer_id,
              workerName: profile.full_name,
              jobTitle: offerData.jobs.title,
              jobId: offerData.jobs.id
            }
          });
        }
      } catch (notifyError) {
        console.error('Failed to notify customer about rejection:', notifyError);
      }

      toast({
        title: "Poptávka odmítnuta",
        description: "Zákazník bude informován.",
      });

      queryClient.invalidateQueries({ queryKey: ['worker-pending-offers'] });
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const loading = sessionLoading || offersLoading;

  if (loading) {
    return <ContentLoader />;
  }

  return (
    <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">
      <div className="mt-1 mb-1">
        <div className="flex items-center min-h-[36px] -mx-3 px-3 md:mx-0 md:px-0 pb-1">
          <p className="text-sm text-muted-foreground">Poptávky a nabídky čekající na odpověď</p>
        </div>
      </div>

      <InsufficientPointsModal
        open={showPointsModal}
        onOpenChange={setShowPointsModal}
        requiredPoints={requiredPoints}
        currentPoints={profile?.points || 0}
      />

      {pendingOffers.length === 0 ? (
        <EmptyState
          message="Nemáte žádné čekající nabídky"
          buttonLabel="Hledat zakázky"
          onButtonClick={() => navigate('/remeslnik/hledej')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {pendingOffers.map((offer) => {
            const IconComponent = offer.jobs?.service_categories?.icon 
              ? getCategoryIcon(offer.jobs.service_categories.icon)
              : Briefcase;
            
            const jobPhotos = offer.jobs?.photos || [];
            const firstJobPhoto = jobPhotos.length > 0 ? jobPhotos[0] : null;
            const workerPhotos = offer.photos || [];
            
            return (
              <div 
                key={offer.id} 
                id={`offer-job-${offer.job_id}`}
                className="bg-list-item-bg rounded-2xl border border-border/50 transition-all shadow-md hover:shadow-lg duration-500"
              >
                {/* Summary Row: Customer's Job Details - Header */}
                <div 
                  className="flex items-center gap-3 cursor-pointer bg-[hsl(var(--list-item-header))] p-3 md:p-5 rounded-2xl m-[11px] mb-0"
                  onClick={() => handleHeaderClick(offer)}
                >
                  {/* Icon */}
                  <div className="h-11 w-11 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  {/* Title + Customer's Job Badges (city, deadline, budget) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">
                          {offer.jobs?.title}
                        </h3>
                        {(offer as any).is_direct && (
                          <Badge variant="secondary" className="h-5 px-1.5 bg-primary/10 text-primary border-primary/20 text-[10px] font-bold shrink-0">
                            Přímé oslovení
                          </Badge>
                        )}
                      </div>
                      {offer.status === 'direct_pending' && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0">
                          PŘÍMÉ OSLOVENÍ
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {offer.jobs?.city && (
                        <div className="inline-flex items-center gap-1.5 bg-card rounded-full px-2.5 py-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {offer.jobs.city}
                          </span>
                        </div>
                      )}
                      {offer.jobs?.deadline_date && (
                        <div className="inline-flex items-center gap-1.5 bg-card rounded-full px-2.5 py-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {new Date(offer.jobs.deadline_date).toLocaleDateString('cs-CZ')}
                          </span>
                        </div>
                      )}
                      {(offer.jobs?.budget_min || offer.jobs?.budget_max) && (
                        <div className="inline-flex items-center gap-1.5 bg-card rounded-full px-2.5 py-1">
                          <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {offer.jobs.budget_min && offer.jobs.budget_max 
                              ? `${offer.jobs.budget_min.toLocaleString('cs-CZ')} - ${offer.jobs.budget_max.toLocaleString('cs-CZ')} Kč`
                              : offer.jobs.budget_max 
                                ? `do ${offer.jobs.budget_max.toLocaleString('cs-CZ')} Kč`
                                : `od ${offer.jobs.budget_min?.toLocaleString('cs-CZ')} Kč`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* First Job Image Thumbnail - Rightmost */}
                  {firstJobPhoto ? (
                    <div 
                      className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 -mt-1.5 -mr-1.5 md:-mt-2.5 md:-mr-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLightbox(jobPhotos, 0);
                      }}
                    >
                      <img 
                        src={firstJobPhoto} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-background flex items-center justify-center flex-shrink-0">
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Worker's Offer Section - Hide for direct inquiries since worker hasn't made an offer yet */}
                {!(offer as any).is_direct || offer.status !== 'direct_pending' ? (
                  <div className="p-3 md:p-5 pt-4 md:pt-6">
                    <p className="text-xs text-muted-foreground mb-2">Vaše nabídka:</p>
                    
                    {/* Worker's price and availability badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <div className="inline-flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1">
                        <Coins className="h-3.5 w-3.5 text-foreground" />
                        <span className="text-xs text-foreground font-medium">
                          {offer.price.toLocaleString('cs-CZ')} Kč
                        </span>
                      </div>
                      {offer.availability && (
                        <div className="inline-flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1">
                          <Calendar className="h-3.5 w-3.5 text-foreground" />
                          <span className="text-xs text-foreground font-medium">
                            do {(() => {
                              try {
                                return format(new Date(offer.availability), "d. M. yyyy", { locale: cs });
                              } catch {
                                return offer.availability;
                              }
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Worker's message */}
                    <p className="text-sm text-foreground leading-relaxed mb-4">
                      {offer.message || "Bez zprávy"}
                    </p>
                  </div>
                ) : null}

                {/* Worker's Portfolio Photos - Small thumbnails under the message */}
                {workerPhotos.length > 0 && (
                  <div className="flex gap-2 px-3 md:px-5 mb-4 overflow-x-auto pb-1">
                    {workerPhotos.map((photo: string, index: number) => (
                      <div 
                        key={index}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => openLightbox(workerPhotos, index)}
                      >
                        <img 
                          src={photo} 
                          alt="" 
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 px-3 md:px-5 pb-3 md:pb-5 border-t border-border/50 flex flex-col gap-2">
                  {offer.status === 'direct_pending' ? (
                    <>
                      <div className="flex items-center gap-2 mb-1 p-3 bg-primary/5 rounded-xl border border-primary/10">
                        <Info className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-[12px] text-foreground leading-tight">
                          Zákazník vás přímo oslovil. Vyplňte svou cenu a termín dokončení. Vaše nabídka bude odeslána zákazníkovi ke schválení.
                        </p>
                        <div className="ml-auto flex items-center gap-0.5 px-2 py-1 bg-primary text-white rounded-full text-[10px] font-bold">
                          {offer.jobs?.service_subcategories?.points_cost || 3} <Coins className="h-3 w-3" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 h-10 rounded-full font-bold gap-2 bg-primary hover:bg-primary-hover"
                          onClick={() => handleHeaderClick(offer)}
                        >
                          Zobrazit nabídku
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline"
                        className="h-10 rounded-full px-4 flex-1 text-sm font-medium"
                        onClick={() => {
                          setSelectedOffer(offer);
                          setShowEditDialog(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Upravit
                      </Button>
                      <Button 
                        variant="outline"
                        className="h-10 rounded-full px-4 flex-1 text-sm font-medium"
                        onClick={() => handleSendMessage(offer)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Zprávy
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />

      {/* Job Details Popup */}
      {selectedJob && (
        <JobDetailsPopup
          job={selectedJob}
          isOpen={showJobDetails}
          onClose={() => {
            setShowJobDetails(false);
            setSelectedJob(null);
            setSelectedOffer(null);
          }}
          hasApplied={true}
          onOfferSubmitted={() => {}}
          isDirectInquiry={selectedOffer?.status === 'direct_pending'}
          onAccept={() => selectedOffer && handleAcceptDirectJob(selectedOffer)}
          onDecline={() => selectedOffer && handleDeclineDirectJob(selectedOffer.id, selectedOffer.job_id)}
          isProcessing={!!isProcessing}
          pointsCost={selectedOffer?.jobs?.service_subcategories?.points_cost || 3}
        />
      )}

      {selectedOffer && showEditDialog && (
        <WorkerOfferEditDialog
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedOffer(null);
          }}
          offer={selectedOffer}
          onUpdate={() => {
            setShowEditDialog(false);
            setSelectedOffer(null);
            // Invalidate query to refresh data
            queryClient.invalidateQueries({ queryKey: ['worker-pending-offers', user?.id] });
          }}
        />
      )}
    </div>
  );
};

export default WorkerPendingOffers;
