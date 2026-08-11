import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Send, 
  Users, 
  History, 
  Sparkles, 
  Settings2 
} from "lucide-react";

interface NavItemProps {
  id: string;
  label: string;
  icon: any;
  active: boolean;
  onClick: (id: string) => void;
  badge?: string;
}

const NavItem = ({ id, label, icon: Icon, active, onClick, badge }: NavItemProps) => (
  <button
    onClick={() => onClick(id)}
    title={label}
    data-state={active ? "active" : "inactive"}
    className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all h-9 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white data-[state=active]:text-foreground border border-transparent data-[state=active]:border-border/60"
  >
    <Icon className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground group-hover:text-foreground" />
    <span className="truncate flex items-center justify-center min-w-0">
      {label}
      {badge && (
        <span className="ml-2 text-[10px] font-black min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-primary text-white">
          {badge}
        </span>
      )}
    </span>
  </button>
);

export const EmailTopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const pathParts = location.pathname.split("/");
  const currentTab = pathParts[2] || "fronta";

  // Normalize legacy routes to 3 core tabs
  let activeTab = "fronta";
  if (currentTab === "kontakty" || currentTab === "ai-data" || currentTab === "crm") {
    activeTab = "kontakty";
  } else if (currentTab === "sablony-ai" || currentTab === "sablony" || currentTab === "sber") {
    activeTab = "sablony-ai";
  } else {
    activeTab = "fronta";
  }

  const onTabChange = (tab: string) => {
    navigate(`/emaily/${tab}`);
  };

  const { data: outboxReadyCount = 0 } = useQuery({
    queryKey: ["outbox-ready-count-nav"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_outbox")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  return (
    <div className="flex items-center justify-between bg-zinc-100/80 dark:bg-zinc-900/80 p-1.5 rounded-2xl border border-border/60 mb-6">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
        <NavItem 
          id="fronta" 
          label="Fronta & Historie" 
          icon={History} 
          active={activeTab === "fronta"} 
          onClick={onTabChange} 
          badge={outboxReadyCount > 0 ? `${outboxReadyCount}/300` : undefined}
        />
        <NavItem 
          id="kontakty" 
          label="Kontakty & Publiku" 
          icon={Users} 
          active={activeTab === "kontakty"} 
          onClick={onTabChange} 
        />
        <NavItem 
          id="sablony-ai" 
          label="Šablony & AI Asistent" 
          icon={Sparkles} 
          active={activeTab === "sablony-ai"} 
          onClick={onTabChange} 
        />
      </div>

      <div className="hidden sm:flex items-center pr-2">
        <button
          onClick={() => navigate("/seo-obsah?tab=automation")}
          title="Nastavení automatizací"
          className="inline-flex items-center justify-center rounded-xl w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 transition-all border border-transparent hover:border-border"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
