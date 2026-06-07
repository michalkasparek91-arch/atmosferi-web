import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { getMapboxToken } from "@/lib/geocode-address";
import { MapPin, Search, Loader2, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AddressSelectResult {
  streetName: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  onSelect: (result: AddressSelectResult) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  address?: string;
  center: [number, number];
  context?: Array<{ id: string; text: string; short_code?: string }>;
  place_type?: string[];
}

export const AddressAutocompleteInput = ({
  onSelect,
  placeholder = "Začněte psát adresu (ulice, město)...",
  defaultValue = "",
  className,
}: AddressAutocompleteProps) => {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [pendingFeature, setPendingFeature] = useState<MapboxFeature | null>(null);
  const [streetNumber, setStreetNumber] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const streetNumberRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const token = await getMapboxToken();
    if (!token) return;

    setLoading(true);
    try {
      // Use broader types and proximity bias to Czech Republic center for better street-first results
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?` +
        `access_token=${token}&country=cz&language=cs&limit=5` +
        `&types=address,place,locality,neighborhood` +
        `&autocomplete=true&fuzzyMatch=true` +
        `&proximity=15.4729,49.8175`
      );
      const data = await res.json();
      if (data.features) {
        setSuggestions(data.features);
        setIsOpen(data.features.length > 0);
        setSelectedIndex(-1);
      }
    } catch (e) {
      console.error("Address autocomplete error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setPendingFeature(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  const parseFeature = (feature: MapboxFeature, overrideStreetNumber?: string): AddressSelectResult => {
    const [lng, lat] = feature.center;
    const placeTypes = feature.place_type || [];
    const isNonAddress = placeTypes.some(t => ["place", "locality", "neighborhood"].includes(t));

    if (isNonAddress) {
      return {
        streetName: "",
        streetNumber: "",
        city: feature.text,
        postalCode: feature.context?.find(c => c.id.startsWith("postcode."))?.text || "",
        lat,
        lng,
      };
    }

    // Address type
    const city =
      feature.context?.find(c => c.id.startsWith("place."))?.text || "";
    const postalCode =
      feature.context?.find(c => c.id.startsWith("postcode."))?.text || "";

    return {
      streetName: feature.text || "",
      streetNumber: overrideStreetNumber || feature.address || "",
      city,
      postalCode,
      lat,
      lng,
    };
  };

  const handleSelect = (feature: MapboxFeature) => {
    const placeTypes = feature.place_type || [];
    const isAddress = placeTypes.includes("address");
    const hasStreetNumber = !!feature.address;

    // If it's an address type without a street number, prompt for it
    if (isAddress && !hasStreetNumber) {
      setPendingFeature(feature);
      setStreetNumber("");
      setQuery(feature.place_name);
      setIsOpen(false);
      setSuggestions([]);
      setTimeout(() => streetNumberRef.current?.focus(), 100);
      return;
    }

    const result = parseFeature(feature);
    setQuery(feature.place_name);
    setIsOpen(false);
    setSuggestions([]);
    setPendingFeature(null);
    onSelect(result);
  };

  const confirmStreetNumber = () => {
    if (!pendingFeature) return;
    const result = parseFeature(pendingFeature, streetNumber);
    setPendingFeature(null);
    setStreetNumber("");
    onSelect(result);
  };

  const skipStreetNumber = () => {
    if (!pendingFeature) return;
    const result = parseFeature(pendingFeature);
    setPendingFeature(null);
    setStreetNumber("");
    onSelect(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          className={cn("pl-9 pr-8", className)}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Street number prompt when address selected without number */}
      {pendingFeature && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5">
          <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={streetNumberRef}
            value={streetNumber}
            onChange={(e) => setStreetNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmStreetNumber();
              }
            }}
            placeholder="Číslo popisné (např. 42)"
            className="h-8 text-sm flex-1"
          />
          <button
            type="button"
            onClick={confirmStreetNumber}
            className="text-xs font-medium text-primary hover:text-primary/80 whitespace-nowrap px-2"
          >
            Potvrdit
          </button>
          <button
            type="button"
            onClick={skipStreetNumber}
            className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Přeskočit
          </button>
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((feature, i) => {
            const hasNumber = !!feature.address;
            const placeTypes = feature.place_type || [];
            const isPlace = placeTypes.some(t => ["place", "locality", "neighborhood"].includes(t));
            
            return (
              <li
                key={feature.id}
                onMouseDown={() => handleSelect(feature)}
                className={cn(
                  "flex items-start gap-2 px-3 py-2.5 cursor-pointer text-sm transition-colors",
                  i === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <MapPin className={cn(
                  "h-4 w-4 flex-shrink-0 mt-0.5",
                  isPlace ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <span className="line-clamp-2">{feature.place_name}</span>
                  {!isPlace && !hasNumber && (
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      Po výběru zadáte číslo popisné
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
