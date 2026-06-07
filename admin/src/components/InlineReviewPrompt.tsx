import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Star, CheckCircle2, ArrowRight, ArrowLeft, Clock, MessageCircle, Sparkles, Award, Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface InlineReviewPromptProps {
  job: any;
  onReviewSubmitted: () => void;
}

type Step = 'rating' | 'qualities';

interface QualityRating {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: number;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'fraud', label: 'Podvod' },
  { value: 'offensive', label: 'Urážlivé' },
  { value: 'other', label: 'Jiné' },
];

export const InlineReviewPrompt = ({
  job,
  onReviewSubmitted
}: InlineReviewPromptProps) => {
  const [step, setStep] = useState<Step>('rating');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qualities, setQualities] = useState<QualityRating[]>([
    { key: 'punctuality', label: 'Dochvilnost', icon: <Clock className="h-3 w-3" />, value: 0 },
    { key: 'communication', label: 'Komunikace', icon: <MessageCircle className="h-3 w-3" />, value: 0 },
    { key: 'cleanliness', label: 'Čistota práce', icon: <Sparkles className="h-3 w-3" />, value: 0 },
    { key: 'professionalism', label: 'Profesionalita', icon: <Award className="h-3 w-3" />, value: 0 },
  ]);
  const [hoveredQuality, setHoveredQuality] = useState<{ key: string; value: number } | null>(null);
  
  // Report state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const handleQualityRating = (qualityKey: string, value: number) => {
    setQualities(prev => prev.map(q => 
      q.key === qualityKey ? { ...q, value } : q
    ));
  };

  const handleNext = () => {
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

  const handleBack = () => {
    setStep('rating');
  };

  const handleSubmit = async () => {
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
        description: "Hodnocení bylo odesláno",
      });

      onReviewSubmitted();
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

  const handleReport = async () => {
    if (!reportReason) {
      toast({
        title: "Chyba",
        description: "Vyberte důvod nahlášení",
        variant: "destructive"
      });
      return;
    }

    setReportSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: offerData } = await supabase
        .from('offers')
        .select('worker_id, profiles:worker_id(full_name)')
        .eq('job_id', job.id)
        .eq('status', 'accepted')
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      // Save report to database
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          reporter_id: session.user.id,
          job_id: job.id,
          worker_id: offerData?.worker_id,
          reason: reportReason,
          details: reportDetails || null
        });

      if (reportError) throw reportError;

      // Send admin notification
      await supabase.functions.invoke('notify-admin-report', {
        body: {
          reporter_name: profile?.full_name || 'Neznámý uživatel',
          job_title: job.title,
          worker_name: (offerData?.profiles as any)?.full_name || 'Neznámý řemeslník',
          reason: reportReason,
          details: reportDetails
        }
      });

      toast({
        title: "Děkujeme",
        description: "Vaše nahlášení bylo odesláno k přezkoumání",
      });

      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se odeslat nahlášení",
        variant: "destructive"
      });
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-sm w-full my-3">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            {step === 'qualities' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-7 w-7 shrink-0">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === 'rating' && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">
                {step === 'rating' ? 'Práce dokončena!' : 'Podrobné hodnocení'}
              </p>
              <p className="text-xs text-muted-foreground">
                {step === 'rating' ? 'Ohodnoťte kvalitu práce' : 'Ohodnoťte jednotlivé vlastnosti'}
              </p>
            </div>
          </div>

          {step === 'rating' && (
            <>
              {/* Completion photos - compact 2x2 grid */}
              {job?.completion_photos && job.completion_photos.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {job.completion_photos.slice(0, 4).map((photo: string, index: number) => (
                    <div key={index} className="aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={photo}
                        alt={`Dokončená práce ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Final price - compact */}
              {job?.final_price && (
                <div className="text-center py-1.5 bg-background rounded-lg">
                  <p className="text-xs text-muted-foreground">Finální cena</p>
                  <p className="text-lg font-bold text-foreground">
                    {job.final_price.toLocaleString('cs-CZ')} Kč
                  </p>
                </div>
              )}

              {/* Star rating - compact */}
              <div className="flex flex-col items-center gap-1">
                <Label className="text-xs text-muted-foreground">Celkové hodnocení</Label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment - compact */}
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Napište komentář (volitelné)"
                className="resize-none bg-background text-sm min-h-[60px]"
                rows={2}
              />

              {/* Next button */}
              <Button 
                onClick={handleNext} 
                disabled={rating === 0}
                className="w-full"
                size="sm"
              >
                Pokračovat
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </>
          )}

          {step === 'qualities' && (
            <>
              <p className="text-xs text-muted-foreground text-center">
                Hodnocení je volitelné, ale pomůže ostatním.
              </p>

              <div className="space-y-1.5">
                {qualities.map((quality) => (
                  <div key={quality.key} className="flex items-center justify-between p-1.5 rounded-lg bg-background">
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {quality.icon}
                      </div>
                      <span className="text-xs font-medium text-foreground">{quality.label}</span>
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
                              className={`h-3.5 w-3.5 ${
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

              {/* Submit button */}
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="w-full"
                size="sm"
              >
                {submitting ? "Odesílání..." : "Odeslat hodnocení"}
              </Button>
            </>
          )}

          {/* Report link */}
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors w-full pt-1"
          >
            <Flag className="h-3 w-3" />
            <span>Nahlásit problém</span>
          </button>
        </div>
      </div>

      {/* Report Modal */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Důvod nahlášení?</DialogTitle>
          </DialogHeader>
          
          <RadioGroup value={reportReason} onValueChange={setReportReason} className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <div key={reason.value} className="flex items-center space-x-2">
                <RadioGroupItem value={reason.value} id={reason.value} />
                <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                  {reason.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {reportReason === 'other' && (
            <Textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Popište problém..."
              className="resize-none text-sm"
              rows={2}
            />
          )}

          <Button
            onClick={handleReport}
            disabled={!reportReason || reportSubmitting}
            variant="destructive"
            size="sm"
            className="w-full"
          >
            {reportSubmitting ? "Odesílání..." : "Odeslat nahlášení"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};