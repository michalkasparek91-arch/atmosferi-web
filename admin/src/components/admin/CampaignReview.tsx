import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, Save, Loader2, Eye, Mail, 
  Users, UserCheck, Layout, AlertCircle, Zap,
  X, Image as ImageIcon, Sparkles, Monitor, Smartphone,
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import ModularEmailEditorDialog from "@/components/admin/email/ModularEmailEditor";

export default function CampaignReview() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);

  // Fetch pending drafts
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["marketing-campaigns-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-newsletter-draft");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns-drafts"] });
      toast({ 
        title: "Generování spuštěno", 
        description: "AI začala připravovat nový draft v prémiovém Magazine formátu.",
      });
    },
    onError: async (err: any) => {
      let errorMessage = err.message;
      try {
        if (err.context?.response) {
          const body = await err.context.response.json();
          if (body.error) errorMessage = body.error;
        }
      } catch (e) {
        console.error("Failed to parse error response", e);
      }
      toast({ title: "Chyba generování", description: errorMessage, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns-drafts"] });
      setEditingCampaign(null);
      toast({ title: "Smazáno", description: "Draft byl úspěšně odstraněn." });
    },
    onError: (err: any) => {
      toast({ title: "Chyba při mazání", description: err.message, variant: "destructive" });
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={generateMutation.isPending}
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6 shadow-md"
        >
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-emerald-500 text-emerald-500" />}
          Generovat AI Draft
        </Button>
      </div>

      <div className="grid gap-4">
        {campaigns?.length === 0 ? (
          <Card className="border-dashed border-2 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="h-16 w-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 opacity-20" />
              </div>
              <p className="font-bold">Žádné nové drafty k recenzi</p>
              <p className="text-xs max-w-xs text-center mt-1">Klikněte na tlačítko výše a nechte AI připravit nový newsletter založený na aktuálním dění.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns?.map((c) => (
              <div 
                key={c.id} 
                className="group bg-card hover:bg-muted/50 border border-border/50 rounded-xl p-3 flex items-center justify-between gap-4 transition-all cursor-pointer shadow-sm"
                onClick={() => setEditingCampaign(c)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 text-base shadow-inner">
                    {c.emoji || "✨"}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 uppercase bg-background shadow-sm border-emerald-500/20 text-emerald-600">
                        {c.layout_type === 'magazine' ? 'Magazine' : 'Standard'}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {new Date(c.created_at).toLocaleDateString('cs-CZ')} • {c.audience_type === 'workers' ? 'Řemeslníci' : c.audience_type === 'customers' ? 'Zákazníci' : 'Všichni'}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-foreground truncate mt-0.5 group-hover:text-emerald-600 transition-colors">
                      {c.subject || "(bez předmětu)"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-lg text-xs font-semibold hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCampaign(c);
                    }}
                  >
                    Otevřít ve Studiu
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Opravdu chcete tento draft smazat?")) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingCampaign && (
        <NewsletterStudioDialog 
          campaign={editingCampaign} 
          onClose={() => setEditingCampaign(null)} 
        />
      )}
    </div>
  );
}

function NewsletterStudioDialog({ campaign, onClose }: { campaign: any, onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase
        .from("marketing_campaigns")
        .update({
          subject: payload.subject,
          body: payload.body,
          cta_text: payload.cta_text,
          cta_url: payload.cta_url,
          secondary_text: payload.secondary_text,
          sender_email: payload.sender_email,
          hero_image_url: payload.hero_image_url,
          layout_type: payload.layout_type,
          urgency_banner_enabled: payload.urgency_banner_enabled,
          urgency_banner_text: payload.urgency_banner_text,
          promo_banner_enabled: payload.promo_banner_enabled,
          promo_banner_text: payload.promo_banner_text,
          ps_footer_enabled: payload.ps_footer_enabled,
          ps_footer_text: payload.ps_footer_text,
          show_job_widget: payload.show_job_widget,
          show_cta_button: payload.show_cta_button,
          job_description_snippet: payload.job_description_snippet,
          segment_filters: payload.segment_filters,
          template_id: payload.id !== "custom" && payload.id ? payload.id : null
        })
        .eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns-drafts"] });
      onClose();
      toast({ title: "Kampaň uložena", description: "Změny byly úspěšně uloženy." });
    },
    onError: (err: any) => {
      toast({ title: "Chyba ukládání", description: err.message, variant: "destructive" });
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: async (payload: any) => {
      // First save the latest data
      await updateMutation.mutateAsync(payload);
      
      // Then broadcast
      const { error } = await supabase
        .from("marketing_campaigns")
        .update({ status: "pending" })
        .eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-campaigns-drafts"] });
      onClose();
      toast({ 
        title: "Newsletter odeslán! 🚀", 
        description: "Kampaň byla úspěšně zařazena do fronty k odeslání.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Chyba odesílání", description: err.message, variant: "destructive" });
    }
  });

  return (
    <ModularEmailEditorDialog
      mode="campaign"
      isOpen={true}
      onClose={onClose}
      initialData={{
        id: campaign.template_id || "",
        name: campaign.name || "",
        slug: campaign.template_id ? undefined : "custom",
        subject: campaign.subject || "",
        body: campaign.body || "",
        cta_text: campaign.cta_text || "",
        cta_url: campaign.cta_url || "",
        secondary_text: campaign.secondary_text || "",
        hero_image_url: campaign.hero_image_url || "",
        layout_type: campaign.layout_type || "standard",
        urgency_banner_enabled: campaign.urgency_banner_enabled ?? true,
        urgency_banner_text: campaign.urgency_banner_text || "",
        promo_banner_enabled: campaign.promo_banner_enabled ?? true,
        promo_banner_text: campaign.promo_banner_text || "",
        ps_footer_enabled: campaign.ps_footer_enabled ?? false,
        ps_footer_text: campaign.ps_footer_text || "",
        show_job_widget: campaign.show_job_widget ?? true,
        show_cta_button: campaign.show_cta_button ?? true,
        job_description_snippet: campaign.job_description_snippet || "",
        segment_filters: campaign.segment_filters || {}
      }}
      onSave={(data) => updateMutation.mutate(data)}
      isSaving={updateMutation.isPending}
      onBroadcast={(data) => broadcastMutation.mutate(data)}
      isBroadcasting={broadcastMutation.isPending}
    />
  );
}
