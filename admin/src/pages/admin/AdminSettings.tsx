import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings, Loader2, Save } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SettingCard {
  key: string;
  title: string;
  description: string;
}

const settingCards: SettingCard[] = [
  { key: "free_credits_new_user", title: "Kredity pro nové uživatele", description: "Počet kreditů přidělených při registraci" },
  { key: "maintenance_mode", title: "Režim údržby", description: "Zapnutí dočasně omezí přístup k platformě" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase.from("platform_settings").select("*");
      if (error) {
        console.error(error);
        toast.error("Chyba při načítání nastavení");
      } else {
        const map: Record<string, any> = {};
        data?.forEach(s => { map[s.key] = s.value; });
        setSettings(map);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (key: string) => {
    setSaving(key);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: settings[key], updated_at: new Date().toISOString(), updated_by: userData.user?.id })
      .eq("key", key);
    
    if (error) {
      toast.error("Chyba při ukládání");
    } else {
      toast.success("Nastavení uloženo");
    }
    setSaving(null);
  };

  const updateValue = (key: string, path: string, val: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [path]: val },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Settings}
        title="Nastavení"
        subtitle="Konfigurace systému a parametrů platformy"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Free credits */}
        <Card className="rounded-xl shadow-sm border border-border">
          <CardHeader className="pb-3 px-5">
            <p className="text-[10px] font-medium text-muted-foreground opacity-60">Uživatelé</p>
            <CardTitle className="text-sm font-semibold text-foreground">Kredity pro nové uživatele</CardTitle>
            <CardDescription className="text-[10px] font-medium text-muted-foreground/70">Počet kreditů při registraci</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground opacity-60 mb-1.5 block">Počet kreditů</Label>
              <Input
                type="number"
                value={settings.free_credits_new_user?.amount || 0}
                onChange={e => updateValue("free_credits_new_user", "amount", parseInt(e.target.value) || 0)}
                className="h-8 text-[10px] bg-muted/40 border-border/60 rounded-xl focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <Button
              onClick={() => handleSave("free_credits_new_user")}
              disabled={saving === "free_credits_new_user"}
              size="sm"
              className="w-full h-8 rounded-full text-[10px] font-medium active:scale-95 transition-all"
            >
              {saving === "free_credits_new_user" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5 opacity-70" />}
              Uložit nastavení
            </Button>
          </CardContent>
        </Card>

        {/* Maintenance mode */}
        <Card className="rounded-xl shadow-sm border border-border">
          <CardHeader className="pb-3 px-5">
            <p className="text-[10px] font-medium text-muted-foreground opacity-60">Provoz</p>
            <CardTitle className="text-sm font-semibold text-foreground">Režim údržby</CardTitle>
            <CardDescription className="text-[10px] font-medium text-muted-foreground/70">Dočasně omezí přístup k platformě</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            <div className="flex items-center justify-between py-2 px-3 bg-muted/30 border border-border/40 rounded-xl">
              <Label className="text-[10px] font-medium opacity-70">Aktivní stav</Label>
              <Switch
                checked={settings.maintenance_mode?.enabled || false}
                onCheckedChange={val => updateValue("maintenance_mode", "enabled", val)}
                className="data-[state=active]:bg-primary"
              />
            </div>
            <Button
              onClick={() => handleSave("maintenance_mode")}
              disabled={saving === "maintenance_mode"}
              size="sm"
              className="w-full h-8 rounded-full text-[10px] font-medium active:scale-95 transition-all"
            >
              {saving === "maintenance_mode" ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5 opacity-70" />}
              Uložit stav
            </Button>
          </CardContent>
        </Card>

        {/* Credit pricing */}
        <Card className="rounded-xl shadow-sm md:col-span-2">
          <CardHeader className="pb-3 px-5 border-b border-border/40">
            <CardTitle className="text-sm font-semibold">Ceník kreditů</CardTitle>
            <CardDescription className="text-[10px] font-medium text-muted-foreground/70">Konfigurace balíčků kreditů</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(settings.credit_pricing?.packages || []).map((pkg: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-medium opacity-60">Kreditů</Label>
                      <Input
                        type="number"
                        value={pkg.points}
                        onChange={e => {
                          const packages = [...(settings.credit_pricing?.packages || [])];
                          packages[i] = { ...packages[i], points: parseInt(e.target.value) || 0 };
                          updateValue("credit_pricing", "packages", packages);
                        }}
                        className="h-8 text-[10px] bg-background border-border/60 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-medium opacity-60">Cena (Kč)</Label>
                      <Input
                        type="number"
                        value={pkg.price}
                        onChange={e => {
                          const packages = [...(settings.credit_pricing?.packages || [])];
                          packages[i] = { ...packages[i], price: parseInt(e.target.value) || 0 };
                          updateValue("credit_pricing", "packages", packages);
                        }}
                        className="h-9 text-[13px] bg-background border-border/60 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={() => handleSave("credit_pricing")}
              disabled={saving === "credit_pricing"}
              className="w-full mt-6 h-8 rounded-full text-[10px] font-medium active:scale-95 transition-all"
            >
              {saving === "credit_pricing" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Uložit ceník
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
