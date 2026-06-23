// _shared/api_keys.ts
// Helper for dynamically fetching API keys from the database, falling back to Deno.env

export async function getApiKeys(supabase: any) {
  // Read from database
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "api_keys")
    .maybeSingle();

  const dbKeys = (data?.value as Record<string, string>) || {};

  // Merge DB keys with Deno.env fallbacks
  return {
    GEMINI_API_KEY: (dbKeys.GEMINI_API_KEY || Deno.env.get("GEMINI_API_KEY") || "").trim(),
    OPENROUTER_API_KEY: (dbKeys.OPENROUTER_API_KEY || Deno.env.get("OPENROUTER_API_KEY") || "").trim(),
    GROQ_API_KEY: (dbKeys.GROQ_API_KEY || Deno.env.get("GROQ_API_KEY") || "").trim(),
    GOOGLE_PLACES_API_KEY: (dbKeys.GOOGLE_PLACES_API_KEY || Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY") || "").trim(),
    DEEPSEEK_API_KEY: (dbKeys.DEEPSEEK_API_KEY || Deno.env.get("DEEPSEEK_API_KEY") || "").trim(),
    SILICONFLOW_API_KEY: (dbKeys.SILICONFLOW_API_KEY || Deno.env.get("SILICONFLOW_API_KEY") || "").trim(),
  };
}
