import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Coins, Calendar, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface AcceptOfferConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  accepting: boolean;
  workerName?: string;
  workerAvatarUrl?: string;
  price?: number;
  availability?: string;
  message?: string;
}

const AcceptOfferConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  accepting,
  workerName,
  workerAvatarUrl,
  price,
  availability,
  message,
}: AcceptOfferConfirmDialogProps) => {
  const formatAvailability = (val: string) => {
    try {
      return format(new Date(val), "d. MMMM yyyy", { locale: cs });
    } catch {
      return val;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="sm:max-w-[480px] max-md:w-[95%] max-md:max-w-[95%] rounded-3xl p-0 border-0 overflow-hidden bg-background shadow-2xl"
      >
        {/* Hero header */}
        <div className="flex flex-col items-center pt-10 pb-6 px-6 bg-primary/10">
          <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center mb-4 shadow-lg">
            <CheckCircle className="h-10 w-10 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-extrabold text-foreground text-center">
            Potvrdit přijetí nabídky
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Po potvrzení začne realizace zakázky
          </p>
        </div>

        {/* Summary */}
        <div className="px-6 pb-2 pt-4 space-y-4">
          {/* Worker */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden flex items-center justify-center ring-2 ring-primary/20 bg-primary/10">
              {workerAvatarUrl ? (
                <img
                  src={workerAvatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Pracovník</p>
              <p className="text-xl font-bold text-foreground">
                {(workerName?.split(" ")[0]) || "Pracovník"}
              </p>
            </div>
          </div>

          {/* Price */}
          {price != null && (
            <div className="flex items-center gap-3 pt-3 border-t border-border/50">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Cena</p>
                <p className="text-xl font-bold text-foreground">
                  {price.toLocaleString("cs-CZ")} Kč
                </p>
              </div>
            </div>
          )}

          {/* Availability */}
          {availability && (
            <div className="flex items-center gap-3 pt-3 border-t border-border/50">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Odhadované dokončení</p>
                <p className="text-xl font-bold text-foreground">
                  {formatAvailability(availability)}
                </p>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Zpráva</p>
              </div>
              <p className="text-sm text-foreground line-clamp-3">{message}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 px-6 pb-8 pt-4">
          <Button
            className="w-full h-14 text-base font-bold gap-2 rounded-full"
            onClick={onConfirm}
            disabled={accepting}
          >
            {accepting ? (
              "Přijímám..."
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                Přijmout nabídku
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={accepting}
          >
            Zrušit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcceptOfferConfirmDialog;
