import { useState } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminAgencyOutreach, { CollectorProgress } from "@/pages/admin/AdminAgencyOutreach";
import { AdminOutbox } from "./AdminOutbox";
import CampaignsOverview from "./CampaignsOverview";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const db = supabase as any;
const slug = "atmosferi-agenturen-de";
const segment = { category: "agentury", language: "de", outreach_template_slug: slug };
const tabs = [
  ["", "Přehled kampaní"], ["agentury-de", "Agentury · Německo"], ["agentury-cz", "Agentury · Česko"],
  ["fronta", "Fronta a historie"], ["sber", "Sběr kontaktů"],
];

type Contact = { id: string; company_name: string; email: string; city: string | null; website: string | null;
  subcategory: string | null; description: string | null; outreach_import_review: boolean; outreach_email_ready: boolean;
  marketing_notifications: boolean | null; email_notifications: boolean | null; tags: string[] | null };

function GermanAgencies() {
  const qc = useQueryClient();
  const [reviewOnly, setReviewOnly] = useState(true);
  const [page, setPage] = useState(0);
  const size = 25;
  const deTemplates = useQuery({
    queryKey: ["de-agencies", "email-templates"],
    queryFn: async () => {
      const { data, error } = await db.from("email_templates")
        .select("slug,name,subject,trigger_type,is_enabled")
        .in("slug", ["atmosferi-agenturen-de", "atmosferi-agenturen-de-followup"]);
      if (error) throw error;
      return (data || []) as { slug: string; name: string; subject: string | null; trigger_type: string; is_enabled: boolean }[];
    },
  });
  const counts = useQuery({
    queryKey: ["de-agencies", "counts"], refetchInterval: 60000,
    queryFn: async () => {
      const count = () => db.from("marketing_leads").select("id", { count: "exact", head: true }).match(segment);
      const messages = () => db.from("email_outbox").select("id", { count: "exact", head: true }).eq("template_slug", slug);
      const results = await Promise.all([count(), count().eq("outreach_import_review", true),
        count().eq("outreach_email_ready", true).eq("outreach_import_review", false),
        messages().in("status", ["draft", "pending"]), messages().eq("status", "sent"), messages().eq("status", "failed")]);
      for (const result of results) if (result.error) throw result.error;
      return results.map(result => result.count as number);
    },
  });
  const contacts = useQuery({
    queryKey: ["de-agencies", "contacts", reviewOnly, page], refetchInterval: 60000,
    queryFn: async () => {
      let query = db.from("marketing_leads").select("id,company_name,email,city,website,subcategory,description,outreach_import_review,outreach_email_ready,marketing_notifications,email_notifications,tags", { count: "exact" }).match(segment);
      if (reviewOnly) query = query.eq("outreach_import_review", true);
      const { data, count, error } = await query.order("created_at", { ascending: false }).order("id").range(page * size, (page + 1) * size - 1);
      if (error) throw error;
      return { rows: data as Contact[], count: count as number };
    },
  });
  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db.from("marketing_leads").update({ outreach_import_review: false, outreach_email_ready: false }).match(segment)
        .eq("id", id).eq("outreach_import_review", true)
        .or("marketing_notifications.is.null,marketing_notifications.eq.true")
        .or("email_notifications.is.null,email_notifications.eq.true").select("id").single();
      if (error || !data) throw error || new Error("Kontakt se mezitím změnil.");
    },
    onSuccess: () => {
      if (reviewOnly && page > 0 && contacts.data?.rows.length === 1) setPage(page - 1);
      void qc.invalidateQueries({ queryKey: ["de-agencies"] });
      toast.success("Kontakt schválen k ověření e-mailu.");
    },
    onError: () => toast.error("Schválení kontaktu se nepodařilo."),
  });
  const approveAll = useMutation({
    mutationFn: async () => {
      const { error, count } = await db.from("marketing_leads")
        .update({ outreach_import_review: false, outreach_email_ready: false })
        .match(segment)
        .eq("outreach_import_review", true)
        .or("marketing_notifications.is.null,marketing_notifications.eq.true")
        .or("email_notifications.is.null,email_notifications.eq.true")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count as number;
    },
    onSuccess: (count) => {
      setPage(0);
      void qc.invalidateQueries({ queryKey: ["de-agencies"] });
      toast.success(`Schváleno ${count?.toLocaleString("cs-CZ") ?? "?"} kontaktů k ověření e-mailu.`);
    },
    onError: () => toast.error("Hromadné schválení se nepodařilo."),
  });
  const total = contacts.data?.count ?? 0;
  return <section className="space-y-4">
    <h2 className="text-xl font-semibold">Marketingové agentury · Německo</h2>
    <div className="rounded-2xl border bg-muted/50 p-4 space-y-2 text-sm">
      <strong>Šablony pro německé agentury</strong>
      <p>První oslovení i připomenutí jsou oddělené od české kampaně. Aktivní šablona v ručním režimu nespouští automatickou rozesílku. Před oslovením je nutné ověřit oprávnění ke kontaktování konkrétní firmy; tento přehled žádné e-maily neodesílá.</p>
      {["atmosferi-agenturen-de", "atmosferi-agenturen-de-followup"].map((slug, i) => {
        const tpl = deTemplates.data?.find(t => t.slug === slug);
        return <div key={slug} className="flex flex-wrap gap-2 items-center justify-between border-t pt-2">
          <span>{i === 0 ? "První oslovení" : "Připomenutí"} · {tpl?.subject || (deTemplates.isLoading ? "Načítám…" : "Šablona chybí")}</span>
          <span className={tpl?.is_enabled && tpl.trigger_type !== "manual" ? "text-red-700" : "text-muted-foreground"}>
            {deTemplates.isLoading ? "Načítám stav…" : !tpl ? "Šablona chybí" : !tpl.is_enabled ? "Vypnutá" : tpl.trigger_type === "manual" ? "Aktivní · pouze ruční použití" : "Pozor: automatická"}
          </span>
        </div>;
      })}
      <Link className="inline-block underline" to="/emaily/sablony">Spravovat německé šablony v knihovně</Link>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{["V publiku", "K prověření", "E-mail ověřen", "Zprávy ve frontě", "Odesláno", "Selhalo"].map((label, i) =>
      <div key={label} className="rounded-2xl bg-muted p-4"><div className="text-sm">{label}</div>
        <strong className="text-2xl tabular-nums">{counts.data?.[i]?.toLocaleString("cs-CZ") ?? "–"}</strong></div>)}</div>
    <div className="flex flex-wrap items-center gap-3">{[true, false].map(value =>
      <Button key={String(value)} variant={value === reviewOnly ? "default" : "outline"} size="sm"
        onClick={() => { setReviewOnly(value); setPage(0); }}>{value ? "K prověření" : "Celé publikum"}</Button>)}
      {reviewOnly && (counts.data?.[1] ?? 0) > 0 && (
        <Button size="sm" variant="destructive" disabled={approveAll.isPending}
          onClick={() => { if (window.confirm(`Schválit všech ${(counts.data?.[1] ?? 0).toLocaleString("cs-CZ")} kontaktů čekajících na prověření?`)) approveAll.mutate(); }}>
          {approveAll.isPending ? "Schvaluji…" : `Schválit vše (${(counts.data?.[1] ?? 0).toLocaleString("cs-CZ")})`}
        </Button>
      )}
      <Link className="text-sm underline" to="/emaily/akvizice">Nastavení kampaně a šablona</Link></div>
    {(contacts.isError || counts.isError) && <p role="alert">Některá data publika se nepodařilo načíst.</p>}
    {contacts.isLoading && <p>Načítám kontakty…</p>}
    <div className="divide-y rounded-2xl bg-white px-4">{contacts.data?.rows.map(c => {
      const blocked = c.email_notifications === false || c.marketing_notifications === false ||
        c.tags?.some(tag => ["známé", "email:suppressed"].includes(tag));
      const evidence = c.description?.match(/^Zdroj e-mailu: (https?:\/\/[^\s]+)$/m)?.[1];
      const specialtyReview = c.description?.includes("Specializace k ověření");
      return <div key={c.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
        <div><strong>{c.company_name || c.email}</strong><div>{c.email} · {c.city}</div>
          {c.subcategory && <div>{c.subcategory}</div>}{specialtyReview && <div>Specializace k ověření</div>}
          {evidence && <a href={evidence} target="_blank" rel="noopener noreferrer" className="underline">Ověřit zdroj e-mailu</a>}</div>
        {blocked ? <span>Vyřazeno z oslovení</span> : c.outreach_import_review ?
          <Button size="sm" variant="outline" disabled={approve.isPending} onClick={() => approve.mutate(c.id)}>Schválit kontakt</Button> :
          <span>{c.outreach_email_ready ? "E-mail ověřen" : "Čeká na ověření e-mailu"}</span>}
      </div>;
    })}</div>
    {contacts.isSuccess && !contacts.data.rows.length && <p>V tomto výběru nejsou žádné kontakty.</p>}
    <div className="flex items-center justify-end gap-3 text-sm">{total > 0 && <span>{page * size + 1}–{Math.min((page + 1) * size, total)} z {total}</span>}
      <Button size="sm" variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>Předchozí</Button>
      <Button size="sm" variant="outline" disabled={(page + 1) * size >= total} onClick={() => setPage(page + 1)}>Další</Button></div>
  </section>;
}

export default function AcquisitionWorkspace() {
  return <div className="space-y-5">
    <nav aria-label="Akvizice" className="flex flex-wrap gap-2">{tabs.map(([path, title]) =>
      <NavLink key={path} end to={`/emaily/akvizice${path ? "/" + path : ""}`}
        className={({ isActive }) => `rounded-full px-4 py-2 text-sm ${isActive ? "bg-foreground text-background" : "bg-muted"}`}>{title}</NavLink>)}</nav>
    <Routes>
      <Route index element={<CampaignsOverview acquisitionOnly />} />
      <Route path="agentury-de" element={<GermanAgencies />} />
      <Route path="agentury-cz" element={<AdminAgencyOutreach embedded />} />
      <Route path="fronta" element={<AdminOutbox />} />
      <Route path="sber" element={<CollectorProgress />} />
      <Route path="*" element={<Navigate to="/emaily/akvizice" replace />} />
    </Routes>
  </div>;
}
