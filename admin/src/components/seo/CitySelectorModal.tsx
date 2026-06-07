import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Search } from "lucide-react";
import { TOP_CITIES, CITY_COORDINATES, cityToSlug } from "@/lib/city-regions";

interface CitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categorySlug: string;
}

const CitySelectorModal = ({ isOpen, onClose, categorySlug }: CitySelectorModalProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const allCities = Object.keys(CITY_COORDINATES).sort();
  const filteredCities = allCities.filter((city) =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCitySelect = (city: string) => {
    const citySlug = cityToSlug(city);
    navigate(`/sluzby/${categorySlug}/${citySlug}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Kde hledáte tuto službu?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              Vyberte město a my vám ukážeme ty nejlepší profesionály v okolí.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Select Top Cities */}
          <div className="space-y-4 mb-8">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Populární lokality</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TOP_CITIES.map((city) => (
                <Button
                  key={city}
                  variant="outline"
                  onClick={() => handleCitySelect(city)}
                  className="rounded-xl border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium py-6"
                >
                  {city}
                </Button>
              ))}
            </div>
          </div>

          {/* Search All Cities */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ostatní města</h4>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Hledat město..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-2xl border-border/60 focus-visible:ring-primary/20 transition-all bg-background/50 backdrop-blur-sm"
              />
            </div>
            
            <ScrollArea className="h-[200px] rounded-2xl border border-border/40 bg-background/30 px-1">
              <div className="p-2 grid grid-cols-1 gap-1">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-sm font-medium"
                    >
                      {city}
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Město nebylo nalezeno...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CitySelectorModal;
