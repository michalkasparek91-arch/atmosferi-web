import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeSVG } from "qrcode.react";
import { 
  Share2, 
  Copy, 
  Check, 
  ArrowLeft,
  ArrowRight,
  Link as LinkIcon,
  Loader2,
  Upload,
  X,
  GripVertical
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { geocodeAddress } from "@/lib/geocode-address";
import { compressJobPhoto } from "@/lib/image-compression";

interface WorkerShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  workerName: string;
}

type Step = 'job-details' | 'share';

export function WorkerShareDialog({ open, onOpenChange, workerId, workerName }: WorkerShareDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('job-details');
  const [jobDetails, setJobDetails] = useState({
    categoryId: '',
    subcategoryId: '',
    description: '',
    priceNote: '',
    fullAddress: '',
    city: '',
    street: '',
    streetName: '',
    streetNumber: '',
    postalCode: '',
    deadlineType: 'asap',
    deadlineDate: '',
  });
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  interface PhotoItem {
    url: string;
    file?: File;
    isNew: boolean;
  }
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  // Fetch worker's assigned services (subcategories)
  const { data: workerServices = [] } = useQuery({
    queryKey: ['worker-services', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_services')
        .select(`
          subcategory_id,
          service_subcategories (
            id,
            name,
            category_id,
            service_categories (
              id,
              name
            )
          )
        `)
        .eq('worker_id', workerId);
      if (error) throw error;
      return data;
    },
    enabled: !!workerId
  });

  // Extract unique categories from worker's services
  const categories = workerServices.reduce((acc: { id: string; name: string }[], service) => {
    const category = service.service_subcategories?.service_categories;
    if (category && !acc.find(c => c.id === category.id)) {
      acc.push({ id: category.id, name: category.name });
    }
    return acc;
  }, []).sort((a, b) => a.name.localeCompare(b.name));

  // Filter subcategories based on selected category and worker's services
  const subcategories = workerServices
    .filter(service => service.service_subcategories?.category_id === jobDetails.categoryId)
    .map(service => ({
      id: service.service_subcategories!.id,
      name: service.service_subcategories!.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Get selected subcategory name for title
  const selectedSubcategory = subcategories.find(s => s.id === jobDetails.subcategoryId);

  // Always use production domain for shared links
  const baseUrl = 'https://zrobee.cz';
  
  const getShareUrl = () => {
    if (createdJobId) {
      return `${baseUrl}/sdilena-zakazka/${createdJobId}`;
    }
    return `${baseUrl}/remeslnik-profil/${workerId}`;
  };

  const shareUrl = getShareUrl();

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: PhotoItem[] = files.map(file => ({
      url: URL.createObjectURL(file),
      file,
      isNew: true,
    }));
    setPhotoItems(prev => [...prev, ...newItems]);
  };

  const removePhoto = (index: number) => {
    setPhotoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setPhotoItems(prev => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, dragged);
      return updated;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Create job and offer when proceeding to share step
  const handleProceedToShare = async () => {
    if (!jobDetails.subcategoryId) return;
    
    setIsCreating(true);
    try {
      // Geocode address from manual fields
      const coords = await geocodeAddress(jobDetails.streetName, jobDetails.streetNumber, jobDetails.city, jobDetails.postalCode);
      if (coords) setCoordinates(coords);

      // Upload photos if any
      const uploadedPhotoUrls: string[] = [];
      for (const item of photoItems) {
        if (!item.isNew) {
          uploadedPhotoUrls.push(item.url);
          continue;
        }
        if (!item.file) continue;
        const compressedFile = await compressJobPhoto(item.file);
        const fileExt = 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${workerId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(filePath, compressedFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('job-photos')
          .getPublicUrl(filePath);

        uploadedPhotoUrls.push(publicUrl);
      }

      // Create the job
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          customer_id: workerId,
          category_id: jobDetails.categoryId,
          subcategory_id: jobDetails.subcategoryId,
          title: selectedSubcategory?.name || 'Nová zakázka',
          description: jobDetails.description || selectedSubcategory?.name || 'Popis práce',
          status: 'in_progress',
          city: jobDetails.city || null,
          full_address: jobDetails.streetName && jobDetails.streetNumber && jobDetails.city
            ? `${jobDetails.streetName} ${jobDetails.streetNumber}, ${jobDetails.postalCode} ${jobDetails.city}`.trim()
            : jobDetails.fullAddress || null,
          latitude: coordinates?.lat ?? null,
          longitude: coordinates?.lng ?? null,
          budget_max: null,
          price_note: jobDetails.priceNote || null,
          deadline_type: jobDetails.deadlineType,
          deadline_date: jobDetails.deadlineType === 'specific' && jobDetails.deadlineDate
            ? new Date(jobDetails.deadlineDate).toISOString()
            : null,
          photos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : null,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Create an accepted offer for this job
      const { error: offerError } = await supabase
        .from('offers')
        .insert({
          job_id: newJob.id,
          worker_id: workerId,
          price: 0,
          message: jobDetails.description || 'Práce vytvořená přes sdílení',
          status: 'accepted',
        });

      if (offerError) throw offerError;

      setCreatedJobId(newJob.id);
      setStep('share');
      
      queryClient.invalidateQueries({ queryKey: ['worker-in-progress-jobs'] });
      
      toast({
        title: "Zakázka vytvořena",
        description: "Nyní můžete sdílet odkaz se zákazníkem",
      });
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit zakázku",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Odkaz zkopírován",
        description: "Odkaz byl zkopírován do schránky",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se zkopírovat odkaz",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${workerName} - Zakázka na zrobee`,
          text: jobDetails.description 
            ? `Zakázka: ${jobDetails.description}`
            : `Podívejte se na vaši zakázku`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleBack = () => {
    setStep('job-details');
  };

  const addressFieldsValid = !!(jobDetails.streetName.trim() && jobDetails.streetNumber.trim() && jobDetails.city.trim());

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('job-details');
      setJobDetails({ categoryId: '', subcategoryId: '', description: '', priceNote: '', fullAddress: '', city: '', street: '', streetName: '', streetNumber: '', postalCode: '', deadlineType: 'asap', deadlineDate: '' });
      setPhotoItems([]);
      setCreatedJobId(null);
      setCoordinates(null);
    }, 300);
  };

  const handleGoToInProgress = () => {
    const jobId = createdJobId;
    handleClose();
    if (jobId) {
      navigate(`/remeslnik/zakazka/${jobId}`);
      return;
    }
    navigate('/remeslnik/probihajici');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideCloseButton className="!max-w-full w-full h-full max-h-full m-0 p-0 rounded-none overflow-y-auto pb-20 md:pb-0 md:!max-w-[580px] md:w-[580px] md:h-auto md:max-h-[90vh] md:m-4 md:rounded-2xl md:overflow-auto border-0 md:border bg-card text-foreground flex flex-col">
        <div className="min-h-full md:min-h-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-2">
            {step === 'share' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 rounded-full flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-base font-bold text-foreground leading-tight">
                {step === 'job-details' ? 'Nová práce' : 'Sdílet zakázku'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0 bg-card/80 hover:bg-card"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

        {/* Job details form - scrollable */}
        {step === 'job-details' && (
          <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-4">
            <p className="text-xs text-gray-500 text-center mb-4">
              Vyplňte detaily práce a vytvořte zakázku, kterou můžete sdílet se zákazníkem.
            </p>

            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">Kategorie</h3>
                <Select
                  value={jobDetails.categoryId}
                  onValueChange={(value) => setJobDetails(prev => ({ 
                    ...prev, 
                    categoryId: value, 
                    subcategoryId: '' 
                  }))}
                >
                <SelectTrigger className="bg-background border-border rounded-xl text-foreground font-medium">
                    <SelectValue placeholder="Vyberte kategorii..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[9999]" position="popper" sideOffset={4}>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {jobDetails.categoryId && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-1">Typ služby</h3>
                  <Select
                    value={jobDetails.subcategoryId}
                    onValueChange={(value) => setJobDetails(prev => ({ 
                      ...prev, 
                      subcategoryId: value 
                    }))}
                  >
                    <SelectTrigger className="bg-background border-border rounded-xl text-foreground font-medium">
                      <SelectValue placeholder="Vyberte službu..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[9999]" position="popper" sideOffset={4}>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}


              {/* Individual address fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-1">Ulice *</h3>
                  <Input
                    value={jobDetails.streetName}
                    onChange={(e) => setJobDetails(prev => ({ ...prev, streetName: e.target.value }))}
                    placeholder="Ulice"
                    className="bg-background border-border rounded-xl text-foreground font-medium"
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-1">Č.p. *</h3>
                  <Input
                    value={jobDetails.streetNumber}
                    onChange={(e) => setJobDetails(prev => ({ ...prev, streetNumber: e.target.value }))}
                    placeholder="123"
                    className="bg-background border border-border rounded-xl text-foreground font-medium"
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-1">Město *</h3>
                  <Input
                    value={jobDetails.city}
                    onChange={(e) => setJobDetails(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Město"
                    className="bg-background border border-border rounded-xl text-foreground font-medium"
                  />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-1">PSČ</h3>
                  <Input
                    value={jobDetails.postalCode}
                    onChange={(e) => setJobDetails(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="110 00"
                    className="bg-background border border-border rounded-xl text-foreground font-medium"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">Popis práce (volitelné)</h3>
                <Textarea
                  id="description"
                  placeholder="Stručně popište, o jakou práci se jedná..."
                  value={jobDetails.description}
                  onChange={(e) => setJobDetails(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  maxLength={500}
                  className="resize-none bg-background border border-border rounded-xl text-foreground font-medium"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{jobDetails.description.length}/500</p>
              </div>

              {/* Deadline */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">Termín</h3>
                <Select value={jobDetails.deadlineType} onValueChange={(value) => setJobDetails(prev => ({ ...prev, deadlineType: value }))}>
                  <SelectTrigger className="bg-background border border-border rounded-xl text-foreground font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-[9999]" position="popper" sideOffset={4}>
                    <SelectItem value="asap">Co nejdříve</SelectItem>
                    <SelectItem value="agreement">Dle dohody</SelectItem>
                    <SelectItem value="specific">Konkrétní datum</SelectItem>
                  </SelectContent>
                </Select>
                {jobDetails.deadlineType === 'specific' && (
                  <Input
                    type="date"
                    value={jobDetails.deadlineDate}
                    onChange={(e) => setJobDetails(prev => ({ ...prev, deadlineDate: e.target.value }))}
                    className="bg-background border border-border rounded-xl text-foreground font-medium mt-2"
                  />
                )}
              </div>

              {/* Price Note */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">Poznámka k ceně</h3>
                <Input
                  value={jobDetails.priceNote}
                  onChange={(e) => setJobDetails(prev => ({ ...prev, priceNote: e.target.value }))}
                  placeholder="Např. cena závisí na rozsahu..."
                  className="bg-background border border-border rounded-xl text-foreground font-medium"
                />
              </div>

              {/* Photos with drag and drop */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">Fotografie</h3>
                <p className="text-xs text-gray-400 mb-2">Přetáhněte fotky pro změnu pořadí</p>

                <div className="grid grid-cols-4 gap-2">
                  {photoItems.map((item, index) => (
                    <div
                      key={`photo-${index}-${item.url}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-grab active:cursor-grabbing group transition-all ${
                        dragIndex === index ? 'opacity-40 scale-95' : ''
                      } ${dragOverIndex === index && dragIndex !== index ? 'ring-2 ring-primary ring-offset-1' : ''} ${
                        item.isNew ? 'ring-1 ring-primary/50' : ''
                      }`}
                    >
                      <img src={item.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <GripVertical className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                          Hlavní
                        </span>
                      )}
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border cursor-pointer transition-colors hover:border-border/80 hover:bg-muted text-muted-foreground flex flex-col items-center justify-center gap-1">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs font-medium text-center leading-tight">Přidat<br/>fotografie</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button 
                onClick={handleProceedToShare} 
                className="w-full h-12 text-sm font-semibold rounded-full"
                disabled={!jobDetails.subcategoryId || !addressFieldsValid || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Vytvářím zakázku...
                  </>
                ) : (
                  <>
                    Vytvořit a sdílet
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full h-12 text-sm font-semibold rounded-full bg-background hover:bg-muted text-foreground border-border"
              >
                Zrušit
              </Button>
            </div>
          </div>
        )}

        {/* QR Code and share options - fullscreen */}
        {step === 'share' && (
          <div className="flex-1 flex flex-col justify-start pt-4 px-2 overflow-y-auto">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <QRCodeSVG 
                  value={shareUrl} 
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-3 text-center">
                Zákazník naskenuje QR kód pro zobrazení zakázky
              </p>
            </div>

            {/* Job context info */}
            <div className="bg-accent/50 rounded-xl p-3 mt-4">
              <p className="text-sm font-medium text-foreground">
                ✓ Zakázka byla vytvořena
              </p>
              {jobDetails.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {jobDetails.description}
                </p>
              )}
            </div>

            {/* Share URL */}
            <div className="space-y-1.5 mt-4">
              <Label className="text-sm">Odkaz na zakázku</Label>
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="text-sm h-10 font-medium"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button 
                variant="outline" 
                onClick={handleCopyLink}
                className="flex items-center gap-2"
              >
                <LinkIcon className="h-4 w-4" />
                Kopírovat
              </Button>
              <Button 
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Sdílet
              </Button>
            </div>

            {/* Go to in-progress button */}
            <Button 
              variant="secondary"
              onClick={handleGoToInProgress}
              className="w-full mt-4"
            >
              Přejít na probíhající zakázky
            </Button>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
