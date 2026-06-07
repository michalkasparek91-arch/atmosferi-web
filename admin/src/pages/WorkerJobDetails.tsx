import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Coins, User, Briefcase } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WorkerOfferDialog } from "@/components/WorkerOfferDialog";
import { WorkerJobCard } from "@/components/WorkerJobCard";
import { ImageLightbox } from "@/components/SwipeableImageGallery";
import { safeGoBack } from "@/utils/navigation";

export const WorkerJobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showOfferDialog, setShowOfferDialog] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    if (!jobId) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/prihlaseni');
      return;
    }
    setUserId(session.user.id);

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(jobId);
    let query = supabase
      .from('jobs')
      .select(`
        *,
        profiles!jobs_customer_id_fkey(full_name, avatar_url, phone),
        service_categories(name, icon),
        service_subcategories(name, points_cost),
        offers(id, worker_id)
      `);
      
    if (isUuid) {
      query = query.eq('id', jobId);
    } else {
      query = query.eq('slug', jobId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      navigate('/remeslnik/hledej');
      return;
    }

    setJob(data);
    setHasApplied(data.offers?.some((offer: any) => offer.worker_id === session.user.id));
    setLoading(false);
  };

  const getJobCategoryIcon = () => {
    const IconComponent = getCategoryIcon(job?.service_categories?.icon || 'Wrench');
    return <IconComponent className="h-8 w-8 text-primary-foreground" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Načítání...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Zakázka nenalezena</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-3 md:px-6 pt-3 pb-24 md:pb-6">
      <div className="w-full max-w-5xl mx-auto">
        <div className="space-y-6">
          <WorkerJobCard
            job={job}
            userId={userId}
            hasApplied={hasApplied}
            distance={undefined} // Distance not calculated on details page yet
            pointsCost={job.service_subcategories?.points_cost || 3}
            isFullyClosed={false}
            isStandardFull={false}
            userIsPro={false}
            onApply={() => setShowOfferDialog(true)}
            showFullDescription={true}
            onImageClick={(images, index) => {
              setLightboxIndex(index);
              setLightboxOpen(true);
            }}
          />

          <Button 
            variant="outline"
            className="w-full h-12 text-base font-semibold rounded-full"
            onClick={() => safeGoBack(navigate, '/remeslnik/hledej')}
          >
            Zpět na seznam
          </Button>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox 
        images={job.photos || []} 
        initialIndex={lightboxIndex} 
        open={lightboxOpen} 
        onOpenChange={setLightboxOpen} 
      />

      {/* Offer Dialog */}
      {showOfferDialog && (
        <WorkerOfferDialog
          job={job}
          onClose={() => {
            setShowOfferDialog(false);
            loadJob();
          }}
        />
      )}
    </div>
  );
};

export default WorkerJobDetails;