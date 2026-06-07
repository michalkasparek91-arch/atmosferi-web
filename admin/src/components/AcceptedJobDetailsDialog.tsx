import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Coins, User } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface AcceptedJobDetailsDialogProps {
  job: any;
  isOpen: boolean;
  onClose: () => void;
}

export const AcceptedJobDetailsDialog = ({ job, isOpen, onClose }: AcceptedJobDetailsDialogProps) => {
  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{job.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Metadata */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{job.full_address || job.city || "Neuvedeno"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {format(new Date(job.created_at), "d. MMMM yyyy", { locale: cs })}
              </span>
            </div>
            {job.budget_min != null && job.budget_max != null && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-semibold text-foreground">
                  {job.budget_min.toLocaleString('cs-CZ')} - {job.budget_max.toLocaleString('cs-CZ')} Kč
                </span>
              </div>
            )}
            {job.profiles?.full_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="text-sm">{job.profiles.full_name}</span>
              </div>
            )}
          </div>

          {/* Category Badge */}
          {job.service_categories?.name && (
            <div>
              <Badge variant="secondary" className="text-sm">
                {job.service_categories.name}
              </Badge>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Popis zakázky</h3>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {job.description || "Bez popisu"}
            </p>
          </div>

          {/* Photos */}
          {job.photos && job.photos.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-3">Fotografie</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {job.photos.map((photo: string, index: number) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={photo}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(photo, '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
