// _shared/email_validation.ts
// Free email deliverability check: syntax + MX record lookup via DNS-over-HTTPS.
// No paid API. Uses fetch (dns.google) instead of Deno.resolveDns, which is not
// reliably available inside Supabase Edge Functions.

const SYNTAX_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Disposable / throwaway domains worth rejecting for B2B outreach.
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "trashmail.com", "yopmail.com", "getnada.com", "sharklasers.com", "temp-mail.org",
]);

// Cache MX results per domain for the lifetime of the function invocation.
const mxCache = new Map<string, boolean>();

export function hasValidSyntax(email: string): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (e.length > 254) return false;
  return SYNTAX_RE.test(e);
}

async function dohHasRecord(domain: string, type: "MX" | "A"): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
      { signal: controller.signal, headers: { accept: "application/dns-json" } }
    );
    if (!res.ok) return false;
    const json = await res.json();
    // Status 0 = NOERROR. Answer array holds records of the requested type.
    const wantType = type === "MX" ? 15 : 1;
    return Array.isArray(json.Answer) && json.Answer.some((a: any) => a.type === wantType);
  } catch {
    return false; // network/timeout — treat as "unknown", handled by caller
  } finally {
    clearTimeout(id);
  }
}

export async function domainHasMx(domain: string): Promise<boolean> {
  const d = (domain || "").toLowerCase().trim();
  if (!d) return false;
  if (mxCache.has(d)) return mxCache.get(d)!;
  let ok = await dohHasRecord(d, "MX");
  // Some domains accept mail on an A record without a dedicated MX.
  if (!ok) ok = await dohHasRecord(d, "A");
  mxCache.set(d, ok);
  return ok;
}

export type EmailCheck = { valid: boolean; reason: "ok" | "invalid_syntax" | "disposable" | "no_mx" };

export async function checkEmailDeliverable(email: string): Promise<EmailCheck> {
  if (!hasValidSyntax(email)) return { valid: false, reason: "invalid_syntax" };
  const domain = email.trim().toLowerCase().split("@")[1];
  if (DISPOSABLE.has(domain)) return { valid: false, reason: "disposable" };
  const ok = await domainHasMx(domain);
  return ok ? { valid: true, reason: "ok" } : { valid: false, reason: "no_mx" };
}
