import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EmailMarket = {
  id: string; // e.g. "cz"
  code: string; // e.g. "CZ"
  name: string; // e.g. "Česko"
  lang: string; // e.g. "Čeština"
};

const DEFAULT_MARKETS: EmailMarket[] = [
  { id: "cz", code: "CZ", name: "Česko", lang: "Čeština" },
  { id: "de", code: "DE", name: "Německo", lang: "Němčina" },
  { id: "at", code: "AT", name: "Rakousko", lang: "Němčina" }
];

export function useMarkets() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["app_settings", "email_markets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "email_markets")
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        return data.value as EmailMarket[];
      }
      return DEFAULT_MARKETS;
    }
  });

  const addMarketMutation = useMutation({
    mutationFn: async (newMarket: EmailMarket) => {
      const currentMarkets = query.data || DEFAULT_MARKETS;
      const updatedMarkets = [...currentMarkets, newMarket];
      
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "email_markets", value: updatedMarkets as any }, { onConflict: "key" });
        
      if (error) throw error;
      return updatedMarkets;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings", "email_markets"] });
    }
  });

  return {
    markets: query.data || DEFAULT_MARKETS,
    isLoading: query.isLoading,
    addMarket: addMarketMutation.mutateAsync,
    isAdding: addMarketMutation.isPending
  };
}
