import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Wand2, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AiDescriptionAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  subcategoryName: string;
  onSelect: (description: string) => void;
}

export const AiDescriptionAssistant = ({
  open,
  onOpenChange,
  categoryName,
  subcategoryName,
  onSelect
}: AiDescriptionAssistantProps) => {
  const [userPrompt, setUserPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      toast({
        title: "Chybí zadání",
        description: "Napište prosím alespoň pár slov o tom, co potřebujete.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-job-description', {
        body: {
          category: categoryName,
          subcategory: subcategoryName,
          userPrompt: userPrompt.trim()
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedText(data.description);
    } catch (error: any) {
      console.error('AI Generation error:', error);
      toast({
        title: "Chyba při generování",
        description: error.message || "Nepodařilo se vygenerovat popis. Zkuste to prosím znovu.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    onSelect(generatedText);
    onOpenChange(false);
    // Reset state for next time
    setUserPrompt("");
    setGeneratedText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            AI Pomocník s popisem
          </DialogTitle>
          <DialogDescription className="text-sm">
            Napište stručně, co potřebujete, a naše AI za vás vytvoří profesionální popis zakázky pro {subcategoryName || 'řemeslníka'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!generatedText ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Např.: Potřebuji vyměnit pákovou baterii v kuchyni, protéká u základny. Mám už koupenou novou značky Hansgrohe."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="min-h-[120px] rounded-2xl bg-muted/30 border-muted focus-visible:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground px-1 italic">
                Tip: Čím více detailů (značka, rozsah, patro) napíšete, tím přesnější bude výsledek.
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 relative group">
                <p className="text-sm leading-relaxed text-foreground">
                  {generatedText}
                </p>
                <div className="absolute -top-3 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  NÁVRH AI
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setGeneratedText("")}
                className="text-[11px] h-7 hover:bg-muted"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" /> Zkusit jiné zadání
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          {!generatedText ? (
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !userPrompt.trim()}
              className="w-full rounded-full h-11 font-bold tracking-tight shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generuji popis...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Vytvořit popis
                </>
              )}
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-full h-11 font-semibold"
              >
                Zrušit
              </Button>
              <Button 
                onClick={handleApply}
                className="flex-1 rounded-full h-11 font-bold tracking-tight shadow-sm"
              >
                <Check className="mr-2 h-4 w-4" />
                Použít tento text
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
