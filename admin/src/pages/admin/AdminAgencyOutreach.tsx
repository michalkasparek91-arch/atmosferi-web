import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
 BriefcaseBusiness, Upload, Search, Save, ExternalLink, RefreshCw, Send, FlaskConical, Eye, Clock, AlertTriangle, Zap,
} from "lucide-react";

type Lead = {
 id: string; source_id: string; company_name: string; contact_name: string | null;
 email: string; website: string | null; city: string | null; region: string | null;
 priority: string; review_state: string; outreach_status: string; notes: string;
 last_contacted_at: string | null; followup_sent_at: string | null; sent_count: number | null; last_error: string | null;
};
type Template = { slug: string; name: string; subject: string; body: string };
type Settings = {
 enabled: boolean; daily_limit: number; followup_enabled: boolean; followup_after_days: number;
 sender_email: string; sender_name: string; test_email: string; last_run_at: string | null; last_error: string | null;
};
type LogRow = { id: string; kind: string; email: string; subject: string; status: string; error: string | null; sent_at: string };

const db = supabase as any;
const INTRO = "agency-intro-cs", FOLLOW = "agency-followup-cs";
// Monochrome: the further in the pipeline, the darker the pill.
const STATUS: Record<string, { label: string; cls: string }> = {
 new: { label: "Ve frontě", cls: "bg-neutral-100 text-neutral-500" },
 queued: { label: "Ve frontě", cls: "bg-neutral-100 text-neutral-500" },
 sent: { label: "Osloven", cls: "bg-neutral-200 text-neutral-800" },
 opened: { label: "Otevřel", cls: "bg-neutral-200 text-neutral-800" },
 replied: { label: "Odpověděl", cls: "bg-neutral-800 text-white" },
 meeting: { label: "Schůzka", cls: "bg-black text-white" },
 won: { label: "Spolupráce", cls: "bg-black text-white" },
 not_interested: { label: "Nemá zájem", cls: "border border-neutral-300 text-neutral-500" },
 do_not_contact: { label: "Neoslovovat", cls: "border border-red-200 text-red-600" },
};
const STATUS_SELECT = ["new", "sent", "opened", "replied", "meeting", "won", "not_interested", "do_not_contact"];

// ---------- CSV import (unchanged format: firma, email, id, …) ----------
function parseCsv(text: string): string[][] {
 const source = text.replace(/^﻿/, "");
 const delimiter = source.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
 const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
 for (let i = 0; i < source.length; i++) {
  const ch = source[i];
  if (ch === '"') { if (quoted && source[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
  else if (ch === delimiter && !quoted) { row.push(cell); cell = ""; }
  else if ((ch === "\n" || ch === "\r") && !quoted) {
   if (ch === "\r" && source[i + 1] === "\n") i++;
   row.push(cell); cell = ""; if (row.some(v => v.trim())) rows.push(row); row = [];
  } else cell += ch;
 }
 row.push(cell); if (row.some(v => v.trim())) rows.push(row);
 return rows;
}
function mapCsv(csv: string, review: boolean): Record<string, unknown>[] {
 const rows = parseCsv(csv); if (!rows.length) throw new Error("Prázdný CSV soubor");
 const header = rows.shift()!.map(v => v.toLowerCase().trim());
 for (const required of ["firma", "email", "id"]) if (!header.includes(required)) throw new Error("CSV postrádá sloupec: " + required);
 const index = (row: string[], col: string) => row[header.indexOf(col)]?.trim() || "";
 const seen = new Set<string>(); const output: Record<string, unknown>[] = [];
 for (const row of rows) {
  const email = index(row, "email").toLowerCase(), sourceId = index(row, "id");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !sourceId || seen.has(sourceId)) continue;
  seen.add(sourceId);
  const old = index(row, "stav").toLowerCase(), oldEmail = index(row, "email_stav").toLowerCase();
  const status = ["odeslano", "otevreno"].includes(oldEmail) ? (oldEmail === "otevreno" ? "opened" : "sent")
   : old === "osloven" ? "sent" : old === "ve_fronte" ? "queued" : "new";
  output.push({
   source_id: sourceId, company_name: index(row, "firma"), contact_name: index(row, "jmeno") || null,
   email, website: index(row, "web") || null, city: index(row, "mesto") || null, region: index(row, "kraj") || null,
   priority: review ? "REVIEW" : index(row, "priorita") === "A" ? "A" : "B",
   review_state: review ? "review" : "ready", outreach_status: status,
   source_status: old || null, source_email_status: oldEmail || null,
   source_reason: index(row, "duvod") || null, source_name: index(row, "zdroj") || "csv-import",
   notes: index(row, "kontaktovat_poznamka"),
  });
 }
 return output;
}

const cleanCompany = (name: string) => name.replace(/\s*\(.*?\)/g, "")
 .replace(/,?\s*\b(s\.?\s*r\.?\s*o\.?|spol\.?\s*s\s*r\.?\s*o\.?|a\.?\s*s\.?|z\.?\s*s\.?|v\.?\s*o\.?\s*s\.?|k\.?\s*s\.?)(?!\w)/gi, "")
 .replace(/[,\s]+$/, "").trim() || name;
const personalized = (input: string, lead: Lead | null) =>
 input.replace(/\{\{\s*firma\s*\}\}/g, lead ? cleanCompany(lead.company_name) : "vaší agenturou");
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";

async function callSender(body: Record<string, unknown>) {
 const { data, error } = await supabase.functions.invoke("dispatch-agency-emails", { body });
 if (error) {
  let msg = error.message;
  try { const j = await (error as any).context?.json(); msg = j?.error || msg; } catch { /* keep message */ }
  throw new Error(msg);
 }
 return data;
}

function Pill({ status }: { status: string }) {
 const s = STATUS[status] || { label: status, cls: "bg-muted" };
 return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}
function LeadPhone({ notes }: { notes: string }) {
 const phone = notes?.match(/^Telefon: (\+?[\d(). -]{8,30})$/m)?.[1];
 if (!phone) return null;
 return <a className="block w-fit text-xs text-muted-foreground hover:underline" href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>;
}
const LEAD_CATEGORIES = ["Marketingová agentura", "Architektonické studio", "Realitní developer"];
function LeadCategory({ notes }: { notes: string }) {
 const category = notes?.match(/^Obor: ([^\r\n]+)/m)?.[1];
 if (!category) return null;
 const specialty = notes.match(/^Specializace: ([^\r\n]+)/m)?.[1];
 const needsReview = notes.includes("Zařazení: Specializace k ověření");
 return <div className="text-xs text-muted-foreground">{[category, specialty, needsReview ? "Specializace k ověření" : null].filter(Boolean).join(" · ")}</div>;
}
function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
 return <div className="rounded-2xl bg-neutral-100 px-4 py-3">
  <div className="text-xs text-muted-foreground">{label}</div>
  <div className="text-2xl font-medium tracking-tight tabular-nums mt-1">{value}</div>
  {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
 </div>;
}

export default function AdminAgencyOutreach({ embedded = false }: { embedded?: boolean }) {
 const [leads, setLeads] = useState<Lead[]>([]);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(0);
 const [search, setSearch] = useState("");
 const [tab, setTab] = useState("ready");
 const [priority, setPriority] = useState("all");
 const [leadCategory, setLeadCategory] = useState("");
 const [status, setStatus] = useState("all");
 const [loading, setLoading] = useState(false);
 const [importing, setImporting] = useState(false);
 const [templates, setTemplates] = useState<Record<string, Template>>({});
 const [settings, setSettings] = useState<Settings | null>(null);
 const [counts, setCounts] = useState<Record<string, number>>({});
 const [sentToday, setSentToday] = useState(0);
 const [log, setLog] = useState<LogRow[]>([]);
 const [busy, setBusy] = useState<string | null>(null);
 const [previewId, setPreviewId] = useState<string | null>(null);
 const preview = useMemo(() => leads.find(x => x.id === previewId) || null, [leads, previewId]);

 const loadLeads = useCallback(async () => {
  setLoading(true);
  try {
   let q = db.from("agency_outreach_leads").select("*", { count: "exact" }).eq("review_state", tab);
   if (leadCategory) q = q.ilike("notes", `%Obor: ${leadCategory}%`);
   if (priority !== "all" && tab === "ready") q = q.eq("priority", priority);
   if (status !== "all") q = status === "new" ? q.in("outreach_status", ["new", "queued"]) : q.eq("outreach_status", status);
   if (search.trim()) {
    const safe = search.trim().replace(/[%_,()]/g, " ").slice(0, 100);
    q = q.or(`company_name.ilike.%${safe}%,email.ilike.%${safe}%,city.ilike.%${safe}%,notes.ilike.%${safe}%`);
   }
   const { data, count, error } = await q.order("priority", { ascending: true }).order("company_name").range(page * 50, page * 50 + 49);
   if (error) throw error;
   setLeads(data || []); setTotal(count || 0);
  } catch (e: any) { toast.error(e.message || "Nelze načíst agentury"); }
  finally { setLoading(false); }
 }, [page, search, tab, priority, status, leadCategory]);

 const loadOverview = useCallback(async () => {
  const keys = ["new", "queued", "sent", "opened", "replied", "meeting", "won", "not_interested", "do_not_contact"];
  const res = await Promise.all(keys.map(k => db.from("agency_outreach_leads").select("id", { count: "exact", head: true })
   .eq("review_state", "ready").eq("outreach_status", k)));
  const review = await db.from("agency_outreach_leads").select("id", { count: "exact", head: true }).eq("review_state", "review");
  const followed = await db.from("agency_outreach_leads").select("id", { count: "exact", head: true }).not("followup_sent_at", "is", null);
  const c: Record<string, number> = {}; keys.forEach((k, i) => { c[k] = res[i].count || 0; });
  c.review = review.count || 0; c.followed = followed.count || 0;
  setCounts(c);
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const today = await db.from("agency_outreach_log").select("id", { count: "exact", head: true })
   .neq("kind", "test").eq("status", "sent").gte("sent_at", midnight.toISOString());
  setSentToday(today.count || 0);
  const { data: s, error: sErr } = await db.from("agency_outreach_settings").select("*").eq("id", 1).single();
  if (sErr) toast.error("Chybí nastavení automatizace – spusť migraci 20261119230000."); else setSettings(s);
  const { data: l } = await db.from("agency_outreach_log").select("*").order("sent_at", { ascending: false }).limit(100);
  setLog(l || []);
 }, []);

 useEffect(() => { void loadLeads(); }, [loadLeads]);
 useEffect(() => {
  void loadOverview();
  db.from("agency_outreach_templates").select("*").in("slug", [INTRO, FOLLOW]).then(({ data, error }: any) => {
   if (error) return toast.error(error.message);
   setTemplates(Object.fromEntries((data || []).map((t: Template) => [t.slug, t])));
  });
 }, [loadOverview]);
 const refresh = () => { void loadLeads(); void loadOverview(); };

 async function patchLead(id: string, values: Partial<Lead>) {
  const { error } = await db.from("agency_outreach_leads").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) toast.error(error.message); else { toast.success("Uloženo"); refresh(); }
 }
 async function saveSettings(values: Partial<Settings>) {
  if (!settings) return;
  const next = { ...settings, ...values }; setSettings(next);
  const { error } = await db.from("agency_outreach_settings").update({ ...values, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) { toast.error(error.message); void loadOverview(); }
  else if ("enabled" in values) toast.success(values.enabled ? "Automatické odesílání zapnuto" : "Automatické odesílání vypnuto");
 }
 async function importFile(file: File, review: boolean) {
  setImporting(true);
  try {
   const rows = mapCsv(await file.text(), review);
   if (!rows.length) throw new Error("Nenalezeny platné e-maily.");
   if (!window.confirm(`Importovat ${rows.length} kontaktů do sekce ${review ? "K prověření" : "K oslovení"}? Duplicitní ID se aktualizují.`)) return;
   for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from("agency_outreach_leads").upsert(rows.slice(i, i + 100), { onConflict: "source_id" });
    if (error) throw new Error(`Import skončil na řádku ${i + 1}: ${error.message}`);
   }
   toast.success(`Naimportováno ${rows.length} kontaktů.`);
   setTab(review ? "review" : "ready"); setPage(0); refresh();
  } catch (e: any) { toast.error(e.message || "Import se nezdařil"); }
  finally { setImporting(false); }
 }
 async function saveTemplate(slug: string) {
  const t = templates[slug]; if (!t) return;
  const { error } = await db.from("agency_outreach_templates").update({ subject: t.subject, body: t.body, updated_at: new Date().toISOString() }).eq("slug", slug);
  error ? toast.error(error.message) : toast.success("Šablona uložena");
 }
 async function run(key: string, body: Record<string, unknown>, ok: (d: any) => string) {
  setBusy(key);
  try { const d = await callSender(body); toast.success(ok(d)); }
  catch (e: any) { toast.error(e.message || "Odeslání selhalo"); }
  finally { setBusy(null); refresh(); }
 }
 const testTemplate = (slug: string, lead?: Lead | null) => {
  const t = templates[slug];
  return run(`test-${slug}-${lead?.id || ""}`, { action: "test", slug, subject: t?.subject, body: t?.body, company_name: lead?.company_name },
   d => `Test odeslán na ${d?.to || settings?.test_email}`);
 };
 const nextKind = (l: Lead) => ["sent", "opened"].includes(l.outreach_status) ? FOLLOW : INTRO;
 const canSend = (l: Lead) => l.review_state === "ready" && (["new", "queued"].includes(l.outreach_status)
  || (["sent", "opened"].includes(l.outreach_status) && !l.followup_sent_at));

 const queue = (counts.new || 0) + (counts.queued || 0);
 const contacted = (counts.sent || 0) + (counts.opened || 0) + (counts.replied || 0) + (counts.meeting || 0) + (counts.won || 0) + (counts.not_interested || 0);
 const answered = (counts.replied || 0) + (counts.meeting || 0) + (counts.won || 0) + (counts.not_interested || 0);
 const days = settings ? Math.ceil(queue / Math.max(1, settings.daily_limit)) : 0;

 const csvUpload = (review: boolean) => <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
  <Upload className="h-4 w-4" />{importing ? "Importuji…" : review ? "CSV k prověření" : "CSV k oslovení"}
  <input type="file" accept=".csv,text/csv" className="hidden" disabled={importing} onChange={e => { const f = e.target.files?.[0]; if (f) void importFile(f, review); e.target.value = ""; }} />
 </label>;

 const templateEditor = (slug: string, title: string, note: string) => {
  const t = templates[slug];
  if (!t) return <Card><CardContent className="p-5 text-sm text-muted-foreground">Šablona {slug} chybí – spusť migraci.</CardContent></Card>;
  return <Card><CardContent className="p-5 space-y-3">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <div><h3 className="font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{note}</p></div>
    <div className="flex gap-2">
     <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void testTemplate(slug)}>
      <FlaskConical className="h-4 w-4 mr-1.5" />{busy === `test-${slug}-` ? "Posílám…" : "Test"}
     </Button>
     <Button size="sm" onClick={() => void saveTemplate(slug)}><Save className="h-4 w-4 mr-1.5" />Uložit</Button>
    </div>
   </div>
   <Input value={t.subject} onChange={e => setTemplates({ ...templates, [slug]: { ...t, subject: e.target.value } })} aria-label="Předmět" />
   <Textarea rows={13} value={t.body} onChange={e => setTemplates({ ...templates, [slug]: { ...t, body: e.target.value } })} aria-label="Text e-mailu" className="font-sans text-sm" />
   <p className="text-[11px] text-muted-foreground">Proměnné: <code>{"{{firma}}"}</code> (název bez s.r.o.), <code>{"{{jmeno}}"}</code>. Na konec se automaticky přidá řádek pro odhlášení. Test posílá aktuální (i neuložený) text na {settings?.test_email || "testovací adresu"}.</p>
  </CardContent></Card>;
 };

 return <div className="space-y-5">
  {!embedded && <AdminPageHeader icon={BriefcaseBusiness} title="Agentury"
   subtitle={settings ? `Odesílá ${settings.sender_name} <${settings.sender_email}>` : "Oslovení digitálních agentur"}
   actions={<Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-2" />Obnovit</Button>} />}

  {/* Automation */}
  {settings && <Card><CardContent className="p-5">
   <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
    <div className="space-y-4">
     <div className="flex items-center gap-3">
      <Switch checked={settings.enabled} onCheckedChange={v => void saveSettings({ enabled: v })} aria-label="Automatické odesílání" />
      <div>
       <div className="font-medium text-base flex items-center gap-2">Automatické odesílání {settings.enabled ? "zapnuto" : "vypnuto"}</div>
       <div className="text-xs text-muted-foreground">Po–Pá 8–17 h, rozložené do celého dne, nejdřív priorita A. Odpověď nebo „ne“ sekvenci zastaví.</div>
      </div>
     </div>
     <div className="flex flex-wrap items-end gap-4 text-sm">
      <label className="space-y-1"><span className="block text-xs text-muted-foreground">Denní limit</span>
       <Input type="number" min={1} max={100} className="w-24" value={settings.daily_limit}
        onChange={e => setSettings({ ...settings, daily_limit: Number(e.target.value) })}
        onBlur={e => void saveSettings({ daily_limit: Math.min(100, Math.max(1, Number(e.target.value) || 25)) })} /></label>
      <label className="flex items-center gap-2 pb-2"><Switch checked={settings.followup_enabled} onCheckedChange={v => void saveSettings({ followup_enabled: v })} />Připomenutí po</label>
      <label className="space-y-1"><span className="block text-xs text-muted-foreground">dnech</span>
       <Input type="number" min={2} max={30} className="w-20" value={settings.followup_after_days}
        onChange={e => setSettings({ ...settings, followup_after_days: Number(e.target.value) })}
        onBlur={e => void saveSettings({ followup_after_days: Math.min(30, Math.max(2, Number(e.target.value) || 6)) })} /></label>
      <label className="space-y-1"><span className="block text-xs text-muted-foreground">Testy chodí na</span>
       <Input type="email" className="w-64" value={settings.test_email}
        onChange={e => setSettings({ ...settings, test_email: e.target.value })}
        onBlur={e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value) && void saveSettings({ test_email: e.target.value.trim() })} /></label>
     </div>
     <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" disabled={busy !== null} onClick={() => { if (window.confirm("Odeslat teď dávku až 5 e-mailů skutečným kontaktům?")) void run("batch", { action: "run" }, d => `Odesláno ${d?.sent ?? 0}${d?.failed ? `, chyby ${d.failed}` : ""}${d?.skipped ? ` (${d.skipped})` : ""}`); }}>
       <Send className="h-4 w-4 mr-1.5" />{busy === "batch" ? "Odesílám…" : "Odeslat dávku teď"}
      </Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void testTemplate(INTRO)}><FlaskConical className="h-4 w-4 mr-1.5" />Test oslovení</Button>
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void testTemplate(FOLLOW)}><FlaskConical className="h-4 w-4 mr-1.5" />Test připomenutí</Button>
     </div>
     <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Poslední běh: {fmtDate(settings.last_run_at)}</span>
      {embedded && <button className="underline underline-offset-2 hover:text-foreground" onClick={refresh}>Obnovit</button>}
      {settings.last_error && <span className="inline-flex items-center gap-1 text-red-600"><AlertTriangle className="h-3.5 w-3.5" />{settings.last_error}</span>}
     </div>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
     <Stat label="Dnes odesláno" value={`${sentToday} / ${settings.daily_limit}`} />
     <Stat label="Ve frontě" value={queue} hint={queue ? `≈ ${days} prac. ${days === 1 ? "den" : days < 5 ? "dny" : "dní"}` : "hotovo"} />
     <Stat label="Osloveno" value={contacted} hint={`${counts.followed || 0} připomenuto`} />
     <Stat label="Odpověděli" value={answered} hint={contacted ? `${Math.round((answered / contacted) * 100)} %` : undefined} />
     <Stat label="Schůzka / spolupráce" value={(counts.meeting || 0) + (counts.won || 0)} />
     <Stat label="K prověření" value={counts.review || 0} hint={`${counts.do_not_contact || 0} neoslovovat`} />
    </div>
   </div>
  </CardContent></Card>}

  <Tabs defaultValue="contacts">
   <TabsList>
    <TabsTrigger value="contacts">Kontakty</TabsTrigger>
    <TabsTrigger value="templates">Šablony</TabsTrigger>
    <TabsTrigger value="log">Historie</TabsTrigger>
   </TabsList>

   <TabsContent value="contacts">
    <Card><CardContent className="p-4 space-y-4">
     <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant={tab === "ready" ? "default" : "outline"} onClick={() => { setTab("ready"); setPage(0); setPriority("all"); }}>K oslovení</Button>
      <Button size="sm" variant={tab === "review" ? "default" : "outline"} onClick={() => { setTab("review"); setPage(0); setPriority("all"); }}>K prověření {counts.review ? `(${counts.review})` : ""}</Button>
      <span className="text-sm text-muted-foreground">{loading ? "Načítám…" : `${total} kontaktů`}</span>
      <div className="ml-auto flex gap-2">{csvUpload(false)}{csvUpload(true)}</div>
     </div>
     <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-48"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" placeholder="Firma, e-mail, město nebo specializace" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      <select aria-label="Obor kontaktu" className="rounded-md border bg-background px-3 text-sm" value={leadCategory} onChange={e => { setLeadCategory(e.target.value); setPage(0); }}><option value="">Všechny obory</option>{LEAD_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select>
      {tab === "ready" && <select className="rounded-md border bg-background px-3 text-sm" value={priority} onChange={e => { setPriority(e.target.value); setPage(0); }}><option value="all">Všechny priority</option><option value="A">Priorita A</option><option value="B">Priorita B</option></select>}
      <select className="rounded-md border bg-background px-3 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="all">Všechny stavy</option>{STATUS_SELECT.map(v => <option key={v} value={v}>{STATUS[v].label}</option>)}</select>
     </div>
     <div className="overflow-x-auto"><table className="w-full text-sm text-left">
      <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2">Firma</th><th className="p-2">Město</th><th className="p-2">Pr.</th><th className="p-2">Stav</th><th className="p-2">Poslední kontakt</th><th className="p-2 text-right">Akce</th></tr></thead>
      <tbody>{leads.map(l => <tr key={l.id} className="border-b align-middle hover:bg-muted/40">
       <td className="p-2"><div className="font-medium flex items-center gap-1.5">{l.company_name}{l.website && <a href={l.website} target="_blank" rel="noopener noreferrer" title="Web firmy" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}</div>
        <div className="text-xs text-muted-foreground">{l.email}</div>
        <LeadPhone notes={l.notes} />
        <LeadCategory notes={l.notes} />
        {l.last_error && <div className="text-[11px] text-red-600">{l.last_error}</div>}</td>
       <td className="p-2 text-muted-foreground">{l.city || "–"}</td>
       <td className="p-2">{l.priority}</td>
       <td className="p-2"><div className="flex items-center gap-1.5"><Pill status={l.outreach_status} />
        <select aria-label="Změnit stav" className="rounded border bg-background px-1 py-0.5 text-xs w-6 opacity-60 hover:opacity-100" value={l.outreach_status === "queued" ? "new" : l.outreach_status} onChange={e => void patchLead(l.id, { outreach_status: e.target.value })}>{STATUS_SELECT.map(v => <option key={v} value={v}>{STATUS[v].label}</option>)}</select></div>
        {l.followup_sent_at && <div className="text-[11px] text-muted-foreground mt-0.5">+ připomenutí</div>}</td>
       <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.followup_sent_at || l.last_contacted_at)}</td>
       <td className="p-2"><div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" title="Náhled" onClick={() => setPreviewId(l.id)}><Eye className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" title={`Test na ${settings?.test_email || "testovací adresu"}`} disabled={busy !== null} onClick={() => void testTemplate(nextKind(l), l)}><FlaskConical className="h-4 w-4" /></Button>
        {canSend(l) && <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => { if (window.confirm(`Poslat ${nextKind(l) === FOLLOW ? "připomenutí" : "oslovení"} na ${l.email}?`)) void run(`send-${l.id}`, { action: "send_one", lead_id: l.id }, () => `Odesláno na ${l.email}`); }}>
         <Send className="h-3.5 w-3.5 mr-1" />{busy === `send-${l.id}` ? "…" : nextKind(l) === FOLLOW ? "Připomenout" : "Poslat"}</Button>}
        {tab === "review" && <Button size="sm" onClick={() => void patchLead(l.id, { review_state: "ready", priority: "B" })}>Schválit</Button>}
        {tab === "ready" && !l.last_contacted_at && <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void patchLead(l.id, { review_state: "review", priority: "REVIEW" })}>Prověřit</Button>}
       </div></td>
      </tr>)}</tbody>
     </table></div>
     {!leads.length && !loading && <p className="text-sm text-muted-foreground">Žádné kontakty. Nahraj vyčištěné CSV (sloupce firma, email, id).</p>}
     <div className="flex gap-2 items-center justify-end"><span className="text-sm text-muted-foreground">{total ? page * 50 + 1 : 0}–{Math.min((page + 1) * 50, total)} z {total}</span>
      <Button variant="outline" size="sm" disabled={!page} onClick={() => setPage(v => v - 1)}>Předchozí</Button>
      <Button variant="outline" size="sm" disabled={(page + 1) * 50 >= total} onClick={() => setPage(v => v + 1)}>Další</Button>
     </div>
    </CardContent></Card>
   </TabsContent>

   <TabsContent value="templates" className="space-y-4">
    {templateEditor(INTRO, "1 · První oslovení", "Posílá se kontaktům ve frontě.")}
    {templateEditor(FOLLOW, "2 · Připomenutí", `Jednou, ${settings?.followup_after_days ?? 6} dní po oslovení, jen když kontakt neodpověděl.`)}
   </TabsContent>

   <TabsContent value="log">
    <Card><CardContent className="p-4">
     {!log.length ? <p className="text-sm text-muted-foreground">Zatím nic neodešlo.</p> :
      <div className="overflow-x-auto"><table className="w-full text-sm text-left">
       <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2">Kdy</th><th className="p-2">Typ</th><th className="p-2">Komu</th><th className="p-2">Předmět</th><th className="p-2">Výsledek</th></tr></thead>
       <tbody>{log.map(r => <tr key={r.id} className="border-b">
        <td className="p-2 whitespace-nowrap text-muted-foreground">{fmtDate(r.sent_at)}</td>
        <td className="p-2">{r.kind === "intro" ? "Oslovení" : r.kind === "followup" ? "Připomenutí" : "Test"}</td>
        <td className="p-2">{r.email}</td>
        <td className="p-2 max-w-72 truncate" title={r.subject}>{r.subject}</td>
        <td className="p-2">{r.status === "sent" ? <span>Odesláno</span> : <span className="text-red-600" title={r.error || ""}>Chyba{r.error ? `: ${r.error}` : ""}</span>}</td>
       </tr>)}</tbody>
      </table></div>}
    </CardContent></Card>
   </TabsContent>
  </Tabs>

  {preview && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewId(null)}>
   <section className="bg-background rounded-xl border shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
    <div className="flex justify-between gap-3"><div><h3 className="font-semibold">{preview.company_name}</h3><div className="text-sm text-muted-foreground">{preview.email}</div></div>
     <Button variant="ghost" onClick={() => setPreviewId(null)}>Zavřít</Button></div>
    {(() => { const t = templates[nextKind(preview)]; if (!t) return null; return <>
     <div className="text-xs uppercase tracking-wide text-muted-foreground">{nextKind(preview) === FOLLOW ? "Další e-mail: připomenutí" : "Další e-mail: oslovení"}</div>
     <div className="text-sm font-medium">{personalized(t.subject, preview)}</div>
     <pre className="whitespace-pre-wrap text-sm font-sans rounded bg-muted p-3">{personalized(t.body, preview)}</pre>
    </>; })()}
    <Textarea rows={3} placeholder="Poznámka ke kontaktu" defaultValue={preview.notes || ""} onBlur={e => e.target.value !== (preview.notes || "") && void patchLead(preview.id, { notes: e.target.value })} />
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" disabled={busy !== null} onClick={() => void testTemplate(nextKind(preview), preview)}><FlaskConical className="h-4 w-4 mr-2" />Test na {settings?.test_email}</Button>
     {canSend(preview) && <Button disabled={busy !== null} onClick={() => { if (window.confirm(`Poslat na ${preview.email}?`)) void run(`send-${preview.id}`, { action: "send_one", lead_id: preview.id }, () => `Odesláno na ${preview.email}`); }}><Send className="h-4 w-4 mr-2" />Poslat teď</Button>}
    </div>
   </section>
  </div>}
 </div>;
}
