export type DomainStatus = "valid" | "invalid" | "unknown";
export async function validateMailDomain(domain: string, fetcher: typeof fetch = fetch): Promise<DomainStatus> {
  const d = domain.trim().toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) || d === "placeholder.zrobee.cz"
    || /(^|\.)(example\.(com|net|org)|invalid|test|localhost)$/.test(d)) return "invalid";
  const lookup = async (type: string) => {
    const r = await fetcher(`https://dns.google/resolve?name=${encodeURIComponent(d)}&type=${type}`,
      { signal: AbortSignal.timeout(4000), headers: { accept: "application/dns-json" } });
    if (!r.ok) throw new Error("DNS HTTP " + r.status);
    const data = await r.json();
    if (![0, 3].includes(data.Status)) throw new Error("Temporary DNS failure");
    return data;
  };
  try {
    const mx = await lookup("MX");
    if (mx.Status === 3) return "invalid";
    const records = (mx.Answer || []).filter((r: any) => r.type === 15);
    // RFC 7505 null MX explicitly rejects mail, even when an A record exists.
    if (records.some((r: any) => /^0\s+\.$/.test(r.data.trim()))) return "invalid";
    if (records.length) return "valid";
    for (const [type, code] of [["A", 1], ["AAAA", 28]] as const) {
      const result = await lookup(type);
      if ((result.Answer || []).some((r: any) => r.type === code)) return "valid";
    }
    return "invalid";
  } catch {
    // An outage is never proof that an address is valid or permanently invalid.
    return "unknown";
  }
}
