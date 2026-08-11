// Centrální AI router s fallback řetězcem (princip převzatý ze Zrobee).
//
// PROČ: dřív každá funkce volala jednoho providera napevno. Když mu došla kvóta
// (Gemini 429, Groq TPD, DeepSeek 402…), celý sběr i obohacování spadly na nulu.
// Router zkouší providery po sobě a NA KONCI je vždy Pollinations — veřejný,
// BEZ API KLÍČE a zdarma. Díky tomu pipeline nikdy neskončí na 0 kvůli kvótám.

export interface RouterAttempt { provider: string; ok: boolean; error?: string }
export interface RouterResult { text: string; provider: string; attempts: RouterAttempt[] }

// Modely, které v daném providerovi držíme jako výchozí (free tier friendly).
const DEFAULTS: Record<string, string> = {
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",

  openrouter: "openai/gpt-4o-mini",
  deepseek: "deepseek-chat",
  siliconflow: "Qwen/Qwen2.5-72B-Instruct",
  cerebras: "gpt-oss-120b",
  mistral: "mistral-large-latest",
  nvidia: "meta/llama-3.3-70b-instruct",
  pollinations: "openai",
};


const ENDPOINTS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  siliconflow: "https://api.siliconflow.com/v1/chat/completions",
  cerebras: "https://api.cerebras.ai/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
};

const KEY_NAMES: Record<string, [string, string]> = {
  gemini: ["GEMINI_API_KEY", "GEMINI_FALLBACK_API_KEY"],
  groq: ["GROQ_API_KEY", "GROQ_FALLBACK_API_KEY"],
  openrouter: ["OPENROUTER_API_KEY", "OPENROUTER_FALLBACK_API_KEY"],
  deepseek: ["DEEPSEEK_API_KEY", "DEEPSEEK_FALLBACK_API_KEY"],
  siliconflow: ["SILICONFLOW_API_KEY", "SILICONFLOW_FALLBACK_API_KEY"],
  cerebras: ["CEREBRAS_API_KEY", "CEREBRAS_FALLBACK_API_KEY"],
  mistral: ["MISTRAL_API_KEY", "MISTRAL_FALLBACK_API_KEY"],
  nvidia: ["NVIDIA_API_KEY", "NVIDIA_FALLBACK_API_KEY"],
};

// NVIDIA NIM odmítá response_format u části modelů → JSON vynucujeme promptem.
const NO_JSON_MODE = new Set(["nvidia"]);

async function postJson(url: string, headers: Record<string, string>, body: any, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

function openAiBody(provider: string, model: string, system: string, user: string, jsonMode: boolean) {
  const body: any = {
    model,
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    temperature: 0.2,
  };
  if (jsonMode && !NO_JSON_MODE.has(provider)) body.response_format = { type: "json_object" };
  return body;
}

/**
 * Zavolá první funkční AI z řetězce. `allowed` = providery povolené v nastavení
 * (v pořadí). Pollinations se přidává vždy na konec jako záchrana zdarma.
 */
export async function callAIWithFallback(opts: {
  supabase?: any;
  keys: Record<string, string>;
  allowed: string[];
  models?: Record<string, string>;
  system: string;
  user: string;
  jsonMode?: boolean;
  timeoutMs?: number;
  skipRecentlyFailed?: boolean;
}): Promise<RouterResult> {
  const { keys, allowed, models = {}, system, user } = opts;
  const jsonMode = opts.jsonMode !== false;
  const timeoutMs = opts.timeoutMs ?? 45000;
  const attempts: RouterAttempt[] = [];

  // Circuit breaker: přeskoč providery, kteří selhali v poslední hodině
  // (typicky vyčerpaná denní kvóta) — ať se run nezdržuje marnými pokusy.
  let skip = new Set<string>();
  if (opts.skipRecentlyFailed !== false && opts.supabase) {
    try {
      const { data } = await opts.supabase.from("app_settings").select("value").eq("key", "api_health").maybeSingle();
      const health = data?.value || {};
      const now = Date.now();
      for (const [p, h] of Object.entries<any>(health)) {
        if (h?.status === "error" && h?.updated_at && now - new Date(h.updated_at).getTime() < 60 * 60 * 1000) skip.add(p);
      }
    } catch { /* health nesmí shodit běh */ }
  }

  const chain = allowed.filter((p) => p !== "pollinations");
  const active = chain.filter((p) => !skip.has(p));
  // Když by se přeskočilo úplně vše, zkus přesto původní řetězec.
  const finalChain = [...(active.length > 0 ? active : chain), "pollinations"];

  let lastErr = "";
  for (const provider of finalChain) {
    const model = models[provider] || DEFAULTS[provider] || "";
    try {
      let text = "";

      if (provider === "pollinations") {
        // Veřejné, bez API klíče. Poslední záchrana — proto bez circuit breakeru.
        // POZOR: bez hlavičky Referer vrací 402 Payment Required (gate na anonymní
        // provoz). S referrerem projde běžný OpenAI-kompatibilní request.
        const res = await postJson("https://text.pollinations.ai/openai", { Referer: "https://atmosferi.cz" }, {
          model, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.2,
        }, timeoutMs);
        if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
        const data = await res.json();
        text = data.choices?.[0]?.message?.content?.trim() || "";
      } else if (provider === "gemini") {
        const authKeys = [keys[KEY_NAMES.gemini[0]], keys[KEY_NAMES.gemini[1]]].filter(Boolean);
        if (authKeys.length === 0) throw new Error("chybí API klíč");
        let ok = false; let err = "";
        for (const ak of authKeys) {
          const res = await postJson(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ak}`, {},
            { contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 8000 } },
            timeoutMs
          );
          if (res.ok) { const d = await res.json(); text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ""; ok = true; break; }
          err = `${res.status} ${(await res.text()).slice(0, 200)}`;
        }
        if (!ok) throw new Error(err);
      } else {
        const [k1, k2] = KEY_NAMES[provider] || [];
        const authKeys = [keys[k1], keys[k2]].filter(Boolean);
        if (authKeys.length === 0) throw new Error("chybí API klíč");
        const endpoint = ENDPOINTS[provider];
        if (!endpoint) throw new Error("neznámý provider");
        let ok = false; let err = "";
        for (const ak of authKeys) {
          const extra: Record<string, string> = { Authorization: `Bearer ${ak}` };
          if (provider === "openrouter") { extra["HTTP-Referer"] = "https://atmosferi.cz"; extra["X-Title"] = "Atmosferi CRM"; }
          const res = await postJson(endpoint, extra, openAiBody(provider, model, system, user, jsonMode), timeoutMs);
          if (res.ok) { const d = await res.json(); text = d.choices?.[0]?.message?.content?.trim() || ""; ok = true; break; }
          err = `${res.status} ${(await res.text()).slice(0, 200)}`;
          if (res.status !== 401 && res.status !== 429) break;
        }
        if (!ok) throw new Error(err);
      }

      if (!text) throw new Error("prázdná odpověď");
      attempts.push({ provider, ok: true });
      return { text, provider, attempts };
    } catch (e: any) {
      lastErr = `${provider}: ${e.message}`;
      attempts.push({ provider, ok: false, error: String(e.message).slice(0, 300) });
      console.warn(`[ai-router] ${provider} selhal → zkouším dalšího. ${e.message}`);
    }
  }
  throw new Error(`Celý AI řetězec selhal. Poslední chyba: ${lastErr}`);
}

/** Vytáhne JSON pole z odpovědi AI (zvládá markdown i objekt s vnořeným polem). */
export function parseJsonArray(raw: string): any[] {
  let t = (raw || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const fb = t.indexOf("["); const lb = t.lastIndexOf("]");
  if (fb !== -1 && lb !== -1 && lb > fb) t = t.substring(fb, lb + 1);
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed;
    const nested = Object.values(parsed).find((v) => Array.isArray(v));
    return (nested as any[]) || [];
  } catch { return []; }
}
