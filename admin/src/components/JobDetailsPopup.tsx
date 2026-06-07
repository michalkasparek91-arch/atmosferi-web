import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Coins, User, Briefcase, ChevronRight, X, Check, Info } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { useState } from "react";
import { WorkerOfferDialog } from "./WorkerOfferDialog";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useHistoryState } from "@/hooks/use-history-state";

interface JobDetailsPopupProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  hasApplied: boolean;
  onOfferSubmitted: () => void;
  isAccepted?: boolean;
  priceLabel?: string;
  isDirectInquiry?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  isProcessing?: boolean;
  pointsCost?: number;
}

export const JobDetailsPopup = ({ 
  job, 
  isOpen, 
  onClose, 
  hasApplied,
  onOfferSubmitted,
  isAccepted = false,
  priceLabel = "Cena",
  isDirectInquiry = false,
  onAccept,
  onDecline,
  isProcessing = false,
  pointsCost = 3
}: JobDetailsPopupProps) => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);

  // Sync with browser history for native back button support
  useHistoryState(isOpen, onClose, "job-details");

  const getJobCategoryIcon = () => {
    const IconComponent = getCategoryIcon(job?.service_categories?.icon || 'Wrench');
    return <IconComponent className="h-5 w-5 text-muted-foreground" />;
  };

  if (!job) return null;

  const displayAddress = job.full_address || job.city || 'Neuvedeno';

  const deadlineText = (() => {
    if (job.deadline_type === 'asap') return 'Co nejdříve';
    if (job.deadline_type === 'agreement') return 'Dle dohody';
    if (job.deadline_type === 'specific' && job.deadline_date)
      return format(new Date(job.deadline_date), 'd. MMMM yyyy', { locale: cs });
    return 'Neurčeno';
  })();

  return (
    <>
      <Dialog open={isOpen && !showOfferDialog} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="!max-w-full w-full h-full max-h-full m-0 p-0 rounded-none overflow-y-auto pb-20 md:pb-0 md:!max-w-[580px] md:w-[580px] md:h-auto md:max-h-[90vh] md:m-4 md:rounded-2xl md:overflow-auto border-0 md:border bg-card text-foreground">
          <div className="min-h-full md:min-h-0 flex flex-col">
            {/* Header - clean, no pills */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-2">
              {/* Icon */}
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {getJobCategoryIcon()}
              </div>
              
              {/* Title only */}
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-base font-bold text-foreground leading-tight">
                  {job.service_subcategories?.name}
                </p>
                {(hasApplied || isAccepted) && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {isAccepted ? 'Nabídka přijata' : 'Nabídka podána'}
                  </Badge>
                )}
                {isDirectInquiry && !isAccepted && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0 mt-1">
                    PŘÍMÉ OSLOVENÍ
                  </Badge>
                )}
              </div>

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full flex-shrink-0 bg-muted/80 hover:bg-muted"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 md:p-5 space-y-5 overflow-auto">
              {/* Description */}
              {job.description && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Popis zakázky</h3>
                  <p className="text-sm font-bold text-foreground leading-relaxed whitespace-pre-wrap">
                    {job.description}
                  </p>
                </div>
              )}

              {/* Address */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1">Adresa</h3>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm font-bold text-foreground">{displayAddress}</p>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1">Termín</h3>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm font-bold text-foreground">{deadlineText}</p>
                </div>
              </div>

              {/* Price */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-1">{priceLabel}</h3>
                  <p className="text-sm font-bold text-foreground">
                    {job.price_note || 'Není stanovena.'}
                  </p>
              </div>

              {/* Photos */}
              {job.photos && job.photos.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Fotografie</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {job.photos.map((photo: string, index: number) => (
                      <div 
                        key={index} 
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setExpandedImage(photo)}
                      >
                        <img
                          src={photo}
                          alt={`Fotka ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Info */}
              <div className="flex items-center gap-3 pt-1">
                {job.customer_profile?.avatar_url ? (
                  <img
                    src={job.customer_profile.avatar_url}
                    alt="Profile"
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {job.customer_profile?.full_name?.split(' ')[0] || 'Zákazník'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vytvořeno {new Date(job.created_at).toLocaleDateString('cs-CZ')}
                  </p>
                </div>
              </div>

              {/* Action Buttons - stacked */}
              <div className="flex flex-col gap-3 pt-2">
                {isDirectInquiry && !isAccepted ? (
                  <>
                    <div className="flex flex-col gap-2 mb-1 p-3 bg-primary/5 rounded-xl border border-primary/10">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-xs font-bold text-foreground leading-tight">
                          Zákazník vás přímo oslovil!
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug pl-6">
                        Napsat cenu a termín dokončení. Vaše nabídka bude odeslána zákazníkovi ke schválení.
                      </p>
                      <div className="mt-1 pl-6 flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cena za kontakt:</span>
                        <div className="flex items-center gap-0.5 px-2 py-0.5 bg-primary text-white rounded-full text-[10px] font-bold shadow-sm">
                          {pointsCost} <Coins className="h-2.5 w-2.5" />
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="w-full h-12 text-sm font-bold rounded-full bg-primary shadow-sm"
                      disabled={isProcessing}
                      onClick={() => setShowOfferDialog(true)}
                    >
                      {isProcessing ? (
                        <div className="h-4 w-4 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Předložit nabídku
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full h-12 text-sm font-semibold rounded-full text-foreground border-border"
                      disabled={isProcessing}
                      onClick={onDecline}
                    >
                      Odmítnout
                    </Button>
                  </>
                ) : (
                  <>
                    {!hasApplied && (
                      <Button 
                        className="w-full h-12 text-sm font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary-hover"
                        onClick={() => setShowOfferDialog(true)}
                      >
                        Podat nabídku
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      className="w-full h-12 text-sm font-semibold rounded-full text-foreground border-border"
                      onClick={onClose}
                    >
                      Zavřít
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Dialog */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl p-2">
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded photo"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      {showOfferDialog && (
        <WorkerOfferDialog
          job={job}
          isDirectInquiry={isDirectInquiry}
          onClose={() => {
            setShowOfferDialog(false);
            onOfferSubmitted();
            onClose();
          }}
        />
      )}
    </>
  );
};
