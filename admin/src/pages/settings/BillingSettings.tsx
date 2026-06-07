import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building2, Save } from "lucide-react";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";

interface BillingProfile {
  user_id: string;
  company_name: string | null;
  ico: string | null;
  dic: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  bank_account: string | null;
}

const BillingSettings = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<BillingProfile>>({
    company_name: "",
    ico: "",
    dic: "",
    street: "",
    city: "",
    zip: "",
    country: "Česká republika",
    bank_account: "",
  });

  const { data: billingProfile, isLoading } = useQuery({
    queryKey: ["billing-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("billing_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as BillingProfile | null;
    },
  });

  useEffect(() => {
    if (billingProfile) {
      setFormData({
        company_name: billingProfile.company_name || "",
        ico: billingProfile.ico || "",
        dic: billingProfile.dic || "",
        street: billingProfile.street || "",
        city: billingProfile.city || "",
        zip: billingProfile.zip || "",
        country: billingProfile.country || "Česká republika",
        bank_account: billingProfile.bank_account || "",
      });
    }
  }, [billingProfile]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<BillingProfile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("billing_profiles")
        .upsert({
          user_id: user.id,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-profile"] });
      toast.success("Fakturační údaje byly uloženy");
    },
    onError: (error) => {
      toast.error("Nepodařilo se uložit údaje: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const formatIco = (value: string) => {
    // Remove non-digits and limit to 8 characters
    return value.replace(/\D/g, "").slice(0, 8);
  };

  const formatDic = (value: string) => {
    // Format: CZ followed by digits
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.startsWith("CZ")) {
      return "CZ" + cleaned.slice(2).replace(/\D/g, "").slice(0, 10);
    }
    return cleaned.slice(0, 12);
  };

  const formatZip = (value: string) => {
    // Format: XXX XX
    const digits = value.replace(/\D/g, "").slice(0, 5);
    if (digits.length > 3) {
      return digits.slice(0, 3) + " " + digits.slice(3);
    }
    return digits;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Fakturační údaje</h2>
        <p className="text-muted-foreground">
          Tyto údaje budou použity na fakturách za zakoupené kredity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Údaje odběratele
          </CardTitle>
          <CardDescription>
            Vyplňte fakturační údaje vaší firmy nebo živnosti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Název firmy / Jméno a příjmení *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name || ""}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Jan Novák - Instalatérství"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ico">IČO (volitelné)</Label>
                  <Input
                    id="ico"
                    value={formData.ico || ""}
                    onChange={(e) => setFormData({ ...formData, ico: formatIco(e.target.value) })}
                    placeholder="12345678"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dic">DIČ (volitelné)</Label>
                  <Input
                    id="dic"
                    value={formData.dic || ""}
                    onChange={(e) => setFormData({ ...formData, dic: formatDic(e.target.value) })}
                    placeholder="CZ12345678"
                    maxLength={12}
                  />
                </div>
              </div>

              <AddressAutocompleteInput
                onSelect={(result) => {
                  setFormData(prev => ({
                    ...prev,
                    street: result.streetName && result.streetNumber
                      ? `${result.streetName} ${result.streetNumber}`
                      : result.streetName,
                    city: result.city,
                    zip: result.postalCode,
                  }));
                }}
                placeholder="Vyhledat adresu..."
              />

              <div className="space-y-2">
                <Label htmlFor="street">Ulice a číslo popisné *</Label>
                <Input
                  id="street"
                  value={formData.street || ""}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  placeholder="Hlavní 123"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="city">Město *</Label>
                  <Input
                    id="city"
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Praha"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">PSČ *</Label>
                  <Input
                    id="zip"
                    value={formData.zip || ""}
                    onChange={(e) => setFormData({ ...formData, zip: formatZip(e.target.value) })}
                    placeholder="110 00"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Země</Label>
                <Input
                  id="country"
                  value={formData.country || ""}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Česká republika"
                />
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="bank_account" className="text-primary font-semibold">Číslo bankovního účtu</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account || ""}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  placeholder="Např. 12345678/0100"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Slouží pro automatické generování platebního QR kódu na předávacím protokolu.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Uložit fakturační údaje
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSettings;
