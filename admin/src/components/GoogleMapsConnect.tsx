import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search, MapPin, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

interface GoogleMapsConnectProps {
  placeId: string | null;
  rating: number | null;
  reviewsCount: number | null;
  mapsUrl: string | null;
  onConnect: (placeData: { place_id: string; rating: number; user_ratings_total: number; url: string }) => void;
  onDisconnect: () => void;
}

export const GoogleMapsConnect = ({ placeId, rating, reviewsCount, mapsUrl, onConnect, onDisconnect }: GoogleMapsConnectProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { action: 'search', query: searchQuery }
      });
      if (error) throw error;
      if (data.results) {
        setResults(data.results.slice(0, 5));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Nepodařilo se vyhledat firmu. Zkuste to znovu.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (place: any) => {
    try {
      setSearching(true);
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { action: 'details', placeId: place.place_id }
      });
      if (error) throw error;
      
      const details = data.result;
      if (details) {
        onConnect({
          place_id: details.place_id,
          rating: details.rating || place.rating,
          user_ratings_total: details.user_ratings_total || place.user_ratings_total,
          url: details.url || `https://www.google.com/maps/place/?q=place_id:${details.place_id}`
        });
        setResults([]);
        setSearchQuery("");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Chyba při stahování detailů firmy.");
    } finally {
      setSearching(false);
    }
  };

  if (placeId) {
    return (
      <div className="rounded-xl border border-border p-3 bg-white/50 dark:bg-white/5 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-sm border border-border/50">
              <img src="https://www.gstatic.com/images/branding/product/1x/maps_512dp.png" alt="Google Maps" className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold flex items-center gap-1">
                Propojeno s Google <CheckCircle className="h-3 w-3 text-emerald-500" />
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="font-bold text-foreground">{rating}</span>
                <span>({reviewsCount} recenzí)</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onDisconnect} className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
            Odpojit
          </Button>
        </div>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline block truncate">
            {mapsUrl}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input 
          placeholder="Název firmy (např. Tonda Malíř, Praha)" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 text-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={searching} className="h-9 px-3">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2 mt-2">
          {results.map((r) => (
            <div key={r.place_id} className="flex items-center justify-between p-2 rounded-lg border border-border hover:border-primary cursor-pointer transition-colors" onClick={() => handleSelect(r)}>
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {r.formatted_address}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold">
                {r.rating} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-muted-foreground font-normal ml-0.5">({r.user_ratings_total})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
