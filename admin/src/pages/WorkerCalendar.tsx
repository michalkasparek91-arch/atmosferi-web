import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ContentLoader from "@/components/ContentLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import { getCategoryIcon } from "@/utils/categoryIcons";

interface VisitAppointment {
  id: string;
  date: Date;
  time: string;
  jobId: string;
  offerId: string;
  isDeadline?: boolean;
  job?: {
    title: string;
    city: string;
    categoryIcon?: string;
    categoryName?: string;
    subcategoryName?: string;
    customerName?: string;
    deadlineDate?: string;
  };
}

const WorkerCalendar = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<VisitAppointment[]>([]);
  const [deadlines, setDeadlines] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/prihlaseni');
      return;
    }
    setUser(session.user);
    loadAppointments(session.user.id);
  };

  const loadAppointments = async (userId: string) => {
    try {
      // Get all visit appointments for the worker
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('visit_appointments')
        .select('*')
        .eq('worker_id', userId)
        .order('visit_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Get all accepted offers for the worker
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select(`
          id,
          job_id,
          jobs:job_id(
            id,
            title,
            city,
            deadline_date,
            service_categories:category_id(name, icon),
            service_subcategories:subcategory_id(name),
            profiles:customer_id(full_name)
          )
        `)
        .eq('worker_id', userId)
        .eq('status', 'accepted');
      
      if (offersError) throw offersError;

      // Map job_id to offer info and collect deadlines
      const jobToOffer: Record<string, { offerId: string; job: any }> = {};
      const deadlineDates: Date[] = [];
      
      offersData?.forEach((offer: any) => {
        if (offer.jobs) {
          jobToOffer[offer.job_id] = {
            offerId: offer.id,
            job: offer.jobs
          };
          // Collect deadline dates
          if (offer.jobs.deadline_date) {
            deadlineDates.push(new Date(offer.jobs.deadline_date));
          }
        }
      });
      
      setDeadlines(deadlineDates);

      // Build appointments with job info
      const formattedAppointments: VisitAppointment[] = (appointmentsData || []).map((apt: any) => {
        const offerInfo = jobToOffer[apt.job_id];
        return {
          id: apt.id,
          date: new Date(apt.visit_date),
          time: (apt.visit_time || "09:00").substring(0, 5),
          jobId: apt.job_id,
          offerId: offerInfo?.offerId || '',
          isDeadline: false,
          job: offerInfo?.job ? {
            title: offerInfo.job.title,
            city: offerInfo.job.city,
            categoryIcon: offerInfo.job.service_categories?.icon,
            categoryName: offerInfo.job.service_categories?.name,
            subcategoryName: offerInfo.job.service_subcategories?.name,
            customerName: offerInfo.job.profiles?.full_name,
            deadlineDate: offerInfo.job.deadline_date,
          } : undefined
        };
      });

      // Add deadlines as special appointments
      const deadlineAppointments: VisitAppointment[] = [];
      offersData?.forEach((offer: any) => {
        if (offer.jobs?.deadline_date) {
          deadlineAppointments.push({
            id: `deadline-${offer.job_id}`,
            date: new Date(offer.jobs.deadline_date),
            time: '23:59',
            jobId: offer.job_id,
            offerId: offer.id,
            isDeadline: true,
            job: {
              title: offer.jobs.title,
              city: offer.jobs.city,
              categoryIcon: offer.jobs.service_categories?.icon,
              categoryName: offer.jobs.service_categories?.name,
              subcategoryName: offer.jobs.service_subcategories?.name,
              customerName: offer.jobs.profiles?.full_name,
              deadlineDate: offer.jobs.deadline_date,
            }
          });
        }
      });

      setAppointments([...formattedAppointments, ...deadlineAppointments]);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get all dates with appointments
  const appointmentDates = appointments.map(a => a.date);

  // Get appointments for selected date
  const selectedDateAppointments = selectedDate
    ? appointments.filter(a => 
        format(a.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      ).sort((a, b) => a.time.localeCompare(b.time))
    : [];

  // Get all appointments grouped by date for the list view
  const groupedAppointments = appointments.reduce((acc, apt) => {
    const dateKey = format(apt.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(apt);
    return acc;
  }, {} as Record<string, VisitAppointment[]>);

  // Sort dates and filter to show only upcoming
  const today = format(new Date(), 'yyyy-MM-dd');
  const sortedDates = Object.keys(groupedAppointments)
    .filter(dateKey => dateKey >= today)
    .sort();

  if (loading) {
    return <ContentLoader />;
  }

  return (
    <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">
      <div className="py-3">
        <p className="text-sm text-muted-foreground">Přehled naplánovaných návštěv a termínů dokončení</p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calendar Section */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={cs}
            className="w-full pointer-events-auto"
            modifiers={{
              hasAppointment: appointmentDates.filter(d => 
                !appointments.find(a => format(a.date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd') && a.isDeadline)
              ),
              deadline: deadlines,
            }}
            modifiersClassNames={{
              hasAppointment: "calendar-dot-primary",
              deadline: "calendar-dot-lime",
            }}
            classNames={{
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-lg",
            }}
          />

          {/* Selected Date Appointments */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-sm font-medium text-foreground mb-3">
                {format(selectedDate, "d. MMMM yyyy", { locale: cs })}
              </p>
              {selectedDateAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné návštěvy v tento den</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDateAppointments.map((apt) => {
                    const IconComponent = getCategoryIcon(apt.job?.categoryIcon);
                    
                    return (
                      <div 
                        key={apt.id}
                        className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => navigate('/remeslnik/probihajici')}
                      >
                        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {apt.job?.subcategoryName || apt.job?.categoryName || 'Zakázka'}
                          </p>
                          {apt.job?.city && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {apt.job.city}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="inline-flex items-center gap-1.5 bg-background rounded-full px-2.5 py-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{apt.time}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Appointments List */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <p className="text-sm font-medium text-foreground mb-4">Nadcházející návštěvy a termíny</p>
          
          {sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground font-medium mb-4">Nemáte žádné naplánované návštěvy</p>
              <Button onClick={() => navigate('/remeslnik/probihajici')} className="rounded-full">
                Zobrazit zakázky
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedDates.map((dateKey) => {
                const dateAppointments = groupedAppointments[dateKey].sort((a, b) => {
                  // Sort deadlines last
                  if (a.isDeadline && !b.isDeadline) return 1;
                  if (!a.isDeadline && b.isDeadline) return -1;
                  return a.time.localeCompare(b.time);
                });
                const date = new Date(dateKey);
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                
                return (
                  <div key={dateKey}>
                    <p className={`text-xs font-medium mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isToday ? 'Dnes' : format(date, "EEEE, d. MMMM", { locale: cs })}
                    </p>
                    <div className="flex flex-col gap-2">
                      {dateAppointments.map((apt) => {
                        const IconComponent = getCategoryIcon(apt.job?.categoryIcon);
                        
                        if (apt.isDeadline) {
                          // Render deadline item
                          return (
                            <div 
                              key={apt.id}
                              className="flex items-center gap-3 p-3 bg-[hsl(75,55%,50%)]/20 rounded-xl cursor-pointer hover:bg-[hsl(75,55%,50%)]/30 transition-colors border border-[hsl(75,55%,50%)]/50"
                              onClick={() => navigate('/remeslnik/probihajici')}
                            >
                              <div className="inline-flex items-center gap-1.5 bg-[hsl(75,55%,50%)] rounded-full px-2.5 py-1 flex-shrink-0">
                                <AlertTriangle className="h-3.5 w-3.5 text-foreground" />
                                <span className="text-xs font-semibold text-foreground">Deadline</span>
                              </div>
                              <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                                <IconComponent className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {apt.job?.subcategoryName || apt.job?.categoryName || 'Zakázka'}
                                </p>
                                {apt.job?.city && (
                                  <p className="text-xs text-muted-foreground">
                                    {apt.job.city}
                                  </p>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          );
                        }
                        
                        // Render regular appointment
                        return (
                          <div 
                            key={apt.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => navigate('/remeslnik/probihajici')}
                          >
                            <div className="inline-flex items-center gap-1.5 bg-primary rounded-full px-2.5 py-1 flex-shrink-0">
                              <Clock className="h-3.5 w-3.5 text-primary-foreground" />
                              <span className="text-xs font-semibold text-primary-foreground">{apt.time}</span>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                              <IconComponent className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {apt.job?.subcategoryName || apt.job?.categoryName || 'Zakázka'}
                              </p>
                              {apt.job?.city && (
                                <p className="text-xs text-muted-foreground">
                                  {apt.job.city}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerCalendar;
