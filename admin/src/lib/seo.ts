import { supabase } from "@/integrations/supabase/client";

/**
 * Pings IndexNow API via a Supabase Edge Function to notify search engines about new/updated content.
 * @param path The relative path to the content (e.g., '/radce/moje-clanek' or '/poptavka/oprava-staveb')
 */
export const pingIndexNow = async (path: string) => {
  try {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `https://zrobee.cz${normalizedPath}`;
    
    const { error } = await supabase.functions.invoke('indexnow-ping', {
      body: { urls: [url] }
    });
    
    if (error) throw error;
    console.log(`[IndexNow] Ping successful for ${url}`);
  } catch (err) {
    console.error(`[IndexNow] Ping failed for ${path}:`, err);
  }
};
