import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Calendar, Coins, Upload, X, Crown, Lock, Wand2, Sparkles, AlertTriangle } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format as formatDate } from "date-fns";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { generateId } from "@/lib/utils";
import { compressOfferPhoto } from "@/lib/image-compression";
import { checkAndNotifyLowCredits } from "@/lib/low-credits-notification";
import { hapticTap } from "@/utils/haptics";
import { checkJobSlotAvailability, STANDARD_SLOT_LIMIT, PRO_SLOT_LIMIT } from "@/hooks/use-pro-status";
import { useQueryClient } from "@tanstack/react-query";
import { PrioritySlotBadge } from "@/components/worker-badges/ProBadge";
import { useProfile } from "@/hooks/use-profile";
import { InsufficientPointsModal } from "@/components/InsufficientPointsModal";
import { useHistoryState } from "@/hooks/use-history-state";
import { getCategoryIcon } from "@/utils/categoryIcons";

interface WorkerOfferDialogProps {
  job: any;
  onClose: () => void;
  onJobUnavailable?: () => void;
  isDirectInquiry?: boolean;
}

export const WorkerOfferDialog = ({ job, onClose, onJobUnavailable, isDirectInquiry = false }: WorkerOfferDialogProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [offerData, setOfferData] = useState({
    price: "",
    message: "",
    availabilityDate: undefined as Date | undefined,
  });
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { profile, invalidateProfile } = useProfile();
  const [showLowPointsModal, setShowLowPointsModal] = useState(false);
  const [slotStatus, setSlotStatus] = useState<{
    canApply: boolean;
    reason: string;
    isPrioritySlot: boolean;
    totalOffers: number;
    loading: boolean;
  }>({ canApply: true, reason: "", isPrioritySlot: false, totalOffers: 0, loading: true });
  const [generatingAi, setGeneratingAi] = useState(false);
  const pointsCost = job?.service_subcategories?.points_cost ?? 3;

  // Sync with browser history for native back button support
  useHistoryState(true, onClose, "worker-offer-dialog");

  // Check slot availability on mount
  useEffect(() => {
    const checkSlots = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !job?.id) {
        setSlotStatus(prev => ({ ...prev, loading: false }));
        return;
      }
      
      const result = await checkJobSlotAvailability(job.id, session.user.id);
      setSlotStatus({
        canApply: result.canApply,
        reason: result.reason,
        isPrioritySlot: result.isPrioritySlot,
        totalOffers: result.slotInfo?.totalOffers || 0,
        loading: false,
      });
    };
    
    checkSlots();
  }, [job?.id]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files].slice(0, 5)); // Max 5 photos
    if (e.target) e.target.value = ''; // Reset for re-selection
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setPhotos(prev => [...prev, ...files].slice(0, 5));
  }, []);

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateAiMessage = async () => {
    if (generatingAi) return;
    
    try {
      setGeneratingAi(true);
      const { data, error } = await supabase.functions.invoke('generate-offer-message', {
        body: {
          jobTitle: job.service_subcategories?.name || job.title,
          jobDescription: job.description || job.title,
          workerName: profile?.full_name || "Ověřený řemeslník",
          workerBio: profile?.bio
        }
      });

      if (error) {
        if (error.message?.includes('LIMIT_REACHED')) {
          toast({
            title: "Limit vyčerpán",
            description: "Dosáhli jste limitu 3 AI návrhů měsíčně. Upgradujte na PRO pro neomezené generování.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      if (data?.message) {
        setOfferData(prev => ({ ...prev, message: data.message }));
        toast({
          title: "Zpráva vygenerována",
          description: "Můžete ji nyní doupravit podle potřeby.",
        });
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast({
        title: "Chyba při generování",
        description: "Nepodařilo se vygenerovat zprávu. Zkuste to prosím později.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAi(false);
    }
  };

  const IconComponent = getCategoryIcon(job?.service_categories?.icon || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!offerData.price || !offerData.message || !offerData.availabilityDate) {
      toast({
        title: "Chyba",
        description: "Prosím vyplňte všechna povinná pole včetně data dokončení",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Re-check slot availability before submitting (race condition protection)
      const slotCheck = await checkJobSlotAvailability(job.id, session.user.id);
      if (!slotCheck.canApply) {
        toast({
          title: "Zakázka není dostupná",
          description: "Tuto zakázku už vzal někdo jiný.",
          variant: "destructive",
        });
        onJobUnavailable?.();
        onClose();
        return;
      }

      // Check if already applied, but handle direct_pending as a special case
      const { data: existingOfferData } = await supabase
        .from('offers')
        .select('id, status')
        .eq('job_id', job.id)
        .eq('worker_id', session.user.id)
        .maybeSingle();

      const isInternalDirectUpdate = existingOfferData?.status === 'direct_pending';

      if (existingOfferData && !isInternalDirectUpdate) {
        toast({
          title: "Chyba",
          description: "Již jste podali nabídku na tuto zakázku",
          variant: "destructive",
        });
        return;
      }

      // Check user points using the consolidated profile data
      if (!profile || profile.points < pointsCost) {
        setShowLowPointsModal(true);
        return;
      }

      // Upload photos if any
      let uploadedPhotos: string[] = [];
      if (photos.length > 0) {
        for (const photo of photos) {
          try {
            const compressedPhoto = await compressOfferPhoto(photo);
            const fileExt = 'jpg';
            const fileName = `${generateId()}.${fileExt}`;
            const filePath = `offer-photos/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('job-photos')
              .upload(filePath, compressedPhoto);
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
              .from('job-photos')
              .getPublicUrl(filePath);
            
            uploadedPhotos.push(publicUrl);
          } catch (err) {
            console.error('Individual photo upload failed, skipping:', err);
          }
        }
      }

      // Atomically deduct points FIRST (prevents double-spend race condition)
      const { data: newBalance, error: pointsError } = await supabase
        .rpc('deduct_points' as any, { p_user_id: session.user.id, p_amount: pointsCost });

      if (pointsError) {
        console.error('[WorkerOfferDialog] Points deduction failed:', pointsError);
        throw new Error('Nedostatek kreditů pro odeslání nabídky');
      }

      const finalBalance = (newBalance as number) ?? (profile.points - pointsCost);

      // Create or update offer (after points deducted)
      const offerPayload = {
        job_id: job.id,
        worker_id: session.user.id,
        price: parseFloat(offerData.price),
        message: offerData.message,
        availability: offerData.availabilityDate ? formatDate(offerData.availabilityDate, 'yyyy-MM-dd') : null,
        photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
        status: 'pending' as const,
      };

      let offerError;
      if (isInternalDirectUpdate && existingOfferData) {
        const { error } = await supabase
          .from('offers')
          .update(offerPayload)
          .eq('id', existingOfferData.id);
        offerError = error;
      } else {
        const { error } = await supabase
          .from('offers')
          .insert(offerPayload);
        offerError = error;
      }

      if (offerError) {
        // Rollback: refund points since offer creation failed
        console.error('[WorkerOfferDialog] Offer creation failed, refunding points:', offerError);
        await supabase.rpc('add_user_points' as any, { target_user_id: session.user.id, points_to_add: pointsCost });

        if (offerError.message?.includes('violates foreign key') || 
            offerError.code === '23503') {
          toast({
            title: "Zakázka není dostupná",
            description: "Tuto zakázku už vzal někdo jiný.",
            variant: "destructive",
          });
          onJobUnavailable?.();
          onClose();
          return;
        }
        throw offerError;
      }

      hapticTap();
      toast({
        title: "Úspěch!",
        description: "Vaše nabídka byla odeslána",
      });

      // Invalidate all relevant caches BEFORE navigation
      invalidateProfile();
      queryClient.invalidateQueries({ queryKey: ['available-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['worker-pending-offers'] });

      // Notify customer about the new offer
      try {
        await supabase.functions.invoke('notify-customer-new-offer', {
          body: {
            customerId: job.customer_id,
            workerName: profile.full_name,
            jobTitle: job.service_subcategories?.name || job.title,
            jobId: job.id,
            offerPrice: parseFloat(offerData.price)
          }
        });
      } catch (notifyError) {
        console.log('Failed to send push notification:', notifyError);
      }

      // Check if worker's credits dropped below threshold and notify
      await checkAndNotifyLowCredits(session.user.id, finalBalance, profile.full_name, profile.email);

      onClose();
      navigate('/remeslnik/nabidky');
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <InsufficientPointsModal
        open={showLowPointsModal}
        onOpenChange={setShowLowPointsModal}
        requiredPoints={pointsCost}
        currentPoints={profile?.points || 0}
      />
      <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="!max-w-full w-full h-full max-h-full m-0 p-0 rounded-none overflow-y-auto pb-20 md:pb-0 md:!max-w-[580px] md:w-[580px] md:h-auto md:max-h-[90vh] md:m-4 md:rounded-2xl md:overflow-auto border-0 md:border bg-card text-foreground">
        <div className="min-h-full md:min-h-0 flex flex-col">
          <DialogHeader className="p-5 pb-4">
            <DialogTitle className="text-xl font-bold">
              {isDirectInquiry ? "Odpovědět na poptávku" : "Předložit nabídku"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="flex-1 px-5 pb-5 space-y-5 overflow-auto">
            {/* Job Info Card */}
            <div className="rounded-xl py-3 px-0 -mx-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <IconComponent className="h-3.5 w-3.5 text-foreground" />
                </div>
                <h3 className="font-semibold text-foreground leading-tight text-sm">
                  {job.service_subcategories?.name || job.title}
                </h3>
              </div>
              
              {/* Details Pills */}
              <div className="flex flex-wrap gap-1.5">
                <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-medium">{job.city}</span>
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-medium">
                    {job.deadline_type === 'asap' && 'Co nejdříve'}
                    {job.deadline_type === 'agreement' && 'Dle dohody'}
                    {job.deadline_type === 'specific' && job.deadline_date && format(new Date(job.deadline_date), 'd.M.yyyy', { locale: cs })}
                    {!job.deadline_type && 'Neurčeno'}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="price" className="text-sm font-medium text-foreground">
                  Navrhovaná cena (Kč) <span className="text-destructive">*</span>
                </Label>
                {job?.service_subcategories?.price_range && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Obvyklá cena: <span className="font-medium text-foreground">{job.service_subcategories.price_range}</span>
                  </p>
                )}
                <Input
                  id="price"
                  type="number"
                  value={offerData.price}
                  onChange={(e) => setOfferData({ ...offerData, price: e.target.value })}
                  className="mt-1.5 h-11 bg-background border-border rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground">
                  Datum dokončení <span className="text-destructive">*</span>
                </Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="mt-1.5 h-11 w-full justify-start text-left font-normal bg-background border-border rounded-xl"
                    >
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {offerData.availabilityDate ? (
                        <span className="text-foreground">{formatDate(offerData.availabilityDate, 'd.M.yyyy', { locale: cs })}</span>
                      ) : (
                        <span className="text-muted-foreground">Vyberte datum</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full min-w-[calc(100vw-2.5rem)] md:min-w-0 md:w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={offerData.availabilityDate}
                      onSelect={(date) => {
                        setOfferData({ ...offerData, availabilityDate: date });
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      locale={cs}
                      className="pointer-events-auto w-full [&_table]:w-full"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message" className="text-sm font-medium text-foreground">
                    Osobní zpráva pro zákazníka <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateAiMessage}
                    disabled={generatingAi}
                    className="h-8 rounded-full px-3 gap-1.5 text-xs font-bold bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                  >
                    {generatingAi ? (
                      <div className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {generatingAi ? "Generuji..." : "✨ Navrhnout text"}
                  </Button>
                </div>
                <Textarea
                  id="message"
                  value={offerData.message}
                  onChange={(e) => setOfferData({ ...offerData, message: e.target.value })}
                  placeholder="Osobní zpráva pro zákazníka..."
                  className="min-h-[100px] resize-none bg-background border-border rounded-xl focus:ring-primary/20"
                  required
                />
                {!profile?.is_pro && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-1 w-20 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${Math.min(((profile?.ai_usage_count || 0) / 3) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                      {profile?.ai_usage_count || 0}/3 AI návrhy tento měsíc
                    </span>
                  </div>
                )}
              </div>

              {/* Portfolio Photos */}
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Fotky podobných prací (volitelné)
                </Label>
                <div className="mt-1.5 grid grid-cols-5 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <div
                      className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-muted/50'
                      }`}
                      onClick={() => document.getElementById('portfolio-upload')?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground mt-1">Přidat</span>
                    </div>
                  )}
                  <input
                    id="portfolio-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>
            </div>

            {/* Slot Status Warning */}
            {!slotStatus.loading && !slotStatus.canApply && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">{slotStatus.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Staňte se PRO členem a odemkněte přístup k exkluzivním slotům.
                  </p>
                </div>
              </div>
            )}

            {/* Priority Slot Notice */}
            {!slotStatus.loading && slotStatus.canApply && slotStatus.isPrioritySlot && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Prioritní slot (PRO)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Využíváte exkluzivní PRO slot ({slotStatus.totalOffers + 1}/8).
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {slotStatus.canApply ? (
                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-full text-foreground text-sm font-semibold relative justify-center"
                  disabled={submitting || slotStatus.loading || !offerData.price || !offerData.message.trim() || !offerData.availabilityDate}
                >
                  <span>
                    {submitting ? "Odesílání..." : slotStatus.isPrioritySlot ? "Prioritní nabídka" : isDirectInquiry ? "Předložit nabídku" : "Předložit nabídku"}
                  </span>
                  <span className="absolute right-3 text-foreground/70 text-xs font-bold flex items-center gap-0.5">
                    {pointsCost} <Coins className="w-3.5 h-3.5" />
                  </span>
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full h-11 text-sm font-medium gap-2"
                  disabled
                >
                  <Lock className="h-4 w-4" />
                  {slotStatus.reason}
                </Button>
              )}
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-11 text-sm font-medium rounded-full border-border bg-background"
                onClick={onClose}
              >
                Zrušit
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
