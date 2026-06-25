import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { getApiKeys } from "../_shared/api_keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const keys = await getApiKeys(supabase);

    const testGroq = async () => {
      const authKeys = [keys.GROQ_API_KEY, keys.GROQ_FALLBACK_API_KEY].filter(Boolean);
      if (authKeys.length === 0) return { engine: "groq", status: "error", message: "Missing API Key" };
      for (const ak of authKeys) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { "Authorization": `Bearer ${ak}` }
          });
          if (res.ok) return { engine: "groq", status: "ok" };
          if (res.status === 401 || res.status === 429) continue;
          return { engine: "groq", status: "error", message: `HTTP ${res.status}` };
        } catch (e: any) {
          return { engine: "groq", status: "error", message: e.message };
        }
      }
      return { engine: "groq", status: "error", message: "All keys failed (Unauthorized or Rate Limited)" };
    };

    const testOpenRouter = async () => {
      const authKeys = [keys.OPENROUTER_API_KEY, keys.OPENROUTER_FALLBACK_API_KEY].filter(Boolean);
      if (authKeys.length === 0) return { engine: "openrouter", status: "error", message: "Missing API Key" };
      for (const ak of authKeys) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
            headers: { "Authorization": `Bearer ${ak}` }
          });
          if (res.ok) return { engine: "openrouter", status: "ok" };
          if (res.status === 401 || res.status === 429) continue;
          return { engine: "openrouter", status: "error", message: `HTTP ${res.status}` };
        } catch (e: any) {
          return { engine: "openrouter", status: "error", message: e.message };
        }
      }
      return { engine: "openrouter", status: "error", message: "All keys failed" };
    };

    const testDeepSeek = async () => {
      const authKeys = [keys.DEEPSEEK_API_KEY, keys.DEEPSEEK_FALLBACK_API_KEY].filter(Boolean);
      if (authKeys.length === 0) return { engine: "deepseek", status: "error", message: "Missing API Key" };
      for (const ak of authKeys) {
        try {
          const res = await fetch("https://api.deepseek.com/models", {
            headers: { "Authorization": `Bearer ${ak}` }
          });
          if (res.ok) return { engine: "deepseek", status: "ok" };
          if (res.status === 401 || res.status === 429) continue;
          return { engine: "deepseek", status: "error", message: `HTTP ${res.status}` };
        } catch (e: any) {
          return { engine: "deepseek", status: "error", message: e.message };
        }
      }
      return { engine: "deepseek", status: "error", message: "All keys failed" };
    };

    const testSiliconFlow = async () => {
      const authKeys = [keys.SILICONFLOW_API_KEY, keys.SILICONFLOW_FALLBACK_API_KEY].filter(Boolean);
      if (authKeys.length === 0) return { engine: "siliconflow", status: "error", message: "Missing API Key" };
      for (const ak of authKeys) {
        try {
          const res = await fetch("https://api.siliconflow.cn/v1/user/info", {
            headers: { "Authorization": `Bearer ${ak}` }
          });
          if (res.ok) return { engine: "siliconflow", status: "ok" };
          if (res.status === 401 || res.status === 429) continue;
          return { engine: "siliconflow", status: "error", message: `HTTP ${res.status}` };
        } catch (e: any) {
          return { engine: "siliconflow", status: "error", message: e.message };
        }
      }
      return { engine: "siliconflow", status: "error", message: "All keys failed" };
    };

    const testGemini = async () => {
      const authKeys = [keys.GEMINI_API_KEY, keys.GEMINI_FALLBACK_API_KEY].filter(Boolean);
      if (authKeys.length === 0) return { engine: "gemini", status: "error", message: "Missing API Key" };
      for (const ak of authKeys) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${ak}`);
          if (res.ok) return { engine: "gemini", status: "ok" };
          if (res.status === 401 || res.status === 429) continue;
          return { engine: "gemini", status: "error", message: `HTTP ${res.status}` };
        } catch (e: any) {
          return { engine: "gemini", status: "error", message: e.message };
        }
      }
      return { engine: "gemini", status: "error", message: "All keys failed" };
    };

    const testPlaces = async () => {
      const authKeys = [keys.GOOGLE_PLACES_API_KEY, keys.GOOGLE_PLACES_FALLBACK_API_KEY].filter(Boolean);
      if (authKeys.length === 0) return { engine: "places", status: "error", message: "Missing API Key" };
      for (const ak of authKeys) {
        try {
          const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": ak,
                "X-Goog-FieldMask": "places.displayName"
            },
            body: JSON.stringify({ textQuery: "Google", languageCode: "en" })
          });
          if (res.ok) return { engine: "places", status: "ok" };
          if (res.status === 403 || res.status === 429) continue;
          return { engine: "places", status: "error", message: `HTTP ${res.status}` };
        } catch (e: any) {
          return { engine: "places", status: "error", message: e.message };
        }
      }
      return { engine: "places", status: "error", message: "All keys failed" };
    };

    const results = await Promise.all([
      testGroq(),
      testOpenRouter(),
      testDeepSeek(),
      testSiliconFlow(),
      testGemini(),
      testPlaces(),
    ]);

    const resultObj: Record<string, any> = {};
    for (const r of results) {
      resultObj[r.engine] = { status: r.status, message: r.message, updated_at: new Date().toISOString() };
    }

    // Save to DB
    await supabase.from("app_settings").upsert({
      key: "api_health",
      value: resultObj
    }, { onConflict: "key" });

    return new Response(JSON.stringify(resultObj), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
