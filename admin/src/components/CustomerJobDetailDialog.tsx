import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Coins, User, X } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { ReactNode, useState } from "react";

interface CustomerJobDetailDialogProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onImageClick?: (photo: string) => void;
  actions?: ReactNode;
}

export const CustomerJobDetailDialog = ({ job, isOpen, onClose, onImageClick, actions }: CustomerJobDetailDialogProps) => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!job) return null;

  const IconComponent = getCategoryIcon(job.service_categories?.icon || 'Wrench');

  const displayAddress = job.full_address || job.city || 'Neuvedeno';

  const deadlineText = (() => {
    if (job.deadline_type === 'asap') return 'Co nejdříve';
    if (job.deadline_type === 'agreement') return 'Dle dohody';
    if (job.deadline_type === 'specific' && job.deadline_date)
      return format(new Date(job.deadline_date), 'd. MMMM yyyy', { locale: cs });
    return 'Neurčeno';
  })();

  const handleImageClick = (photo: string) => {
    if (onImageClick) {
      onImageClick(photo);
    } else {
      setExpandedImage(photo);
    }
  };

  return (
    <>
      <Dialog open={isOpen && !expandedImage} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="!max-w-full w-full h-full max-h-full m-0 p-0 rounded-none overflow-y-auto pb-20 md:pb-0 md:!max-w-[580px] md:w-[580px] md:h-auto md:max-h-[90vh] md:m-4 md:rounded-2xl md:overflow-auto border-0 md:border bg-background text-foreground">
          <DialogHeader className="sr-only">
            <DialogTitle>{job.service_subcategories?.name || job.title}</DialogTitle>
          </DialogHeader>

          <div className="min-h-full md:min-h-0 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-2 md:px-5 md:pt-5 md:pb-2">
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <IconComponent className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-base font-bold text-foreground leading-tight">
                  {job.service_subcategories?.name || job.title}
                </p>
                {job.is_urgent && (
                  <Badge variant="secondary" className="text-xs mt-1 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    🔥 URGENTNÍ
                  </Badge>
                )}
              </div>
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

              {/* Budget */}
              {(job.budget_min || job.budget_max) && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Rozpočet</h3>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-bold text-foreground">
                      {job.budget_min && job.budget_max
                        ? `${job.budget_min.toLocaleString('cs-CZ')} - ${job.budget_max.toLocaleString('cs-CZ')} Kč`
                        : job.budget_max
                          ? `do ${job.budget_max.toLocaleString('cs-CZ')} Kč`
                          : `od ${job.budget_min?.toLocaleString('cs-CZ')} Kč`
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Price Note */}
              {job.price_note && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Cena</h3>
                  <p className="text-sm font-bold text-foreground">{job.price_note}</p>
                </div>
              )}

              {/* Photos */}
              {job.photos && job.photos.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-1">Fotografie</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {job.photos.map((photo: string, index: number) => (
                      <div
                        key={index}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(photo)}
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

              {actions && (
                <div className="flex flex-col gap-3 pt-2">
                  {actions}
                </div>
              )}
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
    </>
  );
};
