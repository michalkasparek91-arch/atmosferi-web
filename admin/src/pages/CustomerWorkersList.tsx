import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Plus, Grid, Heart, X, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublicWorkerProfileCard } from "@/components/PublicWorkerProfileCard";
import { CustomerNewJobWithWorkerDialog } from "@/components/CustomerNewJobWithWorkerDialog";
import { getCategoryIconBySlug, getCategoryIcon } from "@/utils/categoryIcons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterPill, FilterPillChip } from "@/components/ui/filter-pill";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const getFirstName = (fullName: string | null) => fullName?.split?.(" ")?.[0] || "?";

interface WorkerListItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  company_type: string | null;
  is_promoted: boolean;
  worker_verifications: { status: string }[] | null;
}

const CustomerWorkersList = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [newJobWorkerId, setNewJobWorkerId] = useState<string | null>(null);
  const [newJobWorkerName, setNewJobWorkerName] = useState<string>("");

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id, name, icon, slug")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch workers (filtered by category/favorites and excluding current user)
  const { data: workers = [], isLoading, refetch } = useQuery({
    queryKey: ["customer-workers-list", selectedCategoryId, showFavoritesOnly],
    queryFn: async (): Promise<WorkerListItem[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      let workerIds: string[] | null = null;

      // 1. Favorites filter
      if (showFavoritesOnly) {
        if (!user) return [];
        const { data: favors } = await supabase
          .from("favorite_workers")
          .select("worker_id")
          .eq("user_id", user.id);
        
        workerIds = favors?.map(f => f.worker_id) || [];
        if (workerIds.length === 0) return [];
      }

      // 2. Category filter
      if (selectedCategoryId) {
        const { data: subcats } = await supabase
          .from("service_subcategories")
          .select("id")
          .eq("category_id", selectedCategoryId);

        const subcatIds = subcats?.map((s) => s.id) || [];
        if (subcatIds.length === 0) return [];

        const { data: services } = await supabase
          .from("worker_services")
          .select("worker_id")
          .in("subcategory_id", subcatIds);

        const categoryWorkerIds = [...new Set(services?.map((s) => s.worker_id) || [])];
        if (workerIds !== null) {
          workerIds = workerIds.filter(id => categoryWorkerIds.includes(id));
        } else {
          workerIds = categoryWorkerIds;
        }
        if (workerIds.length === 0) return [];
      } else if (!showFavoritesOnly) {
        // If neither selected, we still only want workers with at least one service
        const { data: services } = await supabase
          .from("worker_services")
          .select("worker_id");
        
        workerIds = [...new Set(services?.map((s) => s.worker_id) || [])];
        if (workerIds.length === 0) return [];
      }

      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city, bio, company_type, is_promoted, worker_verifications(status)")
        .eq("user_type", "worker");

      if (workerIds) {
        query = query.in("id", workerIds);
      }

      // Exclude current user's own profile
      if (user) {
        query = query.neq("id", user.id);
      }

      const { data, error } = await query
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

        let catEntry = categorized[workerId].find((c) => c.id === category.id);
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

  // Fetch favorite status for ALL shown workers
  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ["user-favorites"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("favorite_workers")
        .select("worker_id")
        .eq("user_id", user.id);
      return data?.map(f => f.worker_id) || [];
    }
  });
  
  const selectedWorkerIndex = workers.findIndex(w => w.id === selectedWorkerId);
  const [isCarouselReady, setIsCarouselReady] = useState(false);

  const selectedWorkerIdRef = useRef(selectedWorkerId);
  useEffect(() => {
    selectedWorkerIdRef.current = selectedWorkerId;
  }, [selectedWorkerId]);

  // Set up intersection observer to detect the currently centered card
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

  // Scroll to selected worker when modal opens
  useEffect(() => {
    if (selectedWorkerId && !isCarouselReady) {
      setTimeout(() => {
        const el = document.getElementById(`worker-slide-${selectedWorkerId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
          // Short delay before enabling smooth scrolling
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

  const toggleFavorite = async (e: React.MouseEvent, workerId: string) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Pro uložení řemeslníka se nejprve přihlaste.");
      return;
    }

    const isFav = favorites.includes(workerId);
    if (isFav) {
      await supabase
        .from("favorite_workers")
        .delete()
        .eq("user_id", user.id)
        .eq("worker_id", workerId);
    } else {
      await supabase
        .from("favorite_workers")
        .insert({ user_id: user.id, worker_id: workerId });
    }
    
    refetchFavorites();
    if (showFavoritesOnly) refetch();
  };

  return (
    <div className="min-h-screen px-3 md:px-0 pt-1 pb-6">
      {/* Category filter and Favorites toggle */}
      <div className="mt-1 mb-2">
        <div className="flex items-center min-h-[36px] pb-1 gap-2">
          <div className="flex-1 min-w-0">
            <Select
              value={selectedCategoryId || "all"}
              onValueChange={(value) => setSelectedCategoryId(value === "all" ? null : value)}
            >
              <SelectTrigger 
                className={cn(
                  "inline-flex items-center gap-2 w-full h-9 rounded-full border text-xs font-semibold whitespace-nowrap shadow-sm transition-colors px-4 [&>svg]:opacity-60",
                  selectedCategoryId 
                    ? "bg-primary border-primary text-foreground hover:bg-primary/90" 
                    : "bg-card border-border/50 text-foreground hover:bg-muted/50"
                )}
              >
                <SelectValue placeholder="Vyberte kategorii">
                  {(() => {
                    if (!selectedCategoryId) {
                      return (
                        <div className="flex items-center gap-2">
                          <Grid className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                          <span>Všechny kategorie</span>
                        </div>
                      );
                    }
                    const cat = categories.find((c) => c.id === selectedCategoryId);
                    if (!cat) return "Všechny kategorie";
                    const Icon = getCategoryIconBySlug(cat.slug);
                    return (
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-foreground" strokeWidth={1.75} />
                        <span>{cat.name}</span>
                      </div>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-md max-h-[300px] w-[var(--radix-select-trigger-width)]">
                <SelectItem value="all" className="focus:bg-primary/5 cursor-pointer py-2.5">
                  <div className="flex items-center gap-2">
                    <Grid className="h-4 w-4 text-muted-foreground" />
                    <span>Všechny kategorie</span>
                  </div>
                </SelectItem>
                {categories.map((cat) => {
                  const Icon = getCategoryIconBySlug(cat.slug);
                  return (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="focus:bg-primary/5 cursor-pointer py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-full flex-shrink-0 border-border/50 shadow-sm transition-colors",
              showFavoritesOnly 
                ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100 hover:text-red-600" 
                : "bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Heart className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
          </Button>
        </div>
      </div>

      {/* Workers list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <div className="text-center py-12 text-muted-foreground text-sm">
          Žádní profíci v této kategorii
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {workers.map((worker) => {
            const stats = reviewStats[worker.id!];
            return (
              <button
                key={worker.id}
                onClick={() => setSelectedWorkerId(worker.id!)}
                className="w-full flex items-start gap-3 p-3 rounded-2xl bg-list-item-bg border border-border/50 shadow-md hover:shadow-lg transition-all text-left"
              >
                <div className="relative flex-shrink-0 group">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={worker.avatar_url || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getFirstName(worker.full_name)?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={(e) => toggleFavorite(e, worker.id!)}
                    className={cn(
                      "absolute -top-1 -right-1 w-6 h-6 rounded-full border bg-white flex items-center justify-center shadow-sm transition-all z-10",
                      favorites.includes(worker.id!) ? "text-red-500 border-red-100" : "text-muted-foreground border-border hover:scale-110"
                    )}
                  >
                    <Heart className={cn("h-3 w-3", favorites.includes(worker.id!) && "fill-current")} />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {getFirstName(worker.full_name)}
                    </span>
                    {worker.is_promoted && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-50 text-[9px] font-bold text-emerald-600 border border-emerald-100 uppercase tracking-tight">
                        TOP
                      </span>
                    )}
                    {worker.worker_verifications?.[0]?.status === "verified" && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-widest text-[9px] px-1.5 py-0.5 shadow-sm h-4">
                        <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> Ověřeno
                      </Badge>
                    )}
                    {stats && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary flex-shrink-0">
                        {stats.avg.toFixed(1)}{" "}
                        <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                        <span className="text-muted-foreground ml-0.5">
                          ({stats.count})
                        </span>
                      </span>
                    )}
                    {stats && stats.avg >= 4.8 && stats.count >= 5 && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-widest text-[9px] px-1.5 py-0.5 shadow-sm h-4">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-500 text-amber-500" /> Zlatý profík
                      </Badge>
                    )}
                  </div>
                  {worker.city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{worker.city}</span>
                    </div>
                  )}
                  {worker.bio && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {worker.bio}
                    </p>
                  )}

                  {/* Categories pills & Action button row */}
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
                                <span className="text-muted-foreground">({category.count})</span>
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
                      Nabídnout práci
                    </Button>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Worker profile card modal carousel */}
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
              // Only close if clicking directly on the container background, not on cards
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
      {/* New job with worker dialog */}
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

export default CustomerWorkersList;
