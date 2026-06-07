import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import { cn } from "@/lib/utils";
import ContentLoader from "@/components/ContentLoader";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Coins, Hammer, Wrench, Paintbrush, Zap, Droplet, Home, Truck, Sparkles, Users, Calendar, Shield, FileText, Scale, Laptop, Briefcase, Car, Palette, Grid, Monitor, Ruler, Building, Building2, Package, Scissors, BookOpen, Trees, Flower, Heart, Info, Plus, Lock, Filter, X, Eye, Send, Crown, Flame, User, ChevronDown, LayoutGrid } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { FilterPill } from "@/components/ui/filter-pill";
import { WorkerOfferDialog } from "./WorkerOfferDialog";
import { JobDetailsPopup } from "./JobDetailsPopup";
import { WorkerJobCard } from "./WorkerJobCard";
import { calculateDistance, calculateDistanceFromCoords, CITY_COORDINATES } from "@/lib/city-regions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SwipeableImageGallery, ImageLightbox } from "./SwipeableImageGallery";
import { checkAndNotifyLowCredits } from "@/lib/low-credits-notification";
import { STANDARD_SLOT_LIMIT, PRO_SLOT_LIMIT } from "@/hooks/use-pro-status";
import { getCategoryIcon } from "@/utils/categoryIcons";
const getIconForCategory = getCategoryIcon;
const DEFAULT_POINTS_COST = 3;
  function getPointsLabel(count: number) {
    if (count === 1) return 'bod';
    if (count >= 2 && count <= 4) return 'body';
    return 'bodů';
  }
interface Category {
  id: string;
  name: string;
  icon: string;
}
export interface WorkerJobListingsRef {
  toggleFilter: () => void;
}
interface WorkerJobListingsProps {
  alwaysShowFilter?: boolean;
}
function WorkerJobListingsBase({
  alwaysShowFilter = false
}: WorkerJobListingsProps, ref: React.ForwardedRef<WorkerJobListingsRef>) {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{
    userPoints?: number;
    loadUserPoints?: () => void;
  }>();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // UI state only
  const [selectedJobForOffer, setSelectedJobForOffer] = useState<any>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<any>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [showIncompleteProfileDialog, setShowIncompleteProfileDialog] = useState<any>(null);

  // Category filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(alwaysShowFilter);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [categoryToAdd, setCategoryToAdd] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Query for current user session
  const {
    data: session
  } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 1000 * 60 * 5
  });
  const userId = session?.user?.id || null;

  // Query for worker profile (points, location, pro status)
  const {
    data: profile
  } = useQuery({
    queryKey: ['worker-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const {
        data
      } = await supabase.from('profiles').select('points, city, latitude, longitude, is_pro, pro_expires_at').eq('id', userId).single();
      return data;
    },
    enabled: !!userId
  });
  const userPoints = profile?.points || 0;
  const userCity = profile?.city || "";
  const userCoords = profile?.latitude && profile?.longitude ? {
    lat: Number(profile.latitude),
    lng: Number(profile.longitude)
  } : null;
  const userIsPro = profile?.is_pro && (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date());

  // Query for expanded job IDs
  const {
    data: expandedJobIds = []
  } = useQuery({
    queryKey: ['worker-expanded-jobs', userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data
      } = await supabase.from('worker_expanded_jobs').select('job_id').eq('worker_id', userId);
      return data?.map(item => item.job_id) || [];
    },
    enabled: !!userId
  });

  // Query for worker's categories
  const {
    data: categoriesData
  } = useQuery({
    queryKey: ['worker-categories', userId],
    queryFn: async () => {
      if (!userId) return {
        workerCategories: [],
        allCategories: []
      };
      const {
        data: workerServices
      } = await supabase.from('worker_services').select('subcategory_id, service_subcategories(category_id)').eq('worker_id', userId);
      const workerCategoryIds = [...new Set(workerServices?.map(s => (s.service_subcategories as any)?.category_id).filter(Boolean) || [])];
      const {
        data: categories
      } = await supabase.from('service_categories').select('id, name, icon').order('name');
      const allCategories = categories || [];
      const workerCategories = allCategories.filter(c => workerCategoryIds.includes(c.id));
      return {
        workerCategories,
        allCategories
      };
    },
    enabled: !!userId
  });
  const workerCategories = categoriesData?.workerCategories || [];
  const allCategories = categoriesData?.allCategories || [];

  // Query for worker's subcategory IDs
  const {
    data: subcategoryIds = []
  } = useQuery({
    queryKey: ['worker-services', userId],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data
      } = await supabase.from('worker_services').select('subcategory_id').eq('worker_id', userId);
      return data?.map(s => s.subcategory_id) || [];
    },
    enabled: !!userId
  });

  // Query for available jobs
  const {
    data: allJobs = [],
    isLoading: loading
  } = useQuery({
    queryKey: ['available-jobs', userId, userCoords?.lat, userCoords?.lng, userCity, subcategoryIds],
    queryFn: async () => {
      if (!userId) return [];
      const {
        data: fetchedJobs
       } = await supabase.from('jobs').select(`
           *,
           service_categories(name, icon),
           service_subcategories(name, points_cost),
           offers(id, worker_id, status)
         `).eq('status', 'open').neq('customer_id', userId).order('created_at', {
        ascending: false
      });
      if (!fetchedJobs) return [];

      // Fetch customer profiles from public_profiles view
      const customerIds = [...new Set(fetchedJobs.map((j: any) => j.customer_id))];
      const customerProfiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url')
          .in('id', customerIds);
        profiles?.forEach((p: any) => {
          customerProfiles[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        });
      }

      const jobsWithDistance = fetchedJobs.map((job: any) => {
        let distance = Infinity;
        if (userCoords && job.city) {
          const jobCityCoords = CITY_COORDINATES[job.city];
          if (jobCityCoords) {
            distance = calculateDistanceFromCoords(userCoords.lat, userCoords.lng, jobCityCoords.lat, jobCityCoords.lng);
          }
        }
        if (distance === Infinity && userCity && job.city) {
          distance = calculateDistance(userCity, job.city);
        }
        return {
          ...job,
          customer_profile: customerProfiles[job.customer_id] || null,
          distance,
          hasApplied: job.offers?.some((offer: any) => offer.worker_id === userId)
        };
      });
      const sortedJobs = jobsWithDistance.sort((a, b) => a.distance - b.distance);
      return sortedJobs.filter((job: any) => {
        if (job.hasApplied) return false;
        return subcategoryIds.length > 0 && subcategoryIds.includes(job.subcategory_id);
      });
    },
    enabled: !!userId && (!!userCity || !!userCoords)
  });

  // Get unique subcategories for the selected category
  const uniqueSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    
    // Get all subcategories from the jobs that are in the selected category
    const subcatsMap = new Map();
    allJobs
      .filter(job => job.category_id === selectedCategoryId && job.service_subcategories)
      .forEach(job => {
        if (!subcatsMap.has(job.subcategory_id)) {
          subcatsMap.set(job.subcategory_id, {
            id: job.subcategory_id,
            name: job.service_subcategories.name
          });
        }
      });
    
    return Array.from(subcatsMap.values());
  }, [selectedCategoryId, allJobs]);

  // Filter jobs by selected category and subcategory (memoized)
  const jobs = useMemo(() => {
    let filtered = allJobs;
    if (selectedCategoryId) {
      filtered = filtered.filter(job => job.category_id === selectedCategoryId);
      if (filterSubcategory) {
        filtered = filtered.filter(job => job.subcategory_id === filterSubcategory);
      }
    }
    return filtered;
  }, [selectedCategoryId, filterSubcategory, allJobs]);

  // Invalidate queries helper
  function invalidateQueries() {
    queryClient.invalidateQueries({
      queryKey: ['available-jobs']
    });
    queryClient.invalidateQueries({
      queryKey: ['user-profile']
    });
    queryClient.invalidateQueries({
      queryKey: ['worker-categories']
    });
    queryClient.invalidateQueries({
      queryKey: ['worker-expanded-jobs']
    });
  }

  const calculateCompletion = (prof: any) => {
    if (!prof) return 0;
    let score = 20;
    if (prof.full_name) score += 10;
    if (prof.phone) score += 15;
    if (prof.city) score += 15;
    if (prof.avatar_url) score += 20;
    if (prof.bio && prof.bio.length > 10) score += 20;
    return score;
  };

  const handleApplyClick = (job: any) => {
    const score = calculateCompletion(profile);
    if (score < 100) {
      setShowIncompleteProfileDialog(job);
    } else {
      setSelectedJobForOffer(job);
    }
  };

  // loadJobs is now handled by React Query above

  async function handleAddCategory() {
    if (!categoryToAdd || !userId) return;
    if (userPoints < 10) {
      toast({
        title: "Nedostatek bodů",
        description: "Potřebujete alespoň 10 bodů pro přidání nové kategorie.",
        variant: "destructive"
      });
      return;
    }
    setIsAddingCategory(true);
    try {
      // Get all subcategories for this category
      const {
        data: subcategories
      } = await supabase.from('service_subcategories').select('id').eq('category_id', categoryToAdd.id);
      if (!subcategories || subcategories.length === 0) {
        toast({
          title: "Chyba",
          description: "Tato kategorie nemá žádné podkategorie.",
          variant: "destructive"
        });
        setIsAddingCategory(false);
        return;
      }

      // Add first subcategory to worker's services
      const {
        error: insertError
      } = await supabase.from('worker_services').insert({
        worker_id: userId,
        subcategory_id: subcategories[0].id
      });
      if (insertError) {
        console.error('Error adding service:', insertError);
        toast({
          title: "Chyba",
          description: "Nepodařilo se přidat kategorii.",
          variant: "destructive"
        });
        setIsAddingCategory(false);
        return;
      }

      // Atomically deduct 10 points
      const { data: newPointsBalance, error: pointsError } = await supabase
        .rpc('deduct_points' as any, { p_user_id: userId, p_amount: 10 });

      if (pointsError) {
        // Rollback: remove the service we just added
        await supabase.from('worker_services').delete()
          .eq('worker_id', userId).eq('subcategory_id', subcategories[0].id);
        toast({
          title: "Nedostatek bodů",
          description: "Potřebujete alespoň 10 bodů pro přidání nové kategorie.",
          variant: "destructive"
        });
        setIsAddingCategory(false);
        return;
      }

      const newPoints = (newPointsBalance as number) ?? (userPoints - 10);
      setSelectedCategoryId(categoryToAdd.id);

      // Notify parent layout to refresh points in header
      outletContext?.loadUserPoints?.();

      // Check and notify if low credits
      await checkAndNotifyLowCredits(userId, newPoints);
      toast({
        title: "Kategorie přidána",
        description: `Kategorie "${categoryToAdd.name}" byla přidána do vašeho profilu.`
      });

      invalidateQueries();
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat kategorii.",
        variant: "destructive"
      });
    } finally {
      setIsAddingCategory(false);
      setCategoryToAdd(null);
    }
  }
  async function handleExpandRadius() {
    if (userPoints < 3) {
      toast({
        title: "Nedostatek bodů",
        description: "Potřebujete alespoň 3 body pro rozšíření oblasti hledání.",
        variant: "destructive"
      });
      return;
    }
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    setIsExpanding(true);
    try {
      // Get all open jobs
      const {
        data: allJobs
      } = await supabase.from('jobs').select('id, city, subcategory_id, offers(worker_id)').eq('status', 'open');
      if (!allJobs) {
        setIsExpanding(false);
        return;
      }

      // Get worker's subcategories
      const {
        data: workerServices
      } = await supabase.from('worker_services').select('subcategory_id').eq('worker_id', session.user.id);
      const subcategoryIds = workerServices?.map(s => s.subcategory_id) || [];

      // Calculate distances and filter to get additional jobs from further away
      // 1. Must be in worker's subcategories
      // 2. Not already applied to
      // 3. Not already visible in the current list (too close)
      const currentVisibleJobIds = new Set(jobs.map(j => j.id));
      const eligibleJobs = allJobs.filter(job => {
        const hasApplied = job.offers?.some((offer: any) => offer.worker_id === session.user.id);
        const isInSubcategories = subcategoryIds.includes(job.subcategory_id);
        const isAlreadyVisible = currentVisibleJobIds.has(job.id);
        return !hasApplied && isInSubcategories && !isAlreadyVisible;
      }).map(job => ({
        ...job,
        distance: userCity ? calculateDistance(userCity, job.city || "") : Infinity
      })).sort((a, b) => a.distance - b.distance).slice(0, 50); // Get the 50 nearest jobs

      if (eligibleJobs.length === 0) {
        toast({
          title: "Žádné další zakázky",
          description: "Nejsou k dispozici žádné další zakázky k odemčení."
        });
        setIsExpanding(false);
        return;
      }

      // Insert expanded jobs into database
      const expandedJobsData = eligibleJobs.map(job => ({
        worker_id: session.user.id,
        job_id: job.id
      }));
      const {
        error: insertError
      } = await supabase.from('worker_expanded_jobs').insert(expandedJobsData);
      if (insertError) {
        console.error('Error inserting expanded jobs:', insertError);
        toast({
          title: "Chyba",
          description: "Nepodařilo se odemknout zakázky.",
          variant: "destructive"
        });
        setIsExpanding(false);
        return;
      }

      // Atomically deduct 3 points
      const { data: newPointsBalance, error: pointsError } = await supabase
        .rpc('deduct_points' as any, { p_user_id: session.user.id, p_amount: 3 });

      if (pointsError) {
        // Rollback: remove expanded jobs
        await supabase.from('worker_expanded_jobs').delete()
          .eq('worker_id', session.user.id)
          .in('job_id', eligibleJobs.map(j => j.id));
        toast({
          title: "Nedostatek bodů",
          description: "Potřebujete alespoň 3 body pro rozšíření oblasti hledání.",
          variant: "destructive"
        });
        setIsExpanding(false);
        return;
      }

      const newPoints = (newPointsBalance as number) ?? (userPoints - 3);

      // Notify parent layout to refresh points in header
      outletContext?.loadUserPoints?.();

      // Check and notify if low credits
      await checkAndNotifyLowCredits(session.user.id, newPoints);

      // Invalidate queries to reload data
      invalidateQueries();
      toast({
        title: "Oblast rozšířena",
        description: `Odemkli jste ${eligibleJobs.length} nových zakázek ze širší oblasti.`
      });
    } catch (error) {
      console.error('Error expanding radius:', error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se rozšířit oblast.",
        variant: "destructive"
      });
    } finally {
      setIsExpanding(false);
    }
  }
  if (loading) {
    return <ContentLoader />;
  }

  // Separate worker's categories from other categories
  const otherCategories = allCategories.filter(c => !workerCategories.some(wc => wc.id === c.id));
  return <div className="w-full">
      {/* Always visible horizontal scrollable filter */}
      {(showCategoryFilter || alwaysShowFilter) && <div className="mt-1 mb-1">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
            {/* All button with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <FilterPill
                  hasMenu
                  active={!!selectedCategoryId}
                >
                  {selectedCategoryId ? allCategories.find(c => c.id === selectedCategoryId)?.name : "Všechny kategorie"}
                </FilterPill>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[220px] max-h-[400px] overflow-y-auto p-1 rounded-xl shadow-xl border-border bg-card">
                <DropdownMenuItem 
                  className="rounded-lg mb-1 focus:bg-primary focus:text-white font-medium cursor-pointer"
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setFilterSubcategory(null);
                  }}
                >
                  <LayoutGrid className="h-4 w-4 mr-2 opacity-70" />
                  Všechny zakázky
                </DropdownMenuItem>
                
                <div className="h-px bg-border my-1 mx-1" />
                
                {workerCategories.map(category => {
                  const Icon = getIconForCategory(category.icon);
                  const count = allJobs.filter(j => j.category_id === category.id).length;
                  return (
                    <DropdownMenuItem 
                      key={category.id}
                      className="rounded-lg focus:bg-primary focus:text-white cursor-pointer"
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setFilterSubcategory(null);
                      }}
                    >
                      <Icon className="h-4 w-4 mr-2 opacity-70" />
                      <span className="flex-1 truncate">{category.name}</span>
                      {count > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-1 text-foreground">{count}</span>}
                    </DropdownMenuItem>
                  );
                })}

                {otherCategories.length > 0 && (
                  <>
                    <div className="h-px bg-border my-1 mx-1" />
                    <DropdownMenuItem 
                      className="rounded-lg focus:bg-primary focus:text-white text-muted-foreground cursor-pointer"
                      onClick={() => setShowAddCategoryDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2 opacity-70" />
                      <span>Přidat další...</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>}

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Přidat novou kategorii</DialogTitle>
            <DialogDescription>
              Vyberte kategorii, kterou chcete přidat do svého profilu. Přidání kategorie stojí 10 bodů.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-2 max-h-[300px] overflow-y-auto py-2">
            {otherCategories.map(category => {
            const IconComponent = getIconForCategory(category.icon);
            return <Button key={category.id} variant="outline" className="justify-start gap-3 h-12" onClick={() => {
              setCategoryToAdd(category);
              setShowCategoryFilter(false);
            }}>
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <span>{category.name}</span>
                  <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                </Button>;
          })}
          </div>
          
          <DialogFooter>
            <p className="text-xs text-muted-foreground">
              Vaše body: <span className="font-semibold text-foreground">{userPoints}</span>
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Add Category Dialog */}
      <AlertDialog open={!!categoryToAdd} onOpenChange={open => !open && setCategoryToAdd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Přidat kategorii "{categoryToAdd?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Přidání této kategorie do vašeho profilu bude stát 10 bodů. 
              Poté budete moci podávat nabídky na zakázky v této kategorii.
              <br /><br />
              <span className="font-medium">Vaše aktuální body: {userPoints}</span>
              {userPoints < 10 && <span className="text-destructive block mt-1">
                  Nemáte dostatek bodů. Potřebujete alespoň 10 bodů.
                </span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAddingCategory}>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddCategory} disabled={isAddingCategory || userPoints < 10}>
              {isAddingCategory ? "Přidávám..." : "Přidat za 10 bodů"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {jobs.length === 0 ? <div className="py-16 text-center">
          <p className="text-muted-foreground text-[14px]">
            Momentálně nejsou k dispozici žádné zakázky ve vašem oboru.
          </p>
        </div> : <TooltipProvider>
          {/* Single column layout matching WorkerInProgressJobs */}
          <div className="flex flex-col gap-4">
            {jobs.map(job => {
          const hasApplied = job.offers?.some((offer: any) => offer.worker_id === userId);
          const pointsCost = job.service_subcategories?.points_cost ?? DEFAULT_POINTS_COST;

          // Calculate slot availability for this job
          const offerCount = job.offers?.filter((o: any) => o.status === 'pending' || o.status === 'accepted').length || 0;
          const isFullyClosed = offerCount >= PRO_SLOT_LIMIT;
          const isStandardFull = offerCount >= STANDARD_SLOT_LIMIT;

          return (
            <WorkerJobCard
              key={job.id}
              job={job}
              userId={userId}
              hasApplied={hasApplied}
              distance={job.distance}
              pointsCost={pointsCost}
              isFullyClosed={isFullyClosed}
              isStandardFull={isStandardFull}
              userIsPro={userIsPro}
              onApply={() => handleApplyClick(job)}
              onViewDetail={() => setSelectedJobForDetails(job)}
              onImageClick={(images, index) => {
                setLightboxImages(images);
                setLightboxInitialIndex(index);
                setLightboxOpen(true);
              }}
            />
          );
        })}

            {/* Expand Radius Card */}
            <div className="rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1 text-foreground">Rozšířit oblast</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Odemkněte 50 dalších zakázek za 3 body
              </p>
              <Button onClick={handleExpandRadius} className="h-10 px-6 text-center" disabled={isExpanding}>
                {isExpanding ? "Načítání..." : "Rozšířit za 3 body"}
              </Button>
            </div>
          </div>
        </TooltipProvider>}

      {selectedJobForOffer && <WorkerOfferDialog job={selectedJobForOffer} onClose={() => {
      setSelectedJobForOffer(null);
      invalidateQueries();
    }} onJobUnavailable={() => {
      invalidateQueries();
    }} />}

      {selectedJobForDetails && <JobDetailsPopup job={selectedJobForDetails} isOpen={!!selectedJobForDetails} onClose={() => setSelectedJobForDetails(null)} hasApplied={selectedJobForDetails.offers?.some((offer: any) => offer.worker_id === userId)} onOfferSubmitted={() => {
      invalidateQueries();
    }} />}

      {/* Incomplete Profile Dialog */}
      <AlertDialog open={!!showIncompleteProfileDialog} onOpenChange={(open) => !open && setShowIncompleteProfileDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" />
              Zvyšte své šance na úspěch!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Zákazník uvidí váš profil dříve, než nabídku přijme. Váš profil nyní ale není kompletně vyplněn (vidí vás spíše jako anonymního panáčka).
              </p>
              <p>
                Doporučujeme nahrát <strong>profilovou fotografii</strong>, přidat <strong>bio</strong> a vyplnit údaje. Pracovníci s kompletním profilem mají až o 70 % vyšší šanci na úspěch.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <AlertDialogCancel 
              onClick={() => {
                const job = showIncompleteProfileDialog;
                setShowIncompleteProfileDialog(null);
                setSelectedJobForOffer(job);
              }}
              className="sm:mr-auto mt-0"
            >
              Přesto podat nabídku
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate('/remeslnik/profil/upravit')}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Vyplnit profil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox */}
      <ImageLightbox images={lightboxImages} initialIndex={lightboxInitialIndex} open={lightboxOpen} onOpenChange={setLightboxOpen} />
    </div>;
}

export const WorkerJobListings = forwardRef(WorkerJobListingsBase);