import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { BriefcaseBusiness, Upload, Search, Copy, Save, ExternalLink, Mail, RefreshCw } from "lucide-react";

type Lead = {
 id: string; source_id: string; company_name: string; contact_name: string | null;
 email: string; website: string | null; city: string | null; region: string | null;
 priority: string; review_state: string; outreach_status: string;
 notes: string; source_status: string | null; source_email_status: string | null;
};
type Template = { slug: string; name: string; subject: string; body: string };
const db = supabase as any;
const statusOptions = [
 ["new", "Neosloven"], ["queued", "Dříve ve frontě"], ["sent", "Osloven"],
 ["opened", "Otevřen"], ["replied", "Odpověděl"], ["meeting", "Schůzka"],
 ["won", "Spolupráce"], ["not_interested", "Nemá zájem"], ["do_not_contact", "Neoslovovat"]
];

function parseCsv(text: string): string[][] {
 const source = text.replace(/^\uFEFF/, "");
 const delimiter = source.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
 const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
 for (let i = 0; i < source.length; i++) {
  const ch = source[i];
  if (ch === '"') {
   if (quoted && source[i+1] === '"') { cell += '"'; i++; } else quoted = !quoted;
  } else if (ch === delimiter && !quoted) { row.push(cell); cell = ""; }
  else if ((ch === "\n" || ch === "\r") && !quoted) {
   if (ch === "\r" && source[i+1] === "\n") i++;
   row.push(cell); cell = "";
   if (row.some(v => v.trim())) rows.push(row);
   row = [];
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
  const status = ["odeslano", "otevreno"].includes(oldEmail)
   ? (oldEmail === "otevreno" ? "opened" : "sent")
   : old === "osloven" ? "sent" : old === "ve_fronte" ? "queued" : "new";
  output.push({
   source_id: sourceId, company_name: index(row, "firma"), contact_name: index(row, "jmeno") || null,
   email, website: index(row, "web") || null, city: index(row, "mesto") || null,
   region: index(row, "kraj") || null,
   priority: review ? "REVIEW" : index(row, "priorita") === "A" ? "A" : "B",
   review_state: review ? "review" : "ready", outreach_status: status,
   source_status: old || null, source_email_status: oldEmail || null,
   source_reason: index(row, "duvod") || null,
   source_name: index(row, "zdroj") || "csv-2026-11-19",
   notes: index(row, "kontaktovat_poznamka")
  });
 }
 return output;
}
const personalized = (input: string, lead: Lead | null) =>
 input.replace(/\{\{firma\}\}/g, lead?.company_name || "vaší agenturou");

export default function AdminAgencyOutreach() {
 const [leads, setLeads] = useState<Lead[]>([]);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(0);
 const [search, setSearch] = useState("");
 const [tab, setTab] = useState("ready");
 const [priority, setPriority] = useState("all");
 const [status, setStatus] = useState("all");
 const [loading, setLoading] = useState(false);
 const [importing, setImporting] = useState(false);
 const [draft, setDraft] = useState<Template | null>(null);
 const [selectedId, setSelectedId] = useState<string | null>(null);
 const selected = useMemo(() => leads.find(x => x.id === selectedId) || null, [leads, selectedId]);
 async function load() {
  setLoading(true);
  try {
   let q = db.from("agency_outreach_leads").select("*", {count:"exact"}).eq("review_state", tab);
   if (priority !== "all" && tab === "ready") q = q.eq("priority", priority);
   if (status !== "all") q = q.eq("outreach_status", status);
   if (search.trim()) {
    const safe = search.trim().replace(/[%_,()]/g," ").slice(0,100);
    q = q.or(`company_name.ilike.%${safe}%,email.ilike.%${safe}%,city.ilike.%${safe}%`);
   }
   const {data, count, error} = await q.order("priority", {ascending:true}).order("company_name").range(page*50,page*50+49);
   if (error) throw error;
   setLeads(data || []); setTotal(count || 0);
  } catch(e:any) { toast.error(e.message || "Nelze načíst agentury"); }
  finally { setLoading(false); }
 }
 useEffect(() => { void load(); }, [page, search, tab, priority, status]);
 useEffect(() => {
  db.from("agency_outreach_templates").select("*").eq("slug","agency-intro-cs").single()
   .then(({data,error}:any) => error ? toast.error(error.message) : setDraft(data));
 }, []);
 async function patch(id: string, values: Partial<Lead>) {
  const {error}=await db.from("agency_outreach_leads").update({...values, updated_at:new Date().toISOString()}).eq("id",id);
  if(error) toast.error(error.message); else {toast.success("Uloženo");await load();}
 }
 async function importFile(file: File, review: boolean) {
  setImporting(true);
  try {
   const rows = mapCsv(await file.text(), review);
   if (!rows.length) throw new Error("Nenalezeny platné e-maily.");
   if (!window.confirm(`Importovat ${rows.length} kontaktů do sekce ${review?"K prověření":"K oslovení"}? Duplicitní ID se aktualizují. E-maily se neodesílají.`)) return;
   for(let i=0;i<rows.length;i+=100) {
    const {error}=await db.from("agency_outreach_leads").upsert(rows.slice(i,i+100),{onConflict:"source_id"});
    if(error) throw new Error(`Import skončil na řádku ${i+1}: ${error.message}`);
   }
   toast.success(`Naimportováno ${rows.length} kontaktů. Žádné e-maily nebyly odeslány.`);
   setTab(review?"review":"ready");setPage(0);await load();
  } catch (e:any) {toast.error(e.message || "Import se nezdařil");}
  finally {setImporting(false);}
 }
 async function saveTemplate() {
  if(!draft) return;
  const {error}=await db.from("agency_outreach_templates").update({subject:draft.subject,body:draft.body,updated_at:new Date().toISOString()}).eq("slug",draft.slug);
  error?toast.error(error.message):toast.success("Šablona uložena");
 }
 const csvUpload=(review:boolean)=><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
  <Upload className="h-4 w-4"/>{importing?"Importuji…":review?"Import CSV k prověření":"Import CSV k oslovení"}
  <input type="file" accept=".csv,text/csv" className="hidden" disabled={importing} onChange={e=>{const f=e.target.files?.[0];if(f) void importFile(f,review);e.target.value="";}}/>
 </label>;
 return <div className="space-y-6">
  <AdminPageHeader icon={BriefcaseBusiness} title="Agentury · akvizice" subtitle="Samostatný B2B pipeline. Žádná automatická rozesílka." />
  <div className="flex gap-2 flex-wrap">{csvUpload(false)}{csvUpload(true)}
   <Button variant="outline" onClick={()=>void load()}><RefreshCw className="h-4 w-4 mr-2"/>Obnovit</Button>
  </div>
  <Card><CardContent className="p-4 space-y-4">
   <div className="flex flex-wrap items-center gap-3">
    <Button variant={tab==="ready"?"default":"outline"} onClick={()=>{setTab("ready");setPage(0);setPriority("all");}}>K oslovení</Button>
    <Button variant={tab==="review"?"default":"outline"} onClick={()=>{setTab("review");setPage(0);setPriority("all");}}>K prověření</Button>
    <span className="text-sm text-muted-foreground">{loading?"Načítám…":`${total} kontaktů`}</span>
   </div>
   <div className="flex flex-wrap gap-2">
    <div className="relative flex-1 min-w-48"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground"/><Input className="pl-9" placeholder="Firma, e-mail nebo město" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></div>
    {tab==="ready"&&<select className="rounded-md border bg-background px-3" value={priority} onChange={e=>{setPriority(e.target.value);setPage(0);}}><option value="all">Všechny priority</option><option value="A">Priorita A</option><option value="B">Priorita B</option></select>}
    <select className="rounded-md border bg-background px-3" value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="all">Všechny stavy</option>{statusOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
   </div>
   <div className="overflow-x-auto"><table className="w-full text-sm text-left">
    <thead><tr className="border-b text-muted-foreground"><th className="p-2">Firma / kontakt</th><th className="p-2">Lokalita</th><th className="p-2">Priorita</th><th className="p-2">Stav</th><th className="p-2">Akce</th></tr></thead>
    <tbody>{leads.map(l=><tr key={l.id} className="border-b align-top">
     <td className="p-2"><div className="font-medium">{l.company_name}</div><a className="text-primary hover:underline" href={`mailto:${l.email}`}>{l.email}</a>{l.website&&<a href={l.website} target="_blank" rel="noopener noreferrer" title="Web firmy" className="inline-flex ml-2"><ExternalLink className="h-3.5 w-3.5"/></a>}</td>
     <td className="p-2 text-muted-foreground">{l.city||"–"}</td>
     <td className="p-2">{l.priority}</td>
     <td className="p-2"><select className="rounded border bg-background p-1 max-w-40" value={l.outreach_status} onChange={e=>void patch(l.id,{outreach_status:e.target.value})}>{statusOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></td>
     <td className="p-2 space-x-2">
      <Button size="sm" variant="outline" onClick={()=>setSelectedId(l.id)}>E-mail</Button>
      {tab==="review"&&<Button size="sm" onClick={()=>void patch(l.id,{review_state:"ready",priority:"B"})}>Schválit</Button>}
      {tab==="ready"&&<Button size="sm" variant="ghost" onClick={()=>void patch(l.id,{review_state:"review",priority:"REVIEW"})}>Prověřit</Button>}
     </td>
    </tr>)}</tbody>
   </table></div>
   {!leads.length&&!loading&&<p className="text-sm text-muted-foreground">Zatím tu nejsou kontakty. Nahraj vyčištěné CSV soubory.</p>}
   <div className="flex gap-2 items-center justify-end"><span className="text-sm text-muted-foreground">{page*50+1}–{Math.min((page+1)*50,total)} z {total}</span>
    <Button variant="outline" size="sm" disabled={!page} onClick={()=>setPage(v=>v-1)}>Předchozí</Button><Button variant="outline" size="sm" disabled={(page+1)*50>=total} onClick={()=>setPage(v=>v+1)}>Další</Button>
   </div>
  </CardContent></Card>
  {draft&&<Card><CardContent className="p-5 space-y-3">
   <div className="flex items-center gap-2"><Mail className="h-5 w-5"/><h2 className="font-semibold">Šablona · první oslovení</h2></div>
   <p className="text-sm text-muted-foreground">Ručně upravitelný návrh. Nepřipojeno k žádné automatické kampani.</p>
   <Input value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})} aria-label="Předmět e-mailu"/>
   <Textarea rows={15} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} aria-label="Text e-mailu"/>
   <Button onClick={()=>void saveTemplate()}><Save className="h-4 w-4 mr-2"/>Uložit šablonu</Button>
  </CardContent></Card>}
  {selected&&draft&&<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setSelectedId(null)}>
   <section className="bg-background rounded-xl border shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
    <div className="flex justify-between gap-3"><h3 className="font-semibold">Oslovení: {selected.company_name}</h3><Button variant="ghost" onClick={()=>setSelectedId(null)}>Zavřít</Button></div>
    <div className="text-sm">{selected.email}</div>
    <div className="text-sm font-medium">{personalized(draft.subject,selected)}</div>
    <pre className="whitespace-pre-wrap text-sm font-sans rounded bg-muted p-3">{personalized(draft.body,selected)}</pre>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={()=>{void navigator.clipboard.writeText(personalized(draft.body,selected));toast.success("Text zkopírován");}}><Copy className="h-4 w-4 mr-2"/>Kopírovat</Button>
     <Button onClick={()=>{const subject=encodeURIComponent(personalized(draft.subject,selected));const body=encodeURIComponent(personalized(draft.body,selected));window.location.href=`mailto:${selected.email}?subject=${subject}&body=${body}`;}}>Otevřít e-mailového klienta</Button>
    </div>
    <p className="text-xs text-muted-foreground">Po skutečném odeslání ručně změň stav kontaktu na Osloven. Otevření e-mailového klienta není důkazem odeslání.</p>
   </section></div>}
 </div>;
}
