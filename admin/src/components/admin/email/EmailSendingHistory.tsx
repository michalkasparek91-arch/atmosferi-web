import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, History, AlertTriangle } from "lucide-react";

/**
 * Historie odesílání — co kdy odešlo a s jakým výsledkem.
 *
 * Zdrojem je email_outbox. Stavy doručení (doručeno / otevřeno / proklik /
 * odmítnuto) plní webhooky poskytovatele. SMTP žádné webhooky neposílá,
 * takže u něj zůstane jen "odesláno" — komponenta na to upozorní, aby
 * prázdné sloupce nevypadaly jako chyba.
 */

type Row = {
  sent_at: string | null;
  template_slug: string | null;
  status: string | null;
  delivery_status: string | null;
  provider: string | null;
  error_message: string | null;
};

type DayStats = {
  den: string;
  odeslano: number;
  chyby: number;
  doruceno: number;
  otevreno: number;
  prokliky: number;
  odmitnuto: number;
  spam: number;
  sablony: Record<string, number>;
  chyboveHlasky: Record<string, number>;
};

const DAYS = 30;

export default function EmailSendingHistory() {
  // delivery_status a provider přibyly migrací, ale vygenerované typy
  // Supabase je neznají — proto netypovaný přístup.
  const db = supabase as any;
  const [openDay, setOpenDay] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["email-sending-history"],
    queryFn: async () => {
      const from = new Date();
      from.setDate(from.getDate() - DAYS);
      from.setHours(0, 0, 0, 0);
      const out: Row[] = [];
      for (let page = 0; ; page += 1000) {
        const { data, error } = await db
          .from("email_outbox")
          .select("sent_at, template_slug, status, delivery_status, provider, error_message")
          .gte("sent_at", from.toISOString())
          .order("sent_at", { ascending: false })
          .range(page, page + 999);
        if (error) throw error;
        out.push(...((data || []) as Row[]));
        if (!data || data.length < 1000) break;
      }
      return out;
    },
    refetchInterval: 120000,
  });

  const { dny, souhrn, maTracking } = useMemo(() => {
    const map = new Map<string, DayStats>();
    let tracking = 0;

    for (const r of rows) {
      if (!r.sent_at) continue;
      const den = new Date(r.sent_at).toLocaleDateString("sv-SE"); // YYYY-MM-DD
      let d = map.get(den);
      if (!d) {
        d = { den, odeslano: 0, chyby: 0, doruceno: 0, otevreno: 0, prokliky: 0,
              odmitnuto: 0, spam: 0, sablony: {}, chyboveHlasky: {} };
        map.set(den, d);
      }
      if (r.status === "failed") {
        d.chyby++;
        const msg = (r.error_message || "neznámá chyba").slice(0, 70);
        d.chyboveHlasky[msg] = (d.chyboveHlasky[msg] || 0) + 1;
      } else {
        d.odeslano++;
        const slug = r.template_slug || "(bez šablony)";
        d.sablony[slug] = (d.sablony[slug] || 0) + 1;
      }
      const ds = (r.delivery_status || "").toLowerCase();
      if (ds) tracking++;
      // delivery_status drží poslední stav, takže vyšší stav implikuje nižší
      if (["delivered", "opened", "clicked"].includes(ds)) d.doruceno++;
      if (["opened", "clicked"].includes(ds)) d.otevreno++;
      if (ds === "clicked") d.prokliky++;
      if (ds === "bounced") d.odmitnuto++;
      if (ds === "spam") d.spam++;
    }

    const dny = [...map.values()].sort((a, b) => b.den.localeCompare(a.den));
    const souhrn = dny.reduce((a, d) => ({
      odeslano: a.odeslano + d.odeslano, chyby: a.chyby + d.chyby,
      doruceno: a.doruceno + d.doruceno, otevreno: a.otevreno + d.otevreno,
      prokliky: a.prokliky + d.prokliky, odmitnuto: a.odmitnuto + d.odmitnuto,
    }), { odeslano: 0, chyby: 0, doruceno: 0, otevreno: 0, prokliky: 0, odmitnuto: 0 });

    return { dny, souhrn, maTracking: tracking > 0 };
  }, [rows]);

  const pct = (n: number, z: number) => (z > 0 ? `${Math.round((n / z) * 1000) / 10} %` : "—");
  const maxDen = Math.max(1, ...dny.map(d => d.odeslano + d.chyby));
  const bounceRate = souhrn.odeslano > 0 ? (souhrn.odmitnuto / souhrn.odeslano) * 100 : 0;

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-sky-500" />
          Historie odesílání
        </CardTitle>
        <CardDescription>Co odešlo za posledních {DAYS} dní a s jakým výsledkem</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : dny.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Za posledních {DAYS} dní nic neodešlo.</p>
        ) : (
          <>
            {/* Souhrn */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { l: "Odesláno", v: souhrn.odeslano.toLocaleString("cs-CZ") },
                { l: "Doručeno", v: maTracking ? pct(souhrn.doruceno, souhrn.odeslano) : "—" },
                { l: "Otevřeno", v: maTracking ? pct(souhrn.otevreno, souhrn.doruceno) : "—" },
                { l: "Prokliky", v: maTracking ? pct(souhrn.prokliky, souhrn.doruceno) : "—" },
                { l: "Chyby", v: souhrn.chyby.toLocaleString("cs-CZ") },
              ].map(m => (
                <div key={m.l} className="bg-muted/40 rounded-lg p-3">
                  <div className="text-[13px] text-muted-foreground">{m.l}</div>
                  <div className="text-2xl font-semibold tabular-nums">{m.v}</div>
                </div>
              ))}
            </div>

            {!maTracking && (
              <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                Sloupce doručení jsou prázdné, protože aktuální poskytovatel neposílá zpětné stavy.
                Doručeno, otevřeno a prokliky se začnou plnit po přepnutí na Brevo nebo SES.
              </p>
            )}

            {bounceRate >= 5 && (
              <p className="text-[11px] text-red-600 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Odmítnuto {Math.round(bounceRate * 10) / 10} % — nad hranicí 5 %. Sniž denní limit a dočisti databázi,
                jinak hrozí pozastavení účtu u poskytovatele.
              </p>
            )}

            {/* Denní řádky */}
            <div className="rounded-xl border border-border/40 divide-y divide-border/30 overflow-hidden">
              {dny.map(d => {
                const isOpen = openDay === d.den;
                const celkem = d.odeslano + d.chyby;
                return (
                  <div key={d.den}>
                    <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30"
                         onClick={() => setOpenDay(isOpen ? null : d.den)}>
                      <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      <span className="text-sm font-medium w-28 shrink-0">
                        {new Date(d.den).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", weekday: "short" })}
                      </span>
                      <div className="flex-1 min-w-0 hidden sm:block">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden max-w-sm">
                          <div className="h-full bg-emerald-500" style={{ width: `${(celkem / maxDen) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-sm tabular-nums shrink-0"><strong>{d.odeslano}</strong> odesláno</span>
                      {d.chyby > 0 && <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/30 shrink-0">{d.chyby} chyb</Badge>}
                      {maTracking && d.otevreno > 0 && (
                        <span className="text-[11px] text-muted-foreground shrink-0 hidden md:block">{pct(d.otevreno, d.doruceno)} otevřeno</span>
                      )}
                    </div>

                    {isOpen && (
                      <div className="px-5 py-3 bg-muted/10 text-xs space-y-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Podle šablony</div>
                          <div className="space-y-1">
                            {Object.entries(d.sablony).sort((a, b) => b[1] - a[1]).map(([slug, n]) => (
                              <div key={slug} className="flex justify-between gap-3">
                                <span className="font-mono text-[11px] truncate">{slug}</span>
                                <span className="tabular-nums shrink-0">{n}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {Object.keys(d.chyboveHlasky).length > 0 && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Chyby</div>
                            <div className="space-y-1">
                              {Object.entries(d.chyboveHlasky).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([msg, n]) => (
                                <div key={msg} className="flex justify-between gap-3 text-red-600">
                                  <span className="truncate">{msg}</span>
                                  <span className="tabular-nums shrink-0">{n}×</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {maTracking && (
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
                            <span>Doručeno: <strong className="text-foreground">{d.doruceno}</strong></span>
                            <span>Otevřeno: <strong className="text-foreground">{d.otevreno}</strong></span>
                            <span>Prokliky: <strong className="text-foreground">{d.prokliky}</strong></span>
                            <span>Odmítnuto: <strong className="text-foreground">{d.odmitnuto}</strong></span>
                            {d.spam > 0 && <span className="text-red-600">Spam: <strong>{d.spam}</strong></span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
