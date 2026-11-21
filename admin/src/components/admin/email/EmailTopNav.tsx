import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// One navigation for everything we send: overview first, then each part.
const TABS: { id: string; label: string; match: string[] }[] = [
  { id: "prehled", label: "Přehled", match: ["prehled"] },
  { id: "akvizice", label: "Akvizice", match: ["akvizice", "agentury", "fronta", "outbox", "historie"] },
  { id: "kontakty", label: "Publikum", match: ["kontakty", "crm"] },
  { id: "sablony", label: "Šablony", match: ["sablony"] },
  { id: "odpovedi", label: "Odpovědi", match: ["odpovedi"] },
  { id: "ai-asistent", label: "AI a sběr", match: ["ai-asistent", "sber", "ai-data", "sablony-ai"] },
];

export const EmailTopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const current = location.pathname.split("/")[2] || "prehled";
  const active = TABS.find(t => t.match.includes(current))?.id || "prehled";

  const { data: ready = 0 } = useQuery({
    queryKey: ["outbox-ready-count-nav"],
    queryFn: async () => {
      const { count, error } = await supabase.from("email_outbox").select("*", { count: "exact", head: true }).eq("status", "pending");
      return error ? 0 : count || 0;
    },
    refetchInterval: 30000,
  });
  const { data: unread = 0 } = useQuery({
    queryKey: ["replies-unread-nav"],
    queryFn: async () => {
      const { count, error } = await (supabase as any).from("email_replies").select("id", { count: "exact", head: true }).eq("status", "unread");
      return error ? 0 : count || 0;
    },
    refetchInterval: 60000,
  });
  const badge: Record<string, number> = { akvizice: ready, odpovedi: unread };

  return (
    <nav aria-label="Kampaně" className="flex shrink-0 gap-1 overflow-x-auto no-scrollbar rounded-full bg-white p-1 w-fit max-w-full">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => navigate(`/emaily/${t.id}`)}
          aria-current={active === t.id ? "page" : undefined}
          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 h-9 text-sm font-medium transition-colors ${
            active === t.id ? "bg-foreground text-white" : "text-foreground/65 hover:text-foreground hover:bg-neutral-100"}`}
        >
          {t.label}
          {badge[t.id] ? (
            <span className={`text-[11px] tabular-nums rounded-full px-1.5 min-w-[20px] h-5 inline-flex items-center justify-center ${
              active === t.id ? "bg-white/20" : "bg-neutral-100"}`}>{badge[t.id]}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
};
