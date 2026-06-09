import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const ContactUpload = () => {
  const [formData, setFormData] = useState({
    company_name: "",
    full_name: "",
    email: "",
    phone: "",
    website: "",
    city: "",
    full_address: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    toast.loading("Ukládám kontakt...", { id: "upload-contact" });
    try {
      const res = await supabase.functions.invoke("upload-contact", { body: formData });
      if (res.error) throw new Error(res.error.message || "Neznámá chyba");
      toast.success("Kontakt úspěšně uložen!", { id: "upload-contact" });
    } catch (err: any) {
      toast.error(`Chyba: ${err.message || err}", { id: "upload-contact" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">📝 Ruční nahrání kontaktu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
          <Input name="company_name" placeholder="Název firmy*" value={formData.company_name} onChange={handleChange} required />
          <Input name="full_name" placeholder="Jméno kontaktu (volitelně)" value={formData.full_name} onChange={handleChange} />
          <Input name="email" type="email" placeholder="E‑mail*" value={formData.email} onChange={handleChange} required />
          <Input name="phone" placeholder="Telefon (volitelně)" value={formData.phone} onChange={handleChange} />
          <Input name="website" placeholder="Web (volitelně)" value={formData.website} onChange={handleChange} />
          <Input name="city" placeholder="Město*" value={formData.city} onChange={handleChange} required />
          <Input name="full_address" placeholder="Adresa (volitelně)" value={formData.full_address} onChange={handleChange} />
          <textarea
            name="description"
            placeholder="Krátký popis (volitelně)"
            value={formData.description}
            onChange={handleChange}
            className="border border-border/30 rounded-xl p-2 text-sm min-h-[60px]"
          />
          <Button type="submit" disabled={isSubmitting} className="w-full h-10 rounded-xl font-bold">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Uložit kontakt"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
