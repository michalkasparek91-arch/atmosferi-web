import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
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
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";

interface CustomerNewJobWithWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  workerName: string;
}

interface PhotoItem {
  url: string;
  file?: File;
  isNew: boolean;
}

export function CustomerNewJobWithWorkerDialog({ open, onOpenChange, workerId, workerName }: CustomerNewJobWithWorkerDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [jobDetails, setJobDetails] = useState({
    categoryId: '',
    subcategoryId: '',
    description: '',
    priceNote: '',
    streetName: '',
    streetNumber: '',
    city: '',
    postalCode: '',
    deadlineType: 'asap',
    deadlineDate: '',
  });
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [jobCoordinates, setJobCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch worker's assigned services
  const { data: workerServices = [], isLoading: isLoadingServices } = useQuery({
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
    enabled: !!workerId && open
  });

  const categories = workerServices.reduce((acc: { id: string; name: string }[], service: any) => {
    // Handle potential array return from Supabase join (though it should be an object)
    const subcategory = Array.isArray(service.service_subcategories) 
      ? service.service_subcategories[0] 
      : service.service_subcategories;
    
    const category = subcategory?.service_categories;
    const finalCategory = Array.isArray(category) ? category[0] : category;

    if (finalCategory && !acc.find(c => c.id === finalCategory.id)) {
      acc.push({ id: finalCategory.id, name: finalCategory.name });
    }
    return acc;
  }, []).sort((a, b) => a.name.localeCompare(b.name));

  const subcategories = workerServices
    .filter((service: any) => {
      const subcategory = Array.isArray(service.service_subcategories) 
        ? service.service_subcategories[0] 
        : service.service_subcategories;
      return subcategory?.category_id === jobDetails.categoryId;
    })
    .map((service: any) => {
      const subcategory = Array.isArray(service.service_subcategories) 
        ? service.service_subcategories[0] 
        : service.service_subcategories;
      return {
        id: subcategory.id,
        name: subcategory.name
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Automatic pre-selection if there's only one category
  useEffect(() => {
    if (!isLoadingServices && categories.length === 1 && !jobDetails.categoryId) {
      setJobDetails(prev => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [isLoadingServices, categories, jobDetails.categoryId]);

  const selectedSubcategory = subcategories.find(s => s.id === jobDetails.subcategoryId);

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

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setDragOverIndex(null); return; }
    setPhotoItems(prev => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, dragged);
      return updated;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const handleCreateJob = async () => {
    if (!jobDetails.subcategoryId) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use stored coordinates or geocode as fallback
      const coords = jobCoordinates || await geocodeAddress(jobDetails.streetName, jobDetails.streetNumber, jobDetails.city, jobDetails.postalCode);

      // Upload photos
      const uploadedPhotoUrls: string[] = [];
      for (const item of photoItems) {
        if (!item.isNew) { uploadedPhotoUrls.push(item.url); continue; }
        if (!item.file) continue;
        const compressedFile = await compressJobPhoto(item.file);
        const fileName = `${Math.random()}.jpg`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('job-photos').upload(filePath, compressedFile);
        if (uploadError) { console.error('Upload error:', uploadError); continue; }
        const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(filePath);
        uploadedPhotoUrls.push(publicUrl);
      }

      // Create job as customer
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          customer_id: user.id,
          category_id: jobDetails.categoryId,
          subcategory_id: jobDetails.subcategoryId,
          title: selectedSubcategory?.name || 'Nová zakázka',
          description: jobDetails.description || selectedSubcategory?.name || 'Popis práce',
          status: 'pending',
          city: jobDetails.city || null,
          full_address: jobDetails.streetName && jobDetails.streetNumber && jobDetails.city
            ? `${jobDetails.streetName} ${jobDetails.streetNumber}, ${jobDetails.postalCode} ${jobDetails.city}`.trim()
            : null,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
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

      // Create an accepted offer from the worker
      const { error: offerError } = await supabase
        .from('offers')
        .insert({
          job_id: newJob.id,
          worker_id: workerId,
          price: 0,
          message: jobDetails.description || 'Práce zadána zákazníkem',
          status: 'direct_pending',
          is_direct: true,
        });

      if (offerError) throw offerError;

      // Notify the worker about the new direct hire inquiry
      supabase.functions.invoke('notify-worker-direct-inquiry', {
        body: {
          workerId: workerId,
          customerName: user.user_metadata?.full_name || 'Zákazník',
          jobTitle: selectedSubcategory?.name || 'Nová zakázka',
          jobId: newJob.id
        }
      }).catch(err => console.error('Failed to notify worker:', err));

      queryClient.invalidateQueries({ queryKey: ['customer-jobs'] });

      toast({
        title: "Zakázka vytvořena",
        description: `Práce byla zadána pro ${workerName}`,
      });

      handleClose();
      navigate('/zakaznik/poptavky');
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

  const addressFieldsValid = !!(jobDetails.streetName.trim() && jobDetails.streetNumber.trim() && jobDetails.city.trim());

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setJobDetails({ categoryId: '', subcategoryId: '', description: '', priceNote: '', streetName: '', streetNumber: '', city: '', postalCode: '', deadlineType: 'asap', deadlineDate: '' });
      setPhotoItems([]);
      setJobCoordinates(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideCloseButton className="!max-w-full w-full h-full max-h-full m-0 p-0 rounded-none overflow-y-auto pb-20 md:pb-0 md:!max-w-[580px] md:w-[580px] md:h-auto md:max-h-[90vh] md:m-4 md:rounded-2xl md:overflow-auto border-0 md:border bg-background text-foreground flex flex-col">
        <div className="min-h-full md:min-h-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-base font-bold text-foreground leading-tight">
                Nová práce
              </p>
              <p className="text-xs text-muted-foreground">pro {workerName}</p>
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

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-4">
            <p className="text-xs text-muted-foreground text-center mb-4">
              Vyplňte detaily práce a vytvořte zakázku s tímto řemeslníkem.
            </p>

            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1">Kategorie</h3>
                {isLoadingServices ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Načítání kategorií...
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 font-medium">
                    Pracovník zatím nemá přiřazené žádné služby v systému. Zaměstnejte ho přes standardní zadání práce.
                  </p>
                ) : (
                  <Select
                    value={jobDetails.categoryId}
                    onValueChange={(value) => setJobDetails(prev => ({ ...prev, categoryId: value, subcategoryId: '' }))}
                  >
                    <SelectTrigger className="bg-background border-border rounded-xl text-foreground font-medium">
                      <SelectValue placeholder="Vyberte kategorii..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground z-[9999]" position="popper" sideOffset={4}>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {!isLoadingServices && jobDetails.categoryId && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Typ služby</h3>
                  <Select
                    value={jobDetails.subcategoryId}
                    onValueChange={(value) => setJobDetails(prev => ({ ...prev, subcategoryId: value }))}
                  >
                    <SelectTrigger className="bg-background border-border rounded-xl text-foreground font-medium">
                      <SelectValue placeholder="Vyberte službu..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground z-[9999]" position="popper" sideOffset={4}>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}


              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1.5">Lokalita zakázky *</h3>
                <AddressAutocompleteInput
                  onSelect={(result) => {
                    setJobDetails(prev => ({
                      ...prev,
                      streetName: result.streetName,
                      streetNumber: result.streetNumber,
                      city: result.city,
                      postalCode: result.postalCode
                    }));
                    setJobCoordinates({ lat: result.lat, lng: result.lng });
                  }}
                  placeholder="Začněte psát adresu (ulice, město)..."
                  className="bg-background border-border rounded-xl text-foreground font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Ulice *</h3>
                  <Input value={jobDetails.streetName} onChange={(e) => setJobDetails(prev => ({ ...prev, streetName: e.target.value }))} placeholder="Ulice" className="bg-muted border-transparent rounded-xl text-foreground font-medium" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Č.p. *</h3>
                  <Input value={jobDetails.streetNumber} onChange={(e) => setJobDetails(prev => ({ ...prev, streetNumber: e.target.value }))} placeholder="123" className="bg-muted border-transparent rounded-xl text-foreground font-medium" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Město *</h3>
                  <Input value={jobDetails.city} onChange={(e) => setJobDetails(prev => ({ ...prev, city: e.target.value }))} placeholder="Město" className="bg-muted border-transparent rounded-xl text-foreground font-medium" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">PSČ</h3>
                  <Input value={jobDetails.postalCode} onChange={(e) => setJobDetails(prev => ({ ...prev, postalCode: e.target.value }))} placeholder="110 00" className="bg-muted border-transparent rounded-xl text-foreground font-medium" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1">Popis práce (volitelné)</h3>
                <Textarea
                  placeholder="Stručně popište, o jakou práci se jedná..."
                  value={jobDetails.description}
                  onChange={(e) => setJobDetails(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  maxLength={500}
                  className="resize-none bg-background border-border rounded-xl text-foreground font-medium"
                />
                <p className="text-xs text-muted-foreground/60 text-right mt-1">{jobDetails.description.length}/500</p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1">Termín</h3>
                <Select value={jobDetails.deadlineType} onValueChange={(value) => setJobDetails(prev => ({ ...prev, deadlineType: value }))}>
                  <SelectTrigger className="bg-background border-border rounded-xl text-foreground font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground z-[9999]" position="popper" sideOffset={4}>
                    <SelectItem value="asap">Co nejdříve</SelectItem>
                    <SelectItem value="agreement">Dle dohody</SelectItem>
                    <SelectItem value="specific">Konkrétní datum</SelectItem>
                  </SelectContent>
                </Select>
                {jobDetails.deadlineType === 'specific' && (
                  <Input type="date" value={jobDetails.deadlineDate} onChange={(e) => setJobDetails(prev => ({ ...prev, deadlineDate: e.target.value }))} className="bg-background border-border rounded-xl text-foreground font-medium mt-2" />
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1">Poznámka k ceně</h3>
                <Input value={jobDetails.priceNote} onChange={(e) => setJobDetails(prev => ({ ...prev, priceNote: e.target.value }))} placeholder="Např. cena závisí na rozsahu..." className="bg-background border-border rounded-xl text-foreground font-medium" />
              </div>

              {/* Photos */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1">Fotografie</h3>
                <p className="text-xs text-muted-foreground/60 mb-2">Přetáhněte fotky pro změnu pořadí</p>
                <div className="grid grid-cols-4 gap-2">
                  {photoItems.map((item, index) => (
                    <div
                      key={`photo-${index}-${item.url}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-grab active:cursor-grabbing group transition-all ${dragIndex === index ? 'opacity-40 scale-95' : ''} ${dragOverIndex === index && dragIndex !== index ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    >
                      <img src={item.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <GripVertical className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                      <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                      {index === 0 && <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">Hlavní</span>}
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border cursor-pointer transition-colors hover:border-muted-foreground/30 hover:bg-muted text-muted-foreground flex flex-col items-center justify-center gap-1">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs font-medium text-center leading-tight">Přidat<br/>fotografie</span>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={handleCreateJob}
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
                    Zadat práci
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
