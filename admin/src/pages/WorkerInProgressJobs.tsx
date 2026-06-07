import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Briefcase, 
  Calendar as CalendarIcon, 
  MapPin, 
  MessageSquare, 
  Phone, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  Receipt, 
  Plus, 
  Camera, 
  Loader2, 
  Check, 
  X, 
  AlertTriangle, 
  Navigation, 
  Copy, 
  Trash2, 
  Users, 
  LayoutGrid,
  Share2,
  XCircle,
  FileText,
  Coins,
  Upload,
  Pencil
} from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import ContentLoader from "@/components/ContentLoader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/hooks/useAuthSession";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { toast } from "sonner";
import { JobCompletionDialog } from "@/components/JobCompletionDialog";
import { JobDetailsPopup } from "@/components/JobDetailsPopup";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { SharedWorkersDialog } from "@/components/SharedWorkersDialog";
import { ImageLightbox } from "@/components/SwipeableImageGallery";
import { HandoverProtocolDialog } from "@/components/HandoverProtocolDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilterPill } from "@/components/ui/filter-pill";

const WorkerInProgressJobs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any>(null);
  const [showJobDetailsDialog, setShowJobDetailsDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [updating, setUpdating] = useState(false);
  const [showAddCostDialog, setShowAddCostDialog] = useState(false);
  const [newCostDescription, setNewCostDescription] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [showCostsDetailDialog, setShowCostsDetailDialog] = useState(false);
  const [selectedDateForTime, setSelectedDateForTime] = useState<{offerId: string, date: Date, deadline?: Date} | null>(null);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [showDeadlinePrompt, setShowDeadlinePrompt] = useState(false);
  const [pendingAppointment, setPendingAppointment] = useState<{offerId: string, date: Date, deadline: Date} | null>(null);
  const [uploadingProgressPhotos, setUploadingProgressPhotos] = useState<string | null>(null);
  const [calendarShares, setCalendarShares] = useState<Record<string, boolean>>({});
  const [showSharedWorkersDialog, setShowSharedWorkersDialog] = useState(false);
  const [selectedJobForSharing, setSelectedJobForSharing] = useState<{jobId: string, customerId: string} | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [showProtocolDialog, setShowProtocolDialog] = useState(false);
  const [protocolOffer, setProtocolOffer] = useState<any>(null);
  const [customerBilling, setCustomerBilling] = useState<any>(null);
  const [workerBilling, setWorkerBilling] = useState<any>(null);
  const [showShareExplanation, setShowShareExplanation] = useState(false);
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'deadline' | 'appointment'>('date');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [editingAddressJob, setEditingAddressJob] = useState<any>(null);
  const [mobileCalendarJob, setMobileCalendarJob] = useState<any>(null);

  // Auth session query
  const { session, isLoading: sessionLoading, isAuthReady } = useAuthSession();

  const user = session?.user;

  useEffect(() => {
    if (isAuthReady && !session) {
      navigate('/prihlaseni');
    }
  }, [session, isAuthReady, navigate]);

  // Worker profile and billing
  const { data: workerProfile } = useQuery({
    queryKey: ['worker-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useQuery({
    queryKey: ['worker-billing', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      setWorkerBilling(data);
      return data;
    },
    enabled: !!user,
  });

  // Accepted offers query
  const { data: acceptedOffers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['worker-in-progress-offers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          jobs:job_id (
            *,
            public_profiles:customer_id (full_name, avatar_url, phone),
            service_categories:category_id (name, icon),
            service_subcategories:subcategory_id (id, name)
          )
        `)
        .eq('worker_id', user!.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const offerIds = useMemo(() => acceptedOffers.map(o => o.id), [acceptedOffers]);
  const offerJobIds = useMemo(() => acceptedOffers.map(o => o.job_id), [acceptedOffers]);

  // Visit appointments
  const { data: visitAppointments = {} } = useQuery({
    queryKey: ['worker-appointments', user?.id, offerJobIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_appointments')
        .select('*')
        .eq('worker_id', user!.id)
        .in('job_id', offerJobIds);

      if (error) throw error;
      const grouped: Record<string, {id: string, date: Date, time: string}[]> = {};
      acceptedOffers.forEach(offer => {
        grouped[offer.id] = (data || [])
          .filter((apt: any) => apt.job_id === offer.job_id)
          .map((apt: any) => ({
            id: apt.id,
            date: new Date(apt.visit_date),
            time: apt.visit_time
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
      });
      return grouped;
    },
    enabled: !!user && offerJobIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Shared appointments
  const { data: sharedAppointments = {} } = useQuery({
    queryKey: ['worker-shared-appointments', user?.id, offerJobIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_appointments')
        .select(`
          *,
          public_profiles:worker_id (full_name)
        `)
        .in('job_id', offerJobIds)
        .neq('worker_id', user!.id);

      if (error) throw error;
      const grouped: Record<string, {id: string, date: Date, time: string, workerName: string}[]> = {};
      acceptedOffers.forEach(offer => {
        grouped[offer.id] = (data || [])
          .filter((apt: any) => apt.job_id === offer.job_id)
          .map((apt: any) => ({
            id: apt.id,
            date: new Date(apt.visit_date),
            time: apt.visit_time,
            workerName: apt.public_profiles?.full_name || 'Jiný řemeslník'
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
      });
      return grouped;
    },
    enabled: !!user && offerJobIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Unread messages
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ['worker-unread-counts', user?.id, offerIds],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('messages')
        .select('offer_id')
        .in('offer_id', offerIds)
        .eq('receiver_id', user!.id)
        .eq('read', false);

      if (error) throw error;
      const counts: Record<string, number> = {};
      offerIds.forEach(id => {
        counts[id] = (data || []).filter((m: any) => m.offer_id === id).length;
      });
      return counts;
    },
    enabled: !!user && offerIds.length > 0,
    refetchInterval: 1000 * 30, // 30 seconds
  });

  // Additional costs
  const { data: additionalCosts = {} } = useQuery({
    queryKey: ['worker-additional-costs', offerIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('additional_costs')
        .select('*')
        .in('offer_id', offerIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const grouped: Record<string, typeof data> = {};
      offerIds.forEach((offerId: string) => {
        grouped[offerId] = (data || []).filter((cost: any) => cost.offer_id === offerId);
      });
      return grouped;
    },
    enabled: offerIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Calendar shares
  useQuery({
    queryKey: ['worker-calendar-shares', user?.id, offerJobIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_shares')
        .select('job_id, enabled')
        .in('job_id', offerJobIds)
        .eq('worker_id', user!.id);

      if (error) throw error;
      const shares: Record<string, boolean> = {};
      (data || []).forEach((share: any) => {
        shares[share.job_id] = share.enabled;
      });
      setCalendarShares(shares);
      return shares;
    },
    enabled: offerJobIds.length > 0 && !!user,
    staleTime: 1000 * 60 * 2,
  });

  const { data: completedCount = 0 } = useQuery({
    queryKey: ['worker-completed-jobs-count', user?.id],
    queryFn: async () => {
      const { data: completedOffers } = await supabase
        .from('offers')
        .select('job_id, jobs!inner(status)')
        .eq('worker_id', user!.id)
        .eq('status', 'accepted')
        .eq('jobs.status', 'completed');
      
      return completedOffers?.length || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  function refreshAllData() {
    queryClient.invalidateQueries({ queryKey: ['worker-in-progress-offers'] });
    queryClient.invalidateQueries({ queryKey: ['worker-appointments'] });
    queryClient.invalidateQueries({ queryKey: ['worker-shared-appointments'] });
    queryClient.invalidateQueries({ queryKey: ['worker-unread-counts'] });
    queryClient.invalidateQueries({ queryKey: ['worker-additional-costs'] });
    queryClient.invalidateQueries({ queryKey: ['worker-calendar-shares'] });
  }

  function handleCompleteJob(offer: any) {
    setSelectedOffer(offer);
    setShowCompletionDialog(true);
  }

  async function handleJobCompleted() {
    if (!selectedOffer || !user) return;
    setShowCompletionDialog(false);
    setSelectedOffer(null);
    refreshAllData();
  }

  function handleOpenMessages(offerId: string) {
    navigate(`/remeslnik/zpravy?offer=${offerId}`);
  }

  function handleCallCustomer(phone: string) {
    window.location.href = `tel:${phone}`;
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Adresa byla zkopírována");
  };

  function handleNavigate(lat: number, lng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  }

  function handleViewJobDetails(job: any) {
    setSelectedJobForDetails({
      ...job,
      customer_profile: job.public_profiles || job.profiles || job.customer_profile,
    });
    setShowJobDetailsDialog(true);
  }

  function handleOpenDateDialog(offer: any) {
    setEditingOffer(offer);
    setNewDate(offer.jobs?.deadline_date ? new Date(offer.jobs.deadline_date) : undefined);
    setShowDateDialog(true);
  }

  async function handleUpdateDeadline() {
    if (!editingOffer || !newDate || !user) return;
    setUpdating(true);
    const { error } = await supabase
      .from('jobs')
      .update({ deadline_date: newDate.toISOString() })
      .eq('id', editingOffer.jobs.id);
    if (error) {
      toast.error('Chyba při aktualizaci termínu');
    } else {
      toast.success('Termín byl aktualizován');
      refreshAllData();
      setShowDateDialog(false);
      setEditingOffer(null);
    }
    setUpdating(false);
  }

  function handleOpenAddCostDialog(offer: any) {
    setEditingOffer(offer);
    setNewCostDescription("");
    setNewCostAmount("");
    setShowAddCostDialog(true);
  }

  async function handleAddCost() {
    if (!editingOffer || !newCostDescription.trim() || !newCostAmount || !user) return;
    const amount = parseFloat(newCostAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Zadejte platnou částku');
      return;
    }
    setUpdating(true);
    const { error } = await supabase
      .from('additional_costs')
      .insert({
        offer_id: editingOffer.id,
        job_id: editingOffer.jobs.id,
        worker_id: user.id,
        description: newCostDescription.trim(),
        amount,
        added_by: 'worker',
        confirmed_by_other: false
      });
    if (error) {
      toast.error('Chyba při přidávání nákladu');
    } else {
      toast.success('Náklad byl přidán');
      queryClient.invalidateQueries({ queryKey: ['worker-additional-costs'] });
      setShowAddCostDialog(false);
      setEditingOffer(null);
    }
    setUpdating(false);
  }

  async function handleDeleteCost(costId: string) {
    const { error } = await supabase.from('additional_costs').delete().eq('id', costId);
    if (!error) {
      toast.success('Náklad byl smazán');
      queryClient.invalidateQueries({ queryKey: ['worker-additional-costs'] });
    }
  }

  async function handleConfirmCost(costId: string) {
    const { error } = await supabase.from('additional_costs').update({ confirmed_by_other: true, confirmed_at: new Date().toISOString() }).eq('id', costId);
    if (!error) {
      toast.success('Náklad byl potvrzen');
      queryClient.invalidateQueries({ queryKey: ['worker-additional-costs'] });
    }
  }

  function handleAddAppointment(offer: any, date: Date) {
    const deadline = offer.jobs?.deadline_date ? new Date(offer.jobs.deadline_date) : null;
    if (deadline && date > deadline) {
      setPendingAppointment({ offerId: offer.id, date, deadline });
      setShowDeadlinePrompt(true);
    } else {
      setSelectedDateForTime({ offerId: offer.id, date, deadline: deadline || undefined });
    }
  }

  async function handleSaveAppointment() {
    if (!selectedDateForTime || !user) return;
    const { offerId, date } = selectedDateForTime;
    const offer = acceptedOffers.find(o => o.id === offerId);
    if (!offer) return;
    const { error } = await supabase.from('visit_appointments').insert({
      job_id: offer.jobs.id,
      worker_id: user.id,
      visit_date: date.toISOString().split('T')[0],
      visit_time: selectedTime
    });
    if (!error) {
      toast.success('Termín byl přidán');
      queryClient.invalidateQueries({ queryKey: ['worker-appointments'] });
      setSelectedDateForTime(null);
    }
  }

  async function handleConfirmAppointmentPastDeadline() {
    if (!pendingAppointment || !user) return;
    const { offerId, date } = pendingAppointment;
    setSelectedDateForTime({ offerId, date });
    setShowDeadlinePrompt(false);
    setPendingAppointment(null);
  }

  async function handleDeleteAppointment(appointmentId: string, offerId: string) {
    const { error } = await supabase.from('visit_appointments').delete().eq('id', appointmentId);
    if (!error) {
      toast.success('Termín byl smazán');
      queryClient.invalidateQueries({ queryKey: ['worker-appointments'] });
    }
  }

  async function handleUploadProgressPhotos(offerId: string, files: FileList) {
    if (!user) return;
    const offer = acceptedOffers.find(o => o.id === offerId);
    if (!offer) return;
    setUploadingProgressPhotos(offerId);
    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fileName = `${offer.jobs.id}/${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage.from('job-photos').upload(`progress/${fileName}`, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(`progress/${fileName}`);
        uploadedUrls.push(publicUrl);
      } catch (err) { console.error(err); }
    }
    if (uploadedUrls.length > 0) {
      const existing = offer.jobs?.progress_photos || [];
      await supabase.from('jobs').update({ progress_photos: [...existing, ...uploadedUrls] }).eq('id', offer.jobs.id);
      refreshAllData();
    }
    setUploadingProgressPhotos(null);
  }

  async function handleDeleteProgressPhoto(photoUrl: string, offerId: string) {
    const offer = acceptedOffers.find(o => o.id === offerId);
    if (!offer) return;
    const updated = (offer.jobs?.progress_photos || []).filter((p: string) => p !== photoUrl);
    await supabase.from('jobs').update({ progress_photos: updated }).eq('id', offer.jobs.id);
    refreshAllData();
  }

  async function handleToggleCalendarShare(jobId: string, currentState: boolean) {
    if (!user) return;
    const { error } = await supabase.from('calendar_shares').upsert({ job_id: jobId, worker_id: user.id, enabled: !currentState }, { onConflict: 'job_id,worker_id' });
    if (!error) {
      setCalendarShares(prev => ({ ...prev, [jobId]: !currentState }));
      toast.success(!currentState ? 'Kalendář je nyní sdílen' : 'Sdílení vypnuto');
    }
  }

  async function handleOpenProtocol(offer: any) {
    setProtocolOffer(offer);
    const { data } = await supabase.from('billing_profiles').select('*').eq('user_id', offer.jobs.customer_id).maybeSingle();
    setCustomerBilling(data);
    setShowProtocolDialog(true);
  }

  async function handleMarkAsViewed(offerId: string) {
    await supabase.from('offers').update({ worker_viewed: true }).eq('id', offerId);
    refreshAllData();
  }

  const filteredAndSortedOffers = useMemo(() => {
    let result = acceptedOffers;
    if (filterSubcategory) {
      result = result.filter(o => o.jobs?.service_subcategories?.id === filterSubcategory);
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'appointment') {
        const aFirst = visitAppointments[a.id]?.[0]?.date;
        const bFirst = visitAppointments[b.id]?.[0]?.date;
        if (!aFirst && !bFirst) return 0;
        if (!aFirst) return 1;
        if (!bFirst) return -1;
        return aFirst.getTime() - bFirst.getTime();
      } else if (sortBy === 'deadline') {
        const aD = a.jobs?.deadline_date ? new Date(a.jobs.deadline_date).getTime() : Infinity;
        const bD = b.jobs?.deadline_date ? new Date(b.jobs.deadline_date).getTime() : Infinity;
        return aD - bD;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [acceptedOffers, filterSubcategory, sortBy, visitAppointments]);

  const subcategories = useMemo(() => {
    const map = new Map();
    acceptedOffers.forEach(o => {
      const sub = o.jobs?.service_subcategories;
      const cat = o.jobs?.service_categories;
      if (sub) map.set(sub.id, { id: sub.id, name: sub.name, icon: cat?.icon });
    });
    return Array.from(map.values());
  }, [acceptedOffers]);

  if (sessionLoading || offersLoading) return <ContentLoader />;

  return (
    <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-1 mb-1 pb-1">
        <div className="flex gap-2 items-center flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterPill icon={LayoutGrid} hasMenu active={!!filterSubcategory}>
                {filterSubcategory ? subcategories.find(s => s.id === filterSubcategory)?.name : 'Vše'}
              </FilterPill>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px] p-2 rounded-2xl shadow-xl border-border bg-popover">
              <DropdownMenuItem 
                className="rounded-lg mb-1 focus:bg-primary/10 focus:text-primary font-medium"
                onClick={() => setFilterSubcategory(null)}
              >
                Vše ({acceptedOffers.length})
              </DropdownMenuItem>
              {subcategories.map(sub => {
                const count = acceptedOffers.filter(o => o.jobs?.service_subcategories?.id === sub.id).length;
                const Icon = sub.icon ? getCategoryIcon(sub.icon) : LayoutGrid;
                return (
                  <DropdownMenuItem 
                    key={sub.id} 
                    className="rounded-lg focus:bg-primary/10"
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

          <FilterPill
            icon={CheckCircle}
            muted
            className="hidden md:inline-flex ml-auto"
            onClick={() => navigate('/remeslnik/historie')}
          >
            Dokončené ({completedCount})
          </FilterPill>
        </div>
      </div>

      {filteredAndSortedOffers.length === 0 ? (
        <EmptyState message="Žádné probíhající zakázky" buttonLabel="Hledat zakázky" onButtonClick={() => navigate('/remeslnik/hledej')} />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredAndSortedOffers.map((offer) => {
            const job = offer.jobs;
            const customerData = job?.public_profiles;
            const customer = Array.isArray(customerData) ? customerData[0] : customerData;
            const category = job?.service_categories;
            const subcategory = job?.service_subcategories;
            const IconComponent = category?.icon ? getCategoryIcon(category.icon) : Briefcase;
            const jobPhotos = job?.photos || [];
            const firstJobPhoto = jobPhotos.length > 0 ? jobPhotos[0] : null;
            const photos = job?.progress_photos || [];
            const unreadCount = unreadCounts[offer.id] || 0;
            const isNew = !offer.worker_viewed;
            const isCalendarShared = calendarShares[job.id] || false;
            const costs = additionalCosts[offer.id] || [];
            const totalAdditionalCost = costs.filter(c => c.confirmed_by_other).reduce((sum, c) => sum + c.amount, 0);
            const myAppts = visitAppointments[offer.id] || [];
            const sharedAppts = sharedAppointments[offer.id] || [];
            const allAppointments: Array<{id: string; date: Date; time: string; isShared?: boolean; workerName?: string}> = [
              ...myAppts.map(a => ({ ...a, isShared: false as boolean, workerName: '' })),
              ...sharedAppts.map(a => ({ ...a, isShared: true as boolean }))
            ].sort((a, b) => a.date.getTime() - b.date.getTime());
            const appointmentDates = allAppointments.map(a => a.date);
            const deadlineDate = job.deadline_date ? new Date(job.deadline_date) : null;
            const otherJobsDates = Object.entries(visitAppointments).filter(([oid]) => oid !== offer.id).flatMap(([, v]) => v.map(a => a.date));

            return (
              <div 
                key={offer.id} 
                className={cn("bg-list-item-bg rounded-2xl border transition-all shadow-md hover:shadow-lg", isNew ? 'border-primary shadow-lg' : 'border-border/50')}
                onClick={() => isNew && handleMarkAsViewed(offer.id)}
              >
                <div className="flex items-start gap-3 cursor-pointer bg-[hsl(var(--list-item-header))] p-3 md:p-4 rounded-2xl m-[11px] mb-0" onClick={() => handleViewJobDetails(job)}>
                  <div className="h-11 w-11 rounded-full bg-card flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-sm md:text-base font-bold text-foreground leading-tight truncate">
                        {subcategory?.name || category?.name || 'Zakázka'}
                      </p>
                      {isNew && <Badge variant="default" className="shrink-0">Nová</Badge>}
                      {job.status === 'pending_approval' && (
                        <Badge variant="secondary" className="shrink-0 bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" /> Čeká na schválení
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(job.full_address || job.city) && (
                        <div className="inline-flex items-center gap-1.5 bg-card rounded-full px-2.5 py-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">
                            {job.city || (job.full_address ? job.full_address.split(',').pop()?.trim() : '')}
                          </span>
                        </div>
                      )}
                      {job.deadline_date && (
                        <div className="inline-flex items-center gap-1.5 bg-card rounded-full px-2.5 py-1">
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {format(new Date(job.deadline_date), "d.M.yyyy", { locale: cs })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {firstJobPhoto ? (
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 -mt-1.5 -mr-1.5 md:-mt-2 md:-mr-2" onClick={(e) => { e.stopPropagation(); setLightboxImages(jobPhotos); setLightboxInitialIndex(0); setLightboxOpen(true); }}>
                      <img src={firstJobPhoto} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="p-3 md:p-4">
                  {/* Price & Costs Row */}
                  <div className="p-3 bg-card rounded-xl mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        <p className="text-xs font-medium text-foreground">
                          {totalAdditionalCost > 0 ? 'Celková cena' : 'Dohodnutá cena'}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-foreground">{(offer.price + totalAdditionalCost).toLocaleString('cs-CZ')} Kč</p>
                    </div>
                    {costs.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          Původní cena: {offer.price.toLocaleString('cs-CZ')} Kč
                        </div>
                        <div className="space-y-0.5">
                          {costs.map((cost) => (
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
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={() => handleOpenAddCostDialog(offer)}>
                        <Plus className="h-3 w-3 mr-1" /> Vícenáklady
                      </Button>
                      {costs.length > 0 && (
                        <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" onClick={() => {
                          setEditingOffer(offer);
                          setShowCostsDetailDialog(true);
                        }}>
                          <Receipt className="h-3 w-3 mr-1" /> Detail ({costs.length})
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Address Row */}
                  {(job.full_address || job.city) && (
                    <div className="bg-card rounded-xl p-3 mb-4 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <p className="text-xs font-medium text-foreground">Adresa</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            onClick={() => handleCopyAddress(job.full_address || job.city || '')}
                          >
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          {job.latitude && job.longitude && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full hover:bg-muted"
                              onClick={() => handleNavigate(job.latitude!, job.longitude!)}
                            >
                              <Navigation className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground break-words">
                        {(() => {
                          const address = job.full_address || job.city || '';
                          const parts = address.split(',');
                          if (parts.length > 1) {
                            const lastPart = parts[parts.length - 1].trim().toLowerCase();
                            if (['česká republika', 'czech republic', 'czechia', 'česko', 'cz'].includes(lastPart)) {
                              return parts.slice(0, -1).join(',').trim();
                            }
                          }
                          return address;
                        })()}
                      </p>
                    </div>
                  )}

                  {/* Progress Photos Section */}
                  <div className="bg-card rounded-xl p-3 mb-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <Camera className="h-4 w-4 text-primary" />
                      <p className="text-xs font-medium text-foreground">Fotky z průběhu práce</p>
                    </div>
                    
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {(job.progress_photos || []).map((photo: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="relative aspect-square rounded-lg overflow-hidden bg-background group cursor-pointer"
                          onClick={() => {
                            setLightboxImages(job.progress_photos);
                            setLightboxInitialIndex(idx);
                            setLightboxOpen(true);
                          }}
                        >
                          <img 
                            src={photo} 
                            alt={`Průběh ${idx + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProgressPhoto(photo, offer.id);
                            }}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <label
                        className={`flex flex-col items-center justify-center gap-1 aspect-square rounded-lg border-2 border-dashed border-border cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50 text-muted-foreground ${uploadingProgressPhotos === offer.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {uploadingProgressPhotos === offer.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="h-5 w-5" />
                            <span className="text-[10px] font-medium text-center leading-tight uppercase font-bold">Přidat<br/>fotku</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => e.target.files && handleUploadProgressPhotos(offer.id, e.target.files)}
                          disabled={uploadingProgressPhotos === offer.id}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Calendar & Appointments Block - Two Column Layout */}
                  <div className="bg-card rounded-xl p-3 mb-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      <p className="text-xs font-medium text-foreground uppercase font-bold">Plánované návštěvy</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Appointments List */}
                      <div className="order-2 md:order-1">
                        <p className="text-xs text-muted-foreground mb-2">Domluvené termíny návštěv:</p>
                        {allAppointments.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic mb-3">Zatím nebyly naplánovány žádné návštěvy.</p>
                        ) : (
                          <div className="flex flex-col gap-2 mb-3">
                            {allAppointments.map((apt, idx) => (
                              <div 
                                key={apt.id || idx} 
                                className="inline-flex items-center gap-2 bg-background rounded-full px-3 py-1.5 text-xs w-fit border border-border/50"
                              >
                                <CalendarIcon className="h-3 w-3 text-primary" />
                                <span className="font-bold">
                                  {format(apt.date, "d.M.yyyy", { locale: cs })}
                                </span>
                                <Clock className="h-3 w-3 text-muted-foreground ml-1" />
                                <span>{apt.time}</span>
                                {apt.isShared && (
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-1 truncate max-w-[80px]">
                                    {apt.workerName}
                                  </span>
                                )}
                                {!apt.isShared && (
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(apt.id, offer.id); }} className="hover:text-destructive transition-colors ml-1">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Status/Deadline Row */}
                        <div className="border-t border-border/50 pt-3 mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={isCalendarShared} 
                                onCheckedChange={() => handleToggleCalendarShare(job.id, isCalendarShared)}
                                className="scale-75 origin-left"
                              />
                              <button onClick={() => setShowShareExplanation(true)} className="text-[10px] font-bold text-primary hover:underline uppercase flex items-center gap-1">
                                <Share2 className="h-3 w-3" /> Sdílet
                              </button>
                            </div>
                          </div>
                          
                          {/* Mobile only: Show calendar button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="md:hidden h-8 rounded-full text-xs font-bold uppercase"
                            onClick={() => setMobileCalendarJob(job)}
                          >
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                            Kalendář
                          </Button>
                        </div>
                      </div>
                        
                      {/* Right Column: Calendar - Hidden on mobile */}
                      <div className="order-1 md:order-2 hidden md:block">
                        <div className="w-full flex justify-center bg-background/50 rounded-xl p-2 border border-border/30">
                          <CalendarComponent
                            mode="single"
                            selected={undefined}
                            onSelect={(date) => date && handleAddAppointment(offer, date)}
                            locale={cs}
                            className="w-full"
                            modifiers={{
                              appointment: appointmentDates,
                              otherProjects: otherJobsDates,
                              deadline: deadlineDate ? [deadlineDate] : [],
                            }}
                            modifiersClassNames={{
                              appointment: "bg-primary text-primary-foreground font-bold rounded-lg",
                              otherProjects: "calendar-dot-muted",
                              deadline: "border-b-2 border-primary font-bold",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden md:flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-3">
                      {customer?.avatar_url ? (
                        <img src={customer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                          <span className="text-sm font-medium uppercase">{customer?.full_name?.charAt(0) || 'Z'}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-foreground">{customer?.full_name || 'Zákazník'}</p>
                        {customer?.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                      </div>
                    </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={() => handleOpenMessages(offer.id)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Zprávy
                          {unreadCount > 0 && <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">{unreadCount}</Badge>}
                        </Button>
                        {customer?.phone && (
                          <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={() => handleCallCustomer(customer.phone)}>
                            <Phone className="h-4 w-4 mr-2" />
                            Zavolat
                          </Button>
                        )}
                        <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={() => handleOpenProtocol(offer)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Protokol
                        </Button>
                        <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={() => handleCompleteJob(offer)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Dokončit
                        </Button>
                      </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="md:hidden space-y-3 pt-3 border-t">
                    <div className="flex items-center gap-3">
                      {customer?.avatar_url ? (
                        <img src={customer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                          <span className="text-sm font-medium uppercase">{customer?.full_name?.charAt(0) || 'Z'}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-foreground">{customer?.full_name || 'Zákazník'}</p>
                        {customer?.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                      </div>
                    </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={() => handleOpenMessages(offer.id)}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Zprávy
                          {unreadCount > 0 && <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{unreadCount}</Badge>}
                        </Button>
                        {customer?.phone && (
                          <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={() => handleCallCustomer(customer.phone)}>
                            <Phone className="h-4 w-4 mr-2" />
                            Zavolat
                          </Button>
                        )}
                        <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={() => handleOpenProtocol(offer)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Protokol
                        </Button>
                        <Button variant="outline" className="h-10 rounded-full px-4 flex-1 text-sm font-medium" onClick={() => handleCompleteJob(offer)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Hotovo
                        </Button>
                      </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedOffer && (
        <JobCompletionDialog
          isOpen={showCompletionDialog}
          onClose={() => setShowCompletionDialog(false)}
          offerId={selectedOffer.id}
          jobId={selectedOffer.jobs.id}
          offerPrice={selectedOffer.price}
          onComplete={handleJobCompleted}
          customerId={selectedOffer.jobs.customer_id}
          workerName={workerProfile?.full_name}
          jobTitle={selectedOffer.jobs.service_subcategories?.name}
        />
      )}

      {selectedJobForDetails && (
        <JobDetailsPopup
          job={selectedJobForDetails}
          isOpen={showJobDetailsDialog}
          onClose={() => setShowJobDetailsDialog(false)}
          hasApplied={true}
          isAccepted={true}
          priceLabel="Cena z původního zadání"
          onOfferSubmitted={() => {}}
        />
      )}

      {editingOffer && (
        <>
          <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Upravit termín dokončení</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <CalendarComponent mode="single" selected={newDate} onSelect={setNewDate} locale={cs} className="rounded-md border" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDateDialog(false)}>Zrušit</Button>
                <Button onClick={handleUpdateDeadline} disabled={!newDate || updating}>
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Uložit'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddCostDialog} onOpenChange={setShowAddCostDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Přidat příplatek</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cost-description">Popis</Label>
                  <Input id="cost-description" value={newCostDescription} onChange={(e) => setNewCostDescription(e.target.value)} placeholder="Např. Materiál..." />
                </div>
                <div>
                  <Label htmlFor="cost-amount">Částka (Kč)</Label>
                  <Input id="cost-amount" type="number" value={newCostAmount} onChange={(e) => setNewCostAmount(e.target.value)} placeholder="0" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCostDialog(false)}>Zrušit</Button>
                <Button onClick={handleAddCost} disabled={!newCostDescription.trim() || !newCostAmount || updating}>
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Přidat'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCostsDetailDialog} onOpenChange={setShowCostsDetailDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Příplatky</DialogTitle></DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(additionalCosts[editingOffer.id] || []).map((cost) => (
                  <div key={cost.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{cost.description}</p>
                      <p className="text-sm text-muted-foreground">{cost.amount} Kč {cost.confirmed_by_other && <span className="text-green-600">✓ Potvrzeno</span>}</p>
                    </div>
                    {cost.added_by === 'worker' && <Button variant="destructive" size="sm" onClick={() => handleDeleteCost(cost.id)}><Trash2 className="h-4 w-4" /></Button>}
                    {cost.added_by === 'customer' && !cost.confirmed_by_other && <Button variant="outline" size="sm" onClick={() => handleConfirmCost(cost.id)}><Check className="h-4 w-4" /></Button>}
                  </div>
                ))}
              </div>
              <DialogFooter><Button onClick={() => setShowCostsDetailDialog(false)}>Zavřít</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {selectedDateForTime && (
        <Dialog open={!!selectedDateForTime} onOpenChange={() => setSelectedDateForTime(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Vyberte čas návštěvy</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">Datum: {format(selectedDateForTime.date, 'd. M. yyyy', { locale: cs })}</p>
              <div><Label htmlFor="time-picker">Čas</Label><Input id="time-picker" type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setSelectedDateForTime(null)}>Zrušit</Button><Button onClick={handleSaveAppointment}>Uložit</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showDeadlinePrompt && pendingAppointment && (
        <Dialog open={showDeadlinePrompt} onOpenChange={setShowDeadlinePrompt}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /> Termín po deadline</DialogTitle></DialogHeader>
            <p className="text-sm">Vybraný termín návštěvy je po termínu dokončení zakázky. Chcete pokračovat?</p>
            <DialogFooter><Button variant="outline" onClick={() => setShowDeadlinePrompt(false)}>Zrušit</Button><Button onClick={handleConfirmAppointmentPastDeadline}>Pokračovat</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectedJobForSharing && user && <SharedWorkersDialog isOpen={showSharedWorkersDialog} onClose={() => setShowSharedWorkersDialog(false)} jobId={selectedJobForSharing.jobId} currentWorkerId={user.id} customerId={selectedJobForSharing.customerId} />}
      {protocolOffer && workerProfile && <HandoverProtocolDialog isOpen={showProtocolDialog} onClose={() => setShowProtocolDialog(false)} jobData={{ title: protocolOffer.jobs?.service_subcategories?.name || 'Zakázka', description: protocolOffer.jobs?.description || '', createdAt: protocolOffer.jobs?.created_at, status: protocolOffer.jobs?.status, address: protocolOffer.jobs?.full_address || protocolOffer.jobs?.city }} workerData={{ name: workerProfile.full_name, phone: workerProfile.phone, billing: workerBilling || undefined }} customerData={{ name: (protocolOffer.jobs as any)?.public_profiles?.full_name || 'Zákazník', address: protocolOffer.jobs?.full_address, billing: customerBilling || undefined }} additionalCosts={(additionalCosts[protocolOffer.id] || []).map(c => ({ description: c.description, amount: c.amount, confirmed_by_other: c.confirmed_by_other }))} basePrice={protocolOffer.price} finalPrice={protocolOffer.price + (additionalCosts[protocolOffer.id] || []).reduce((sum, cost) => sum + cost.amount, 0)} />}
      <ImageLightbox images={lightboxImages} open={lightboxOpen} onOpenChange={setLightboxOpen} initialIndex={lightboxInitialIndex} />
      
      <Dialog open={showShareExplanation} onOpenChange={setShowShareExplanation}>
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg"><Share2 className="h-5 w-5 text-primary" /> Proč sdílet kalendář?</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 text-sm text-muted-foreground leading-relaxed">
            <p>Sdílením kalendáře umožníte ostatním řemeslníkům, kteří pracují pro stejného zákazníka, vidět vaše naplánované termíny.</p>
            <ul className="space-y-2 list-disc pl-4">
              <li><strong>Lepší koordinace:</strong> Ostatní uvidí, kdy budete na místě.</li>
              <li><strong>Přehled:</strong> Zákazník i řemeslníci mají jasno.</li>
              <li><strong>Soukromí:</strong> Ostatní uvidí pouze název služby a čas.</li>
            </ul>
          </div>
          <DialogFooter><Button onClick={() => setShowShareExplanation(false)} className="w-full rounded-full">Rozumím</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mobileCalendarJob} onOpenChange={(open) => !open && setMobileCalendarJob(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-[400px] rounded-2xl p-0 overflow-hidden border-none max-h-[90vh] flex flex-col">
          <div className="p-6 overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Kalendář návštěv
              </DialogTitle>
              <DialogDescription>
                Vyberte den pro naplánování nové návštěvy.
              </DialogDescription>
            </DialogHeader>
            {mobileCalendarJob && (
              <CalendarComponent
                mode="single"
                selected={undefined}
                onSelect={(date) => {
                  if (date) {
                    const offer = acceptedOffers.find(o => o.job_id === mobileCalendarJob.id);
                    if (offer) {
                      handleAddAppointment(offer, date);
                      setMobileCalendarJob(null);
                    }
                  }
                }}
                locale={cs}
                className="w-full border rounded-xl p-3 bg-card mx-auto"
                modifiers={{
                  deadline: mobileCalendarJob.deadline_date ? [new Date(mobileCalendarJob.deadline_date)] : [],
                }}
                modifiersClassNames={{
                  deadline: "border-b-2 border-primary font-bold",
                }}
                classNames={{
                  day_selected: "bg-primary text-primary-foreground pointer-events-none rounded-lg",
                }}
              />
            )}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Naplánovaná návštěva</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase">
                <div className="w-3 h-3 rounded-full border-b-2 border-primary bg-background" />
                <span>Termín dokončení</span>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-muted/30 border-t">
            <Button onClick={() => setMobileCalendarJob(null)} className="w-full rounded-full">
              Zavřít
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkerInProgressJobs;
