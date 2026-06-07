import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Calendar, Coins, User, Info, Wrench } from "lucide-react";
import * as Icons from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface JobDetailsDialogProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmitOffer: () => void;
  hasApplied: boolean;
}

export const JobDetailsDialog = ({ job, isOpen, onClose, onSubmitOffer, hasApplied }: JobDetailsDialogProps) => {
  if (!job) return null;

  const CategoryIcon = job.service_categories?.icon 
    ? (Icons as any)[job.service_categories.icon] || Icons.Wrench 
    : Icons.Wrench;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{job.title}</DialogTitle>
        </DialogHeader>

        <TooltipProvider>
          {/* Credit Card Style Layout */}
          <div className="bg-background rounded-2xl p-6 space-y-5 border border-border/50 shadow-sm">
            {/* Top Section: Category Icon + Name */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <CategoryIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-foreground leading-tight">
                  {job.service_subcategories?.name || job.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {job.service_categories?.name}
                </p>
              </div>
            </div>

            {/* Details Pills */}
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/40 cursor-help">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{job.city || "Neuvedeno"}</span>
                    <Info className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Místo realizace zakázky</p>
                </TooltipContent>
              </Tooltip>

              {job.date && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/40 cursor-help">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {format(new Date(job.date), "d.M.yyyy", { locale: cs })}
                      </span>
                      <Info className="h-3 w-3 text-muted-foreground/60" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Termín do kdy má být zakázka hotova</p>
                  </TooltipContent>
                </Tooltip>
              )}

            </div>

            {/* Description */}
            <div className="bg-background/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-border/30">
              <p className="text-sm text-foreground leading-relaxed">
                {job.description || "Bez popisu"}
              </p>
            </div>

            {/* Photos - Square Grid aligned left */}
            {job.photos && job.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-w-md">
                {job.photos.map((photo: string, index: number) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden border border-border/30 shadow-sm">
                    <img
                      src={photo}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(photo, '_blank')}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Customer Info - Bottom */}
            <div className="flex items-center gap-2 pt-3 border-t border-border/30">
              {job.profiles?.avatar_url ? (
                <img
                  src={job.profiles.avatar_url}
                  alt="Profile"
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                  <span className="text-xs font-medium">
                    {job.profiles?.full_name?.charAt(0) || 'Z'}
                  </span>
                </div>
              )}
              <p className="text-xs font-medium text-muted-foreground">
                {job.profiles?.full_name?.split(' ')[0] || 'Zákazník'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11"
              >
                Zavřít
              </Button>
              {hasApplied ? (
                <Button
                  disabled
                  className="flex-1 h-11"
                >
                  Nabídka již podána
                </Button>
              ) : (
                <Button
                  onClick={onSubmitOffer}
                  className="flex-1 h-11 font-semibold bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  Podat nabídku na zakázku
                </Button>
              )}
            </div>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};
