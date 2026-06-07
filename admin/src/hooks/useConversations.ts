import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: string | null;
  offerStatus: string;
  jobPhoto: string | null;
  otherUser: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  otherUserId: string;
  offerId: string;
  lastMessage: {
    id: string;
    message: string;
    created_at: string;
    sender_id: string;
    receiver_id: string;
    read: boolean;
  } | null;
  unread: number;
  isArchived: boolean;
}

export const useConversations = (userId: string | null, isWorkerRoute: boolean) => {
  return useQuery({
    queryKey: ['conversations', userId, isWorkerRoute],
    queryFn: async ({ signal }): Promise<Conversation[]> => {
      if (!userId) return [];

      // Get all offers (accepted and pending with messages) with job and worker profile
      const { data: allOffersRaw, error } = await supabase
        .from('offers')
        .select(`
          id,
          job_id,
          worker_id,
          status,
          jobs(
            title,
            customer_id,
            status,
            photos,
            service_subcategories(name)
          ),
          worker:profiles!worker_id(id, full_name, avatar_url)
        `)
        .in('status', ['accepted', 'pending'])
        .abortSignal(signal);

      if (error) throw error;

      // Filter based on current route context
      const allOffers = (allOffersRaw || []).filter((offer: any) => {
        const job = offer.jobs;
        if (!job) return false;
        
        if (isWorkerRoute) {
          return offer.worker_id === userId;
        } else {
          return job.customer_id === userId;
        }
      });

      if (allOffers.length === 0) return [];

      // Get all customer profiles for jobs where user is worker
      const customerIds = allOffers
        .filter((o: any) => o.worker_id === userId)
        .map((o: any) => o.jobs!.customer_id)
        .filter(Boolean);
      
      const { data: customerProfiles } = customerIds.length > 0 
        ? await supabase
            .from('public_profiles')
            .select('id, full_name, avatar_url')
            .in('id', customerIds)
        : { data: [] };

      const customerProfileMap = new Map(
        (customerProfiles || []).map((p: any) => [p.id, p])
      );

      // Get all messages for these offers in one query
      const offerIds = allOffers.map((o: any) => o.id);
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .in('offer_id', offerIds)
        .order('created_at', { ascending: false });

      // No reviews query needed — archival is based on job status

      // Group messages by offer_id and get latest + unread count
      const messagesByOffer = new Map<string, { latest: any; unread: number }>();
      for (const msg of (allMessages || [])) {
        const existing = messagesByOffer.get(msg.offer_id);
        if (!existing) {
          messagesByOffer.set(msg.offer_id, {
            latest: msg,
            unread: msg.receiver_id === userId && !msg.read ? 1 : 0
          });
        } else {
          if (msg.receiver_id === userId && !msg.read) {
            existing.unread++;
          }
        }
      }

      // Build conversations
      const conversationsList = allOffers
        .map((offer: any) => {
          const job = offer.jobs as any;
          if (!job) return null;

          const isWorker = offer.worker_id === userId;
          const otherUserId = isWorker ? job.customer_id : offer.worker_id;
          const otherUser = isWorker ? customerProfileMap.get(otherUserId) : offer.worker;

          const msgData = messagesByOffer.get(offer.id);
          
          // Skip pending offers without messages
          if (offer.status === 'pending' && !msgData?.latest) {
            return null;
          }
          
          const jobTitle = job.service_subcategories?.name || job.title;
          const jobStatus = job.status;
          const offerStatus = offer.status;
          const jobPhoto = job.photos && job.photos.length > 0 ? job.photos[0] : null;
          const isArchived = jobStatus === 'completed' || jobStatus === 'cancelled';

          return {
            id: `${offer.job_id}-${otherUserId}`,
            jobId: offer.job_id,
            jobTitle,
            jobStatus,
            offerStatus,
            jobPhoto,
            otherUser,
            otherUserId,
            offerId: offer.id,
            lastMessage: msgData?.latest || null,
            unread: msgData?.unread || 0,
            isArchived,
          };
        })
        .filter(Boolean) as Conversation[];

      // Sort by last message date (newest first)
      conversationsList.sort((a, b) => {
        const dateA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const dateB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return dateB - dateA;
      });

      return conversationsList;
    },
    enabled: !!userId,
  });
};

export const useMessages = (
  jobId: string | null, 
  offerId: string | null, 
  userId: string | null, 
  otherUserId: string | null
) => {
  return useQuery({
    queryKey: ['messages', jobId, offerId],
    queryFn: async () => {
      if (!jobId || !offerId || !userId || !otherUserId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', jobId)
        .eq('offer_id', offerId)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId && !!offerId && !!userId && !!otherUserId,
  });
};
