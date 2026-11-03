import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PORTFOLIO_BUCKET, type PortfolioProject } from "@/lib/portfolio-images";
import originalImages from "@/data/visualization-gallery";

type Control = { image_key: string; hidden: boolean; sort_order: number };
type Item = { key: string; src: string; title: string; caption: string; hidden: boolean };
const db = supabase as any; // CMS tables are not yet in generated database types.

export function VisualizationGalleryManager({ projects, disabled = false }: { projects: PortfolioProject[]; disabled?: boolean }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Item[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draft]);
  const { data: controls = [], isPending, error } = useQuery<Control[]>({
    queryKey: ["visualization-gallery-controls"],
    queryFn: async () => {
      const rows: Control[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.from("visualization_gallery_controls").select("image_key,hidden,sort_order").order("image_key").range(offset, offset + 999);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 1000) return rows;
      }
    },
  });
  const saved = useMemo(() => {
    const settings = new Map(controls.map(c => [c.image_key, c]));
    const uploaded = projects.filter(p => p.published).flatMap(p => p.images.map(image => ({
      key: `cms:${image.full}`, src: supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(image.thumb).data.publicUrl,
      title: p.title, caption: image.caption || image.alt,
    })));
    return [...uploaded, ...originalImages].map((image, index) => ({ ...image, hidden: settings.get(image.key)?.hidden ?? false,
      order: settings.get(image.key)?.sort_order ?? index, index,
    })).sort((a, b) => a.order - b.order || a.index - b.index);
  }, [projects, controls]);
  const items = draft ?? saved;
  const blocked = disabled || saving || isPending || !!error;
  function move(key: string, target: number) {
    if (blocked) return;
    const next = [...items];
    const from = next.findIndex(item => item.key === key);
    if (from < 0 || target < 0 || target >= next.length) return;
    const [item] = next.splice(from, 1); next.splice(target, 0, item); setDraft(next);
  }
  async function save() {
    if (lock.current || blocked || !draft) return;
    lock.current = true; setSaving(true);
    try {
      const payload = draft.map((item, i) => ({ image_key: item.key, hidden: item.hidden, sort_order: i }));
      const { error } = await db.from("visualization_gallery_controls").upsert(payload, { onConflict: "image_key" });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["visualization-gallery-controls"] });
      setDraft(null); toast.success("Viditelnost a pořadí obrázků jsou uložené. Projeví se po obnovení portfolia.");
    } catch { toast.error("Změny se nepodařilo uložit. Úpravy zůstaly připravené, zkuste uložit znovu."); }
    finally { lock.current = false; setSaving(false); }
  }
  return <section className="my-8 rounded-xl border p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-4 items-start">
      <div><h2 className="text-lg font-semibold">Obrázky na webu</h2>
        <p className="text-sm text-muted-foreground mt-1">Původní galerie i publikované projekty. Pořadí změňte přetažením nebo šipkami. Odebrané obrázky můžete kdykoliv vrátit.</p>
        <p className="text-sm mt-2">{items.filter(i => !i.hidden).length} na webu · {items.filter(i => i.hidden).length} odebraných</p>
      </div>
      <div className="flex gap-2"><Button variant="outline" disabled={blocked || !draft} onClick={() => setDraft(null)}>Zahodit změny</Button><Button disabled={blocked || !draft} onClick={save}>{saving ? "Ukládám…" : "Uložit galerii"}</Button></div>
    </div>
    {isPending && <p>Načítám nastavení galerie…</p>}
    {error && <p role="alert" className="text-red-600">Nastavení galerie se nepodařilo načíst. Obnovte stránku; změny jsou do té doby vypnuté.</p>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{items.map((item, index) => <article key={item.key}
      draggable={!blocked} onDragStart={e => { setDragged(item.key); e.dataTransfer.setData("text/plain", item.key); e.dataTransfer.effectAllowed = "move"; }}
      onDragEnd={() => setDragged(null)} onDragOver={e => { if (dragged && !blocked) e.preventDefault(); }}
      onDrop={e => { e.preventDefault(); if (dragged) move(dragged, index); setDragged(null); }}
      className={`rounded-lg border overflow-hidden ${item.hidden ? "bg-muted/50" : "bg-background"}`}>
      <img src={item.src} alt={item.caption || item.title} loading="lazy" draggable={false} className={`aspect-[4/3] w-full object-cover ${item.hidden ? "opacity-40 grayscale" : ""}`} />
      <div className="p-3 space-y-3"><div className="flex gap-2 items-start"><GripVertical aria-hidden className="h-4 w-4 shrink-0 mt-1 text-muted-foreground" /><div className="min-w-0"><h3 className="text-sm font-semibold break-words">{item.title}</h3><p className="text-xs text-muted-foreground break-words">{item.caption}</p><p className="text-xs mt-1">{item.hidden ? "Odebráno z webu" : "Na webu"}</p></div></div>
        <div className="flex gap-2 flex-wrap"><Button variant="outline" size="sm" disabled={blocked} onClick={() => setDraft(items.map(i => i.key === item.key ? { ...i, hidden: !i.hidden } : i))}>{item.hidden ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}{item.hidden ? "Vrátit" : "Odebrat"}</Button>
          <Button variant="outline" size="icon" disabled={blocked || index === 0} aria-label={`Posunout ${item.title} nahoru`} onClick={() => move(item.key, index - 1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" disabled={blocked || index === items.length - 1} aria-label={`Posunout ${item.title} dolů`} onClick={() => move(item.key, index + 1)}><ArrowDown className="h-4 w-4" /></Button>
        </div>
      </div>
    </article>)}</div>
    {draft && <div className="flex justify-end"><Button disabled={blocked} onClick={save}>{saving ? "Ukládám…" : "Uložit galerii"}</Button></div>}
  </section>;
}
