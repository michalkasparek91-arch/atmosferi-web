import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const ApiKeysSettings = () => {
  const queryClient = useQueryClient();

  const [keys, setKeys] = useState({
    GEMINI_API_KEY: "",
    OPENROUTER_API_KEY: "",
    GROQ_API_KEY: "",
    GOOGLE_PLACES_API_KEY: "",
    DEEPSEEK_API_KEY: "",
    SILICONFLOW_API_KEY: "",
  });

  const { isLoading } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "api_keys")
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching keys:", error);
        return null;
      }

      if (data?.value) {
        const parsed = data.value as any;
        setKeys({
          GEMINI_API_KEY: parsed.GEMINI_API_KEY || "",
          OPENROUTER_API_KEY: parsed.OPENROUTER_API_KEY || "",
          GROQ_API_KEY: parsed.GROQ_API_KEY || "",
          GOOGLE_PLACES_API_KEY: parsed.GOOGLE_PLACES_API_KEY || "",
          DEEPSEEK_API_KEY: parsed.DEEPSEEK_API_KEY || "",
          SILICONFLOW_API_KEY: parsed.SILICONFLOW_API_KEY || "",
        });
      }
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "api_keys", value: keys as any }, { onConflict: "key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("API klíče uloženy", { description: "Klíče byly úspěšně bezpečně uloženy do databáze." });
      queryClient.invalidateQueries({ queryKey: ["admin-api-keys"] });
    },
    onError: (err: any) => {
      toast.error("Chyba při ukládání", { description: err.message });
    }
  });

  return (
    <Card className="border-border/40 shadow-sm w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Nastavení API klíčů
        </CardTitle>
        <CardDescription>
          Tyto klíče se použijí pro automatický sběr leadů a obohacování. 
          Prázdné hodnoty se pokusí načíst klíče ze Supabase Secrets.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gemini">Gemini API Key</Label>
              <Input 
                id="gemini" 
                type="password" 
                placeholder="AIzaSy..." 
                value={keys.GEMINI_API_KEY} 
                onChange={(e) => setKeys({...keys, GEMINI_API_KEY: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openrouter">OpenRouter API Key</Label>
              <Input 
                id="openrouter" 
                type="password" 
                placeholder="sk-or-v1-..." 
                value={keys.OPENROUTER_API_KEY} 
                onChange={(e) => setKeys({...keys, OPENROUTER_API_KEY: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groq">Groq API Key</Label>
              <Input 
                id="groq" 
                type="password" 
                placeholder="gsk_..." 
                value={keys.GROQ_API_KEY} 
                onChange={(e) => setKeys({...keys, GROQ_API_KEY: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="places">Google Places API Key</Label>
              <Input 
                id="places" 
                type="password" 
                placeholder="AIzaSy..." 
                value={keys.GOOGLE_PLACES_API_KEY} 
                onChange={(e) => setKeys({...keys, GOOGLE_PLACES_API_KEY: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deepseek">DeepSeek API Key (deepseek.com)</Label>
              <Input 
                id="deepseek" 
                type="password" 
                placeholder="sk-..." 
                value={keys.DEEPSEEK_API_KEY} 
                onChange={(e) => setKeys({...keys, DEEPSEEK_API_KEY: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siliconflow">SiliconFlow API Key (siliconflow.cn)</Label>
              <Input 
                id="siliconflow" 
                type="password" 
                placeholder="sk-..." 
                value={keys.SILICONFLOW_API_KEY} 
                onChange={(e) => setKeys({...keys, SILICONFLOW_API_KEY: e.target.value})} 
              />
            </div>
            
            <div className="md:col-span-2 pt-2">
              <Button 
                className="w-full gap-2" 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Uložit klíče
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
