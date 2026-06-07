import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, Phone, MessageSquare, User } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useHistoryState } from "@/hooks/use-history-state";

interface SharedAppointment {
  id: string;
  workerId: string;
  workerName: string;
  workerAvatar: string | null;
  workerPhone: string | null;
  subcategory: string;
  offerId: string;
  date: Date;
  time: string;
}

interface SharedWorkersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  currentWorkerId: string;
  customerId: string;
}

export const SharedWorkersDialog = ({
  isOpen,
  onClose,
  jobId,
  currentWorkerId,
  customerId,
}: SharedWorkersDialogProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<SharedAppointment[]>([]);

  // Sync with browser history for native back button support
  useHistoryState(isOpen, onClose, "shared-workers-dialog");

  useEffect(() => {
    if (isOpen && customerId) {
      loadSharedAppointments();
    }
  }, [isOpen, customerId]);

  const loadSharedAppointments = async () => {
    setLoading(true);
    
    try {
      // Step 1: Find all jobs for this customer that have status 'in_progress' or 'open'
      const { data: customerJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id')
        .eq('customer_id', customerId)
        .in('status', ['in_progress', 'open']);
      
      if (jobsError) throw jobsError;
      if (!customerJobs || customerJobs.length === 0) {
        setAppointments([]);
        setLoading(false);
        return;
      }
      
      const customerJobIds = customerJobs.map(j => j.id);
      
      // Step 2: Find all calendar shares enabled for these jobs (excluding current worker)
      const { data: shares, error: sharesError } = await supabase
        .from('calendar_shares')
        .select('worker_id, job_id')
        .in('job_id', customerJobIds)
        .eq('enabled', true)
        .neq('worker_id', currentWorkerId);
      
      if (sharesError || !shares || shares.length === 0) {
        setAppointments([]);
        setLoading(false);
        return;
      }
      
      const workerIds = [...new Set(shares.map(s => s.worker_id))];
      const jobIdsWithShares = [...new Set(shares.map(s => s.job_id))];
      
      // Get worker profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('public_profiles')
        .select('id, full_name, avatar_url, phone')
        .in('id', workerIds);
      
      if (profilesError) throw profilesError;
      
      // Get offers for these workers on the customer's jobs (accepted only)
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, worker_id, job_id')
        .in('job_id', jobIdsWithShares)
        .eq('status', 'accepted')
        .in('worker_id', workerIds);
      
      if (offersError) throw offersError;
      
      // Get job subcategory info separately
      const { data: jobsWithSubcats, error: jobSubcatsError } = await supabase
        .from('jobs')
        .select('id, subcategory_id, service_subcategories:subcategory_id(name)')
        .in('id', jobIdsWithShares);
      
      if (jobSubcatsError) throw jobSubcatsError;
      
      // Get appointments for these workers on the customer's jobs
      const { data: visitAppointments, error: aptsError } = await supabase
        .from('visit_appointments')
        .select('id, worker_id, job_id, visit_date, visit_time')
        .in('job_id', jobIdsWithShares)
        .in('worker_id', workerIds)
        .order('visit_date', { ascending: true });
      
      if (aptsError) throw aptsError;
      
      // Build flat list of appointments with worker info, sorted by date/time
      const appointmentsList: SharedAppointment[] = (visitAppointments || []).map(apt => {
        const profile = (profiles || []).find(p => p.id === apt.worker_id);
        const workerOffer = (offers || []).find(o => o.worker_id === apt.worker_id && o.job_id === apt.job_id);
        const jobInfo = (jobsWithSubcats || []).find(j => j.id === apt.job_id);
        const subcategoryName = (jobInfo?.service_subcategories as any)?.name || 'Služba';
        
        // Format name: First name + first letter of surname
        const formatName = (fullName: string | null) => {
          if (!fullName) return 'Řemeslník';
          const parts = fullName.trim().split(' ');
          if (parts.length === 1) return parts[0];
          return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
        };
        
        return {
          id: apt.id,
          workerId: apt.worker_id,
          workerName: formatName(profile?.full_name),
          workerAvatar: profile?.avatar_url || null,
          workerPhone: profile?.phone || null,
          subcategory: subcategoryName,
          offerId: workerOffer?.id || '',
          date: new Date(apt.visit_date),
          time: apt.visit_time.substring(0, 5),
        };
      }).sort((a, b) => {
        // Sort by date first, then by time
        const dateCompare = a.date.getTime() - b.date.getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
      
      setAppointments(appointmentsList);
    } catch (error) {
      console.error('Error loading shared appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (offerId: string) => {
    onClose();
    navigate(`/remeslnik/zpravy?offer=${offerId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sdílené kalendáře řemeslníků</DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Načítání...</p>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                Zatím žádné naplánované návštěvy od ostatních řemeslníků.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map((apt) => (
                <div 
                  key={apt.id}
                  className="bg-muted/50 rounded-lg p-3 flex items-center gap-3"
                >
                  {/* Date/Time - Most prominent */}
                  <div className="flex-shrink-0 text-center bg-primary/10 rounded-lg px-3 py-2 min-w-[70px]">
                    <div className="text-lg font-bold text-foreground leading-tight">
                      {format(apt.date, "d.M.", { locale: cs })}
                    </div>
                    <div className="text-xs font-medium text-foreground/80">
                      {apt.time}
                    </div>
                  </div>
                  
                  {/* Worker info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {apt.workerAvatar ? (
                        <img
                          src={apt.workerAvatar}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-medium">
                          {apt.workerName?.charAt(0) || 'R'}
                        </div>
                      )}
                      <span className="font-medium text-sm truncate">{apt.workerName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{apt.subcategory}</p>
                  </div>
                  
                  {/* Action buttons - compact */}
                  <div className="flex-shrink-0 flex gap-1">
                    {apt.workerPhone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => window.open(`tel:${apt.workerPhone}`, '_self')}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                    {apt.offerId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleMessage(apt.offerId)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
