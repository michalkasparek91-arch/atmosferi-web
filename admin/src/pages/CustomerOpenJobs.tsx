import { useEffect, useState } from "react";
import AcceptOfferConfirmDialog from "@/components/AcceptOfferConfirmDialog";
import EmptyState from "@/components/EmptyState";
import ContentLoader from "@/components/ContentLoader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Calendar, Coins, Star, CheckCircle, Pencil, Trash2, MessageSquare, Globe, Clock, User as UserIcon } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { JobEditDialog } from "@/components/JobEditDialog";
import { SwipeableImageGallery, ImageLightbox } from "@/components/SwipeableImageGallery";
import { Card, CardContent } from "@/components/ui/card";
import { acceptOffer } from "@/lib/offer-actions";
import { CustomerJobDetailDialog } from "@/components/CustomerJobDetailDialog";
import { PublicWorkerProfileCard } from "@/components/PublicWorkerProfileCard";

const CustomerOpenJobs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobIdFromQuery = searchParams.get('job');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [workerStats, setWorkerStats] = useState<Record<string, { rating: number | null; jobsCount: number }>>({});
  const [workerProfiles, setWorkerProfiles] = useState<Record<string, any>>({});
  const [workerServices, setWorkerServices] = useState<Record<string, any[]>>({});
  const [workerReviews, setWorkerReviews] = useState<Record<string, any[]>>({});
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [confirmingOffer, setConfirmingOffer] = useState<any>(null);
  const [acceptingOffer, setAcceptingOffer] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (jobIdFromQuery && jobs.length > 0) {
      const element = document.getElementById(`job-${jobIdFromQuery}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 3000);
      }
    }
  }, [jobIdFromQuery, jobs]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/prihlaseni');
      return;
    }
    setUser(session.user);
    loadJobs(session.user.id);
  };

  const loadJobs = async (userId: string) => {
    // For open jobs with pending offers, don't include worker phone - not connected yet
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        service_categories(id, name, icon),
        service_subcategories(id, name),
        offers(
          id, 
          status, 
          worker_id,
          price,
          message,
          availability,
          created_at,
          photos,
          is_direct,
          profiles!offers_worker_id_fkey(full_name, avatar_url)
        )
      `)
      .eq('customer_id', userId)
      .in('status', ['open', 'pending'])
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Sort by offer count (most offers first)
      const sortedJobs = data.sort((a, b) => {
        const aOffers = a.offers?.length || 0;
        const bOffers = b.offers?.length || 0;
        return bOffers - aOffers;
      });
      setJobs(sortedJobs);
      
      // Load worker stats for all offers
      const workerIds = sortedJobs.flatMap(job => 
        job.offers?.map((o: any) => o.worker_id).filter(Boolean) || []
      );
      if (workerIds.length > 0) {
        loadWorkerStats([...new Set(workerIds)]);
        loadWorkerDetails([...new Set(workerIds)]);
      }
    }
    setLoading(false);
  };

  const loadWorkerStats = async (workerIds: string[]) => {
    if (workerIds.length === 0) return;
    
    const newStats: Record<string, { rating: number | null; jobsCount: number }> = {};
    
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('reviewee_id, rating')
      .in('reviewee_id', workerIds);
    
    const { data: offersData } = await supabase
      .from('offers')
      .select('worker_id, jobs!inner(status)')
      .in('worker_id', workerIds)
      .eq('status', 'accepted')
      .eq('jobs.status', 'completed');
    
    workerIds.forEach(workerId => {
      const workerReviews = reviewsData?.filter(r => r.reviewee_id === workerId) || [];
      const ratings = workerReviews.map(r => r.rating).filter(r => r !== null);
      const medianRating = ratings.length > 0 
        ? ratings.sort((a, b) => a - b)[Math.floor(ratings.length / 2)] 
        : null;
      
      const completedJobs = offersData?.filter(o => o.worker_id === workerId).length || 0;
      
      newStats[workerId] = {
        rating: medianRating,
        jobsCount: completedJobs
      };
    });
    
    setWorkerStats(prev => ({ ...prev, ...newStats }));
  };

  const loadWorkerDetails = async (workerIds: string[]) => {
    if (workerIds.length === 0) return;

    // Use public_profiles view to get worker details - it hides sensitive data for non-connected users
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('*')
      .in('id', workerIds);

    if (profiles) {
      const profilesMap: Record<string, any> = {};
      profiles.forEach(p => {
        profilesMap[p.id] = p;
      });
      setWorkerProfiles(profilesMap);
    }

    // Load worker services
    const { data: services } = await supabase
      .from('worker_services')
      .select('*, service_subcategories(*, service_categories(*))')
      .in('worker_id', workerIds);

    if (services) {
      const servicesMap: Record<string, any[]> = {};
      services.forEach(s => {
        if (!servicesMap[s.worker_id]) {
          servicesMap[s.worker_id] = [];
        }
        servicesMap[s.worker_id].push(s);
      });
      setWorkerServices(servicesMap);
    }

    // Load worker reviews with completion photos
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*, jobs(title, completion_photos, service_subcategories(name)), profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
      .in('reviewee_id', workerIds)
      .order('created_at', { ascending: false });

    if (reviews) {
      const reviewsMap: Record<string, any[]> = {};
      reviews.forEach(r => {
        if (!reviewsMap[r.reviewee_id]) {
          reviewsMap[r.reviewee_id] = [];
        }
        reviewsMap[r.reviewee_id].push(r);
      });
      setWorkerReviews(reviewsMap);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    
    const { error } = await supabase.rpc('refund_and_delete_job', { 
      p_job_id: jobToDelete.id 
    });
    
    if (error) {
      toast.error("Nepodařilo se smazat poptávku");
      return;
    }
    
    toast.success("Poptávka byla smazána");
    setJobToDelete(null);
    setSelectedJob(null);
    if (user) loadJobs(user.id);
  };

  const handleConfirmAcceptOffer = async () => {
    if (!confirmingOffer || !user) return;
    setAcceptingOffer(true);
    
    const result = await acceptOffer({
      offerId: confirmingOffer.offerId,
      jobId: confirmingOffer.jobId,
      customerId: user.id,
      workerId: confirmingOffer.workerId,
      subcategoryName: confirmingOffer.subcategoryName,
      offerAvailability: confirmingOffer.offerAvailability
    });

    setAcceptingOffer(false);
    
    if (result.success) {
      toast.success("Nabídka byla přijata");
      setConfirmingOffer(null);
      setSelectedJob(null);
      navigate('/zakaznik/prehled');
    } else {
      toast.error(result.error || "Nepodařilo se přijmout nabídku");
    }
  };

  const handleOpenToAll = async (jobId: string) => {
    if (!user) return;
    
    try {
      // 1. Update job status to 'open'
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'open' })
        .eq('id', jobId);

      if (jobError) throw jobError;

      // 2. Delete the rejected direct inquiry offer for this job
      // Deleting the offer resets the UI to "Zatím žádné nabídky"
      const { error: offerError } = await supabase
        .from('offers')
        .delete()
        .eq('job_id', jobId)
        .eq('is_direct', true);

      if (offerError) throw offerError;

      toast.success("Zakázka byla zpřístupněna všem řemeslníkům");
      loadJobs(user.id);
    } catch (error: any) {
      toast.error(error.message || "Nepodařilo se zpřístupnit zakázku");
    }
  };

  const openLightbox = (photos: string[], index: number) => {
    setLightboxImages(photos);
    setLightboxInitialIndex(index);
    setLightboxOpen(true);
  };

  const getWorkerCategories = (workerId: string) => {
    const services = workerServices[workerId] || [];
    const categoriesMap = new Map();
    services.forEach(service => {
      const category = service.service_subcategories?.service_categories;
      if (category && !categoriesMap.has(category.id)) {
        categoriesMap.set(category.id, category);
      }
    });
    return Array.from(categoriesMap.values());
  };

  if (loading) {
    return <ContentLoader />;
  }

  return (
    <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">

      {jobs.filter(j => ['open', 'pending'].includes(j.status)).length === 0 ? (
        <EmptyState
          message="Nemáte žádné otevřené poptávky"
          buttonLabel="Vytvořit novou poptávku"
          onButtonClick={() => navigate('/zakaznik/nova-zakazka')}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {jobs.filter(j => ['open', 'pending'].includes(j.status)).map((job) => {
            const offerCount = job.offers?.length || 0;
            const IconComponent = getCategoryIcon(job.service_categories?.icon);
            const firstJobPhoto = job.photos && job.photos.length > 0 ? job.photos[0] : null;

            return (
              <div 
                key={job.id} 
                id={`job-${job.id}`}
                className="bg-list-item-bg rounded-2xl border border-border/50 overflow-hidden transition-all shadow-md hover:shadow-lg duration-500"
              >
                {/* Header - styled like worker pending offers - shows only job details */}
                <div 
                  className="flex items-center gap-3 cursor-pointer bg-[hsl(var(--list-item-header))] p-3 md:p-5 rounded-2xl m-[11px] mb-0"
                  onClick={() => setSelectedJob({ ...job, showJobDetailsOnly: true })}
                >
                  {/* Icon */}
                  <div className="h-11 w-11 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  {/* Title + Badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm md:text-base font-bold text-foreground leading-tight">
                        {job.service_subcategories?.name}
                      </p>
                      {job.is_urgent && (
                        <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs font-semibold">
                          🔥 URGENTNÍ
                        </span>
                      )}
                      {(() => {
                        if (job.status === 'in_progress' || job.status === 'pending_approval') {
                          return (
                            <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-500/20">
                              {job.status === 'pending_approval' ? 'KE SCHVÁLENÍ' : 'PROBÍHÁ'}
                            </span>
                          );
                        }
                          
                        if (job.status === 'pending') {
                          const directOffer = job.offers?.find((o: any) => o.is_direct);
                          const isDirectInquiryRejected = directOffer && directOffer.status === 'rejected';
                          const isDirectInquiryAccepted = directOffer && directOffer.status === 'accepted';
                          
                          if (isDirectInquiryRejected) {
                            return (
                              <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-500/20">
                                ❌ NABÍDKA ODMÍTNUTA
                              </span>
                            );
                          }
                          
                          if (isDirectInquiryAccepted) {
                            return (
                              <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-500/20">
                                ✅ NABÍDKA PŘIJATA
                              </span>
                            );
                          }
                          
                          return (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/20">
                              ⏳ ČEKÁ NA ŘEMESLNÍKA
                            </span>
                          );
                        }
                        
                        return null;
                      })()}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {job.city && (
                        <div className="inline-flex items-center gap-1.5 bg-card rounded-full px-2.5 py-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {job.city}
                          </span>
                        </div>
                      )}
                      {(job.budget_min || job.budget_max) && (
                        <div className="inline-flex items-center gap-1.5 bg-card rounded-full px-2.5 py-1">
                          <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {job.budget_min && job.budget_max 
                              ? `${job.budget_min.toLocaleString('cs-CZ')} - ${job.budget_max.toLocaleString('cs-CZ')} Kč`
                              : job.budget_max 
                                ? `do ${job.budget_max.toLocaleString('cs-CZ')} Kč`
                                : `od ${job.budget_min?.toLocaleString('cs-CZ')} Kč`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* First Photo Thumbnail */}
                  {firstJobPhoto ? (
                    <div 
                      className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 -mt-1.5 -mr-1.5 md:-mt-2.5 md:-mr-2.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLightbox(job.photos, 0);
                      }}
                    >
                      <img 
                        src={firstJobPhoto} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>

                {/* Worker Offers Section */}
                {offerCount > 0 ? (
                  <div className="p-3 md:p-5 pt-4 md:pt-6">
                    <p className="text-xs text-muted-foreground mb-3">
                      {job.offers.some((o: any) => o.is_direct) 
                        ? "Vaše poptávka pro řemeslníka:" 
                        : `Nabídky (${offerCount}):`}
                    </p>
                    
                    <div className="divide-y divide-border/50">
                      {job.offers.slice(0, 6).map((offer: any) => {
                        const profile = workerProfiles[offer.worker_id] || offer.profiles;
                        const avatarUrl = profile?.avatar_url;
                        const fullName = profile?.full_name || '';
                        const firstName = fullName ? fullName.split(' ')[0] : 'Pracovník';
                        const isDirectInquiryOffer = offer.is_direct;
                        const isRejectedDirectInquiry = isDirectInquiryOffer && offer.status === 'rejected';

                        return (
                          <div 
                            key={offer.id}
                            className="py-3 first:pt-0 last:pb-0"
                          >
                            {isRejectedDirectInquiry ? (
                              <div className="py-2">
                                {/* Worker info summary for rejected direct inquiry */}
                                <div className="flex items-center gap-3 mb-4">
                                  {avatarUrl ? (
                                    <img
                                      src={avatarUrl}
                                      alt=""
                                      className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                                    />
                                  ) : (
                                    <div 
                                      className="h-9 w-9 rounded-full bg-muted flex items-center justify-center ring-1 ring-border"
                                    >
                                      <span className="text-sm font-medium">
                                        {firstName.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground">
                                      <span className="font-bold">{firstName}</span> byla odmítnuta
                                    </p>
                                    {offer.created_at && (
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        vytvořeno {format(new Date(offer.created_at), "d. M. yyyy", { locale: cs })}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <Button 
                                  onClick={() => handleOpenToAll(job.id)}
                                  className="w-full h-11 rounded-full bg-primary hover:bg-primary-hover text-black font-bold active:scale-95 transition-all gap-2"
                                >
                                  <Globe className="h-4 w-4" />
                                  Zpřístupnit všem řemeslníkům
                                </Button>
                              </div>
                            ) : (
                              <>
                                {/* Price - only show if not a blank direct inquiry */}
                                {offer.status !== 'direct_pending' && (
                                  <div className="mb-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="text-xs font-medium text-muted-foreground">Nabídnutá cena</h4>
                                      {offer.created_at && (
                                        <span className="text-[10px] text-muted-foreground">
                                          vytvořeno {format(new Date(offer.created_at), "d. M. yyyy", { locale: cs })}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-sm font-medium text-foreground">
                                        {offer.price.toLocaleString('cs-CZ')} Kč
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Availability - only show if not a blank direct inquiry */}
                                {offer.status !== 'direct_pending' && offer.availability && !isNaN(new Date(offer.availability).getTime()) && (
                                  <div className="mb-2">
                                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Dostupnost</h4>
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-sm font-medium text-foreground">
                                        do {format(new Date(offer.availability), "d. M. yyyy", { locale: cs })}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Message preview - only show if not a blank direct inquiry */}
                                {offer.status !== 'direct_pending' && offer.message && (
                                  <p className="text-xs text-foreground/80 line-clamp-2 mb-3">
                                    {offer.message}
                                  </p>
                                )}

                                {/* Offer photos */}
                                {offer.photos && offer.photos.length > 0 && (
                                  <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
                                    {offer.photos.slice(0, 4).map((photo: string, index: number) => (
                                      <div
                                        key={index}
                                        className="h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openLightbox(offer.photos, index);
                                        }}
                                      >
                                        <img
                                          src={photo}
                                          alt={`Příloha ${index + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                    {offer.photos.length > 4 && (
                                      <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground">
                                        +{offer.photos.length - 4}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Worker info row - below photos */}
                                <div className="flex items-center gap-3 mb-3">
                                  {avatarUrl ? (
                                    <img
                                      src={avatarUrl}
                                      alt=""
                                      className="h-9 w-9 rounded-full object-cover cursor-pointer ring-1 ring-border"
                                      onClick={() => setSelectedWorker(offer.worker_id)}
                                    />
                                  ) : (
                                    <div 
                                      className="h-9 w-9 rounded-full bg-muted flex items-center justify-center cursor-pointer ring-1 ring-border"
                                      onClick={() => setSelectedWorker(offer.worker_id)}
                                    >
                                      <span className="text-sm font-medium">
                                        {firstName.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p 
                                      className="text-sm font-medium text-foreground cursor-pointer hover:underline"
                                      onClick={() => setSelectedWorker(offer.worker_id)}
                                    >
                                      {firstName}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      {workerStats[offer.worker_id]?.rating && (
                                        <span className="flex items-center gap-0.5">
                                          <Star className="h-3 w-3 fill-primary text-primary" />
                                          {workerStats[offer.worker_id].rating}
                                        </span>
                                      )}
                                      {workerStats[offer.worker_id]?.jobsCount > 0 && (
                                        <span className="flex items-center gap-0.5">
                                          <CheckCircle className="h-3 w-3" />
                                          {workerStats[offer.worker_id].jobsCount} zakázek
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 rounded-full p-0 bg-card border-border dark:border-white/30"
                                    onClick={() => navigate(`/zakaznik/zpravy?offer=${offer.id}`)}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-9 rounded-full gap-2 bg-card border-border dark:border-white/30"
                                    onClick={() => setSelectedWorker(offer.worker_id)}
                                  >
                                    <UserIcon className="h-4 w-4" />
                                    Profil
                                  </Button>
                                  
                                  {offer.status === 'direct_pending' ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 h-9 rounded-full gap-2 opacity-70 cursor-default"
                                      disabled
                                    >
                                      <Clock className="h-4 w-4" />
                                      Čeká se na odpověď
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="flex-1 h-9 rounded-full gap-2 bg-primary text-primary-foreground hover:bg-primary-hover"
                                      disabled={job.status === 'pending' && (!isDirectInquiryOffer || offer.status === 'direct_pending')}
                                      onClick={() => setConfirmingOffer({
                                        offerId: offer.id,
                                        jobId: job.id,
                                        workerId: offer.worker_id,
                                        subcategoryName: job.service_subcategories?.name,
                                        offerAvailability: offer.availability,
                                        price: offer.price,
                                        workerName: fullName || 'Pracovník'
                                      })}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      {(job.status === 'pending' && (!isDirectInquiryOffer || offer.status === 'direct_pending')) ? 'Čeká na přijetí' : 
                                       isDirectInquiryOffer ? 'Přijmout nabídku' : 'Přijmout'}
                                    </Button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* More applications indicator */}
                    {!job.offers.some((o: any) => o.is_direct) && (
                      <div className="mt-3 text-center">
                        {offerCount > 6 ? (
                          <p className="text-xs text-muted-foreground">
                            Zobrazeno 6 z {offerCount} nabídek · Další nabídky mohou přibývat…
                          </p>
                        ) : offerCount < 6 ? (
                          <p className="text-xs text-muted-foreground">
                            Další nabídky mohou přibývat…
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Maximální počet nabídek dosažen
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 text-center py-4 text-sm text-muted-foreground">
                    Zatím žádné nabídky
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Job Detail Dialog - using shared component matching JobDetailsDialog */}
      <CustomerJobDetailDialog
        job={selectedJob}
        isOpen={!!selectedJob?.showJobDetailsOnly && !selectedWorker}
        onClose={() => setSelectedJob(null)}
        onImageClick={(photo) => openLightbox(selectedJob?.photos || [], selectedJob?.photos?.indexOf(photo) || 0)}
        actions={
          selectedJob && (
            <>
              {(!selectedJob.offers || selectedJob.offers.length === 0) && (
                <Button 
                  variant="outline"
                  className="w-full h-12 text-sm font-semibold rounded-full bg-card hover:bg-card/80 text-foreground border-border"
                  onClick={() => setEditingJob(selectedJob)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Upravit poptávku
                </Button>
              )}
              <Button 
                variant="outline"
                className="w-full h-12 text-sm font-semibold rounded-full bg-card hover:bg-card/80 text-destructive border-border"
                onClick={() => setJobToDelete(selectedJob)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Smazat poptávku
              </Button>
            </>
          )
        }
      />

      {/* Worker Profile Card */}
      {selectedWorker && (
        <PublicWorkerProfileCard
          workerId={selectedWorker}
          open={!!selectedWorker}
          onOpenChange={(open) => { if (!open) setSelectedWorker(null); }}
        />
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />

      {/* Edit dialog */}
      {editingJob && (
        <JobEditDialog
          job={editingJob}
          isOpen={!!editingJob}
          onClose={() => setEditingJob(null)}
          onJobUpdated={() => {
            setEditingJob(null);
            setSelectedJob(null);
            if (user) loadJobs(user.id);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat poptávku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Poptávka a všechny nabídky budou smazány.
              {jobToDelete?.offers?.length > 0 && (
                <span className="block mt-2 font-medium">
                  Kredity budou vráceny řemeslníkům, kteří podali nabídku.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob}>Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AcceptOfferConfirmDialog
        open={!!confirmingOffer}
        onOpenChange={() => setConfirmingOffer(null)}
        onConfirm={handleConfirmAcceptOffer}
        accepting={acceptingOffer}
        workerName={confirmingOffer?.workerName}
        price={confirmingOffer?.price}
        availability={confirmingOffer?.offerAvailability}
      />
    </div>
  );
};

export default CustomerOpenJobs;
