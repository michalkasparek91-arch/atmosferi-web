import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface WorkerLocationMapProps {
  city: string;
}

export const WorkerLocationMap = ({ city }: WorkerLocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const initMap = async () => {
      if (!mapContainer.current) return;

      // Clean up any existing map first
      if (map.current) {
        try {
          map.current.remove();
        } catch (e) {
          // ignore
        }
        map.current = null;
      }

      // Get Mapbox token from Supabase secrets
      const { data } = await supabase.functions.invoke('get-mapbox-token');
      const token = data?.token || import.meta.env.VITE_MAPBOX_TOKEN;

      if (!token) {
        console.error('Mapbox token not found');
        if (isMounted) setLoading(false);
        return;
      }

      if (!isMounted) return;
      
      mapboxgl.accessToken = token;

      // Geocode the city to get coordinates
      const geocodeResponse = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?access_token=${token}&country=CZ`
      );
      const geocodeData = await geocodeResponse.json();

      if (!isMounted) return;

      if (!geocodeData.features || geocodeData.features.length === 0) {
        console.error('City not found');
        if (isMounted) setLoading(false);
        return;
      }

      const [lng, lat] = geocodeData.features[0].center;

      if (!isMounted || !mapContainer.current) return;

      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: 8,
      });

      map.current.on('load', () => {
        if (!map.current || !isMounted) return;

        // Add a marker for the city center
        new mapboxgl.Marker({ color: '#84cc16' })
          .setLngLat([lng, lat])
          .addTo(map.current);

        // Add a circle with 30km radius
        const radiusInMeters = 30000;
        const center = [lng, lat];
        const radius = radiusInMeters;
        const earthRadius = 6371000;
        
        const circleCoordinates = [];
        for (let i = 0; i <= 360; i += 360 / 64) {
          const angle = i * Math.PI / 180;
          const dx = radius * Math.cos(angle);
          const dy = radius * Math.sin(angle);
          const deltaLat = dy / earthRadius * (180 / Math.PI);
          const deltaLng = dx / (earthRadius * Math.cos(center[1] * Math.PI / 180)) * (180 / Math.PI);
          circleCoordinates.push([center[0] + deltaLng, center[1] + deltaLat]);
        }

        map.current.addSource('radius', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [circleCoordinates],
            },
            properties: {},
          },
        });

        map.current.addLayer({
          id: 'radius-fill',
          type: 'fill',
          source: 'radius',
          paint: {
            'fill-color': '#84cc16',
            'fill-opacity': 0.15,
          },
        });

        map.current.addLayer({
          id: 'radius-outline',
          type: 'line',
          source: 'radius',
          paint: {
            'line-color': '#84cc16',
            'line-width': 2,
          },
        });

        if (isMounted) {
          setLoading(false);
        }
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    };

    setLoading(true);
    initMap();

    return () => {
      isMounted = false;
      if (map.current) {
        try {
          map.current.remove();
          map.current = null;
        } catch (error) {
          console.error('Error removing map:', error);
        }
      }
    };
  }, [city]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-muted-foreground">Načítání mapy...</p>
        </div>
      )}
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 bg-background/90 px-3 py-2 rounded-lg text-sm shadow-lg">
        <p className="font-semibold">Pracovní oblast</p>
        <p className="text-muted-foreground text-xs">30km poloměr od {city}</p>
      </div>
    </div>
  );
};
