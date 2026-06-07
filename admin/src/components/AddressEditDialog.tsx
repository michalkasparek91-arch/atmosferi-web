import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";

interface AddressEditDialogProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const AddressEditDialog = ({ job, isOpen, onClose, onUpdated }: AddressEditDialogProps) => {
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job && isOpen) {
      // Parse existing address
      const fullAddress = job.full_address || "";
      const parts = fullAddress.split(",").map((p: string) => p.trim());
      
      if (parts.length >= 3) {
        // Try to parse "Street Number, PostalCode City, Country"
        const streetPart = parts[0] || "";
        const cityPart = parts[1] || "";
        
        // Split street into name and number
        const streetMatch = streetPart.match(/^(.+?)\s+(\d+\S*)$/);
        if (streetMatch) {
          setStreet(streetMatch[1]);
          setStreetNumber(streetMatch[2]);
        } else {
          setStreet(streetPart);
          setStreetNumber("");
        }
        
        // Split city part into postal code and city name
        const cityMatch = cityPart.match(/^(\d{3}\s?\d{2})\s+(.+)$/);
        if (cityMatch) {
          setPostalCode(cityMatch[1]);
          setCity(cityMatch[2]);
        } else {
          setCity(cityPart);
          setPostalCode("");
        }
      } else {
        setStreet("");
        setStreetNumber("");
        setCity(job.city || "");
        setPostalCode("");
      }
    }
  }, [job, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!street || !city || !streetNumber) {
      toast.error("Vyplňte ulici, číslo popisné a město");
      return;
    }

    setLoading(true);

    const fullAddress = [
      `${street}${streetNumber ? ` ${streetNumber}` : ""}`,
      `${postalCode ? `${postalCode} ` : ""}${city}`,
    ].filter(Boolean).join(", ");

    const { error } = await supabase
      .from("jobs")
      .update({
        full_address: fullAddress,
        city: city,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", job.id);

    setLoading(false);

    if (error) {
      toast.error("Nepodařilo se aktualizovat adresu");
      return;
    }

    toast.success("Adresa byla aktualizována");
    onUpdated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Upravit adresu
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AddressAutocompleteInput
            onSelect={(result) => {
              setStreet(result.streetName);
              setStreetNumber(result.streetNumber);
              setCity(result.city);
              setPostalCode(result.postalCode);
            }}
            placeholder="Začněte psát adresu..."
          />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="street" className="text-sm">Ulice *</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Hlavní"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="streetNumber" className="text-sm">Č.p. *</Label>
              <Input
                id="streetNumber"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                placeholder="123"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="city" className="text-sm">Město *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Praha"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postalCode" className="text-sm">PSČ</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="110 00"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Zrušit
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Ukládání..." : "Uložit adresu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
