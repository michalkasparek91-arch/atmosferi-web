import { useState } from "react";
import { hapticTap } from "@/utils/haptics";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { compressCompletionPhoto } from "@/lib/image-compression";

interface JobCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  jobId: string;
  offerPrice?: number;
  onComplete: () => void;
  customerId?: string;
  workerName?: string;
  jobTitle?: string;
}

export const JobCompletionDialog = ({
  isOpen,
  onClose,
  offerId,
  jobId,
  offerPrice,
  onComplete,
  customerId,
  workerName,
  jobTitle
}: JobCompletionDialogProps) => {
  const [finalPrice, setFinalPrice] = useState(offerPrice?.toString() || "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    hapticTap();
    if (!finalPrice || photos.length === 0) {
      toast({
        title: "Chyba",
        description: "Vyplňte prosím finální cenu a přidejte alespoň jednu fotku",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const compressedPhoto = await compressCompletionPhoto(photo);
        const fileExt = 'jpg';
        const fileName = `${jobId}/${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('job-photos')
          .upload(fileName, compressedPhoto);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('job-photos')
          .getPublicUrl(fileName);

        photoUrls.push(publicUrl);
      }

      // Update job status to pending_approval (awaiting customer confirmation)
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: 'pending_approval',
          final_price: parseFloat(finalPrice),
          completion_photos: photoUrls
        })
        .eq('id', jobId);

      if (jobError) throw jobError;

      toast({
        title: "Úspěch",
        description: "Zakázka byla označena jako dokončená",
      });

      // Notify customer about job completion
      if (customerId) {
        try {
          await supabase.functions.invoke('notify-customer-job-completed', {
            body: {
              customerId,
              workerName,
              jobTitle,
              jobId,
              finalPrice: parseFloat(finalPrice)
            }
          });
        } catch (notifyError) {
          console.log('Failed to send push notification:', notifyError);
        }
      }

      onComplete();
      onClose();
    } catch (error) {
      console.error('Error completing job:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se dokončit zakázku",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-full max-h-full m-0 p-0 rounded-none md:w-auto md:h-auto md:max-w-2xl md:max-h-[90vh] md:m-4 md:rounded-2xl overflow-auto">
        <div className="min-h-full md:min-h-0 flex flex-col">
          <DialogHeader className="p-5 pb-4 border-b border-border/30 md:border-b-0">
            <DialogTitle className="text-xl font-bold">Dokončit zakázku</DialogTitle>
            <DialogDescription>
              Přidejte fotky dokončené práce a zadejte finální cenu
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 px-5 pb-5 space-y-6 overflow-auto">
            <div>
              <Label htmlFor="finalPrice">Finální cena (Kč)</Label>
              <Input
                id="finalPrice"
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder="Zadejte finální cenu"
                className="mt-2 h-11"
              />
            </div>

            <div>
              <Label>Fotky dokončené práce</Label>
              <div className="mt-2 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Přidat fotky
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button className="w-full h-11" onClick={handleSubmit} disabled={uploading}>
                {uploading ? "Odesílání..." : "Dokončit zakázku"}
              </Button>
              <Button variant="outline" className="w-full h-11" onClick={onClose} disabled={uploading}>
                Zrušit
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
