import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import AcceptOfferConfirmDialog from "@/components/AcceptOfferConfirmDialog";
import EmptyState from "@/components/EmptyState";
import ContentLoader from "@/components/ContentLoader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, MessageSquare, MessageCircle, Sparkles, Award, Pencil, MapPin, Calendar, Coins, Info, Clock, Star, CheckCircle, ChevronDown, ChevronUp, User, Trash2, Copy, Navigation, X, AlertTriangle, ChevronRight, Camera, Upload, Loader2, Plus, Receipt, Check, ArrowUpDown, Phone, Filter, FileText, LayoutGrid } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { type LucideIcon } from "lucide-react";
import JobOffersDialog from "@/components/JobOffersDialog";
import { JobApprovalDialog } from "@/components/JobApprovalDialog";
import { HandoverProtocolDialog } from "@/components/HandoverProtocolDialog";
import { JobEditDialog } from "@/components/JobEditDialog";
import { AddressEditDialog } from "@/components/AddressEditDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { SwipeableImageGallery } from "@/components/SwipeableImageGallery";
import { compressProgressPhoto } from "@/lib/image-compression";
import { acceptOffer } from "@/lib/offer-actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomerJobDetailDialog } from "@/components/CustomerJobDetailDialog";
import { CATEGORY_ORDER, sortCategoriesByOrder } from "@/config/categoryOrder";
import { useAuthSession } from "@/hooks/useAuthSession";
// FavoriteServicesGrid removed - Cockpit mode: signed-in dashboard shows jobs only, not carousel
import { generateId } from "@/lib/utils";
import { FilterPill, FilterPillChip } from "@/components/ui/filter-pill";

interface AdditionalCost {
  id: string;
  description: string;
  amount: number;
  created_at: string;
  added_by: 'worker' | 'customer';
  confirmed_by_other: boolean;
  confirmed_at: string | null;
  worker_id: string;
  job_id: string;
  offer_id: string;
}

interface VisitAppointment {
  id: string;
  date: Date;
  time: string;
  workerName?: string;
  workerId?: string;
}

type SortOption = 'appointment' | 'deadline' | 'newest';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  // pendingApprovalJob removed - handled globally by CustomerLayout
  const [editingJob, setEditingJob] = useState<any>(null);
  const [editingAddressJob, setEditingAddressJob] = useState<any>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [selectedOpenJob, setSelectedOpenJob] = useState<any>(null);
  const [showAllOpenJobs, setShowAllOpenJobs] = useState(false);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [workerStats, setWorkerStats] = useState<Record<string, { rating: number | null; jobsCount: number }>>({});
  const [jobToDelete, setJobToDelete] = useState<any>(null);
  const [selectedInProgressJob, setSelectedInProgressJob] = useState<any>(null);
  const [confirmingOffer, setConfirmingOffer] = useState<any>(null);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  
  // Sorting and filtering for in-progress jobs
  const [sortBy, setSortBy] = useState<'newest' | 'appointment' | 'deadline'>('newest');
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null);
  const [sortExpanded, setSortExpanded] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  
  // Progress photos state
  const [uploadingProgressPhotos, setUploadingProgressPhotos] = useState<string | null>(null);
  
  // Additional costs dialog state
  const [showAddCostDialog, setShowAddCostDialog] = useState(false);
  const [showCostsDetailDialog, setShowCostsDetailDialog] = useState(false);
  const [editingJobForCosts, setEditingJobForCosts] = useState<any>(null);
  const [newCostDescription, setNewCostDescription] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [updatingCost, setUpdatingCost] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [mobileCalendarJob, setMobileCalendarJob] = useState<any>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [reviewJob, setReviewJob] = useState<any>(null);
  const [showProtocolDialog, setShowProtocolDialog] = useState(false);
  const [protocolOffer, setProtocolOffer] = useState<any>(null);
  const [protocolWorkerBilling, setProtocolWorkerBilling] = useState<any>(null);

  // Auth session query via global hook
  const { session, isLoading: sessionLoading, isAuthReady } = useAuthSession();

  const user = session?.user;

  // Redirect if not authenticated
  useEffect(() => {
    if (isAuthReady && !session) {
      navigate('/prihlaseni');
    }
  }, [session, isAuthReady, navigate]);

  // Customer jobs query
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['customer-jobs', user?.id],
    queryFn: async () => {
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
            public_profiles!offers_worker_id_fkey(full_name, phone, avatar_url)
          ),
          reviews(*)
        `)
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Derive in-progress job IDs for dependent queries
  const inProgressJobs = jobs.filter((j: any) => j.status === 'in_progress' || j.status === 'pending_approval');
  const inProgressJobIds = inProgressJobs.map((j: any) => j.id);

  // Progress photos query
  const { data: progressPhotos = {} } = useQuery({
    queryKey: ['customer-progress-photos', inProgressJobIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, progress_photos')
        .in('id', inProgressJobIds);
      
      if (error) throw error;
      
      const photosByJob: Record<string, string[]> = {};
      (data || []).forEach((job: any) => {
        if (job.progress_photos) {
          photosByJob[job.id] = job.progress_photos;
        }
      });
      return photosByJob;
    },
    enabled: inProgressJobIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Visit appointments query
  const { data: visitAppointments = {} } = useQuery({
    queryKey: ['customer-appointments', inProgressJobIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_appointments')
        .select('*, public_profiles:worker_id(full_name)')
        .in('job_id', inProgressJobIds)
        .order('visit_date', { ascending: true });
      
      if (error) throw error;
      
      const appointmentsByJob: Record<string, VisitAppointment[]> = {};
      (data || []).forEach((apt: any) => {
        if (!appointmentsByJob[apt.job_id]) {
          appointmentsByJob[apt.job_id] = [];
        }
        appointmentsByJob[apt.job_id].push({
          id: apt.id,
          date: new Date(apt.visit_date),
          time: apt.visit_time ? apt.visit_time.substring(0, 5) : '09:00',
          workerName: apt.profiles?.full_name?.split(' ')[0] || 'Řemeslník',
          workerId: apt.worker_id,
        });
      });
      return appointmentsByJob;
    },
    enabled: inProgressJobIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Get offer IDs for additional costs
  const acceptedOfferIds = inProgressJobs
    .flatMap((j: any) => j.offers?.filter((o: any) => o.status === 'accepted').map((o: any) => o.id) || []);

  // Additional costs query
  const { data: additionalCosts = {}, refetch: refetchCosts } = useQuery({
    queryKey: ['customer-additional-costs', acceptedOfferIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('additional_costs')
        .select('*')
        .in('offer_id', acceptedOfferIds)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const costsByJob: Record<string, AdditionalCost[]> = {};
      (data || []).forEach((cost: any) => {
        if (!costsByJob[cost.job_id]) {
          costsByJob[cost.job_id] = [];
        }
        costsByJob[cost.job_id].push(cost);
      });
      return costsByJob;
    },
    enabled: acceptedOfferIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch categories for the pills (hardcoded order prevents flickering)
  const { data: categories = [] } = useQuery({
    queryKey: ['dashboard-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name, icon, slug');
      if (error) throw error;
      return sortCategoriesByOrder(data);
    },
    initialData: CATEGORY_ORDER as any,
  });

  const sortedCategories = categories;
  const displayedCategories = showAllCategories ? sortedCategories : sortedCategories.slice(0, 8);

  const getIcon = (iconName: string): LucideIcon => {
    return getCategoryIcon(iconName);
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/nova-poptavka?category=${categoryId}`);
  };

  // Set initial view from URL params
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'completed') {
      setShowCompleted(true);
    } else {
      setShowCompleted(false);
    }
  }, [searchParams]);

  // Real-time subscription for job status changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('job-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `customer_id=eq.${user.id}`
        },
        () => {
          // Refresh jobs list via React Query
          queryClient.invalidateQueries({ queryKey: ['customer-jobs', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Removed: pendingApprovalJob check - handled globally by CustomerLayout

  const handleAddCost = async () => {
    if (!editingJobForCosts || !newCostDescription || !newCostAmount || !user) return;
    
    const acceptedOffer = editingJobForCosts.offers?.find((o: any) => o.status === 'accepted');
    if (!acceptedOffer) return;
    
    setUpdatingCost(true);
    const { error } = await supabase
      .from('additional_costs')
      .insert({
        offer_id: acceptedOffer.id,
        job_id: editingJobForCosts.id,
        worker_id: acceptedOffer.worker_id,
        description: newCostDescription,
        amount: parseFloat(newCostAmount),
        added_by: 'customer'
      });
    
    if (error) {
      toast.error("Nepodařilo se přidat vícenáklad");
    } else {
      toast.success("Vícenáklad byl přidán");
      // Invalidate costs query to refetch
      queryClient.invalidateQueries({ queryKey: ['customer-additional-costs'] });
    }
    setUpdatingCost(false);
    setShowAddCostDialog(false);
    setNewCostDescription("");
    setNewCostAmount("");
  };

  const handleDeleteCost = async (jobId: string, costId: string) => {
    const { error } = await supabase
      .from('additional_costs')
      .delete()
      .eq('id', costId);
    
    if (error) {
      toast.error("Nepodařilo se odstranit vícenáklad");
    } else {
      toast.success("Vícenáklad byl odstraněn");
      queryClient.invalidateQueries({ queryKey: ['customer-additional-costs'] });
    }
  };

  const handleConfirmCost = async (jobId: string, costId: string) => {
    const { error } = await supabase
      .from('additional_costs')
      .update({ confirmed_by_other: true, confirmed_at: new Date().toISOString() })
      .eq('id', costId);
    
    if (error) {
      toast.error("Nepodařilo se potvrdit vícenáklad");
    } else {
      toast.success("Vícenáklad byl potvrzen");
      queryClient.invalidateQueries({ queryKey: ['customer-additional-costs'] });
    }
  };
  
  const handleProgressPhotoUpload = async (jobId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingProgressPhotos(jobId);
    
    try {
      const photoUrls: string[] = [];
      for (const photo of files) {
        try {
          const compressedPhoto = await compressProgressPhoto(photo);
          const fileExt = 'jpg';
          const fileName = `progress/${jobId}/${generateId()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('job-photos')
            .upload(fileName, compressedPhoto);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('job-photos')
            .getPublicUrl(fileName);

          photoUrls.push(publicUrl);
        } catch (err) {
          console.error('Progress photo upload failed for one file, skipping:', err);
        }
      }
      
      // Get existing progress photos
      const existingPhotos = progressPhotos[jobId] || [];
      const allPhotos = [...existingPhotos, ...photoUrls];
      
      // Update job with new progress photos
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ progress_photos: allPhotos })
        .eq('id', jobId);
      
      if (updateError) throw updateError;
      
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['customer-progress-photos'] });
      
      toast.success(`${files.length} ${files.length === 1 ? 'fotka byla přidána' : 'fotek bylo přidáno'}`);
    } catch (error) {
      console.error('Error uploading progress photos:', error);
      toast.error("Nepodařilo se nahrát fotky");
    } finally {
      setUploadingProgressPhotos(null);
    }
  };
  
  const handleRemoveProgressPhoto = async (jobId: string, photoUrl: string) => {
    const currentPhotos = progressPhotos[jobId] || [];
    const updatedPhotos = currentPhotos.filter(p => p !== photoUrl);
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ progress_photos: updatedPhotos.length > 0 ? updatedPhotos : null })
        .eq('id', jobId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['customer-progress-photos'] });
      
      toast.success("Fotka byla odebrána");
    } catch (error) {
      console.error('Error removing progress photo:', error);
      toast.error("Nepodařilo se odebrat fotku");
    }
  };

  // Load worker stats (ratings and completed jobs count) when viewing offers
  const loadWorkerStats = async (workerIds: string[]) => {
    if (workerIds.length === 0) return;
    
    const newStats: Record<string, { rating: number | null; jobsCount: number }> = {};
    
    // Get reviews for workers
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('reviewee_id, rating')
      .in('reviewee_id', workerIds);
    
    // Get completed jobs count for workers (accepted offers)
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

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    
    const { error } = await supabase.rpc('refund_and_delete_job', {
      p_job_id: jobToDelete.id
    });
    
    if (error) {
      toast.error("Nepodařilo se smazat zakázku");
      return;
    }
    
    toast.success("Zakázka byla smazána");
    setJobToDelete(null);
    setSelectedOpenJob(null);
    queryClient.invalidateQueries({ queryKey: ['customer-jobs', user?.id] });
  };

  // Load stats when open job is selected
  useEffect(() => {
    if (selectedOpenJob?.offers) {
      const workerIds = selectedOpenJob.offers.map((o: any) => o.worker_id).filter(Boolean);
      loadWorkerStats(workerIds);
    }
  }, [selectedOpenJob]);

  const handleOpenProtocol = async (offer: any) => {
    setProtocolOffer(offer);
    
    // Fetch worker billing info on demand
    if (offer?.worker_id) {
      const { data } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('user_id', offer.worker_id)
        .maybeSingle();
      setProtocolWorkerBilling(data);
    } else {
      setProtocolWorkerBilling(null);
    }
    
    setShowProtocolDialog(true);
  };

  const getCategoryIconComponent = (job: any) => {
    const IconComponent = getCategoryIcon(job.service_categories?.icon || 'Wrench');
    return <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />;
  };

  const loading = sessionLoading || jobsLoading;

  if (loading) {
    return <ContentLoader />;
  }

  // Separate jobs by status - open jobs sorted by offer count (most offers first)
  const openJobs = jobs
    .filter((j: any) => j.status === 'open')
    .sort((a: any, b: any) => (b.offers?.length || 0) - (a.offers?.length || 0));
  const completedJobs = jobs.filter((j: any) => j.status === 'completed');
  
  // Split open jobs: with offers (preview) vs without offers (expandable)
  const openJobsWithOffers = openJobs.filter(j => (j.offers?.length || 0) > 0);
  const openJobsWithoutOffers = openJobs.filter(j => (j.offers?.length || 0) === 0);
  

  // Render simplified open job item
  const renderOpenJobItem = (job: any) => {
    const offerCount = job.offers?.length || 0;
    
    return (
      <div 
        key={job.id} 
        className="bg-card rounded-xl p-4 flex items-center justify-between border border-border/50 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => setSelectedOpenJob(job)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-card flex items-center justify-center flex-shrink-0">
            {(() => {
              const IconComponent = getCategoryIcon(job.service_categories?.icon || 'Wrench');
              return <IconComponent className="h-5 w-5 text-foreground" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {job.service_subcategories?.name || job.title}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.city}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {job.deadline_type === 'asap' && 'Co nejdříve'}
                {job.deadline_type === 'agreement' && 'Dle dohody'}
                {job.deadline_type === 'specific' && job.deadline_date && format(new Date(job.deadline_date), 'd.M.yyyy', { locale: cs })}
                {!job.deadline_type && 'Neurčeno'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <Button
            variant={offerCount > 0 ? "default" : "secondary"}
            size="sm"
            className={`text-xs h-8 px-3 rounded-full ${offerCount === 0 ? 'bg-muted text-muted-foreground pointer-events-none' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (offerCount > 0) {
                setSelectedJobId(job.id);
              }
            }}
          >
            {offerCount} {offerCount === 1 ? 'nabídka' : 'nabídek'}
          </Button>
        </div>
      </div>
    );
  };

  // Render detailed in-progress job item (matching WorkerInProgressJobs design)
  const renderInProgressJobItem = (job: any) => {
    const acceptedOffer = job.offers?.find((o: any) => o.status === 'accepted');
    const workerProfileData = acceptedOffer?.public_profiles;
    const worker = Array.isArray(workerProfileData) ? workerProfileData[0] : workerProfileData;
    const workerPhone = worker?.phone;
    const jobPhotos = job.photos || [];
    const firstJobPhoto = jobPhotos.length > 0 ? jobPhotos[0] : null;
    const appointments = visitAppointments[job.id] || [];
    const appointmentDates = appointments.map(a => a.date);
    
    // Get deadline date for this job
    const deadlineDate = job.deadline_date ? new Date(job.deadline_date) : null;
    
    // Get all other jobs' appointments to show in grey
    const otherJobsDates = Object.entries(visitAppointments)
      .filter(([jobId]) => jobId !== job.id)
      .flatMap(([, apts]) => apts.map(a => a.date));

    const handleCopyAddress = (address: string) => {
      navigator.clipboard.writeText(address);
      toast.success("Adresa zkopírována");
    };
    
    return (
      <div 
        key={job.id} 
        className="bg-list-item-bg rounded-2xl border border-border/50 transition-all shadow-md hover:shadow-lg"
      >
        {/* Header - Job Overview (Grey Background with rounded corners) */}
        <div 
           className="flex items-start gap-3 cursor-pointer bg-[hsl(var(--list-item-header))] p-3 md:p-4 rounded-2xl m-[11px] mb-0"
           onClick={() => setSelectedInProgressJob(job)}
         >
           {/* Icon or Worker Avatar */}
           <div className="h-11 w-11 rounded-full bg-card flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50 shadow-sm">
             {worker?.avatar_url ? (
               <img 
                 src={worker.avatar_url} 
                 alt={worker.full_name || 'Řemeslník'} 
                 className="h-full w-full object-cover"
               />
             ) : (
               (() => {
                 const IconComponent = getCategoryIcon(job.service_categories?.icon || 'Wrench');
                 return <IconComponent className="h-5 w-5 text-muted-foreground" />;
               })()
             )}
           </div>
          
          {/* Title + Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-sm md:text-base font-bold text-foreground leading-tight">
                {job.service_subcategories?.name}
              </p>
              {job.status === 'pending_approval' && (
                <Badge variant="secondary" className="shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  <Clock className="h-3 w-3 mr-1" />
                  Ke schválení
                </Badge>
              )}
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
              {job.deadline_date && (
                <div className="inline-flex items-center gap-1.5 bg-card rounded-full px-2.5 py-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {new Date(job.deadline_date).toLocaleDateString('cs-CZ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* First Job Image Thumbnail */}
          {firstJobPhoto ? (
            <div 
              className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedImage(firstJobPhoto);
              }}
            >
              <img 
                src={firstJobPhoto} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-3 md:p-4">
          {/* Price & Costs Row */}
          {acceptedOffer?.price && (() => {
            const jobCosts = additionalCosts[job.id] || [];
            const totalAdditionalCosts = jobCosts.reduce((sum, c) => sum + c.amount, 0);
            const totalPrice = acceptedOffer.price + totalAdditionalCosts;
            const unconfirmedCosts = jobCosts.filter(c => !c.confirmed_by_other && c.added_by === 'worker');
            
            return (
              <div className="p-3 bg-card rounded-xl mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-foreground">
                      {totalAdditionalCosts > 0 ? 'Celková cena' : 'Dohodnutá cena'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-foreground">{totalPrice.toLocaleString('cs-CZ')} Kč</p>
                </div>
                {jobCosts.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Původní cena: {acceptedOffer.price.toLocaleString('cs-CZ')} Kč
                    </div>
                    <div className="space-y-0.5">
                      {jobCosts.map((cost) => (
                        <div key={cost.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>+ {cost.description}: {cost.amount.toLocaleString('cs-CZ')} Kč</span>
                          {!cost.confirmed_by_other && cost.added_by === 'worker' && (
                            <span className="text-amber-500">(čeká na potvrzení)</span>
                          )}
                          {cost.confirmed_by_other && (
                            <Check className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-end gap-2">
                  {jobCosts.length > 0 && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className={`h-8 rounded-full text-xs ${unconfirmedCosts.length > 0 ? 'border-amber-500 text-amber-600' : ''}`}
                      onClick={() => {
                        setEditingJobForCosts(job);
                        setShowCostsDetailDialog(true);
                      }}
                    >
                      <Receipt className="h-3 w-3 mr-1" />
                      Detail {unconfirmedCosts.length > 0 && `(${unconfirmedCosts.length})`}
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full text-xs"
                    onClick={() => {
                      setEditingJobForCosts(job);
                      setShowAddCostDialog(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Vícenáklady
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Address Row */}
          {(job.full_address || job.city) && (
            <div className="bg-card rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="text-xs font-medium text-foreground">Adresa</p>
              </div>
              <p className="text-sm text-foreground break-words mb-3">
                {(() => {
                  const address = job.full_address || job.city || '';
                  // Remove country (typically after last comma)
                  const parts = address.split(',');
                  if (parts.length > 1) {
                    const lastPart = parts[parts.length - 1].trim().toLowerCase();
                    // Common country names to filter out
                    if (['česká republika', 'czech republic', 'czechia', 'česko', 'cz'].includes(lastPart)) {
                      return parts.slice(0, -1).join(',').trim();
                    }
                  }
                  return address;
                })()}
              </p>
              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full text-xs flex-shrink-0"
                  onClick={() => setEditingAddressJob(job)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Změnit
                </Button>
              </div>
            </div>
          )}

          {/* Progress Photos Section */}
          <div className="bg-card rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-foreground">Fotky z průběhu práce</p>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {progressPhotos[job.id]?.map((photo, idx) => (
                <div 
                  key={idx} 
                  className="relative aspect-square rounded-lg overflow-hidden bg-background group cursor-pointer"
                  onClick={() => setExpandedImage(photo)}
                >
                  <img 
                    src={photo} 
                    alt={`Průběh ${idx + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveProgressPhoto(job.id, photo);
                    }}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label
                className={`flex flex-col items-center justify-center gap-1 aspect-square rounded-lg border-2 border-dashed border-border cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50 text-muted-foreground ${uploadingProgressPhotos === job.id ? 'opacity-50 pointer-events-none' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-muted/50'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-muted/50'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary', 'bg-muted/50');
                  if (e.dataTransfer.files?.length) {
                    const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                    const dt = new DataTransfer();
                    Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
                    input.files = dt.files;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }}
              >
                {uploadingProgressPhotos === job.id ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px] font-medium text-center leading-tight">Přidat<br/>fotku</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => handleProgressPhotoUpload(job.id, e)}
                  disabled={uploadingProgressPhotos === job.id}
                />
              </label>
            </div>
          </div>

          {/* Calendar & Appointments Block - Two Column Layout */}
          <div className="bg-card rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-foreground">Plánované návštěvy</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Appointments List */}
              <div className="order-2 md:order-1">
                <p className="text-xs text-muted-foreground mb-2">Domluvené termíny návštěv:</p>
                {appointments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic mb-3">Řemeslník zatím nenaplánoval žádné návštěvy.</p>
                ) : (
                  <div className="flex flex-col gap-2 mb-3">
                    {appointments.map((apt, idx) => (
                      <div 
                        key={apt.id || idx} 
                        className="inline-flex items-center gap-2 bg-background rounded-full px-3 py-1.5 text-sm w-fit"
                      >
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">
                          {format(apt.date, "d.M.yyyy", { locale: cs })}
                        </span>
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{apt.time}</span>
                        {apt.workerName && (
                          <span className="text-xs text-muted-foreground">({apt.workerName})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Deadline */}
                <div className="border-t border-border/50 pt-3 mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Termín dokončení</p>
                      <p className="text-sm font-medium text-foreground">
                        {job.deadline_date 
                          ? `do ${format(new Date(job.deadline_date), "d. M. yyyy", { locale: cs })}`
                          : "Není stanoven"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Mobile only: Show calendar button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden h-8 rounded-full text-xs"
                    onClick={() => setMobileCalendarJob(job)}
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Kalendář
                  </Button>
                </div>
              </div>
                
                {/* Right Column: Calendar - Hidden on mobile */}
                <div className="order-1 md:order-2 hidden md:block">
                <CalendarComponent
                  mode="multiple"
                  selected={appointmentDates}
                  locale={cs}
                  className="w-full"
                  modifiers={{
                    otherProjects: otherJobsDates,
                    deadline: deadlineDate ? [deadlineDate] : [],
                  }}
                  modifiersClassNames={{
                    otherProjects: "calendar-dot-muted",
                    deadline: "calendar-dot-lime",
                  }}
                  classNames={{
                    day_selected: "bg-primary text-primary-foreground pointer-events-none rounded-lg",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Worker Info with Action Buttons - At the end */}
          <div className="pt-3 border-t border-border/50">
            {/* Desktop: Single row */}
            <div className="hidden md:flex items-center justify-between">
              {/* Worker Info */}
              {worker && (
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/remeslnik-profil/${acceptedOffer.worker_id}`)}
                >
                  {worker.avatar_url ? (
                    <img
                      src={worker.avatar_url}
                      alt="Profile"
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                      <span className="text-sm font-medium">
                        {worker.full_name?.charAt(0) || 'R'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {worker.full_name || 'Řemeslník'}
                    </p>
                    {workerPhone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {workerPhone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {acceptedOffer && (
                <div className="flex items-center gap-2">
                  <Button
                    className="h-10 rounded-full px-4 bg-[#EAF4E9] text-[hsl(var(--dark-green))] border-none hover:bg-primary shadow-sm active:scale-95 transition-all group"
                    onClick={() => navigate(`/zakaznik/zpravy?offer=${acceptedOffer.id}`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 text-[hsl(var(--dark-green))]" />
                    <span className="font-bold">Zprávy</span>
                  </Button>
                  {workerPhone && (
                    <Button
                      className="h-10 rounded-full px-4 bg-[#EAF4E9] text-[hsl(var(--dark-green))] border-none hover:bg-primary hover:text-white shadow-sm active:scale-95 transition-all group"
                      onClick={() => window.open(`tel:${workerPhone}`, '_self')}
                    >
                      <Phone className="h-4 w-4 mr-2 text-[hsl(var(--dark-green))] group-hover:text-white" />
                      <span className="font-bold">Zavolat</span>
                    </Button>
                  )}
                  <Button
                    className="h-10 rounded-full px-4 bg-[#EAF4E9] text-[hsl(var(--dark-green))] border-none hover:bg-primary shadow-sm active:scale-95 transition-all group"
                    onClick={() => handleOpenProtocol(acceptedOffer)}
                  >
                    <FileText className="h-4 w-4 mr-2 text-[hsl(var(--dark-green))]" />
                    <span className="font-bold">Protokol</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile: Two rows, but with aligned buttons */}
            <div className="md:hidden space-y-3">
              {/* Row 1: Worker Info */}
              {worker && (
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/remeslnik-profil/${acceptedOffer.worker_id}`)}
                >
                  {worker.avatar_url ? (
                    <img
                      src={worker.avatar_url}
                      alt="Profile"
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                      <span className="text-sm font-medium">
                        {worker.full_name?.charAt(0) || 'R'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {worker.full_name || 'Řemeslník'}
                    </p>
                    {workerPhone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {workerPhone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Row 2: Action Buttons - Aligned to Right */}
              {acceptedOffer && (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Button
                    className="h-9 rounded-full px-3 bg-[#EAF4E9] text-[hsl(var(--dark-green))] border-none hover:bg-primary shadow-sm active:scale-95 transition-all group"
                    onClick={() => navigate(`/zakaznik/zpravy?offer=${acceptedOffer.id}`)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-[hsl(var(--dark-green))]" />
                    <span className="font-bold text-xs">Zprávy</span>
                  </Button>
                  {workerPhone && (
                    <Button
                      className="h-9 rounded-full px-3 bg-[#EAF4E9] text-[hsl(var(--dark-green))] border-none hover:bg-primary hover:text-white shadow-sm active:scale-95 transition-all group"
                      onClick={() => window.open(`tel:${workerPhone}`, '_self')}
                    >
                      <Phone className="h-3.5 w-3.5 mr-1.5 text-[hsl(var(--dark-green))] group-hover:text-white" />
                      <span className="font-bold text-xs">Zavolat</span>
                    </Button>
                  )}
                  <Button
                    className="h-9 rounded-full px-3 bg-[#EAF4E9] text-[hsl(var(--dark-green))] border-none hover:bg-primary shadow-sm active:scale-95 transition-all group"
                    onClick={() => handleOpenProtocol(acceptedOffer)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5 text-[hsl(var(--dark-green))]" />
                    <span className="font-bold text-xs">Protokol</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompletedJobItem = (job: any) => {
    // Initial attempt to find worker who did the job
    let workerData = job.offers?.find((o: any) => o.status === 'accepted');
    
    // Fallback: If no accepted offer found but job is completed, take any offer 
    // to at least identify who the worker might be
    if (!workerData && job.offers?.length > 0) {
      workerData = job.offers[0];
    }
    
    // Extract profile info for the UI
    const profiles = Array.isArray(workerData?.public_profiles) ? workerData.public_profiles[0] : workerData?.public_profiles;
    const worker_id = workerData?.worker_id;

    // Get project images in priority order: completion -> progress -> original
    const projectPhotos = job.completion_photos && job.completion_photos.length > 0
      ? job.completion_photos
      : job.progress_photos && job.progress_photos.length > 0
        ? job.progress_photos
        : job.photos || [];

    const hasPhotos = projectPhotos.length > 0;
    const hasReview = job.reviews && job.reviews.length > 0;
    const firstReview = hasReview ? job.reviews[0] : null;

    return (
      <div 
        key={job.id} 
        className="bg-card rounded-2xl flex flex-col border border-border/50 transition-all shadow-md hover:shadow-lg overflow-hidden"
      >
        {/* Project Photos at top of card */}
        {hasPhotos && (
          <div className="relative h-48 overflow-hidden bg-muted">
            <SwipeableImageGallery images={projectPhotos} />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50 shadow-sm">
              {profiles?.avatar_url ? (
                <img 
                  src={profiles.avatar_url} 
                  alt={profiles.full_name || 'Řemeslník'} 
                  className="h-full w-full object-cover"
                />
              ) : (
                (() => {
                  const IconComponent = getCategoryIcon(job.service_categories?.icon || 'Wrench');
                  return <IconComponent className="h-6 w-6 text-foreground/70" />;
                })()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground leading-tight">
                {job.service_subcategories?.name || job.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {job.service_categories?.name}
              </p>
            </div>
          </div>

          {/* Details Line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{job.full_address || job.city}</span>
            </div>
            {job.final_price && (
              <div className="flex items-center gap-1.5">
                <Coins className="h-4 w-4" />
                <span>{job.final_price.toLocaleString('cs-CZ')} Kč</span>
              </div>
            )}
          </div>

          {/* Worker Info & Rating Footer */}
          <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
            <div className="flex-1 min-w-0">
              {profiles ? (
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity bg-muted/30 p-1.5 pr-3 rounded-full w-fit"
                  onClick={() => navigate(`/remeslnik-profil/${worker_id}`)}
                >
                  {profiles.avatar_url ? (
                    <img
                      src={profiles.avatar_url}
                      alt="Profile"
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                      <span className="text-[10px] font-medium uppercase">
                        {profiles.full_name?.charAt(0) || 'R'}
                      </span>
                    </div>
                  )}
                  <p className="text-sm font-bold text-foreground truncate max-w-[100px]">
                    {profiles.full_name?.split(' ')[0]}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground italic">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                    <User className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold">Řemeslník</p>
                </div>
              )}
            </div>

            {/* Rating Section */}
            <div className="shrink-0">
              {hasReview ? (
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-3 w-3 ${star <= firstReview.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold">{firstReview.rating}/5</span>
                  </div>
                  
                  {/* Detailed Qualities */}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium bg-muted/30 px-2 py-0.5 rounded-full">
                    {firstReview.quality_punctuality > 0 && (
                      <div className="flex items-center gap-0.5" title="Dochvilnost">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{firstReview.quality_punctuality}</span>
                      </div>
                    )}
                    {firstReview.quality_communication > 0 && (
                      <div className="flex items-center gap-0.5" title="Komunikace">
                        <MessageCircle className="h-2.5 w-2.5" />
                        <span>{firstReview.quality_communication}</span>
                      </div>
                    )}
                    {firstReview.quality_cleanliness > 0 && (
                      <div className="flex items-center gap-0.5" title="Čistota">
                        <Sparkles className="h-2.5 w-2.5" />
                        <span>{firstReview.quality_cleanliness}</span>
                      </div>
                    )}
                    {firstReview.quality_professionalism > 0 && (
                      <div className="flex items-center gap-0.5" title="Profesionalita">
                        <Award className="h-2.5 w-2.5" />
                        <span>{firstReview.quality_professionalism}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Show review button if no review yet
                worker_id && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 rounded-full bg-green-500 hover:bg-green-600 text-white text-xs px-4 shadow-none active:scale-95 transition-all"
                    onClick={() => setReviewJob(job)}
                  >
                    Ohodnotit
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">
      <div>
          {/* Header - only for completed view */}
          {showCompleted && (
            <div className="pt-1 pb-3">
              <div className="flex items-center justify-between w-full">
                <h1 className="text-lg font-semibold text-foreground">Dokončené zakázky</h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/zakaznik/prehled')}
                  className="text-xs h-8 px-4 rounded-full"
                >
                  ← Zpět
                </Button>
              </div>
            </div>
          )}


          {/* Main Content */}
          <div className={`pb-6 ${showCompleted ? 'pt-3' : ''}`}>
            <TooltipProvider>
            {showCompleted ? (
              // Completed jobs view
              completedJobs.length === 0 ? (
                <EmptyState message="Nemáte žádné dokončené zakázky" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {completedJobs.map(renderCompletedJobItem)}
                </div>
              )
            ) : (
              // Open + In Progress jobs view
              <div className="space-y-6">
                {/* In Progress Jobs - Single column layout matching probíhající */}
                {inProgressJobs.length > 0 && (() => {
                  // Get unique subcategories from current jobs
                  const subcategories = [...new Map(
                    inProgressJobs
                      .filter(j => j.service_subcategories?.id)
                      .map(j => [j.service_subcategories.id, {
                        id: j.service_subcategories.id,
                        name: j.service_subcategories.name,
                        icon: j.service_categories?.icon
                      }])
                  ).values()];

                  // Filter and sort jobs
                  const filteredAndSortedJobs = inProgressJobs
                    .filter(job => !filterSubcategory || job.subcategory_id === filterSubcategory)
                    .sort((a, b) => {
                      if (sortBy === 'appointment') {
                        const aAppts = visitAppointments[a.id] || [];
                        const bAppts = visitAppointments[b.id] || [];
                        const aNext = aAppts.filter(apt => apt.date >= new Date()).sort((x, y) => x.date.getTime() - y.date.getTime())[0];
                        const bNext = bAppts.filter(apt => apt.date >= new Date()).sort((x, y) => x.date.getTime() - y.date.getTime())[0];
                        if (!aNext && !bNext) return 0;
                        if (!aNext) return 1;
                        if (!bNext) return -1;
                        return aNext.date.getTime() - bNext.date.getTime();
                      }
                      if (sortBy === 'deadline') {
                        const aDate = a.deadline_date ? new Date(a.deadline_date) : null;
                        const bDate = b.deadline_date ? new Date(b.deadline_date) : null;
                        if (!aDate && !bDate) return 0;
                        if (!aDate) return 1;
                        if (!bDate) return -1;
                        return aDate.getTime() - bDate.getTime();
                      }
                      // newest (default) - by created_at desc
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    });

                  return (
                    <div>
                      {/* Sort & Filter Controls */}
                      {inProgressJobs.length > 0 && (
                        <div className="flex gap-2 items-center flex-wrap mt-1 mb-1 pb-1 min-h-[36px] relative z-[60]">
                          {/* Collapsible Sort dropdown - only show if more than 1 item */}
                          {inProgressJobs.length > 1 && (
                            <div className="relative flex-shrink-0">
                              <FilterPill
                                icon={ArrowUpDown}
                                hasMenu
                                open={sortExpanded}
                                active={sortBy !== 'newest'}
                                onClick={() => {
                                  setSortExpanded(!sortExpanded);
                                  if (!sortExpanded) setFilterExpanded(false);
                                }}
                              >
                                {sortBy === 'newest' ? 'Nejnovější' : sortBy === 'appointment' ? 'Návštěva' : 'Ukončení'}
                              </FilterPill>

                              {sortExpanded && (
                                <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                                  <button
                                    onClick={() => { setSortBy('newest'); setSortExpanded(false); }}
                                    className={`w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors ${sortBy === 'newest' ? 'text-primary font-medium' : 'text-foreground'}`}
                                  >
                                    Nejnovější
                                  </button>
                                  <button
                                    onClick={() => { setSortBy('appointment'); setSortExpanded(false); }}
                                    className={`w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors flex items-center gap-1.5 ${sortBy === 'appointment' ? 'text-primary font-medium' : 'text-foreground'}`}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    Návštěva
                                  </button>
                                  <button
                                    onClick={() => { setSortBy('deadline'); setSortExpanded(false); }}
                                    className={`w-full px-3 py-2 text-xs text-left hover:bg-muted transition-colors flex items-center gap-1.5 ${sortBy === 'deadline' ? 'text-primary font-medium' : 'text-foreground'}`}
                                  >
                                    <Clock className="h-3 w-3" />
                                    Ukončení
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Subcategory filter - show horizontal scrollable pills like hledej */}
                          {subcategories.length > 0 && (
                            <div className="flex gap-2 items-center flex-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <FilterPill icon={LayoutGrid} hasMenu active={!!filterSubcategory}>
                                    {filterSubcategory ? subcategories.find(s => s.id === filterSubcategory)?.name : 'Vše'}
                                  </FilterPill>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[200px] p-2 rounded-2xl shadow-xl border-border bg-popover">
                                  <DropdownMenuItem 
                                    className="rounded-lg mb-1 focus:bg-primary/10 focus:text-primary font-medium cursor-pointer"
                                    onClick={() => setFilterSubcategory(null)}
                                  >
                                    Vše ({inProgressJobs.length})
                                  </DropdownMenuItem>
                                  {(subcategories as any[]).map(sub => {
                                    const count = inProgressJobs.filter(o => o.service_subcategories?.id === sub.id).length;
                                    const Icon = sub.icon ? getCategoryIcon(sub.icon) : LayoutGrid;
                                    return (
                                      <DropdownMenuItem 
                                        key={sub.id} 
                                        className="rounded-lg focus:bg-primary/10 cursor-pointer"
                                        onClick={() => setFilterSubcategory(sub.id)}
                                      >
                                        <Icon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                        <span className="flex-1 truncate">{sub.name}</span>
                                        {count > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-1">{count}</span>}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}

                          {/* Dedicated Completed Jobs Link - Moved to right end */}
                          {completedJobs.length > 0 && (
                            <FilterPill
                              icon={CheckCircle}
                              muted
                              className="ml-auto flex-shrink-0"
                              onClick={() => navigate('/zakaznik/prehled?status=completed')}
                            >
                              Dokončené ({completedJobs.length})
                            </FilterPill>
                          )}
                        </div>
                      )}
                      
                      {filteredAndSortedJobs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Žádné zakázky neodpovídají filtru</p>
                          <Button variant="outline" className="mt-3" size="sm" onClick={() => setFilterSubcategory(null)}>
                            Zrušit filtr
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {filteredAndSortedJobs.map(renderInProgressJobItem)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Empty state when only in-progress is empty but open jobs exist */}
                {inProgressJobs.length === 0 && openJobs.length > 0 && (
                  <EmptyState
                    message="Zatím nemáte žádné probíhající zakázky"
                    submessage="Přijměte nabídku v sekci Poptávky"
                    buttonLabel="Zobrazit poptávky"
                    onButtonClick={() => navigate('/zakaznik/poptavky')}
                  />
                )}

                {/* Empty state - Cockpit view: no carousel, just a simple message */}
                {inProgressJobs.length === 0 && openJobs.length === 0 && (
                  <EmptyState
                    message="Zatím nemáte žádné aktivní zakázky"
                    buttonLabel="Vytvořit první zakázku"
                    onButtonClick={() => navigate('/zakaznik/nova-zakazka')}
                  />
                )}
              </div>
            )}
            </TooltipProvider>

            <JobOffersDialog
              jobId={selectedJobId || ""}
              customerId={user?.id || ""}
              subcategoryName={jobs.find(j => j.id === selectedJobId)?.service_subcategories?.name}
              isOpen={!!selectedJobId}
              onClose={() => setSelectedJobId(null)}
              onOfferAccepted={() => queryClient.invalidateQueries({ queryKey: ['customer-jobs', user?.id] })}
            />
            
            {editingJob && (
              <JobEditDialog
                job={editingJob}
                isOpen={!!editingJob}
                onClose={() => setEditingJob(null)}
                onJobUpdated={() => {
                  setEditingJob(null);
                  queryClient.invalidateQueries({ queryKey: ['customer-jobs', user?.id] });
                }}
              />
            )}

            {editingAddressJob && (
              <AddressEditDialog
                job={editingAddressJob}
                isOpen={!!editingAddressJob}
                onClose={() => setEditingAddressJob(null)}
                onUpdated={() => {
                  setEditingAddressJob(null);
                  queryClient.invalidateQueries({ queryKey: ['customer-jobs', user?.id] });
                }}
              />
            )}

            {/* Open Job Detail Dialog - using shared component */}
            <CustomerJobDetailDialog
              job={selectedOpenJob}
              isOpen={!!selectedOpenJob}
              onClose={() => setSelectedOpenJob(null)}
              onImageClick={(photo) => setExpandedImage(photo)}
              actions={
                selectedOpenJob && (
                  <>
                    {(!selectedOpenJob.offers || selectedOpenJob.offers.length === 0) && (
                      <Button
                        variant="outline"
                        className="w-full h-12 text-sm font-semibold rounded-full text-foreground border-border"
                        onClick={() => {
                          setEditingJob(selectedOpenJob);
                          setSelectedOpenJob(null);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Upravit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full h-12 text-sm font-semibold rounded-full text-destructive border-border"
                      onClick={() => setJobToDelete(selectedOpenJob)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Smazat
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-12 text-sm font-semibold rounded-full text-foreground border-border"
                      onClick={() => setSelectedOpenJob(null)}
                    >
                      Zavřít
                    </Button>
                  </>
                )
              }
            />

            {/* Expanded Image Dialog */}
            <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
              <DialogContent className="max-w-3xl p-0 overflow-hidden">
                {expandedImage && (
                  <img
                    src={expandedImage}
                    alt="Expanded"
                    className="w-full h-auto"
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
      </div>

      {/* Approval dialog removed - handled globally by CustomerLayout */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat zakázku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Zakázka "{jobToDelete?.service_subcategories?.name || jobToDelete?.title}" bude trvale smazána.
              {jobToDelete?.offers?.length > 0 && (
                <span className="block mt-2 font-medium">
                  Kredity budou vráceny řemeslníkům, kteří podali nabídku.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AcceptOfferConfirmDialog
        open={!!confirmingOffer}
        onOpenChange={() => setConfirmingOffer(null)}
        onConfirm={async () => {
          if (!confirmingOffer || !user) return;
          setAcceptingOffer(true);
          const result = await acceptOffer({
            offerId: confirmingOffer.id,
            jobId: confirmingOffer.jobId,
            customerId: user.id,
            workerId: confirmingOffer.worker_id,
            subcategoryName: confirmingOffer.subcategoryName,
            offerAvailability: confirmingOffer.availability
          });
          setAcceptingOffer(false);
          
          if (result.success) {
            toast.success('Nabídka přijata');
            setConfirmingOffer(null);
            setSelectedOpenJob(null);
            queryClient.invalidateQueries({ queryKey: ['customer-jobs', user?.id] });
          } else {
            toast.error(result.error || 'Nepodařilo se přijmout nabídku');
          }
        }}
        accepting={acceptingOffer}
        price={confirmingOffer?.price}
        availability={confirmingOffer?.availability}
      />


      <CustomerJobDetailDialog
        job={selectedInProgressJob}
        isOpen={!!selectedInProgressJob}
        onClose={() => setSelectedInProgressJob(null)}
        onImageClick={(photo) => setExpandedImage(photo)}
        actions={
          <Button
            variant="outline"
            onClick={() => setSelectedInProgressJob(null)}
            className="flex-1 h-11"
          >
            Zavřít
          </Button>
        }
      />

      {/* Add Additional Cost Dialog */}
      <Dialog open={showAddCostDialog} onOpenChange={setShowAddCostDialog}>
        <DialogContent className="w-full h-full max-w-full max-h-full m-0 p-0 rounded-none md:w-auto md:h-auto md:max-w-md md:max-h-[90vh] md:m-4 md:rounded-2xl overflow-auto">
          <DialogHeader className="p-4 md:p-6 pb-0">
            <DialogTitle>Přidat vícenáklad</DialogTitle>
          </DialogHeader>
          <div className="p-4 md:p-6 pt-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Přidejte náklady, které vznikly během realizace zakázky (materiál, nečekané práce, apod.)
            </p>
            <div>
              <Label htmlFor="costDescription" className="mb-2 block">Popis vícenákladu</Label>
              <Input
                id="costDescription"
                value={newCostDescription}
                onChange={(e) => setNewCostDescription(e.target.value)}
                placeholder="např. Dodatečný materiál, oprava potrubí..."
              />
            </div>
            <div>
              <Label htmlFor="costAmount" className="mb-2 block">Částka (Kč)</Label>
              <Input
                id="costAmount"
                type="number"
                value={newCostAmount}
                onChange={(e) => setNewCostAmount(e.target.value)}
                placeholder="Zadejte částku"
              />
            </div>
          </div>
          <DialogFooter className="p-4 md:p-6 pt-0">
            <Button variant="outline" onClick={() => {
              setShowAddCostDialog(false);
              setNewCostDescription("");
              setNewCostAmount("");
            }}>
              Zrušit
            </Button>
            <Button onClick={handleAddCost} disabled={!newCostDescription || !newCostAmount || updatingCost}>
              {updatingCost ? "Ukládám..." : "Přidat vícenáklad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Costs Detail Dialog */}
      <Dialog open={showCostsDetailDialog} onOpenChange={setShowCostsDetailDialog}>
        <DialogContent className="w-full h-full max-w-full max-h-full m-0 p-0 rounded-none md:w-auto md:h-auto md:max-w-md md:max-h-[90vh] md:m-4 md:rounded-2xl overflow-auto">
          <DialogHeader className="p-4 md:p-6 pb-0">
            <DialogTitle>Přehled nákladů</DialogTitle>
          </DialogHeader>
          {editingJobForCosts && (() => {
            const acceptedOffer = editingJobForCosts.offers?.find((o: any) => o.status === 'accepted');
            const jobCosts = additionalCosts[editingJobForCosts.id] || [];
            
            return (
              <div className="p-4 md:p-6 pt-2">
                {/* Original price */}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-foreground">Původní dohodnutá cena</span>
                  <span className="text-sm font-semibold text-foreground">{acceptedOffer?.price?.toLocaleString('cs-CZ')} Kč</span>
                </div>
                
                {/* Additional costs */}
                {jobCosts.map((cost) => (
                  <div key={cost.id} className="flex items-center justify-between py-3 border-b border-border group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-foreground">{cost.description}</p>
                        {cost.added_by === 'worker' && !cost.confirmed_by_other && (
                          <Badge variant="outline" className="text-amber-600 border-amber-500 text-[10px] px-1.5">
                            K potvrzení
                          </Badge>
                        )}
                        {cost.added_by === 'customer' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-500 text-[10px] px-1.5">
                            Váš náklad
                          </Badge>
                        )}
                        {cost.confirmed_by_other && (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cost.created_at).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">+{cost.amount.toLocaleString('cs-CZ')} Kč</span>
                      {cost.added_by === 'worker' && !cost.confirmed_by_other && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleConfirmCost(editingJobForCosts.id, cost.id)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Potvrdit
                        </Button>
                      )}
                      {cost.added_by === 'customer' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteCost(editingJobForCosts.id, cost.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="flex items-center justify-between py-3 mt-2">
                  <span className="text-sm font-bold text-foreground">Celkem</span>
                  <span className="text-lg font-bold text-primary">
                    {((acceptedOffer?.price || 0) + jobCosts.reduce((sum, c) => sum + c.amount, 0)).toLocaleString('cs-CZ')} Kč
                  </span>
                </div>
              </div>
            );
          })()}
          <DialogFooter className="p-4 md:p-6 pt-0">
            <Button variant="outline" onClick={() => setShowCostsDetailDialog(false)}>
              Zavřít
            </Button>
            <Button onClick={() => {
              setShowCostsDetailDialog(false);
              setShowAddCostDialog(true);
            }}>
              <Plus className="h-4 w-4 mr-1" />
              Přidat vícenáklad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Mobile Calendar Dialog */}
      <Dialog open={!!mobileCalendarJob} onOpenChange={() => setMobileCalendarJob(null)}>
        <DialogContent className="sm:max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Kalendář návštěv
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {mobileCalendarJob && (
              <CalendarComponent
                mode="multiple"
                selected={(visitAppointments[mobileCalendarJob.id] || []).map(a => a.date)}
                locale={cs}
                className="w-full border rounded-xl p-2"
                modifiers={{
                  deadline: mobileCalendarJob.deadline_date ? [new Date(mobileCalendarJob.deadline_date)] : [],
                }}
                modifiersClassNames={{
                  deadline: "calendar-dot-lime",
                }}
                classNames={{
                  day_selected: "bg-primary text-primary-foreground pointer-events-none rounded-lg",
                }}
              />
            )}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Naplánovaná návštěva</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-[#bef264]" />
                <span>Termín dokončení</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setMobileCalendarJob(null)} className="w-full sm:w-auto rounded-full">
              Zavřít
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Review Dialog for manual review */}
      {reviewJob && (
        <JobApprovalDialog
          isOpen={true}
          job={reviewJob}
          onApprove={() => {
            setReviewJob(null);
            refetchJobs();
          }}
        />
      )}

      {showProtocolDialog && protocolOffer && (
        <HandoverProtocolDialog
          isOpen={showProtocolDialog}
          onClose={() => setShowProtocolDialog(false)}
          jobData={{
            title: protocolOffer.jobs?.service_subcategories?.name || protocolOffer.jobs?.title || 'Zakázka',
            description: protocolOffer.jobs?.description || '',
            createdAt: protocolOffer.jobs?.created_at,
            status: protocolOffer.jobs?.status,
            address: protocolOffer.jobs?.full_address || protocolOffer.jobs?.city
          }}
          workerData={{
            name: protocolOffer.profiles?.full_name || 'Řemeslník',
            phone: protocolOffer.profiles?.phone,
            billing: protocolWorkerBilling
          }}
          customerData={{
            name: session?.user?.user_metadata?.full_name || (session?.user?.id === protocolOffer.jobs?.customer_id ? 'Václav Novotný' : 'Zákazník'), // Fallback if name not in metadata
            address: protocolOffer.jobs?.full_address || protocolOffer.jobs?.city
          }}
          additionalCosts={additionalCosts[protocolOffer.job_id] || []}
          basePrice={protocolOffer.price}
          finalPrice={protocolOffer.price + (additionalCosts[protocolOffer.job_id] || []).reduce((sum: number, c: any) => sum + c.amount, 0)}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;