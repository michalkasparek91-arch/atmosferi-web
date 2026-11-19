import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TEST_EMAIL } from "@/lib/testEmail";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowUpRight, FlaskConical, Pencil, AlertTriangle } from "lucide-react";

const db = supabase as any;

type Template = {
 id: string; slug: string | null; name: string; subject: string | null; category: string | null; language: string | null;
 target_role: string | null; trigger_type: string | null; trigger_event: string | null; is_enabled: boolean;
 drip_series: string | null; drip_delay_days: number | null; sender_email: string | null;
};
type Stat = { template_slug: string; sent_total: number; sent_today: number; sent_7d: number; failed_7d: number; queued: number; last_sent_at: string | null };
type Group = "agency" | "acquisition" | "sequence" | "system" | "manual";
type Row = {
 key: string; group: Group; name: string; what: string; who: string; when: string; enabled: boolean;
 today: number | null; week: number | null; total: number | null; queued: number | null; failed: number;
 last: string | null; template?: Template;
};

const GROUPS: { id: Group; title: string; note: string }[] = [
 { id: "agency", title: "Oslovení agentur", note: "B2B nabídka spolupráce, vlastní seznam kontaktů." },
 { id: "acquisition", title: "Akvizice", note: "Studia a firmy z publika podle oboru a jazyka. Odesílá server ve sdíleném denním limitu." },
 { id: "sequence", title: "Sekvence", note: "Série e-mailů po registraci, každý v daný den." },
 { id: "system", title: "Systémové e-maily", note: "Odchází jednotlivě při události (registrace, poptávka, faktura…)." },
 { id: "manual", title: "Ruční a koncepty", note: "Neodchází samy. Odesíláš je z fronty." },
];
const CATEGORY: Record<string, string> = {
 architekti: "Architektonická studia", interiery: "Interiérová studia", developeri: "Developeři", urbanismus: "Urbanismus",
 architekt: "Samostatní architekti", stavebnictvi: "Stavební firmy", reality: "Reality", marketing: "Ostatní B2B",
};
const LANG: Record<string, string> = { cz: "CZ", cs: "CZ", sk: "SK", de: "DE", at: "AT", ch: "CH", en: "EN", pl: "PL", hu: "HU" };
const ROLE: Record<string, string> = { all: "Všichni uživatelé", worker: "Dodavatelé", customer: "Zákazníci" };
const EVENT: Record<string, string> = {
 signup: "registraci", registration: "registraci", user_signup: "registraci", job_created: "nové poptávce",
 new_job: "nové poptávce", invoice_created: "vystavení faktury", invoice_sent: "odeslání faktury", password_reset: "obnově hesla",
};
const n = (v: number | null | undefined) => (v === null || v === undefined ? "–" : v.toLocaleString("cs-CZ"));
const ago = (iso: string | null) => {
 if (!iso) return "zatím nic";
 const d = (Date.now() - new Date(iso).getTime()) / 86400e3;
 return d < 1 ? "dnes" : d < 2 ? "včera" : `před ${Math.floor(d)} dny`;
};

function classify(t: Template, dispatch: { enabled: boolean; daily_limit: number } | null): Pick<Row, "group" | "who" | "when"> {
 const lang = t.language ? LANG[t.language] || t.language.toUpperCase() : "";
 if (t.category === "lifecycle" && t.drip_series) {
  return { group: "sequence", who: `${ROLE[t.target_role || "all"] || t.target_role} · ${t.drip_series}`,
   when: `${t.drip_delay_days ?? 0}. den po registraci` };
 }
 if (t.trigger_type === "event") {
  const ev = t.trigger_event || "";
  return { group: "system", who: ROLE[t.target_role || "all"] || t.target_role || "Uživatelé",
   when: `Hned po ${EVENT[ev] || ev.replace(/_/g, " ") || "události"}` };
 }
 if (t.category && t.language && t.category !== "transactional" && t.category !== "lifecycle") {
  const who = `${CATEGORY[t.category] || t.category} · ${lang}`;
  if (t.trigger_type === "cron") return { group: "acquisition", who,
   when: dispatch?.enabled ? `Automaticky Po–Pá 8–19 · limit ${dispatch.daily_limit}/den pro celou akvizici` : "Automaticky, až se zapne rozesílání" };
  return { group: "manual", who, when: "Ručně z fronty" };
 }
 return { group: "manual", who: ROLE[t.target_role || "all"] || "–", when: "Ručně" };
}

export default function CampaignsOverview() {
 const navigate = useNavigate();
 const qc = useQueryClient();
 const [onlyActive, setOnlyActive] = useState(true);
 const [busy, setBusy] = useState<string | null>(null);

 const { data: templates = [] } = useQuery({
  queryKey: ["campaigns-templates"],
  queryFn: async () => {
   const { data, error } = await db.from("email_templates")
    .select("id,slug,name,subject,category,language,target_role,trigger_type,trigger_event,is_enabled,drip_series,drip_delay_days,sender_email")
    .order("name");
   if (error) throw error;
   return data as Template[];
  },
 });
 const { data: stats, isError: statsMissing } = useQuery({
  queryKey: ["campaigns-stats"],
  queryFn: async () => {
   const { data, error } = await db.rpc("admin_campaign_overview");
   if (error) throw error;
   return Object.fromEntries((data as Stat[]).map(s => [s.template_slug, s])) as Record<string, Stat>;
  },
  retry: false, refetchInterval: 60000,
 });
 const { data: dispatch } = useQuery({
  queryKey: ["email-dispatch-state"],
  queryFn: async () => {
   const { data, error } = await db.from("email_dispatch_state").select("enabled,provider,daily_limit,last_run_at,last_error,safety_paused").eq("id", 1).single();
   if (error) throw error;
   return data as { enabled: boolean; provider: string; daily_limit: number; last_run_at: string | null; last_error: string | null; safety_paused: boolean };
  },
  retry: false, refetchInterval: 30000,
 });
 const { data: audience } = useQuery({
  queryKey: ["campaigns-audience"],
  queryFn: async () => {
   const { data, error } = await supabase.functions.invoke("campaign-batcher", { body: { action: "get_batches" } });
   if (error || data?.error) return {} as Record<string, number>;
   return Object.fromEntries((data?.data || []).map((b: any) => [b.template?.id, b.total_audience])) as Record<string, number>;
  },
  staleTime: 5 * 60_000,
 });
 const { data: agency } = useQuery({
  queryKey: ["campaigns-agency"],
  queryFn: async () => {
   const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
   const week = new Date(Date.now() - 7 * 86400e3).toISOString();
   const [s, today, wk, total, queue, last, failed, intro] = await Promise.all([
    db.from("agency_outreach_settings").select("*").eq("id", 1).single(),
    db.from("agency_outreach_log").select("id", { count: "exact", head: true }).neq("kind", "test").eq("status", "sent").gte("sent_at", midnight.toISOString()),
    db.from("agency_outreach_log").select("id", { count: "exact", head: true }).neq("kind", "test").eq("status", "sent").gte("sent_at", week),
    db.from("agency_outreach_log").select("id", { count: "exact", head: true }).neq("kind", "test").eq("status", "sent"),
    db.from("agency_outreach_leads").select("id", { count: "exact", head: true }).eq("review_state", "ready").in("outreach_status", ["new", "queued"]),
    db.from("agency_outreach_log").select("sent_at").neq("kind", "test").eq("status", "sent").order("sent_at", { ascending: false }).limit(1),
    db.from("agency_outreach_log").select("id", { count: "exact", head: true }).eq("status", "failed").gte("sent_at", week),
    db.from("agency_outreach_templates").select("subject").eq("slug", "agency-intro-cs").maybeSingle(),
   ]);
   if (s.error) return null;
   return { settings: s.data, today: today.count || 0, week: wk.count || 0, total: total.count || 0, queue: queue.count || 0,
    last: last.data?.[0]?.sent_at || null, failed: failed.count || 0, subject: intro.data?.subject || "" };
  },
  refetchInterval: 60000,
 });

 const rows = useMemo<Row[]>(() => {
  const out: Row[] = [];
  if (agency) {
   const s = agency.settings;
   out.push({
    key: "agency", group: "agency", name: "Agentury · oslovení + připomenutí", what: agency.subject,
    who: `Digitální agentury CZ · ${n(agency.queue)} ve frontě`,
    when: s.enabled ? `Automaticky Po–Pá 8–17 · max ${s.daily_limit}/den${s.followup_enabled ? ` · připomenutí po ${s.followup_after_days} dnech` : ""}` : "Vypnuto",
    enabled: s.enabled, today: agency.today, week: agency.week, total: agency.total, queued: agency.queue, failed: agency.failed, last: agency.last,
   });
  }
  for (const t of templates) {
   const c = classify(t, dispatch || null);
   const st = t.slug ? stats?.[t.slug] : undefined;
   const aud = audience?.[t.id];
   out.push({
    key: t.id, group: c.group, name: t.name, what: t.subject || "", template: t, enabled: t.is_enabled,
    who: aud !== undefined && c.group === "acquisition" ? `${c.who} · ${n(aud)} k oslovení` : c.who, when: c.when,
    today: st ? Number(st.sent_today) : stats ? 0 : null, week: st ? Number(st.sent_7d) : stats ? 0 : null,
    total: st ? Number(st.sent_total) : stats ? 0 : null, queued: st ? Number(st.queued) : null,
    failed: st ? Number(st.failed_7d) : 0, last: st?.last_sent_at || null,
   });
  }
  return out;
 }, [templates, stats, dispatch, audience, agency]);

 const visible = rows.filter(r => !onlyActive || r.enabled);
 const activeAuto = rows.filter(r => r.enabled && (r.group === "agency" || r.group === "acquisition" || r.group === "sequence"));
 const todayTotal = rows.reduce((a, r) => a + (r.today || 0), 0);
 const weekTotal = rows.reduce((a, r) => a + (r.week || 0), 0);
 const failedTotal = rows.reduce((a, r) => a + (r.failed || 0), 0);

 async function test(r: Row) {
  setBusy("test-" + r.key);
  try {
   const { data, error } = r.group === "agency"
    ? await supabase.functions.invoke("dispatch-agency-emails", { body: { action: "test", slug: "agency-intro-cs" } })
    : await supabase.functions.invoke("send-template-test", { body: { slug: r.template?.slug, targetEmail: TEST_EMAIL } });
   if (error) { let m = error.message; try { m = (await (error as any).context?.json())?.error || m; } catch { /* keep */ } throw new Error(m); }
   const failed = (data?.results || []).find((x: any) => !x.success);
   if (failed) throw new Error(failed.error || "Odeslání selhalo");
   toast.success(`Test odeslán na ${TEST_EMAIL}`);
  } catch (e: any) { toast.error(e.message || "Test se nepodařilo odeslat"); }
  finally { setBusy(null); }
 }
 async function toggle(r: Row, on: boolean) {
  if (on && (r.group === "acquisition" || r.group === "agency")
   && !window.confirm(`Zapnout „${r.name}“? E-maily začnou automaticky odcházet skutečným kontaktům.`)) return;
  const { error } = r.group === "agency"
   ? await db.from("agency_outreach_settings").update({ enabled: on, updated_at: new Date().toISOString() }).eq("id", 1)
   : await db.from("email_templates").update({ is_enabled: on }).eq("id", r.key);
  if (error) return toast.error(error.message);
  toast.success(on ? "Zapnuto" : "Vypnuto");
  void qc.invalidateQueries({ queryKey: ["campaigns-templates"] });
  void qc.invalidateQueries({ queryKey: ["campaigns-agency"] });
 }
 const open = (r: Row) => r.group === "agency" ? navigate("/emaily/agentury")
  : navigate("/emaily/sablony", { state: { editTemplateId: r.key } });

 return <div className="space-y-5">
  {/* Status */}
  <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
   <div className="rounded-[20px] bg-white p-5 col-span-2">
    <div className="flex items-center gap-2 text-sm">
     <span className={`h-2 w-2 rounded-full ${dispatch?.safety_paused ? "bg-red-500" : dispatch?.enabled ? "bg-foreground" : "bg-neutral-300"}`} />
     <span className="font-medium">Akvizice: {dispatch?.safety_paused ? "pozastaveno kvůli doručitelnosti" : dispatch?.enabled ? `odesílá automaticky (${dispatch.provider})` : "rozesílání vypnuté"}</span>
    </div>
    <div className="flex items-center gap-2 text-sm mt-2">
     <span className={`h-2 w-2 rounded-full ${agency?.settings?.enabled ? "bg-foreground" : "bg-neutral-300"}`} />
     <span className="font-medium">Agentury: {agency?.settings?.enabled ? `odesílá automaticky, max ${agency.settings.daily_limit}/den` : "vypnuto"}</span>
    </div>
    <p className="text-xs text-muted-foreground mt-3">Vše odchází z {agency?.settings?.sender_email || "michal@atmosferi.com"}. Testy chodí na {TEST_EMAIL}.</p>
    {dispatch?.last_error && <p className="text-xs text-red-600 mt-2 flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />{dispatch.last_error}</p>}
   </div>
   <div className="rounded-[20px] bg-white p-5">
    <div className="text-xs text-muted-foreground">Odesláno dnes</div>
    <div className="text-[34px] leading-none font-medium tracking-tight mt-2 tabular-nums">{n(todayTotal)}</div>
    <div className="text-xs text-muted-foreground mt-2">{n(weekTotal)} za 7 dní</div>
   </div>
   <div className="rounded-[20px] bg-white p-5">
    <div className="text-xs text-muted-foreground">Běží automaticky</div>
    <div className="text-[34px] leading-none font-medium tracking-tight mt-2 tabular-nums">{activeAuto.length}</div>
    <div className={`text-xs mt-2 ${failedTotal ? "text-red-600" : "text-muted-foreground"}`}>{failedTotal ? `${failedTotal} chyb za 7 dní` : "bez chyb za 7 dní"}</div>
   </div>
  </div>
  {statsMissing && <p className="text-xs text-muted-foreground">Počty odeslaných se zobrazí po spuštění migrace 20261120090000_admin_campaign_overview.</p>}

  <div className="flex items-center justify-between gap-3">
   <h2 className="text-xl font-medium tracking-tight">Co komu kdy posíláme</h2>
   <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={onlyActive} onCheckedChange={setOnlyActive} />Jen zapnuté</label>
  </div>

  {GROUPS.map(g => {
   const list = visible.filter(r => r.group === g.id);
   if (!list.length) return null;
   return <section key={g.id} className="rounded-[20px] bg-white">
    <header className="px-5 pt-5 pb-3 flex flex-wrap items-baseline justify-between gap-2">
     <h3 className="text-base font-medium">{g.title} <span className="text-muted-foreground font-normal">· {list.length}</span></h3>
     <p className="text-xs text-muted-foreground">{g.note}</p>
    </header>
    <div className="hidden lg:grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.1fr)_150px_auto] gap-4 px-5 pb-2 text-xs text-muted-foreground">
     <span>Kampaň · co</span><span>Komu</span><span>Kdy</span><span className="text-right">Dnes · 7 dní · celkem</span><span className="w-[188px]" />
    </div>
    <ul>{list.map(r => <li key={r.key} className={`grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.1fr)_150px_auto] gap-x-4 gap-y-1 px-5 py-3.5 border-t border-neutral-100 items-center ${r.enabled ? "" : "opacity-55"}`}>
     <button className="text-left min-w-0 group" onClick={() => open(r)}>
      <div className="font-medium text-[15px] truncate flex items-center gap-1.5">{r.name}<ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 shrink-0" /></div>
      <div className="text-xs text-muted-foreground truncate">{r.what || "Bez předmětu"}</div>
     </button>
     <div className="text-sm min-w-0"><span className="lg:hidden text-xs text-muted-foreground">Komu: </span>{r.who}</div>
     <div className="text-sm min-w-0"><span className="lg:hidden text-xs text-muted-foreground">Kdy: </span>{r.enabled ? r.when : "Vypnuto"}
      <div className="text-xs text-muted-foreground">Naposledy {ago(r.last)}{r.queued ? ` · ${n(r.queued)} připraveno` : ""}{r.failed ? <span className="text-red-600"> · {r.failed} chyb</span> : null}</div></div>
     <div className="text-sm tabular-nums lg:text-right"><span className="font-medium">{n(r.today)}</span><span className="text-muted-foreground"> · {n(r.week)} · {n(r.total)}</span></div>
     <div className="flex items-center gap-1.5 lg:justify-end">
      <Button size="sm" variant="outline" disabled={busy !== null || (!r.template?.slug && r.group !== "agency")} onClick={() => void test(r)} title={`Poslat test na ${TEST_EMAIL}`}>
       <FlaskConical />{busy === "test-" + r.key ? "Posílám…" : "Test"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => open(r)} title={r.group === "agency" ? "Otevřít" : "Upravit šablonu"}><Pencil />{r.group === "agency" ? "Otevřít" : "Upravit"}</Button>
      <Switch checked={r.enabled} onCheckedChange={v => void toggle(r, v)} aria-label={r.enabled ? "Vypnout" : "Zapnout"} />
     </div>
    </li>)}</ul>
   </section>;
  })}
  {!visible.length && <p className="text-sm text-muted-foreground">Žádná zapnutá kampaň.</p>}
 </div>;
}
