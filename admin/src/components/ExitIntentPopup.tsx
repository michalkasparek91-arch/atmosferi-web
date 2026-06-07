import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useExitIntent } from "@/hooks/use-exit-intent";
import { useSession } from "@/providers/SessionProvider";
const getSupabase = () => import("@/integrations/supabase/client").then(m => m.supabase);

const leadSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Zadejte prosím platný e-mail" })
    .max(255, { message: "E-mail je příliš dlouhý" }),
  description: z
    .string()
    .trim()
    .max(1000, { message: "Popis je příliš dlouhý (max 1000 znaků)" })
    .optional(),
});

const ExitIntentPopup = () => {
  const { session } = useSession();
  const { open, setOpen } = useExitIntent();
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse({ email, description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Zkontrolujte zadané údaje");
      return;
    }
    setSubmitting(true);
    try {
      const utmSource = sessionStorage.getItem('utm_source');
      const utmMedium = sessionStorage.getItem('utm_medium');
      const utmCampaign = sessionStorage.getItem('utm_campaign');
      console.log('[ExitIntentLead] UTM values:', { utmSource, utmMedium, utmCampaign });

      const supabase = await getSupabase();
      const { error } = await supabase.from("lead_captures").insert({
        email: parsed.data.email,
        request_text: parsed.data.description?.trim() ? parsed.data.description : null,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      } as any);
      if (error) {
        console.error("[ExitIntentLead] insert error", error);
        toast.error("Něco se pokazilo, zkuste to prosím znovu.");
        return;
      }
      toast.success("Děkujeme, ozveme se vám!");

      // Track as GA4 conversion event
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', {
          event_category: 'exit_intent',
          utm_source: sessionStorage.getItem('utm_source') || 'direct',
          utm_medium: sessionStorage.getItem('utm_medium') || '(none)',
          utm_campaign: sessionStorage.getItem('utm_campaign') || '(none)',
        });
      }

      setEmail("");
      setDescription("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nenašli jste, koho hledáte?</DialogTitle>
          <DialogDescription className="text-base">
            Nechte nám na sebe e-mail a napište, co přesně potřebujete. My vaši poptávku zdarma
            rozešleme ověřeným profesionálům v okolí.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exit-email">Váš e-mail</Label>
            <Input
              id="exit-email"
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.cz"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exit-description">Co přesně hledáte?</Label>
            <Textarea
              id="exit-description"
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Např. instalatér v Praze, oprava odpadu..."
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => setOpen(false)}
            >
              Nechci, děkuji
            </Button>
            <Button type="submit" className="rounded-full gap-2" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Odesílám..." : "Odeslat poptávku"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
