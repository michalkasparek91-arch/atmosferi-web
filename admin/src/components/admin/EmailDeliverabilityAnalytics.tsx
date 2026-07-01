import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Send, MailCheck, Eye, MousePointerClick, AlertTriangle, Inbox, MailX } from 'lucide-react';

type OutboxRow = {
  template_slug: string | null;
  subject: string | null;
  status: string | null;
  delivery_status: string | null;
  sent_at: string | null;
};

type Campaign = {
  slug: string;
  title: string;
  lastSent: string | null;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  spam: number;
  unsubscribed: number;
};

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
const fmtPct = (n: number) => `${Math.round(n * 10) / 10}%`;

// delivery_status holds the LATEST terminal state per email, so a cumulative funnel
// counts every status at-or-beyond a given stage.
function aggregate(rows: OutboxRow[]): Campaign[] {
  const map = new Map<string, Campaign>();
  for (const r of rows) {
    const slug = r.template_slug || '(bez šablony)';
    let c = map.get(slug);
    if (!c) {
      c = { slug, title: r.subject || slug, lastSent: r.sent_at, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, spam: 0, unsubscribed: 0 };
      map.set(slug, c);
    }
    if (r.sent_at && (!c.lastSent || r.sent_at > c.lastSent)) { c.lastSent = r.sent_at; if (r.subject) c.title = r.subject; }
    c.sent++;
    const d = (r.delivery_status || '').toLowerCase();
    if (d === 'delivered' || d === 'opened' || d === 'clicked') c.delivered++;
    if (d === 'opened' || d === 'clicked') c.opened++;
    if (d === 'clicked') c.clicked++;
    if (d === 'bounced') c.bounced++;
    if (d === 'spam') c.spam++;
    if (d === 'unsubscribed') c.unsubscribed++;
  }
  return Array.from(map.values()).sort((a, b) => (b.lastSent || '').localeCompare(a.lastSent || ''));
}

const FunnelBar = ({ label, icon, count, base, prev }: { label: string; icon: React.ReactNode; count: number; base: number; prev: number }) => {
  const widthPct = Math.max(pct(count, base), 2);
  const step = prev > 0 ? pct(count, prev) : 100;
  return (
    <div className="grid grid-cols-[110px_1fr_96px] items-center gap-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</div>
      <div className="bg-muted/40 rounded-md h-7">
        <div className="h-full bg-sky-500 rounded-md transition-all" style={{ width: `${widthPct.toFixed(1)}%` }} />
      </div>
      <div className="text-right text-xs">
        <span className="font-semibold">{count.toLocaleString('cs-CZ')}</span>
        <span className="text-muted-foreground/70 ml-1">· {Math.round(step)}%</span>
      </div>
    </div>
  );
};

const HealthPill = ({ label, icon, value, capLabel, ok }: { label: string; icon: React.ReactNode; value: string; capLabel: string; ok: boolean }) => (
  <div className={`rounded-xl border px-3 py-2.5 ${ok ? 'border-emerald-500/40' : 'border-red-500/50'}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
      <span className={`text-[11px] ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{capLabel}</span>
    </div>
    <div className="text-lg font-semibold mt-0.5">{value}</div>
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-muted/40 rounded-lg p-3">
    <div className="text-[13px] text-muted-foreground">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

export default function EmailDeliverabilityAnalytics() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['email-deliverability-outbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_outbox')
        .select('template_slug, subject, status, delivery_status, sent_at')
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(20000);
      if (error) throw error;
      return aggregate((data || []) as OutboxRow[]);
    },
  });

  const active = useMemo(() => {
    if (!campaigns.length) return null;
    return campaigns.find(c => c.slug === selected) || campaigns[0];
  }, [campaigns, selected]);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-sky-500" />
          Doručitelnost kampaní
        </CardTitle>
        <CardDescription>Vyberte kampaň a zobrazte její trychtýř: odesláno → doručeno → otevřeno → prokliky</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">Zatím žádné odeslané e-maily v <code>email_outbox</code>.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
            {/* Campaign list */}
            <div className="flex flex-col gap-1.5 max-h-[440px] overflow-y-auto pr-1">
              {campaigns.map(c => {
                const isActive = active?.slug === c.slug;
                return (
                  <button
                    key={c.slug}
                    onClick={() => setSelected(c.slug)}
                    className={`text-left rounded-lg border px-3 py-2 transition-colors ${isActive ? 'border-sky-500/60 bg-sky-50 dark:bg-sky-950/20' : 'border-border/50 hover:bg-muted/40'}`}
                  >
                    <div className="text-sm font-medium truncate" title={c.title}>{c.title}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{c.sent.toLocaleString('cs-CZ')} odesláno</span>
                      <span>· {fmtPct(pct(c.opened, c.delivered))} open</span>
                      <span>· {fmtPct(pct(c.clicked, c.delivered))} click</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Funnel detail */}
            {active && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Metric label="Odesláno" value={active.sent.toLocaleString('cs-CZ')} />
                  <Metric label="Doručeno" value={fmtPct(pct(active.delivered, active.sent))} />
                  <Metric label="Open rate" value={fmtPct(pct(active.opened, active.delivered))} />
                  <Metric label="Click rate" value={fmtPct(pct(active.clicked, active.delivered))} />
                </div>

                <div className="flex flex-col gap-2.5">
                  <FunnelBar label="Odesláno"  icon={<Send className="h-3.5 w-3.5" />}              count={active.sent}      base={active.sent} prev={active.sent} />
                  <FunnelBar label="Doručeno"  icon={<MailCheck className="h-3.5 w-3.5" />}         count={active.delivered} base={active.sent} prev={active.sent} />
                  <FunnelBar label="Otevřeno"  icon={<Eye className="h-3.5 w-3.5" />}                count={active.opened}    base={active.sent} prev={active.delivered} />
                  <FunnelBar label="Prokliky"  icon={<MousePointerClick className="h-3.5 w-3.5" />} count={active.clicked}   base={active.sent} prev={active.opened} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <HealthPill label="Odmítnuto (bounce)" icon={<MailX className="h-3.5 w-3.5" />} value={fmtPct(pct(active.bounced, active.sent))} capLabel="do 5 %" ok={pct(active.bounced, active.sent) < 5} />
                  <HealthPill label="Spam / stížnosti" icon={<AlertTriangle className="h-3.5 w-3.5" />} value={fmtPct(pct(active.spam, active.sent))} capLabel="do 0,1 %" ok={pct(active.spam, active.sent) < 0.1} />
                  <HealthPill label="Odhlášení" icon={<MailX className="h-3.5 w-3.5" />} value={fmtPct(pct(active.unsubscribed, active.sent))} capLabel="informativní" ok={true} />
                </div>

                {active.delivered === 0 && active.sent > 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Žádná data o doručení — zkontrolujte, že webhook poskytovatele (Brevo/SES) zapisuje do <code>email_outbox.delivery_status</code>.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
