import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

// Import rozdělených komponent
import { CampaignWizard } from "@/components/admin/notifications/CampaignWizard";
import { CampaignHistory } from "@/components/admin/notifications/CampaignHistory";
import { AutomationSettings } from "@/components/admin/notifications/AutomationSettings";
import { AnalyticsDashboard } from "@/components/admin/notifications/AnalyticsDashboard";
import { DiagnosticsPanel } from "@/components/admin/notifications/DiagnosticsPanel";
import { SubscribersList } from "@/components/admin/notifications/SubscribersList";

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [activeCampaignsTab, setActiveCampaignsTab] = useState("compose");
  const [duplicatedCampaign, setDuplicatedCampaign] = useState<any>(null);

  const handleDuplicate = (campaign: any) => {
    setDuplicatedCampaign(campaign);
    setActiveTab("campaigns");
    setActiveCampaignsTab("compose");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Bell}
        title="Centrum push notifikací"
        subtitle="Správa manuálních kampaní a automatických šablon"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="bg-muted/40 p-1 rounded-full h-9 overflow-x-auto w-full justify-start md:justify-center md:w-fit">
            <TabsTrigger value="campaigns" className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Manuální</TabsTrigger>
            <TabsTrigger value="automation" className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Automatizace</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Analytika</TabsTrigger>
            <TabsTrigger value="diagnostics" className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Diagnostika</TabsTrigger>
            <TabsTrigger value="subscribers" className="rounded-full text-[10px] px-4 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Odběratelé</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="campaigns" className="space-y-6 m-0">
          <Tabs value={activeCampaignsTab} onValueChange={setActiveCampaignsTab} className="space-y-6 w-full">
            <div className="flex justify-center mb-2">
              <TabsList className="bg-muted/40 p-1 rounded-full h-9">
                <TabsTrigger value="compose" className="rounded-full text-[10px] px-8 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">Nová kampaň</TabsTrigger>
                <TabsTrigger value="history" className="rounded-full text-[10px] px-8 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all">Historie kampaní</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="compose" className="m-0">
              <CampaignWizard 
                initialData={duplicatedCampaign} 
                onClearInitialData={() => setDuplicatedCampaign(null)} 
              />
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <CampaignHistory onDuplicate={handleDuplicate} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6 m-0">
          <AutomationSettings />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 m-0">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6 m-0">
          <DiagnosticsPanel />
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-6 m-0">
          <SubscribersList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
