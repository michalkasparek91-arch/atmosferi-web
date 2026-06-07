import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Plus, SquareArrowOutUpRight, MoreVertical, LayoutDashboard } from "lucide-react";
import { PwaInstallPointer } from "./PwaInstallPointer";

interface AddToHomeScreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddToHomeScreenModal = ({ open, onOpenChange }: AddToHomeScreenModalProps) => {
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = () => /android/i.test(navigator.userAgent);
  const isChrome = () => /chrome|chromium|crios/i.test(navigator.userAgent);

  const ios = isIOS();
  const android = isAndroid();
  const chrome = isChrome();

  const getTitle = () => {
    if (ios) return "Přidejte aplikaci na plochu";
    if (android) return "Nainstalujte si Zrobee";
    return "Nainstalovat aplikaci";
  };

  const getDescription = () => {
    if (ios) return "Pro příjem push notifikací na iOS je potřeba přidat aplikaci na domovskou obrazovku.";
    if (android) return "Získejte Zrobee přímo na plochu pro rychlý přístup a spolehlivé notifikace.";
    return "Přidejte si Zrobee na plochu svého zařízení.";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PwaInstallPointer open={open} />
      <DialogContent className="sm:max-w-md bg-white dark:bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{getTitle()}</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          <div className="space-y-3.5">
            {/* Step 1: Menu button */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 dark:bg-muted/10 rounded-2xl border border-border/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                1
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[15px]">
                  {chrome && android ? "Otevřete menu" : "Nabídka sdílení"}
                </p>
                <p className="text-[13px] text-muted-foreground leading-snug">
                  {chrome && android ? (
                    <>Klepněte na ikonu <MoreVertical className="inline h-4 w-4 mx-1" /> v pravé horní liště prohlížeče</>
                  ) : chrome && ios ? (
                    <>Klepněte na ikonu <Share className="inline h-4 w-4 mx-1" /> v pravé horní liště Chromu</>
                  ) : (
                    <>Klepněte na ikonu <Share className="inline h-4 w-4 mx-1" /> v dolní liště Safari</>
                  )}
                </p>
              </div>
            </div>
            
            {/* Step 2: Add option */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 dark:bg-muted/10 rounded-2xl border border-border/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                2
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[15px]">
                  {android ? 'Zvolte "Nainstalovat aplikaci"' : 'Vyberte "Přidat na plochu"'}
                </p>
                <p className="text-[13px] text-muted-foreground leading-snug">
                  {android ? (
                    <>Najděte a klepněte na <LayoutDashboard className="inline h-4 w-4 mx-1" /> Nainstalovat aplikaci</>
                  ) : (
                    <>Scrollujte dolů a klepněte na <Plus className="inline h-4 w-4 mx-1" /> Přidat na plochu</>
                  )}
                </p>
              </div>
            </div>
            
            {/* Step 3: Confirmation */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 dark:bg-muted/10 rounded-2xl border border-border/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                3
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[15px]">Potvrďte a je to!</p>
                <p className="text-[13px] text-muted-foreground leading-snug">
                  {ios ? 'Klepněte na "Přidat" v pravém horním rohu' : 'Potvrďte instalaci v dialogovém okně'}
                </p>
              </div>
            </div>
            
            {/* Step 4: Open app */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 dark:bg-muted/10 rounded-2xl border border-border/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                4
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[15px]">Otevřete z plochy</p>
                <p className="text-[13px] text-muted-foreground leading-snug">
                  Spusťte aplikaci z ikony <SquareArrowOutUpRight className="inline h-4 w-4 mx-1" /> na vaší ploše
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-[13px] text-amber-700 dark:text-amber-400 leading-normal">
              <strong>Tip:</strong> Po prvním spuštění z plochy vám aplikace nabídne uložení přihlášení a zapnutí notifikací.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-full font-bold h-12 px-8"
          >
            Rozumím
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToHomeScreenModal;
