import { useEffect, useState, useMemo } from "react";
import { getMapboxToken } from "@/lib/geocode-address";
import { MapPin, ArrowRight } from "lucide-react";

interface Worker {
  city: string | null;
}

interface LocalCoverageMapProps {
  lat: number;
  lng: number;
  cityName: string;
  workers: Worker[];
}

const LocalCoverageMap = ({ lat, lng, cityName, workers }: LocalCoverageMapProps) => {
  const [token, setToken] = useState<string | null>(import.meta.env.VITE_MAPBOX_TOKEN || null);
  const [isTokenLoading, setIsTokenLoading] = useState(!token);

  useEffect(() => {
    if (!token) {
      getMapboxToken().then(t => {
        setToken(t);
        setIsTokenLoading(false);
      });
    }
  }, [token]);
  
  // Create privacy-safe worker pins with jitter
  const markers = useMemo(() => {
    // Show up to 15 workers to avoid URL length limits
    return workers.slice(0, 15).map((_, i) => {
      // Jitter within ~2km radius (0.018 degrees approx)
      const jitterLat = lat + (Math.random() - 0.5) * 0.03;
      const jitterLng = lng + (Math.random() - 0.5) * 0.03;
      return `pin-s+84cc16(${jitterLng},${jitterLat})`;
    }).join(",");
  }, [lat, lng, workers]);

  // Circle GeoJSON for 20km radius
  const circleGeoJson = useMemo(() => {
    const points = 32; // Reduced points to keep URL short
    const radius = 20; // km
    const coords = [];
    const kmInDegLat = 1 / 110.574;
    const kmInDegLng = 1 / (111.320 * Math.cos(lat * Math.PI / 180));

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * (2 * Math.PI);
      const pLat = lat + (radius * kmInDegLat) * Math.sin(angle);
      const pLng = lng + (radius * kmInDegLng) * Math.cos(angle);
      coords.push([pLng, pLat]);
    }

    return JSON.stringify({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coords],
      },
      properties: {
        "fill": "#84cc16",
        "fill-opacity": 0.1,
        "stroke": "#84cc16",
        "stroke-width": 2,
        "stroke-opacity": 0.5
      }
    });
  }, [lat, lng]);

  if (isTokenLoading) {
    return (
      <section className="mt-12 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm h-[300px] animate-pulse">
        <div className="w-full h-[250px] bg-muted flex items-center justify-center">
           <MapPin className="h-8 w-8 text-muted-foreground/30" />
        </div>
      </section>
    );
  }

  if (!token) {
    console.warn("Mapbox token not found, skipping map render");
    return null;
  }

  // Mapbox style: Neutral light style for better pin visibility
  const styleId = "light-v11";
  const username = "mapbox";
  
  // Path for overlay circle (using GeoJSON in the static images API is possible but has length limits)
  // For Static API, we can use "geojson(JSON_URL_ENCODED)"
  // However, simpler is just markers for now, or a very simple GeoJSON if it fits.
  // Let's use a simple city marker + worker pins.
  
  // Construct the Static Image URL - Responsive dimensions
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const width = isMobile ? 640 : 1200;
  const height = isMobile ? 400 : 450;
  const zoom = isMobile ? 11.2 : 11.5;
  
  // Encoded GeoJSON for the circle
  const encodedGeoJson = encodeURIComponent(circleGeoJson);
  
  // City center marker + worker markers
  const cityMarker = `pin-l+064e3b(${lng},${lat})`;
  const allMarkers = markers ? `${cityMarker},${markers}` : cityMarker;
  
  // Mapbox Static Image URL - Include both the circle overlay and markers
  // Use @2x only on non-mobile or high-DPI to save bandwidth on mobile FCP/LCP
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio > 1.5 ? '@2x' : '';
  const mapUrl = `https://api.mapbox.com/styles/v1/${username}/${styleId}/static/geojson(${encodedGeoJson}),${allMarkers}/${lng},${lat},${zoom}/${width}x${height}${dpr}?access_token=${token}&logo=false&attribution=false`;

  // Native map link
  const nativeMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cityName}`)}&zoom=12`;

  return (
    <section className="mt-12 overflow-hidden rounded-3xl border border-border/60 shadow-sm relative">
      <a 
        href={nativeMapUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="relative block h-[300px] md:h-[400px] w-full group overflow-hidden"
      >
        <img 
          src={mapUrl} 
          alt={`Mapa pokrytí služeb v oblasti ${cityName}`}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Top Floating Badge */}
        <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-sm border border-primary/20 px-4 py-1.5 shadow-lg">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wide text-foreground">
            Služba je dostupná
          </span>
        </div>

        {/* Bottom Floating Info Banner (Replaces the white footer) */}
        <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-background/80 backdrop-blur-md border border-white/20 shadow-md flex items-center justify-between gap-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Lokální dostupnost</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                Specialisté v oblasti <strong>{cityName}</strong> a okolí do 30 km.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            Otevřít <ArrowRight className="h-3 w-3" />
          </div>
        </div>

        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
      </a>
    </section>
  );
};

export default LocalCoverageMap;
