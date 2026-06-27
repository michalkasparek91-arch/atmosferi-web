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
  const cleanKey = (k: string) => k ? k.trim().replace(/^Bearer\s+/i, "") : "";
  return {
    GEMINI_API_KEY: cleanKey(dbKeys.GEMINI_API_KEY || Deno.env.get("GEMINI_API_KEY")),
    GEMINI_FALLBACK_API_KEY: cleanKey(dbKeys.GEMINI_FALLBACK_API_KEY || Deno.env.get("GEMINI_FALLBACK_API_KEY")),
    
    OPENROUTER_API_KEY: cleanKey(dbKeys.OPENROUTER_API_KEY || Deno.env.get("OPENROUTER_API_KEY")),
    OPENROUTER_FALLBACK_API_KEY: cleanKey(dbKeys.OPENROUTER_FALLBACK_API_KEY || Deno.env.get("OPENROUTER_FALLBACK_API_KEY")),
    
    GROQ_API_KEY: cleanKey(dbKeys.GROQ_API_KEY || Deno.env.get("GROQ_API_KEY")),
    GROQ_FALLBACK_API_KEY: cleanKey(dbKeys.GROQ_FALLBACK_API_KEY || Deno.env.get("GROQ_FALLBACK_API_KEY")),
    
    GOOGLE_PLACES_API_KEY: cleanKey(dbKeys.GOOGLE_PLACES_API_KEY || Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY")),
    GOOGLE_PLACES_FALLBACK_API_KEY: cleanKey(dbKeys.GOOGLE_PLACES_FALLBACK_API_KEY || Deno.env.get("GOOGLE_PLACES_FALLBACK_API_KEY")),
    
    DEEPSEEK_API_KEY: cleanKey(dbKeys.DEEPSEEK_API_KEY || Deno.env.get("DEEPSEEK_API_KEY")),
    DEEPSEEK_FALLBACK_API_KEY: cleanKey(dbKeys.DEEPSEEK_FALLBACK_API_KEY || Deno.env.get("DEEPSEEK_FALLBACK_API_KEY")),
    
    SILICONFLOW_API_KEY: cleanKey(dbKeys.SILICONFLOW_API_KEY || Deno.env.get("SILICONFLOW_API_KEY")),
    SILICONFLOW_FALLBACK_API_KEY: cleanKey(dbKeys.SILICONFLOW_FALLBACK_API_KEY || Deno.env.get("SILICONFLOW_FALLBACK_API_KEY")),
    
    CEREBRAS_API_KEY: cleanKey(dbKeys.CEREBRAS_API_KEY || Deno.env.get("CEREBRAS_API_KEY")),
    CEREBRAS_FALLBACK_API_KEY: cleanKey(dbKeys.CEREBRAS_FALLBACK_API_KEY || Deno.env.get("CEREBRAS_FALLBACK_API_KEY")),
    
    MISTRAL_API_KEY: cleanKey(dbKeys.MISTRAL_API_KEY || Deno.env.get("MISTRAL_API_KEY")),
    MISTRAL_FALLBACK_API_KEY: cleanKey(dbKeys.MISTRAL_FALLBACK_API_KEY || Deno.env.get("MISTRAL_FALLBACK_API_KEY")),
  };
}
