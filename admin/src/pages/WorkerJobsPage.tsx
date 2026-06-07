import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Calendar, FileText, MessageSquare, Clock, Sparkles, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { SwipeableImageGallery } from "@/components/SwipeableImageGallery";
import { HandoverProtocolDialog } from "@/components/HandoverProtocolDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DetailLayout from "@/components/DetailLayout";

const WorkerJobsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [workerProfile, setWorkerProfile] = useState<{ id: string; full_name: string; phone?: string } | null>(null);
  const [workerBilling, setWorkerBilling] = useState<any>(null);
  const [showProtocolDialog, setShowProtocolDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [customerBilling, setCustomerBilling] = useState<any>(null);
  const [additionalCosts, setAdditionalCosts] = useState<any[]>([]);

  useEffect(() => {
    loadCompletedJobs();
  }, []);

  const loadCompletedJobs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/prihlaseni');
      return;
    }

    // Load worker profile for protocol
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', session.user.id)
      .single();

    if (profileData) {
      setWorkerProfile({ id: session.user.id, full_name: profileData.full_name, phone: profileData.phone || undefined });
      
      // Fetch worker billing info
      const { data: billingData } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setWorkerBilling(billingData);
    }

    // Get accepted offers where the current user was the WORKER and the job is completed
    // Offer status stays 'accepted', but job status becomes 'completed'
    const { data: completedOffers } = await supabase
      .from('offers')
      .select('job_id, jobs!inner(status)')
      .eq('worker_id', session.user.id)
      .eq('status', 'accepted')
      .eq('jobs.status', 'completed');

    const completedJobIds = completedOffers?.map(o => o.job_id) || [];

    if (completedJobIds.length === 0) {
      setCompletedJobs([]);
      setLoading(false);
      return;
    }

    // Get reviews for jobs where this worker completed the work
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        *,
        jobs(
          id,
          title,
          description,
          completion_photos,
          final_price,
          city,
          full_address,
          created_at,
          updated_at,
          status,
          service_subcategories:subcategory_id(
            name,
            service_categories(name)
          )
        ),
        profiles:reviewer_id(full_name, avatar_url)
      `)
      .eq('reviewee_id', session.user.id)
      .in('job_id', completedJobIds)
      .order('created_at', { ascending: false });

    if (reviewsData) {
      setCompletedJobs(reviewsData);
    }

    setLoading(false);
  };

  const handleOpenProtocol = async (job: any) => {
    setSelectedJob(job);
    
    // Fetch customer billing info on demand
    if (job.reviewer_id) {
      const { data: billingData } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('user_id', job.reviewer_id)
        .maybeSingle();
      setCustomerBilling(billingData);
    }

    // Fetch additional costs for this job
    if (job.job_id) {
      const { data: costsData } = await supabase
        .from('additional_costs')
        .select('*')
        .eq('job_id', job.job_id);
      setAdditionalCosts(costsData || []);
    }
    
    setShowProtocolDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-card rounded w-48" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-card rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DetailLayout title="Historie">
    <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">
      <div className="mt-1 mb-1">
        <div className="flex items-center min-h-[36px] -mx-3 px-3 md:mx-0 md:px-0 pb-1">
          {/* Header spacer to match other dashboard pages */}
        </div>
      </div>
      <div>

        {/* Jobs list */}
        {completedJobs.length === 0 ? (
          <EmptyState
            message="Zatím nemáte žádné dokončené práce s hodnocením"
            buttonLabel="Hledat zakázky"
            onButtonClick={() => navigate('/remeslnik/hledej')}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {completedJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden rounded-2xl border-0 shadow-sm bg-list-item-bg">
                <CardContent className="p-0">
                  {/* Photos */}
                  {job.jobs?.completion_photos && job.jobs.completion_photos.length > 0 && (
                    <div className="relative h-48 overflow-hidden">
                      <SwipeableImageGallery 
                        images={job.jobs.completion_photos}
                      />
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Customer info with avatar */}
                    {job.profiles && (
                      <div className="flex items-center gap-3 pb-3 border-b border-border">
                        <Avatar className="h-10 w-10 ring-1 ring-primary/20">
                          <AvatarImage src={job.profiles.avatar_url} alt={job.profiles.full_name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {job.profiles.full_name?.charAt(0)?.toUpperCase() || 'Z'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{job.profiles.full_name}</p>
                          <p className="text-xs text-muted-foreground">Zákazník</p>
                        </div>
                      </div>
                    )}

                    {/* Title and category */}
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {job.jobs?.title || 'Zakázka'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {job.jobs?.service_subcategories?.service_categories?.name} • {job.jobs?.service_subcategories?.name}
                      </p>
                    </div>

                    {/* Overall Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-4 w-4 ${
                              star <= job.rating 
                                ? 'fill-primary text-primary' 
                                : 'text-muted-foreground/30'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">{job.rating}/5</span>
                    </div>

                    {/* Subratings */}
                    {(job.quality_communication || job.quality_punctuality || job.quality_professionalism || job.quality_cleanliness) && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {job.quality_communication && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MessageSquare className="h-3.5 w-3.5 text-primary/70" />
                            <span>Komunikace: {job.quality_communication}/5</span>
                          </div>
                        )}
                        {job.quality_punctuality && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 text-primary/70" />
                            <span>Dochvilnost: {job.quality_punctuality}/5</span>
                          </div>
                        )}
                        {job.quality_professionalism && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <UserCheck className="h-3.5 w-3.5 text-primary/70" />
                            <span>Profesionalita: {job.quality_professionalism}/5</span>
                          </div>
                        )}
                        {job.quality_cleanliness && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                            <span>Čistota: {job.quality_cleanliness}/5</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Review comment */}
                    {job.comment && (
                      <p className="text-sm text-muted-foreground italic">
                        "{job.comment}"
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                      {job.jobs?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.jobs.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(job.created_at), 'd. MMM yyyy', { locale: cs })}
                      </span>
                      {job.jobs?.final_price && (
                        <span className="font-medium text-foreground">
                          {job.jobs.final_price.toLocaleString('cs-CZ')} Kč
                        </span>
                      )}
                    </div>

                    {/* Handover Protocol Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handleOpenProtocol(job)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Předávací protokol
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Handover Protocol Dialog */}
      {selectedJob && workerProfile && (
        <HandoverProtocolDialog
          isOpen={showProtocolDialog}
          onClose={() => {
            setShowProtocolDialog(false);
            setSelectedJob(null);
          }}
          jobData={{
            title: selectedJob.jobs?.service_subcategories?.name || selectedJob.jobs?.title || 'Zakázka',
            description: selectedJob.jobs?.description || '',
            createdAt: selectedJob.jobs?.created_at || '',
            completedAt: selectedJob.jobs?.updated_at || undefined,
            status: selectedJob.jobs?.status || 'completed',
            address: selectedJob.jobs?.full_address || undefined,
          }}
          workerData={{
            name: workerProfile.full_name,
            phone: workerProfile.phone,
            billing: workerBilling || undefined,
          }}
          customerData={{
            name: selectedJob.profiles?.full_name || 'Zákazník',
            address: selectedJob.jobs?.full_address || undefined,
            billing: customerBilling || undefined,
          }}
          additionalCosts={additionalCosts.map(c => ({
            description: c.description,
            amount: c.amount,
            confirmed_by_other: c.confirmed_by_other
          }))}
          basePrice={(selectedJob.jobs?.final_price || 0) - additionalCosts.reduce((sum, c) => sum + c.amount, 0)}
          finalPrice={selectedJob.jobs?.final_price || 0}
        />
      )}
    </div>
    </DetailLayout>
  );
};

export default WorkerJobsPage;
