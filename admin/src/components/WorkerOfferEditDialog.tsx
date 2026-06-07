import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label"; // kept for potential future use
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MapPin, Calendar, Coins, Briefcase, Upload, X } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { cn, generateId } from "@/lib/utils";
import { compressOfferPhoto } from "@/lib/image-compression";

interface WorkerOfferEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offer: any;
  onUpdate: () => void;
}

export const WorkerOfferEditDialog = ({
  isOpen,
  onClose,
  offer,
  onUpdate
}: WorkerOfferEditDialogProps) => {
  const [price, setPrice] = useState(offer?.price?.toString() || "");
  const [message, setMessage] = useState(offer?.message || "");
  const [availabilityDate, setAvailabilityDate] = useState<Date | undefined>(() => {
    if (offer?.availability) {
      const date = new Date(offer.availability);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  });
  const [updating, setUpdating] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(offer?.photos || []);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const getJobCategoryIcon = () => {
    const IconComponent = getCategoryIcon(offer?.jobs?.service_categories?.icon || 'Wrench');
    return <IconComponent className="h-5 w-5 text-foreground" />;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = existingPhotos.length + newPhotos.length + files.length;
    if (totalPhotos > 5) {
      toast({
        title: "Limit dosažen",
        description: "Maximální počet fotek je 5",
        variant: "destructive"
      });
      return;
    }
    setNewPhotos(prev => [...prev, ...files]);
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const compressedFile = await compressOfferPhoto(file);
      const fileExt = 'jpg';
      const fileName = `${generateId()}.${fileExt}`;
      const filePath = `offer-photos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(filePath, compressedFile);
      
      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(filePath);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleUpdate = async () => {
    if (!price || !message) {
      toast({
        title: "Chyba",
        description: "Vyplňte prosím cenu a zprávu",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);

    try {
      // Upload new photos if any
      let allPhotos = [...existingPhotos];
      if (newPhotos.length > 0) {
        const uploadedUrls = await uploadPhotos(newPhotos);
        allPhotos = [...allPhotos, ...uploadedUrls];
      }

      const { error } = await supabase
        .from('offers')
        .update({
          price: parseFloat(price),
          message: message,
          availability: availabilityDate ? format(availabilityDate, 'yyyy-MM-dd') : null,
          photos: allPhotos.length > 0 ? allPhotos : null
        })
        .eq('id', offer.id);

      if (error) throw error;

      toast({
        title: "Úspěch",
        description: "Nabídka byla aktualizována",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating offer:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat nabídku",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="!max-w-full w-full h-full max-h-full m-0 p-0 rounded-none overflow-y-auto pb-20 md:pb-0 md:!max-w-[580px] md:w-[580px] md:h-auto md:max-h-[90vh] md:m-4 md:rounded-2xl md:overflow-auto border-0 md:border bg-card text-foreground">
        <div className="min-h-full md:min-h-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-base font-bold text-foreground leading-tight">
                Upravit nabídku
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0 bg-card/80 hover:bg-card"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Content */}
          <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="flex-1 p-4 md:p-5 space-y-5 overflow-auto">
            {/* Job Info Card */}
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                  {getJobCategoryIcon()}
                </div>
                <h3 className="font-semibold text-foreground leading-tight">
                  {offer?.jobs?.title}
                </h3>
              </div>
              
              {/* Details Pills */}
              <div className="flex flex-wrap gap-2">
                {offer?.jobs?.city && (
                  <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 border border-border">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{offer.jobs.city}</span>
                  </div>
                )}
                {offer?.created_at && (
                  <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 border border-border">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">
                      {new Date(offer.created_at).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">
                  Navrhovaná cena (Kč) *
                </h3>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-background border-border rounded-xl h-11"
                  required
                />
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">
                  Odhadovaný čas dokončení
                </h3>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-11 justify-start text-left font-normal bg-background border-border rounded-xl",
                        !availabilityDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {availabilityDate ? format(availabilityDate, "d. MMMM yyyy", { locale: cs }) : "Vyberte datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100] bg-white" align="start" sideOffset={4}>
                    <CalendarPicker
                      mode="single"
                      selected={availabilityDate}
                      onSelect={setAvailabilityDate}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">
                  Osobní zpráva pro zákazníka *
                </h3>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Osobní zpráva pro zákazníka..."
                  className="bg-background border-border rounded-xl min-h-[100px] resize-none"
                  required
                />
              </div>

              {/* Portfolio Photos */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">
                  Fotky podobných prací
                </h3>
                <div className="mt-1.5 space-y-3">
                  {(existingPhotos.length > 0 || newPhotos.length > 0) && (
                    <div className="grid grid-cols-4 gap-2">
                      {/* Existing photos */}
                      {existingPhotos.map((photo, index) => (
                        <div key={`existing-${index}`} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                          <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {/* New photos */}
                      {newPhotos.map((photo, index) => (
                        <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden bg-muted group ring-1 ring-primary/50">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`New photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewPhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {existingPhotos.length + newPhotos.length < 5 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-border cursor-pointer transition-colors hover:border-border/80 hover:bg-muted/50 text-muted-foreground flex flex-col items-center justify-center gap-1">
                          <Upload className="h-5 w-5" />
                          <span className="text-xs font-medium text-center leading-tight">Přidat<br/>fotografie</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
                            multiple
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                        </label>
                      )}
                    </div>
                  )}
                  {existingPhotos.length === 0 && newPhotos.length === 0 && (
                    <label className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border-2 border-dashed border-border cursor-pointer transition-colors hover:border-border/80 hover:bg-muted/50 text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      <span className="text-xs font-medium">Přidat fotky (0/5)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons - stacked, matching JobEditDialog */}
            <div className="flex flex-col gap-3 pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 text-sm font-semibold rounded-full"
                disabled={updating}
              >
                {updating ? "Ukládání..." : "Uložit změny"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 text-sm font-semibold rounded-full bg-background hover:bg-muted text-foreground border-border"
                onClick={onClose}
              >
                Zrušit
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
