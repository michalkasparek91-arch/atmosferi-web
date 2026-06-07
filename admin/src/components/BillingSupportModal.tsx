import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface BillingSupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastInvoiceId: string | null;
  lastInvoiceNumber: string | null;
}

const REASONS = [
  { value: "wrong_details", label: "Chyba ve fakturačních údajích" },
  { value: "missing_credits", label: "Kredity se nepřipsaly" },
  { value: "other", label: "Jiný problém" },
];

export function BillingSupportModal({ 
  open, 
  onOpenChange, 
  lastInvoiceId,
  lastInvoiceNumber 
}: BillingSupportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: "Vyberte důvod",
        description: "Prosím vyberte důvod vašeho požadavku.",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Vyplňte popis",
        description: "Prosím popište váš problém.",
        variant: "destructive",
      });
      return;
    }

    if (description.trim().length < 10) {
      toast({
        title: "Popis je příliš krátký",
        description: "Prosím popište váš problém podrobněji.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.functions.invoke("send-billing-support", {
        body: {
          lastInvoiceId,
          lastInvoiceNumber,
          reason,
          reasonLabel: REASONS.find(r => r.value === reason)?.label || reason,
          description: description.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Požadavek odeslán",
        description: "Brzy vás budeme kontaktovat.",
      });

      setReason("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending billing support request:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odeslat požadavek. Zkuste to prosím znovu.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Úprava faktury / Problém s platbou</DialogTitle>
          <DialogDescription>
            Popište nám váš problém a my se vám ozveme co nejdříve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reason">Důvod</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Vyberte důvod..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Popište, co potřebujete opravit</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Např. Na faktuře je špatné IČO, správně by mělo být..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>

          {lastInvoiceNumber && (
            <p className="text-xs text-muted-foreground">
              Automaticky přiložíme k požadavku poslední fakturu: {lastInvoiceNumber}
            </p>
          )}

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={sending}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Odesílání...
              </>
            ) : (
              "Odeslat požadavek"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
