import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistance, calculateDistanceFromCoords, CITY_COORDINATES } from "@/lib/city-regions";

interface JobWithDistance {
  id: string;
  title: string;
  description: string;
  city: string | null;
  category_id: string;
  subcategory_id: string;
  status: string;
  deadline_type: string | null;
  deadline_date: string | null;
  is_urgent: boolean;
  photos: string[] | null;
  price_note: string | null;
  created_at: string;
  distance: number;
  hasApplied: boolean;
  profiles: { full_name: string; avatar_url: string | null } | null;
  service_categories: { name: string; icon: string } | null;
  service_subcategories: { name: string; points_cost: number | null } | null;
  offers: { id: string; worker_id: string; status: string }[] | null;
}

interface UseAvailableJobsParams {
  userId: string | null;
  userCoords: { lat: number; lng: number } | null;
  userCity: string;
  subcategoryIds: string[];
  expandedJobIds: string[];
}

export const useAvailableJobs = ({
  userId,
  userCoords,
  userCity,
  subcategoryIds,
  expandedJobIds,
}: UseAvailableJobsParams) => {
  return useQuery({
    queryKey: ['available-jobs', userId, userCoords?.lat, userCoords?.lng, userCity, subcategoryIds, expandedJobIds],
    queryFn: async ({ signal }): Promise<JobWithDistance[]> => {
      if (!userId) return [];

      // Get all open jobs with offers info (exclude user's own jobs)
      const { data: fetchedJobs, error } = await supabase
        .from('jobs')
        .select(`
          *,
          profiles!jobs_customer_id_fkey(full_name, avatar_url),
          service_categories(name, icon),
          service_subcategories(name, points_cost),
          offers(id, worker_id, status)
        `)
        .eq('status', 'open')
        .neq('customer_id', userId)
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (error) throw error;
      if (!fetchedJobs) return [];

      // Calculate distances for all jobs
      const jobsWithDistance = fetchedJobs.map((job: any) => {
        let distance = Infinity;
        
        // Try to calculate distance using coordinates first
        if (userCoords && job.latitude && job.longitude) {
          // Best: both worker and job have precise coordinates
          distance = calculateDistanceFromCoords(
            userCoords.lat, 
            userCoords.lng, 
            Number(job.latitude), 
            Number(job.longitude)
          );
        } else if (userCoords && job.city) {
          // Fallback: use job's city center coordinates
          const jobCityCoords = CITY_COORDINATES[job.city];
          if (jobCityCoords) {
            distance = calculateDistanceFromCoords(
              userCoords.lat, 
              userCoords.lng, 
              jobCityCoords.lat, 
              jobCityCoords.lng
            );
          }
        }
        
        // Fallback to city-to-city calculation
        if (distance === Infinity && userCity && job.city) {
          distance = calculateDistance(userCity, job.city);
        }
        
        return {
          ...job,
          distance,
          hasApplied: job.offers?.some((offer: any) => offer.worker_id === userId)
        };
      });

      // Sort by distance
      const sortedJobs = jobsWithDistance.sort((a, b) => a.distance - b.distance);

      // Filter jobs: only show jobs in worker's subcategories
      // Exclude jobs where worker has already applied
      const visibleJobs = sortedJobs.filter((job: any) => {
        // Don't show if already applied
        if (job.hasApplied) {
          return false;
        }
        
        // Only show if in worker's subcategories
        return subcategoryIds.length > 0 && subcategoryIds.includes(job.subcategory_id);
      });

      return visibleJobs;
    },
    enabled: !!userId && (!!userCity || !!userCoords),
  });
};
