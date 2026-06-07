import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AcceptedOffer {
  id: string;
  job_id: string;
  worker_id: string;
  status: string;
  price: number;
  message: string;
  availability: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
  worker_viewed: boolean;
  jobs: {
    id: string;
    title: string;
    description: string;
    city: string | null;
    full_address: string | null;
    status: string;
    deadline_date: string | null;
    photos: string[] | null;
    progress_photos: string[] | null;
    completion_photos: string[] | null;
    latitude: number | null;
    longitude: number | null;
    profiles: {
      full_name: string;
      phone: string | null;
      avatar_url: string | null;
    };
    service_categories: {
      name: string;
      icon: string;
    };
    service_subcategories: {
      id: string;
      name: string;
    };
  };
}

export const useAcceptedOffers = (userId: string | null) => {
  return useQuery({
    queryKey: ['worker-accepted-offers', userId],
    queryFn: async (): Promise<AcceptedOffer[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          jobs:job_id(
            *,
            profiles:customer_id(full_name, phone, avatar_url),
            service_categories:category_id(name, icon),
            service_subcategories:subcategory_id(id, name)
          )
        `)
        .eq('worker_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out completed jobs and sort by worker_viewed
      const activeJobs = (data || [])
        .filter((offer: any) => offer.jobs?.status !== 'completed')
        .sort((a: any, b: any) => {
          if (a.worker_viewed === false && b.worker_viewed !== false) return -1;
          if (a.worker_viewed !== false && b.worker_viewed === false) return 1;
          return 0;
        });

      return activeJobs;
    },
    enabled: !!userId,
  });
};

export const useVisitAppointments = (userId: string | null, jobIds: string[]) => {
  return useQuery({
    queryKey: ['visit-appointments', userId, jobIds],
    queryFn: async () => {
      if (!userId || jobIds.length === 0) return {};

      const { data, error } = await supabase
        .from('visit_appointments')
        .select('*')
        .eq('worker_id', userId)
        .in('job_id', jobIds)
        .order('visit_date', { ascending: true });

      if (error) throw error;

      // Group appointments by job_id
      const appointmentsByJob: Record<string, any[]> = {};
      (data || []).forEach((apt: any) => {
        if (!appointmentsByJob[apt.job_id]) {
          appointmentsByJob[apt.job_id] = [];
        }
        appointmentsByJob[apt.job_id].push({
          id: apt.id,
          date: new Date(apt.visit_date),
          time: apt.visit_time.substring(0, 5),
        });
      });

      return appointmentsByJob;
    },
    enabled: !!userId && jobIds.length > 0,
  });
};

export const useAdditionalCosts = (offerIds: string[]) => {
  return useQuery({
    queryKey: ['additional-costs', offerIds],
    queryFn: async () => {
      if (offerIds.length === 0) return {};

      const { data, error } = await supabase
        .from('additional_costs')
        .select('*')
        .in('offer_id', offerIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const costsByOffer: Record<string, any[]> = {};
      (data || []).forEach((cost: any) => {
        if (!costsByOffer[cost.offer_id]) {
          costsByOffer[cost.offer_id] = [];
        }
        costsByOffer[cost.offer_id].push(cost);
      });

      return costsByOffer;
    },
    enabled: offerIds.length > 0,
  });
};

export const useUnreadMessageCounts = (userId: string | null, offerIds: string[]) => {
  return useQuery({
    queryKey: ['unread-message-counts', userId, offerIds],
    queryFn: async () => {
      if (!userId || offerIds.length === 0) return {};

      const { data, error } = await supabase
        .from('messages')
        .select('offer_id')
        .eq('receiver_id', userId)
        .eq('read', false)
        .in('offer_id', offerIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((msg: any) => {
        counts[msg.offer_id] = (counts[msg.offer_id] || 0) + 1;
      });

      return counts;
    },
    enabled: !!userId && offerIds.length > 0,
  });
};

export const useCalendarShares = (userId: string | null, jobIds: string[]) => {
  return useQuery({
    queryKey: ['calendar-shares', userId, jobIds],
    queryFn: async () => {
      if (!userId || jobIds.length === 0) return {};

      const { data, error } = await supabase
        .from('calendar_shares')
        .select('*')
        .eq('worker_id', userId)
        .in('job_id', jobIds);

      if (error) throw error;

      const sharesByJob: Record<string, boolean> = {};
      (data || []).forEach((share: any) => {
        sharesByJob[share.job_id] = share.enabled;
      });

      return sharesByJob;
    },
    enabled: !!userId && jobIds.length > 0,
  });
};
