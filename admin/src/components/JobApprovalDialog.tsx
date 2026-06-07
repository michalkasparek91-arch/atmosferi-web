import { useState } from "react";
import { hapticTap } from "@/utils/haptics";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Star, ArrowRight, ArrowLeft, Clock, MessageCircle, Sparkles, Award, CheckCircle, XCircle } from "lucide-react";

interface JobApprovalDialogProps {
  isOpen: boolean;
  job: any;
  onApprove: () => void;
}

type Step = 'choose' | 'rating' | 'qualities' | 'reject';

interface QualityRating {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: number;
}

export const JobApprovalDialog = ({
  isOpen,
  job,
  onApprove
}: JobApprovalDialogProps) => {
  const [step, setStep] = useState<Step>(job?.status === 'completed' ? 'rating' : 'choose');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qualities, setQualities] = useState<QualityRating[]>([
    { key: 'punctuality', label: 'Dochvilnost', icon: <Clock className="h-5 w-5" />, value: 0 },
    { key: 'communication', label: 'Komunikace', icon: <MessageCircle className="h-5 w-5" />, value: 0 },
    { key: 'cleanliness', label: 'Čistota práce', icon: <Sparkles className="h-5 w-5" />, value: 0 },
    { key: 'professionalism', label: 'Profesionalita', icon: <Award className="h-5 w-5" />, value: 0 },
  ]);
  const [hoveredQuality, setHoveredQuality] = useState<{ key: string; value: number } | null>(null);

  const handleQualityRating = (qualityKey: string, value: number) => {
    setQualities(prev => prev.map(q => 
      q.key === qualityKey ? { ...q, value } : q
    ));
  };

  const handleNextToQualities = () => {
    if (rating === 0) {
      toast({
        title: "Chyba",
        description: "Prosím ohodnoťte zakázku",
        variant: "destructive"
      });
      return;
    }
    setStep('qualities');
  };

  const handleSubmitWithReview = async () => {
    hapticTap();
    setSubmitting(true);

    try {
      const qualityMap: Record<string, number> = {};
      qualities.forEach(q => {
        if (q.value > 0) qualityMap[q.key] = q.value;
      });

      const { submitReview } = await import("@/lib/review-actions");
      const result = await submitReview({
        jobId: job.id,
        rating,
        comment: comment || undefined,
        qualities: {
          punctuality: qualityMap.punctuality,
          communication: qualityMap.communication,
          cleanliness: qualityMap.cleanliness,
          professionalism: qualityMap.professionalism,
        },
      });

      if (!result.success) throw new Error(result.error);

      toast({
        title: "Úspěch",
        description: "Hodnocení bylo odesláno a zakázka schválena",
      });

      onApprove();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odeslat hodnocení",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveWithoutReview = async () => {
    hapticTap();
    setSubmitting(true);

    try {
      const { approveWithoutReview } = await import("@/lib/review-actions");
      const result = await approveWithoutReview(job.id);

      if (!result.success) throw new Error(result.error);

      toast({
        title: "Úspěch",
        description: "Zakázka byla schválena",
      });

      onApprove();
    } catch (error) {
      console.error('Error approving without review:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se schválit zakázku",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Chyba",
        description: "Prosím napište důvod, proč práce ještě není hotová",
        variant: "destructive"
      });
      return;
    }

    hapticTap();
    setSubmitting(true);

    try {
      const { rejectCompletion } = await import("@/lib/review-actions");
      const result = await rejectCompletion(job.id, rejectionReason.trim());

      if (!result.success) throw new Error(result.error);

      toast({
        title: "Práce vrácena řemeslníkovi",
        description: "Řemeslník byl informován, že práce ještě není dokončena.",
      });

      onApprove();
    } catch (error) {
      console.error('Error rejecting completion:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odmítnout dokončení",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'choose': return 'Zakázka byla dokončena';
      case 'rating': return 'Ohodnoťte dokončenou zakázku';
      case 'qualities': return 'Podrobné hodnocení';
      case 'reject': return 'Práce ještě není hotová';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'choose': return `Řemeslník označil zakázku "${job?.title}" jako dokončenou. Co chcete udělat?`;
      case 'rating': return `Zakázka "${job?.title}" byla dokončena.`;
      case 'qualities': return 'Ohodnoťte jednotlivé vlastnosti řemeslníka.';
      case 'reject': return 'Popište, proč práce ještě není dokončena. Řemeslník uvidí váš důvod.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {(step === 'qualities' || step === 'rating' || step === 'reject') && (
              <Button variant="ghost" size="icon" onClick={() => setStep(step === 'qualities' ? 'rating' : 'choose')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle>{getStepTitle()}</DialogTitle>
              <DialogDescription>{getStepDescription()}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step: Choose action */}
        {step === 'choose' && (
          <div className="space-y-4">
            {job?.completion_photos && job.completion_photos.length > 0 && (
              <div>
                <Label>Fotky dokončené práce</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {job.completion_photos.map((photo: string, index: number) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={photo}
                        alt={`Completion ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {job?.final_price && (
              <div>
                <Label>Finální cena</Label>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {job.final_price.toLocaleString('cs-CZ')} Kč
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => setStep('rating')}
                className="w-full justify-start gap-3 h-auto py-3 px-4"
                variant="default"
              >
                <CheckCircle className="h-5 w-5 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">Schválit a ohodnotit</div>
                  <div className="text-xs opacity-80">Schválit práci a zanechat hodnocení</div>
                </div>
              </Button>

              <Button
                onClick={handleApproveWithoutReview}
                disabled={submitting}
                className="w-full justify-start gap-3 h-auto py-3 px-4"
                variant="outline"
              >
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">{submitting ? "Schvaluji..." : "Schválit bez hodnocení"}</div>
                  <div className="text-xs text-muted-foreground">Práce je hotová, ale nechci hodnotit</div>
                </div>
              </Button>

              <Button
                onClick={() => setStep('reject')}
                className="w-full justify-start gap-3 h-auto py-3 px-4"
                variant="outline"
              >
                <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                <div className="text-left">
                  <div className="font-semibold text-destructive">Práce ještě není hotová</div>
                  <div className="text-xs text-muted-foreground">Vrátit řemeslníkovi k dokončení</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Step: Rating */}
        {step === 'rating' && (
          <div className="space-y-6">
            <div>
              <Label>Celkové hodnocení</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Komentář (volitelné)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Napište váš komentář"
                className="mt-2"
                rows={3}
              />
            </div>

            <Button onClick={handleNextToQualities} disabled={rating === 0} className="w-full">
              Pokračovat
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step: Quality ratings */}
        {step === 'qualities' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hodnocení jednotlivých vlastností je volitelné, ale pomůže ostatním zákazníkům.
            </p>

            <div className="space-y-4">
              {qualities.map((quality) => (
                <div key={quality.key} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {quality.icon}
                    </div>
                    <span className="font-medium text-foreground">{quality.label}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isHovered = hoveredQuality?.key === quality.key && star <= hoveredQuality.value;
                      const isSelected = star <= quality.value;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleQualityRating(quality.key, star)}
                          onMouseEnter={() => setHoveredQuality({ key: quality.key, value: star })}
                          onMouseLeave={() => setHoveredQuality(null)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              isHovered || isSelected
                                ? 'fill-primary text-primary'
                                : 'text-muted-foreground/40'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSubmitWithReview} disabled={submitting} className="w-full" size="lg">
              {submitting ? "Odesílání..." : "Odeslat hodnocení"}
            </Button>
          </div>
        )}

        {/* Step: Reject */}
        {step === 'reject' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Důvod <span className="text-destructive">*</span></Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Popište, co ještě není dokončeno nebo co je potřeba opravit..."
                className="mt-2"
                rows={4}
              />
            </div>

            <Button
              onClick={handleReject}
              disabled={submitting || !rejectionReason.trim()}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              {submitting ? "Odesílání..." : "Vrátit řemeslníkovi"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};