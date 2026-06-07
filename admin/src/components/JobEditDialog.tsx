import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { geocodeAddress } from "@/lib/geocode-address";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { X, Upload, GripVertical } from "lucide-react";
import { getCategoryIcon as getIconForCategory } from "@/utils/categoryIcons";
import { compressJobPhoto } from "@/lib/image-compression";
import { generateId } from "@/lib/utils";

interface JobEditDialogProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated: () => void;
}

interface PhotoItem {
  url: string;
  file?: File;
  isNew: boolean;
}

export const JobEditDialog = ({ job, isOpen, onClose, onJobUpdated }: JobEditDialogProps) => {
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [streetName, setStreetName] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>(undefined);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [deadlineType, setDeadlineType] = useState<string>("asap");
  const [deadlineDate, setDeadlineDate] = useState<string>("");
  const [priceNote, setPriceNote] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (job && isOpen) {
      setIsInitialLoad(true);
      setDescription(job.description || "");
      setCity(job.city || "");
      setFullAddress(job.full_address || "");
      setCoordinates(job.latitude && job.longitude ? { lat: job.latitude, lng: job.longitude } : null);
      
      // Parse full_address into parts
      const addr = job.full_address || "";
      const addrMatch = addr.match(/^(.+?)\s+(\d+\S*)\s*,\s*(\d{3}\s?\d{2})\s+(.+)$/);
      if (addrMatch) {
        setStreetName(addrMatch[1]);
        setStreetNumber(addrMatch[2]);
        setPostalCode(addrMatch[3]);
        setCity(addrMatch[4]);
      } else {
        setStreetName("");
        setStreetNumber("");
        setPostalCode("");
        setCity(job.city || "");
      }
      setBudgetMax(job.budget_max ?? null);
      setCategoryId(job.category_id || undefined);
      setPhotoItems((job.photos || []).map((url: string) => ({ url, isNew: false })));
      setDeadlineType(job.deadline_type || "asap");
      setDeadlineDate(job.deadline_date ? new Date(job.deadline_date).toISOString().split('T')[0] : "");
      setPriceNote(job.price_note || "");
      
      if (job.category_id) {
        loadSubcategories(job.category_id).then(() => {
          setSubcategoryId(job.subcategory_id || undefined);
          setIsInitialLoad(false);
        });
      } else {
        setSubcategoryId(undefined);
        setIsInitialLoad(false);
      }
    }
  }, [job, isOpen]);

  const prevCategoryIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!isInitialLoad && categoryId && categoryId !== prevCategoryIdRef.current) {
      loadSubcategories(categoryId);
      setSubcategoryId(undefined);
    }
    prevCategoryIdRef.current = categoryId;
  }, [categoryId, isInitialLoad]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('service_categories')
      .select('*')
      .order('name');
    if (data) setCategories(data);
  };

  const loadSubcategories = async (catId: string) => {
    const { data } = await supabase
      .from('service_subcategories')
      .select('*')
      .eq('category_id', catId)
      .order('name');
    if (data) setSubcategories(data);
    return data;
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = getIconForCategory(iconName);
    return <IconComponent className="h-4 w-4" />;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: PhotoItem[] = files.map(file => ({
      url: URL.createObjectURL(file),
      file,
      isNew: true,
    }));
    setPhotoItems(prev => [...prev, ...newItems]);
    if (e.target) e.target.value = ''; // Reset for re-selection
  };

  const removePhoto = (index: number) => {
    setPhotoItems(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !categoryId || !subcategoryId || !streetNumber.trim()) {
      toast({
        title: "Chyba",
        description: !streetNumber.trim() 
          ? "Číslo popisné je povinné" 
          : "Prosím vyplňte všechna povinná pole",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Geocode the address from manual fields
    const coords = await geocodeAddress(streetName, streetNumber, city, postalCode);
    if (coords) setCoordinates(coords);

    // Upload new photos, keep existing URLs
    const finalUrls: string[] = [];
    for (const item of photoItems) {
      if (!item.isNew) {
        finalUrls.push(item.url);
      } else if (item.file) {
        try {
          const compressedFile = await compressJobPhoto(item.file as File);
          const fileExt = 'jpg';
          const fileName = `${generateId()}.${fileExt}`;
          const filePath = `${job.customer_id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('job-photos')
            .upload(filePath, compressedFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('job-photos')
            .getPublicUrl(filePath);

          finalUrls.push(publicUrl);
        } catch (err) {
          console.error('Individual photo upload failed during edit, skipping:', err);
        }
      }
    }

    const category = categories.find(c => c.id === categoryId);
    const subcategory = subcategories.find(s => s.id === subcategoryId);
    const generatedTitle = `${category?.name || ''} - ${subcategory?.name || ''}`;

    const { error } = await supabase
      .from('jobs')
      .update({
        title: generatedTitle,
        description,
        city: city || null,
        full_address: streetName && streetNumber && city
          ? `${streetName} ${streetNumber}, ${postalCode} ${city}`.trim()
          : fullAddress || null,
        latitude: coordinates?.lat ?? null,
        longitude: coordinates?.lng ?? null,
        budget_min: null,
        budget_max: budgetMax,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        photos: finalUrls,
        deadline_type: deadlineType,
        deadline_date: deadlineType === 'specific' && deadlineDate ? new Date(deadlineDate).toISOString() : null,
        price_note: priceNote || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat zakázku",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: "Zakázka byla úspěšně aktualizována",
    });

    onJobUpdated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="!max-w-full w-full h-full max-h-full m-0 p-0 rounded-none overflow-y-auto pb-20 md:pb-0 md:!max-w-[580px] md:w-[580px] md:h-auto md:max-h-[90vh] md:m-4 md:rounded-2xl md:overflow-auto border-0 md:border bg-card text-foreground">
        <div className="min-h-full md:min-h-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm md:text-base font-bold text-foreground leading-tight">
                Upravit poptávku
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
          <form onSubmit={handleSubmit} className="flex-1 p-4 md:p-5 space-y-5 overflow-auto">
            {/* Category */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-1">Kategorie *</h3>
              <Select 
                value={categoryId} 
                onValueChange={setCategoryId}
                key={`category-${categoryId}`}
              >
                <SelectTrigger className="bg-background border-border rounded-xl text-foreground font-medium">
                  <SelectValue placeholder="Vyberte kategorii" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(cat.icon)}
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            {categoryId && subcategories.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">Podkategorie *</h3>
                <Select 
                  value={subcategoryId} 
                  onValueChange={setSubcategoryId}
                  key={`subcategory-${categoryId}`}
                >
                  <SelectTrigger className="bg-background border-border rounded-xl text-foreground font-medium">
                    <SelectValue placeholder="Vyberte podkategorii" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {subcategories.map((subcat) => (
                      <SelectItem key={subcat.id} value={subcat.id}>
                        {subcat.name}
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
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  placeholder="Ulice"
                  className="bg-background border-border rounded-xl text-foreground font-medium"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">Č.p. *</h3>
                <Input
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  placeholder="123"
                  className="bg-background border-border rounded-xl text-foreground font-medium"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">Město *</h3>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Město"
                  className="bg-background border-border rounded-xl text-foreground font-medium"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500 mb-1">PSČ</h3>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="110 00"
                  className="bg-background border-border rounded-xl text-foreground font-medium"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-1">Popis zakázky *</h3>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Popište podrobnosti zakázky..."
                rows={3}
                maxLength={500}
                className="bg-background border-border rounded-xl text-foreground font-medium"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{description.length}/500</p>
            </div>

            {/* Deadline */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-1">Termín</h3>
              <Select value={deadlineType} onValueChange={setDeadlineType}>
                <SelectTrigger className="bg-background border-border rounded-xl text-foreground font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="asap">Co nejdříve</SelectItem>
                  <SelectItem value="agreement">Dle dohody</SelectItem>
                  <SelectItem value="specific">Konkrétní datum</SelectItem>
                </SelectContent>
              </Select>
              {deadlineType === 'specific' && (
                <Input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="bg-background border-border rounded-xl text-foreground font-medium mt-2"
                />
              )}
            </div>

            {/* Price Note */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-1">Poznámka k ceně</h3>
              <Input
                value={priceNote}
                onChange={(e) => setPriceNote(e.target.value)}
                placeholder="Např. cena závisí na rozsahu..."
                className="bg-background border-border rounded-xl text-foreground font-medium"
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
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Buttons - stacked, matching JobDetailsPopup */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-sm font-semibold rounded-full"
              >
                {loading ? "Ukládání..." : "Uložit změny"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="w-full h-12 text-sm font-semibold rounded-full bg-background hover:bg-muted text-foreground border-border"
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
