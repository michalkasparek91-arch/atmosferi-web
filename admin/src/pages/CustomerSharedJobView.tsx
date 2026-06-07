import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Banknote, User, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PageLoader from "@/components/PageLoader";

const CustomerSharedJobView = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!jobId) return;

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);

      // Load job with category info
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(jobId);
      let query = supabase
        .from("jobs")
        .select(`
          *,
          service_categories (name, icon),
          service_subcategories (name)
        `);
        
      if (isUuid) {
        query = query.eq("id", jobId);
      } else {
        query = query.eq("slug", jobId);
      }

      const { data: jobData, error: jobError } = await query.single();

      if (jobError || !jobData) {
        toast({ title: "Zakázka nenalezena", variant: "destructive" });
        navigate("/zakaznik/prehled", { replace: true });
        return;
      }

      setJob(jobData);

      // Check if current user already claimed
      if (userId && jobData.customer_id === userId && jobData.customer_id !== jobData.customer_id) {
        setIsClaimed(true);
      }

      // Load the worker (accepted offer)
      const { data: offer } = await supabase
        .from("offers")
        .select("worker_id")
        .eq("job_id", jobId)
        .eq("status", "accepted")
        .single();

      if (offer?.worker_id) {
        const { data: profile } = await supabase
          .from("public_profiles")
          .select("*")
          .eq("id", offer.worker_id)
          .single();
        setWorkerProfile(profile);

        // If the customer_id is the worker (self-created), it's unclaimed
        if (userId && jobData.customer_id === offer.worker_id) {
          setIsClaimed(false);
        } else if (userId && jobData.customer_id === userId) {
          setIsClaimed(true);
        }
      }

      setLoading(false);
    };

    load();
  }, [jobId, navigate]);

  const handleClaimJob = async () => {
    if (!currentUserId || !jobId) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke('claim-shared-job', {
        body: { jobId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsClaimed(true);
      toast({ title: "Zakázka přijata", description: "Zakázka se nyní zobrazí ve vašem přehledu" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Chyba", description: err.message || "Nepodařilo se převzít zakázku", variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!job) return null;

  const deadlineLabel = job.deadline_type === "asap" ? "Co nejdříve" : job.deadline_type === "agreement" ? "Dle dohody" : job.deadline_date ? new Date(job.deadline_date).toLocaleDateString("cs-CZ") : "Neuvedeno";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Photos */}
        {job.photos && job.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
            {job.photos.map((url: string, i: number) => (
              <img
                key={i}
                src={url}
                alt={`Foto ${i + 1}`}
                className={`w-full object-cover rounded-xl ${i === 0 && job.photos.length > 1 ? 'col-span-2 max-h-64' : 'max-h-40'}`}
              />
            ))}
          </div>
        )}

        {/* Title & category */}
        <div>
          <h2 className="text-lg font-bold">{job.title}</h2>
          <p className="text-sm text-muted-foreground">
            {job.service_categories?.name} → {job.service_subcategories?.name}
          </p>
        </div>

        {/* Description */}
        {job.description && (
          <div>
            <h3 className="text-xs font-bold text-muted-foreground mb-1">Popis</h3>
            <p className="text-sm">{job.description}</p>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          {(job.full_address || job.city) && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Místo</p>
                <p className="text-sm font-medium">{job.full_address || job.city}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Termín</p>
              <p className="text-sm font-medium">{deadlineLabel}</p>
            </div>
          </div>
          {job.budget_max && (
            <div className="flex items-start gap-2">
              <Banknote className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Rozpočet</p>
                <p className="text-sm font-medium">{job.budget_max.toLocaleString("cs-CZ")} Kč</p>
              </div>
            </div>
          )}
          {job.price_note && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Poznámka k ceně</p>
              <p className="text-sm font-medium">{job.price_note}</p>
            </div>
          )}
        </div>

        {/* Worker info */}
        {workerProfile && (
          <div className="bg-card rounded-xl p-4 flex items-center gap-3">
            {workerProfile.avatar_url ? (
              <img src={workerProfile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{workerProfile.full_name}</p>
              <p className="text-xs text-muted-foreground">{workerProfile.city || "Řemeslník"}</p>
            </div>
          </div>
        )}

        {/* Claim button */}
        {currentUserId && !isClaimed && (
          <Button
            onClick={handleClaimJob}
            disabled={claiming}
            className="w-full h-12 text-sm font-semibold rounded-full"
          >
            {claiming ? "Přijímám..." : "Přijmout zakázku"}
          </Button>
        )}

        {isClaimed && (
          <div className="flex items-center gap-2 justify-center text-sm text-primary font-medium py-3">
            <CheckCircle2 className="h-5 w-5" />
            Zakázka je ve vašem přehledu
          </div>
        )}

        {!currentUserId && (
          <Button
            onClick={() => {
              localStorage.setItem("postAuthRedirect", `/zakaznik/zakazka/${jobId}`);
              navigate("/prihlaseni");
            }}
            className="w-full h-12 text-sm font-semibold rounded-full"
          >
            Přihlásit se a přijmout zakázku
          </Button>
        )}
      </div>
    </div>
  );
};

export default CustomerSharedJobView;
