import { supabase } from "@/integrations/supabase/client";

let cachedToken: string | null = null;

export const getMapboxToken = async (): Promise<string | null> => {
  if (cachedToken) return cachedToken;
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    if (!error && data?.token) {
      cachedToken = data.token;
      return cachedToken;
    }
  } catch (e) {
    console.error('Failed to fetch Mapbox token:', e);
  }
  return null;
};

export interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Forward-geocode a Czech address from manual fields.
 * Returns coordinates or null if geocoding fails.
 */
export const geocodeAddress = async (
  streetName: string,
  streetNumber: string,
  city: string,
  postalCode?: string
): Promise<GeocodeResult | null> => {
  const token = await getMapboxToken();
  if (!token) return null;

  // Build query string from available fields
  const parts: string[] = [];
  if (streetName) {
    parts.push(streetNumber ? `${streetName} ${streetNumber}` : streetName);
  }
  if (postalCode) parts.push(postalCode);
  if (city) parts.push(city);

  const query = parts.join(', ');
  if (!query || query.length < 3) return null;

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
      `access_token=${token}&country=cz&language=cs&limit=1`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
};
