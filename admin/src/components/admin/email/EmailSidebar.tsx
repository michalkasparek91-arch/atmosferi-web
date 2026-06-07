import React from "react";
import { 
  BarChart3, Send, Zap, Users, Layout, Settings2, 
  ChevronRight, Sparkles, Database, Mail
} from "lucide-react";

interface SidebarItemProps {
  id: string;
  label: string;
  icon: any;
  active: boolean;
  onClick: (id: string) => void;
  badge?: string | number;
}

const SidebarItem = ({ id, label, icon: Icon, active, onClick, badge }: SidebarItemProps) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group ${
      active 
        ? "bg-primary text-white shadow-sm" 
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg ${active ? "bg-white/20" : "bg-muted group-hover:bg-background dark:group-hover:bg-zinc-800 shadow-sm"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className={`text-xs font-bold ${active ? "text-white" : "text-foreground/80"}`}>{label}</span>
    </div>
    {badge ? (
      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
        {badge}
      </span>
    ) : (
      <ChevronRight className={`h-3 w-3 opacity-0 group-hover:opacity-50 transition-all ${active ? "text-white" : ""}`} />
    )}
  </button>
);

export const EmailSidebar = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => {
  return (
    <div className="w-64 shrink-0 h-full flex flex-col gap-8 pr-6 border-r border-border/50 hidden lg:flex">
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Marketing</p>
          <div className="space-y-1.5">
            <SidebarItem 
              id="dashboard" 
              label="Dashboard" 
              icon={BarChart3} 
              active={activeTab === "dashboard"} 
              onClick={onTabChange} 
            />
            <SidebarItem 
              id="newsletter" 
              label="Newsletter Studio" 
              icon={Sparkles} 
              active={activeTab === "newsletter"} 
              onClick={onTabChange} 
              badge="AI"
            />
            <SidebarItem 
              id="campaign" 
              label="Hromadný rozesílač" 
              icon={Send} 
              active={activeTab === "campaign" || activeTab === "campaign-sniper"} 
              onClick={onTabChange} 
            />
          </div>
        </div>

        <div>
          <p className="px-3 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Audience</p>
          <div className="space-y-1.5">
            <SidebarItem 
              id="crm" 
              label="Kontakty & CRM" 
              icon={Users} 
              active={activeTab === "crm"} 
              onClick={onTabChange} 
            />
            <SidebarItem 
              id="templates" 
              label="Šablony e-mailů" 
              icon={Layout} 
              active={activeTab === "templates"} 
              onClick={onTabChange} 
            />
          </div>
        </div>

        <div>
          <p className="px-3 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Systém</p>
          <div className="space-y-1.5">
            <SidebarItem 
              id="analytics" 
              label="Detailní Analytika" 
              icon={Database} 
              active={activeTab === "analytics"} 
              onClick={onTabChange} 
            />
            <SidebarItem 
              id="settings" 
              label="Nastavení studia" 
              icon={Settings2} 
              active={activeTab === "settings"} 
              onClick={onTabChange} 
            />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto p-4 rounded-3xl bg-slate-100 dark:bg-muted/30 border border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-sm">
            <Zap className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-foreground">Live Status</p>
            <p className="text-[9px] text-muted-foreground font-medium">Všechny systémy OK</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-bold">
            <span className="text-muted-foreground">REACH</span>
            <span className="text-foreground">5,240 kontaktů</span>
          </div>
          <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[85%]" />
          </div>
        </div>
      </div>
    </div>
  );
};
