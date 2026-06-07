import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WorkerProfile {
  points: number;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  is_pro: boolean;
  pro_expires_at: string | null;
}

export const useWorkerProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ['worker-profile', userId],
    queryFn: async (): Promise<WorkerProfile | null> => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('points, city, latitude, longitude, is_pro, pro_expires_at')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useWorkerExpandedJobs = (userId: string | null) => {
  return useQuery({
    queryKey: ['worker-expanded-jobs', userId],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('worker_expanded_jobs')
        .select('job_id')
        .eq('worker_id', userId);
      
      if (error) throw error;
      return data?.map(item => item.job_id) || [];
    },
    enabled: !!userId,
  });
};

interface Category {
  id: string;
  name: string;
  icon: string;
}

export const useWorkerCategories = (userId: string | null) => {
  return useQuery({
    queryKey: ['worker-categories', userId],
    queryFn: async (): Promise<{ workerCategories: Category[]; allCategories: Category[] }> => {
      if (!userId) return { workerCategories: [], allCategories: [] };
      
      // Get worker's subcategories with their category info
      const { data: workerServices } = await supabase
        .from('worker_services')
        .select('subcategory_id, service_subcategories(category_id)')
        .eq('worker_id', userId);

      // Get unique category IDs from worker's services
      const workerCategoryIds = [...new Set(
        workerServices?.map(s => (s.service_subcategories as any)?.category_id).filter(Boolean) || []
      )];

      // Get all categories
      const { data: categories, error } = await supabase
        .from('service_categories')
        .select('id, name, icon')
        .order('name');

      if (error) throw error;
      
      const allCategories = categories || [];
      const workerCategories = allCategories.filter(c => workerCategoryIds.includes(c.id));
      
      return { workerCategories, allCategories };
    },
    enabled: !!userId,
  });
};

export const useWorkerServices = (userId: string | null) => {
  return useQuery({
    queryKey: ['worker-services', userId],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('worker_services')
        .select('subcategory_id')
        .eq('worker_id', userId);
      
      if (error) throw error;
      return data?.map(s => s.subcategory_id) || [];
    },
    enabled: !!userId,
  });
};
