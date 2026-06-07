import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Plus, Heart, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicWorkerProfileCard } from "@/components/PublicWorkerProfileCard";
import { CustomerNewJobWithWorkerDialog } from "@/components/CustomerNewJobWithWorkerDialog";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

const getFirstName = (fullName: string | null) => fullName?.split?.(" ")?.[0] || "?";

interface WorkerListItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  company_type: string | null;
  is_promoted: boolean;
}

const CustomerFavorites = () => {
  const navigate = useNavigate();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [newJobWorkerId, setNewJobWorkerId] = useState<string | null>(null);
  const [newJobWorkerName, setNewJobWorkerName] = useState<string>("");

  // Fetch favorite workers
  const { data: workers = [], isLoading, refetch } = useQuery({
    queryKey: ["customer-favorites-list"],
    queryFn: async (): Promise<WorkerListItem[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: favors } = await supabase
        .from("favorite_workers")
        .select("worker_id")
        .eq("user_id", user.id);
      
      const workerIds = favors?.map(f => f.worker_id) || [];
      if (workerIds.length === 0) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city, bio, company_type, is_promoted")
        .eq("user_type", "worker")
        .in("id", workerIds)
        .order("is_promoted", { ascending: false })
        .order("full_name", { ascending: true })
        .limit(50);

      if (error) throw error;
      return (data || []) as WorkerListItem[];
    },
  });

  // Fetch review stats for displayed workers
  const workerIdsStr = workers.map((w) => w.id).join(",");
  const { data: reviewStats = {} } = useQuery({
    queryKey: ["worker-review-stats", workerIdsStr],
    queryFn: async () => {
      if (workers.length === 0) return {};
      const { data } = await supabase
        .from("reviews")
        .select("reviewee_id, rating")
        .in(
          "reviewee_id",
          workers.map((w) => w.id)
        );

      const stats: Record<string, { count: number; avg: number }> = {};
      if (data) {
        data.forEach((r) => {
          if (!stats[r.reviewee_id]) {
            stats[r.reviewee_id] = { count: 0, avg: 0 };
          }
          stats[r.reviewee_id].count++;
          stats[r.reviewee_id].avg += r.rating;
        });
        Object.keys(stats).forEach((id) => {
          stats[id].avg = stats[id].avg / stats[id].count;
        });
      }
      return stats;
    },
    enabled: workers.length > 0,
  });

  // Fetch categories for displayed workers
  const { data: workerCategories = {} } = useQuery({
    queryKey: ["worker-list-categories", workerIdsStr],
    queryFn: async () => {
      if (workers.length === 0) return {};
      const { data, error } = await supabase
        .from("worker_services")
        .select(`
          worker_id,
          subcategory_id,
          service_subcategories (
            category_id,
            service_categories (
              id,
              name,
              icon
            )
          )
        `)
        .in("worker_id", workers.map((w) => w.id));

      if (error) throw error;

      const categorized: Record<string, any[]> = {};
      
      data.forEach((service: any) => {
        const workerId = service.worker_id;
        const category = service.service_subcategories?.service_categories;
        
        if (!category) return;

        if (!categorized[workerId]) {
          categorized[workerId] = [];
        }

        let catEntry = categorized[workerId].find((c: any) => c.id === category.id);
        if (!catEntry) {
          catEntry = { ...category, count: 0 };
          categorized[workerId].push(catEntry);
        }
        catEntry.count++;
      });
      
      return categorized;
    },
    enabled: workers.length > 0,
  });
  
  const selectedWorkerIndex = workers.findIndex(w => w.id === selectedWorkerId);
  const [isCarouselReady, setIsCarouselReady] = useState(false);

  const selectedWorkerIdRef = useRef(selectedWorkerId);
  useEffect(() => {
    selectedWorkerIdRef.current = selectedWorkerId;
  }, [selectedWorkerId]);

  // Set up intersection observer
  useEffect(() => {
    if (!isCarouselReady) return;
    
    const container = document.getElementById('worker-carousel');
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const workerId = entry.target.getAttribute('data-worker-id');
            if (workerId && workerId !== selectedWorkerIdRef.current) {
              setSelectedWorkerId(workerId);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    const slides = container.querySelectorAll('.worker-slide');
    slides.forEach((slide) => observer.observe(slide));

    return () => observer.disconnect();
  }, [isCarouselReady, workers]);

  useEffect(() => {
    if (selectedWorkerId && !isCarouselReady) {
      setTimeout(() => {
        const el = document.getElementById(`worker-slide-${selectedWorkerId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
          setTimeout(() => setIsCarouselReady(true), 100);
        }
      }, 50);
    } else if (!selectedWorkerId) {
      setIsCarouselReady(false);
    }
  }, [selectedWorkerId, isCarouselReady]);

  const handleOfferJob = (workerId: string, workerName: string) => {
    setSelectedWorkerId(null);
    setNewJobWorkerId(workerId);
    setNewJobWorkerName(getFirstName(workerName));
  };

  const removeFavorite = async (e: React.MouseEvent, workerId: string) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("favorite_workers")
      .delete()
      .eq("user_id", user.id)
      .eq("worker_id", workerId);
    
    toast.success("Odebráno z oblíbených");
    refetch();
  };

  return (
    <div className="min-h-screen px-3 md:px-0 pt-4 pb-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/zakaznik")}
          className="text-muted-foreground hover:text-foreground rounded-full h-8 px-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zpět
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Oblíbení řemeslníci</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Zatím nemáte žádné oblíbené</h3>
          <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
            Klikněte na ikonu srdíčka u řemeslníka, abyste si ho uložili na později.
          </p>
          <Button 
            className="mt-6 rounded-full" 
            onClick={() => navigate("/zakaznik/profici")}
          >
            Prohlížet profíky
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {workers.map((worker) => {
            const stats = reviewStats[worker.id!];
            return (
              <button
                key={worker.id}
                onClick={() => setSelectedWorkerId(worker.id!)}
                className="w-full flex items-start gap-3 p-3 rounded-2xl bg-list-item-bg border border-border/50 shadow-md hover:shadow-lg transition-all text-left group relative"
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={worker.avatar_url || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getFirstName(worker.full_name)?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={(e) => removeFavorite(e, worker.id!)}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full border bg-white flex items-center justify-center shadow-sm transition-all z-10 text-red-500 border-red-100"
                  >
                    <Heart className="h-3 w-3 fill-current" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {getFirstName(worker.full_name)}
                    </span>
                    {stats && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary flex-shrink-0">
                        {stats.avg.toFixed(1)}{" "}
                        <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                      </span>
                    )}
                  </div>
                  {worker.city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{worker.city}</span>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-3 mt-2 w-full">
                    <div className="flex-1">
                      {workerCategories[worker.id!] && (
                        <div className="flex flex-wrap gap-1">
                          {workerCategories[worker.id!].map((category: any) => {
                            const Icon = getCategoryIcon(category.icon);
                            return (
                              <div 
                                key={category.id}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-white/40 dark:bg-white/10 text-[10px] text-foreground"
                              >
                                <Icon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[100px]">{category.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      className="rounded-full flex-shrink-0 text-[11px] font-bold gap-1 h-8 px-4 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewJobWorkerId(worker.id!);
                        setNewJobWorkerName(getFirstName(worker.full_name));
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nabídka
                    </Button>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Carousel dialog */}
      <Dialog 
        open={!!selectedWorkerId} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWorkerId(null);
            setIsCarouselReady(false);
          }
        }}
      >
        <DialogContent className="max-w-none w-full h-[100dvh] p-0 bg-black/90 border-none shadow-none flex flex-col justify-center overflow-hidden [&>button]:hidden focus:outline-none m-0 rounded-none">
          <button
            onClick={() => {
              setSelectedWorkerId(null);
              setIsCarouselReady(false);
            }}
            className="fixed top-4 right-4 md:top-6 md:right-6 z-[100] w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          
          <div 
            id="worker-carousel"
            className={cn(
              "flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full h-full items-center gap-3",
              !isCarouselReady ? "pointer-events-none opacity-0" : "opacity-100 transition-opacity duration-300"
            )}
            style={{ paddingLeft: '10vw', paddingRight: '10vw' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedWorkerId(null);
                setIsCarouselReady(false);
              }
            }}
          >
            {workers.map((w, i) => {
              const distance = Math.abs(i - selectedWorkerIndex);
              return (
                <div 
                  key={w.id} 
                  id={`worker-slide-${w.id}`}
                  data-worker-id={w.id}
                  className="worker-slide flex-shrink-0 snap-center snap-always w-[80vw] sm:w-[400px] transition-opacity duration-300"
                  style={{ opacity: distance > 1 ? 0.3 : 1 }}
                >
                  <PublicWorkerProfileCard
                    workerId={w.id}
                    isEmbedded
                    showShadow={false}
                    deferLoading={distance > 1}
                    onOfferJob={handleOfferJob}
                  />
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {newJobWorkerId && (
        <CustomerNewJobWithWorkerDialog
          workerId={newJobWorkerId}
          workerName={newJobWorkerName}
          open={!!newJobWorkerId}
          onOpenChange={(open) => {
            if (!open) {
              setNewJobWorkerId(null);
              setNewJobWorkerName("");
            }
          }}
        />
      )}
    </div>
  );
};

export default CustomerFavorites;
