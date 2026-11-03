import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Images, Upload, X, ArrowUp, ArrowDown, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { VisualizationGalleryManager } from "@/components/admin/VisualizationGalleryManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PORTFOLIO_IMAGES, MAX_SOURCE_BYTES, PORTFOLIO_BUCKET, preparePortfolioImage, type PortfolioImage, type PortfolioProject } from "@/lib/portfolio-images";

type Selection = { id: string; file: File; preview: string; caption: string; alt: string };
type SavePayload = Omit<PortfolioProject, "created_at">;
const db = supabase as any; // Dedicated CMS table; generated types are maintained separately.
const publicUrl = (path: string) => supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl;
const mb = (n: number) => (n / 1024 / 1024).toFixed(1) + " MB";

export default function AdminVisualizations() {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());
  const running = useRef(false);
  const [files, setFiles] = useState<Selection[]>([]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("Exterior");
  const [description, setDescription] = useState("");
  const [credits, setCredits] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState("");
  const [percent, setPercent] = useState(0);
  const [pendingSave, setPendingSave] = useState<SavePayload | null>(null);
  const { data: projects = [], isPending, error } = useQuery<PortfolioProject[]>({
    queryKey: ["visualization-projects"], queryFn: async () => {
      const { data, error } = await db.from("visualization_projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => () => { previews.current.forEach(URL.revokeObjectURL); }, []);
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  function addFiles(incoming: File[]) {
    if (running.current || pendingSave) return;
    const good = incoming.filter(f => {
      if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(f.type) || f.size > MAX_SOURCE_BYTES) {
        toast.error(`${f.name}: použijte JPG, PNG, WebP nebo AVIF do 40 MB.`); return false;
      }
      return true;
    });
    const available = MAX_PORTFOLIO_IMAGES - files.length;
    if (good.length > available) toast.error(`Projekt může mít nejvýše ${MAX_PORTFOLIO_IMAGES} obrázků.`);
    const additions = good.slice(0, available).map(file => {
        const preview = URL.createObjectURL(file); previews.current.add(preview);
        return { id: crypto.randomUUID(), file, preview, caption: "", alt: "" };
    });
    setFiles(current => [...current, ...additions].slice(0,MAX_PORTFOLIO_IMAGES));
  }
  function remove(id: string) {
    const item = files.find(f => f.id === id);
    if (item) { URL.revokeObjectURL(item.preview); previews.current.delete(item.preview); }
    setFiles(current => current.filter(f => f.id !== id));
  }
  function move(i: number, offset: number) {
    setFiles(current => { const next = [...current]; [next[i], next[i + offset]] = [next[i + offset], next[i]]; return next; });
  }
  async function savePayload(payload: SavePayload) {
    const { error } = await db.from("visualization_projects").upsert(payload, { onConflict: "id" }).select("id").single();
    if (error) throw error;
    setPendingSave(null);
    setFiles([]); previews.current.forEach(URL.revokeObjectURL); previews.current.clear();
    setTitle(""); setLocation(""); setYear(""); setDescription(""); setCredits("");
    setProgress(""); setPercent(0);
    await qc.invalidateQueries({ queryKey: ["visualization-projects"] });
    toast.success(payload.published ? "Projekt je publikovaný v hlavním portfoliu vizualizací." : "Koncept uložen. Na veřejném webu se zatím nezobrazuje.");
  }
  async function upload(published: boolean) {
    if (running.current) return;
    if (!title.trim() || !files.length) { toast.error("Vyplňte název projektu a přidejte alespoň jeden obrázek."); return; }
    if (year && (!Number.isInteger(Number(year)) || Number(year) < 1900 || Number(year) > 2100)) { toast.error("Zadejte platný rok (1900–2100)."); return; }
    running.current = true; setBusy(true); setPercent(0);
    const id = crypto.randomUUID();
    const uploaded: string[] = [];
    let metadataStarted = false;
    try {
      const images: PortfolioImage[] = [];
      let outputBytes = 0;
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setProgress(`Komprimuji ${i + 1}/${files.length}: ${item.file.name}`);
        const prepared = await preparePortfolioImage(item.file);
        const full = `${id}/${item.id}-full.${prepared.full.extension}`;
        const thumb = `${id}/${item.id}-thumb.${prepared.thumb.extension}`;
        for (const [path, image] of [[full, prepared.full], [thumb, prepared.thumb]] as const) {
          setProgress(`Nahrávám ${i + 1}/${files.length}: ${item.file.name}`);
          uploaded.push(path); // Also clean up a write whose response was lost.
          const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, image.blob, {
            contentType: image.blob.type, cacheControl: "31536000", upsert: false,
          });
          if (error) throw error;
        }
        const bytes = prepared.full.blob.size + prepared.thumb.blob.size;
        outputBytes += bytes;
        images.push({ full, thumb, width: prepared.full.width, height: prepared.full.height, bytes,
          caption: item.caption.trim(), alt: (item.alt.trim() || `${title.trim()}${item.caption.trim() ? " — " + item.caption.trim() : " — " + (i + 1)}`).slice(0,300) });
        setPercent(Math.round(((i + 1) / files.length) * 95));
        setProgress(`Nahráno ${i + 1}/${files.length} · optimalizováno na ${mb(outputBytes)}`);
      }
      const payload: SavePayload = { id, title: title.trim(), location: location.trim(), project_year: year ? Number(year) : null,
        category, description: description.trim(), credits: credits.trim(), images, published };
      metadataStarted = true; setPendingSave(payload); setProgress("Ukládám projekt…"); setPercent(98);
      await savePayload(payload);
    } catch (err) {
      if (!metadataStarted && uploaded.length) {
        const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).remove(uploaded);
        if (error) console.error("Portfolio upload cleanup failed", error.message);
      }
      toast.error(metadataStarted ? "Není potvrzené uložení projektu. Zkuste znovu uložit níže; obrázky se nemusí nahrávat znovu." : (err instanceof Error ? err.message : "Nahrání se nezdařilo. Zkuste to znovu."));
    } finally { running.current = false; setBusy(false); }
  }
  async function toggle(project: PortfolioProject) {
    if (running.current) return;
    running.current = true; setBusy(true);
    try {
      const { error } = await db.from("visualization_projects").update({ published: !project.published }).eq("id", project.id).select("id").single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["visualization-projects"] });
      toast.success(project.published ? "Projekt byl skryt z portfolia." : "Projekt byl publikován.");
    } catch { toast.error("Změnu se nepodařilo uložit."); }
    finally { running.current = false; setBusy(false); }
  }
  return <div className="max-w-6xl mx-auto pb-12">
    <AdminPageHeader icon={Images} title="Portfolio vizualizací" subtitle="Obrázky nahrajte jednou. Komprese a hlavní portfolio se propojí automaticky."
      actions={<Button asChild variant="outline"><a href="/demos/atmosferi-viz/index.html#work" target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Otevřít portfolio</a></Button>} />
    <VisualizationGalleryManager projects={projects} disabled={busy || !!pendingSave || isPending || !!error} />
    <div className="grid lg:grid-cols-[1fr_1.15fr] gap-6">
      <fieldset disabled={busy || !!pendingSave} className="space-y-5 rounded-xl border p-5 min-w-0">
        <h2 className="font-semibold">Nový projekt</h2>
        <div><Label htmlFor="project-title">Název projektu *</Label><Input id="project-title" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="Např. Vila nad řekou" /></div>
        <div className="grid grid-cols-2 gap-4"><div><Label htmlFor="project-location">Místo</Label><Input id="project-location" value={location} maxLength={200} onChange={e => setLocation(e.target.value)} placeholder="Praha, Česko" /></div><div><Label htmlFor="project-year">Rok</Label><Input id="project-year" type="number" min={1900} max={2100} value={year} onChange={e => setYear(e.target.value)} placeholder="2026" /></div></div>
        <div><Label htmlFor="project-category">Typ vizualizace</Label><select id="project-category" className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={e => setCategory(e.target.value)}>{[["Exterior","Exteriér"],["Interior","Interiér"],["Landscape","Krajina"],["Urbanism","Urbanismus"],["Other","Ostatní"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
        <div><Label htmlFor="project-description">Popis projektu</Label><Textarea id="project-description" rows={4} maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Krátký popis pro detail projektu…" /></div>
        <div><Label htmlFor="project-credits">Autoři / klient / spolupráce</Label><Input id="project-credits" value={credits} maxLength={500} onChange={e => setCredits(e.target.value)} /></div>
        <p className="text-xs text-muted-foreground">Texty se na webu zobrazí tak, jak je vyplníte. První obrázek bude úvodní; pořadí můžete změnit šipkami.</p>
      </fieldset>
      <div className="min-w-0 space-y-4">
        <button type="button" disabled={busy || !!pendingSave} onClick={() => input.current?.click()} onDragOver={e => {e.preventDefault();setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault();setDragging(false);addFiles(Array.from(e.dataTransfer.files));}}
          className={`w-full rounded-xl border-2 border-dashed p-10 text-center transition-colors ${dragging ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}>
          <Upload className="h-8 w-8 mx-auto mb-3" /><span className="block font-semibold">Přetáhněte sem obrázky</span><span className="block text-sm text-muted-foreground mt-2">nebo klikněte a vyberte soubory · JPG, PNG, WebP, AVIF</span><span className="block text-xs text-muted-foreground mt-2">Nejvýše 30 obrázků, každý do 40 MB. Originály si ponechte u sebe.</span>
        </button>
        <input ref={input} className="sr-only" aria-label="Vybrat obrázky projektu" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy || !!pendingSave} onChange={e => {addFiles(Array.from(e.target.files || []));e.target.value="";}} />
        <p className="text-xs text-muted-foreground">Během nahrávání nechte stránku otevřenou. Publikované projekty se potom načítají z úložiště automaticky.</p>
        {files.length > 0 && <p className="text-sm text-muted-foreground">{files.length} obrázků · původně {mb(files.reduce((n,f)=>n+f.file.size,0))}</p>}
        <div className="space-y-3">{files.map((item,i)=><div key={item.id} className="border rounded-lg p-3 flex gap-3">
          <img src={item.preview} alt={item.alt || item.file.name} width={96} height={96} loading="lazy" decoding="async" className="w-24 h-24 object-cover rounded shrink-0" />
          <div className="min-w-0 flex-1 space-y-2"><p className="truncate text-xs font-medium">{i===0 ? "Úvodní · " : ""}{item.file.name}</p>
            <Input aria-label={`Popisek obrázku ${i+1}`} placeholder="Popisek pohledu (volitelné)" maxLength={300} value={item.caption} disabled={busy || !!pendingSave} onChange={e=>setFiles(current=>current.map(f=>f.id===item.id?{...f,caption:e.target.value}:f))} />
            <Input aria-label={`Alternativní text obrázku ${i+1}`} placeholder="Co obrázek zachycuje? (volitelné)" maxLength={300} value={item.alt} disabled={busy || !!pendingSave} onChange={e=>setFiles(current=>current.map(f=>f.id===item.id?{...f,alt:e.target.value}:f))} />
          </div><div className="flex flex-col gap-1"><Button size="icon" variant="ghost" aria-label={`Posunout obrázek ${i+1} nahoru`} disabled={busy || !!pendingSave || i===0} onClick={()=>move(i,-1)}><ArrowUp className="w-4 h-4" /></Button><Button size="icon" variant="ghost" aria-label={`Posunout obrázek ${i+1} dolů`} disabled={busy || !!pendingSave || i===files.length-1} onClick={()=>move(i,1)}><ArrowDown className="w-4 h-4" /></Button><Button size="icon" variant="ghost" aria-label={`Odebrat obrázek ${i+1}`} disabled={busy || !!pendingSave} onClick={()=>remove(item.id)}><X className="w-4 h-4" /></Button></div>
        </div>)}</div>
        {progress && <div role="status" className="text-sm space-y-2"><p>{progress}</p><progress className="w-full" value={percent} max={100} aria-label="Průběh nahrávání" /></div>}
        {pendingSave && !busy ? <Button onClick={async()=>{running.current=true;setBusy(true);try{await savePayload(pendingSave);}catch{toast.error("Uložení stále není potvrzené. Zkontrolujte připojení.");}finally{running.current=false;setBusy(false);}}}>Znovu uložit stejný projekt</Button> : <div className="flex flex-wrap gap-3"><Button disabled={busy || !files.length || !title.trim()} onClick={()=>upload(true)}>{busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Nahrát a publikovat</Button><Button variant="outline" disabled={busy || !files.length || !title.trim()} onClick={()=>upload(false)}>Uložit jako koncept</Button></div>}
      </div>
    </div>
    <section className="mt-10"><h2 className="text-lg font-semibold mb-4">Nahrané projekty</h2>
      {isPending && <p>Načítám projekty…</p>}{error && <p role="alert" className="text-red-600">Projekty se nepodařilo načíst. Obnovte stránku.</p>}
      {!isPending && !error && !projects.length && <p className="text-sm text-muted-foreground">Zde se objeví projekty nahrané přes administraci. Původní portfolio zůstává na webu zachované.</p>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{projects.map(project=><article key={project.id} className="border rounded-xl overflow-hidden">
        {project.images[0] && <img src={publicUrl(project.images[0].thumb)} alt={project.images[0].alt} className="w-full aspect-[4/3] object-cover" loading="lazy" />}
        <div className="p-4 space-y-2"><h3 className="font-semibold">{project.title}</h3><p className="text-xs text-muted-foreground">{[project.location,project.project_year].filter(Boolean).join(" · ")} · {project.images.length} obrázků</p><p className="text-sm">{project.published ? "Publikováno" : "Koncept"}</p><Button variant="outline" size="sm" disabled={busy || !!pendingSave} onClick={()=>toggle(project)}>{project.published ? "Skrýt z portfolia" : "Publikovat"}</Button></div>
      </article>)}</div>
    </section>
  </div>;
}
