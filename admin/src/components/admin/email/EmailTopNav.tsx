import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, Send, Users, Layout, 
  Settings2, Sparkles, Inbox, History
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
    className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-semibold transition-all h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground data-[state=active]:text-foreground"
  >
    <span className="truncate flex items-center justify-center min-w-0">
      {label}
      {badge && (
        <span className="ml-1.5 text-[8px] font-black min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full bg-primary text-white">
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
  const activeTab = pathParts[3] || "sber";

  const onTabChange = (tab: string) => {
    navigate(`/admin/emaily/${tab}`);
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

  const { data: campaignCount = 0 } = useQuery({
    queryKey: ["marketing-campaigns-count-nav"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("marketing_campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft");
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const totalPending = campaignCount;

  return (
    <div className="flex items-center overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 w-[calc(100%+2rem)] md:w-full pb-1">
      <div className="flex items-center justify-between w-full min-w-max gap-4">
        {/* Left Side: Daily Routine */}
        <div className="bg-muted/40 p-1 rounded-full h-9 flex items-center shrink-0">
          <NavItem 
            id="sber" 
            label="Sběr" 
            icon={Sparkles} 
            active={activeTab === "sber"} 
            onClick={onTabChange} 
          />
          <NavItem 
            id="outbox" 
            label="Outbox" 
            icon={Inbox} 
            active={activeTab === "outbox"} 
            onClick={onTabChange} 
            badge={outboxReadyCount > 0 ? outboxReadyCount.toString() : undefined}
          />
          <NavItem 
            id="sablony" 
            label="Šablony" 
            icon={Layout} 
            active={activeTab === "sablony"} 
            onClick={onTabChange} 
          />
        </div>

        {/* Right Side: Settings & Data */}
        <div className="bg-muted/40 p-1 rounded-full h-9 flex items-center shrink-0">
        <NavItem 
          id="crm" 
          label="CRM" 
          icon={Users} 
          active={activeTab === "crm"} 
          onClick={onTabChange} 
        />
        <NavItem 
          id="historie" 
          label="Historie" 
          icon={History} 
          active={activeTab === "historie" || activeTab === "prehled"} 
          onClick={onTabChange} 
        />
        <button
          onClick={() => navigate("/admin/seo-obsah?tab=automation")}
          title="Nastavení automatizací"
          className="ml-2 inline-flex items-center justify-center rounded-full w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-white dark:hover:bg-slate-900 transition-all"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>
      </div>
    </div>
  );
};
