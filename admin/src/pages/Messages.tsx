import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

// Simple keyboard detection for padding adjustments
const useIsKeyboardOpen = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setIsKeyboardOpen(window.innerHeight - vv.height > 100);
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return isKeyboardOpen;
};
import EmptyState from "@/components/EmptyState";
import ContentLoader from "@/components/ContentLoader";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Send, ArrowLeft, MessageSquare, Image, Camera, X } from "lucide-react";
import { hapticTap } from "@/utils/haptics";
import { generateId } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { compressJobPhoto } from "@/lib/image-compression";
import { format, isToday, isYesterday } from "date-fns";
import { cs } from "date-fns/locale";
import { InlineReviewPrompt } from "@/components/InlineReviewPrompt";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/hooks/useAuthSession";
import { FilterPillChip } from "@/components/ui/filter-pill";

type MessageFilter = 'in_progress' | 'archived';

const formatMessageTime = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, "HH:mm");
  } else if (isYesterday(date)) {
    return "Včera";
  }
  return format(date, "d.M.yyyy", { locale: cs });
};

const formatLastMessageDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, "HH:mm");
  } else if (isYesterday(date)) {
    return "Včera";
  }
  return format(date, "d.M.", { locale: cs });
};

const getJobStatusBadge = (status?: string | null, offerStatus?: string | null, isArchived?: boolean) => {
  if (isArchived) {
    return { label: "Archiv", variant: "secondary" as const };
  }
  if (offerStatus === "pending" || offerStatus === "direct_pending") {
    return { label: "Nabídka", variant: "outline" as const };
  }
  if (offerStatus === "rejected") {
    return { label: "NABÍDKA ODMÍTNUTA", variant: "destructive" as const };
  }
  if (status === "in_progress" || status === "pending_approval") {
    return { label: "Probíhá", variant: "default" as const };
  }
  if (status === "completed") {
    return { label: "Hotovo", variant: "secondary" as const };
  }
  // fallback (older data / other statuses)
  return { label: "Hotovo", variant: "secondary" as const };
};

const MessageFilterTabs = ({ 
  activeFilter, 
  onFilterChange 
}: { 
  activeFilter: MessageFilter; 
  onFilterChange: (filter: MessageFilter) => void;
}) => {
  const filters: { value: MessageFilter; label: string }[] = [
    { value: 'in_progress', label: 'Probíhá' },
    { value: 'archived', label: 'Archiv' },
  ];

  return (
    <div className="mt-1 mb-1">
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
        {filters.map((filter) => (
          <FilterPillChip
            key={filter.value}
            active={activeFilter === filter.value}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </FilterPillChip>
        ))}
      </div>
    </div>
  );
};

const Messages = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeOfferId = searchParams.get('offer');
  const [selectedConversation, setSelectedConversationInternal] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<{ file: File, url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('in_progress');
  const [pendingApprovalJob, setPendingApprovalJob] = useState<any>(null);
  const [showRatePrompt, setShowRatePrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const desktopTextareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isKeyboardOpen = useIsKeyboardOpen();
  
  // Determine if we're on worker or customer messages route
  const isWorkerRoute = location.pathname.startsWith('/remeslnik');

  // Auth session query via global hook
  const { session, isLoading: sessionLoading, isAuthReady } = useAuthSession();

  const user = session?.user;

  // Fetch current user's profile name for notifications
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 30,
  });

  const scrollMessagesToBottom = useCallback(() => {
    const container = messagesScrollRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
      return;
    }

    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (isAuthReady && !session) {
      navigate('/prihlaseni');
    }
  }, [session, isAuthReady, navigate]);

  // Conversations query
  const { data: conversations = [], isLoading: conversationsLoading, error: queryError, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations', user?.id, isWorkerRoute],
    queryFn: async () => {
      // Get all offers (accepted and pending with messages) with job and worker profile
      const { data: allOffersRaw, error } = await supabase
        .from('offers')
        .select(`
          id,
          job_id,
          worker_id,
          status,
          is_direct,
          jobs(
            title,
            customer_id,
            status,
            photos,
            service_subcategories(name)
          ),
          worker:profiles!worker_id(id, full_name, avatar_url)
        `)
        .in('status', ['accepted', 'pending', 'rejected', 'direct_pending']);

      if (error) {
        console.error("Selection query error:", error);
        // We throw so useQuery catches it and we can display it in the UI
        throw error;
      }

      // Filter client-side based on current route context
      const allOffers = (allOffersRaw || []).filter(offer => {
        const job = offer.jobs;
        if (!job) return false;
        
        if (isWorkerRoute) {
          return offer.worker_id === user!.id;
        } else {
          return job.customer_id === user!.id;
        }
      });

      if (allOffers.length === 0) {
        return [];
      }

      // Get all customer profiles for jobs where user is worker
      const customerIds = allOffers
        .filter(o => o.worker_id === user!.id)
        .map(o => o.jobs!.customer_id)
        .filter(Boolean);
      
      const { data: customerProfiles } = customerIds.length > 0 
        ? await supabase
            .from('public_profiles')
            .select('id, full_name, avatar_url')
            .in('id', customerIds)
        : { data: [] };

      const customerProfileMap = new Map(
        (customerProfiles || []).map(p => [p.id, p])
      );

      // Get all messages for these offers in one query
      const offerIds = allOffers.map(o => o.id);
      const { data: allMessages } = await supabase
        .from('messages')
        .select('*')
        .in('offer_id', offerIds)
        .order('created_at', { ascending: false });

      // Fetch reviews if we are on customer route to show needsReview badge
      let reviewedJobIds = new Set<string>();
      if (!isWorkerRoute) {
        const { data: userReviews } = await supabase
          .from('reviews')
          .select('job_id')
          .eq('reviewer_id', user!.id);
        reviewedJobIds = new Set((userReviews || []).map(r => r.job_id));
      }

      // Group messages by offer_id and get latest + unread count
      const messagesByOffer = new Map<string, { latest: any; unread: number }>();
      for (const msg of (allMessages || [])) {
        const existing = messagesByOffer.get(msg.offer_id);
        if (!existing) {
          messagesByOffer.set(msg.offer_id, {
            latest: msg,
            unread: msg.receiver_id === user!.id && !msg.read ? 1 : 0
          });
        } else {
          if (msg.receiver_id === user!.id && !msg.read) {
            existing.unread++;
          }
        }
      }

      // Build conversations
      const conversationsList = allOffers
        .map((offer) => {
          const job = offer.jobs as any;
          if (!job) return null;

          const isWorker = offer.worker_id === user!.id;
          const otherUserId = isWorker ? job.customer_id : offer.worker_id;
          const workerData = offer.worker;
          const otherUser = isWorker 
            ? customerProfileMap.get(otherUserId) 
            : (Array.isArray(workerData) ? workerData[0] : workerData);

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
            isDirect: offer.is_direct,
            needsReview: !isWorkerRoute && jobStatus === 'completed' && !reviewedJobIds.has(offer.job_id),
            job: job, // Full job object for review components
          };
        })
        .filter(Boolean);

      // Sort by last message date (newest first)
      conversationsList.sort((a, b) => {
        const dateA = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const dateB = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return dateB - dateA;
      });

      return conversationsList;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  const loading = sessionLoading || conversationsLoading;

  useEffect(() => {
    if (!isMobile || !selectedConversation) return;

    const frame = requestAnimationFrame(() => scrollMessagesToBottom());
    return () => cancelAnimationFrame(frame);
  }, [isMobile, isKeyboardOpen, selectedConversation?.offerId, scrollMessagesToBottom]);

  useEffect(() => {
    if (!selectedConversation) return;

    const frame = requestAnimationFrame(() => scrollMessagesToBottom());
    return () => cancelAnimationFrame(frame);
  }, [messages.length, selectedConversation?.offerId, scrollMessagesToBottom]);

  // Synchronize state with URL search parameters
  useEffect(() => {
    if (!activeOfferId) {
      if (isMobile) {
        setSelectedConversationInternal(null);
      }
      return;
    }

    // Try to find the conversation in our pre-loaded list
    const conversation = conversations.find(c => c.offerId === activeOfferId);
    if (conversation) {
      setSelectedConversationInternal(conversation);
    } else if (!loading) {
      // If we have an ID but not the object yet, load it manually
      createConversationFromOffer(activeOfferId);
    }
  }, [activeOfferId, conversations, isMobile, loading]);

  const setSelectedConversation = (conv: any) => {
    if (!conv) {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ offer: conv.offerId }, { replace: false });
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      markMessagesAsRead();
      loadPendingApprovalJob();
      setShowRatePrompt(false);
    } else {
      setPendingApprovalJob(null);
      setShowRatePrompt(false);
    }
  }, [selectedConversation]);

  // Hide bottom nav when conversation is open on mobile
  useEffect(() => {
    if (selectedConversation) {
      document.body.dataset.conversationOpen = 'true';
      return () => { delete document.body.dataset.conversationOpen; };
    }
  }, [selectedConversation]);

  // Real-time subscription for incoming messages
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const channel = supabase
      .channel(`messages-${selectedConversation.offerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `offer_id=eq.${selectedConversation.offerId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add message if it's from the other user
          // (our messages are added locally on send)
          if (newMsg.sender_id !== user.id) {
            setMessages(prev => {
              // Check for duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, { ...newMsg, sender: null }];
            });
            
            // Mark as read
            markMessagesAsRead();

            // Keep the latest message visible without animating the whole layout
            requestAnimationFrame(() => scrollMessagesToBottom());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.offerId, user?.id]);

  // Load job data if pending_approval and user is customer
  const loadPendingApprovalJob = async () => {
    if (!selectedConversation || !user) {
      setPendingApprovalJob(null);
      return;
    }

    // Only show review prompt if job is pending_approval
    if (selectedConversation.jobStatus !== 'pending_approval') {
      setPendingApprovalJob(null);
      return;
    }

    // Check if user is the customer (not the worker)
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, customer_id, completion_photos, final_price, status')
      .eq('id', selectedConversation.jobId)
      .single();

    if (job && job.customer_id === user.id) {
      setPendingApprovalJob(job);
    } else {
      setPendingApprovalJob(null);
    }
  };

  const handleReviewSubmitted = () => {
    setShowRatePrompt(false);
    refetchConversations();
  };

  const handleOpenToAll = async () => {
    if (!selectedConversation || !user) return;
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'open' })
        .eq('id', selectedConversation.jobId);

      if (error) throw error;

      toast({ title: "Zakázka byla zpřístupněna všem řemeslníkům" });
      
      // Refresh the query to update badges and buttons
      refetchConversations();
      
      // Update local state to reflect the change immediately
      setSelectedConversation(prev => prev ? ({
        ...prev,
        jobStatus: 'open'
      }) : null);

    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    }
  };


  // Filter conversations based on active filter
  const filteredConversations = useMemo(() => {
    switch (activeFilter) {
      case 'in_progress':
        return conversations.filter(c => !c.isArchived);
      case 'archived':
        return conversations.filter(c => c.isArchived);
      default:
        return conversations.filter(c => !c.isArchived);
    }
  }, [conversations, activeFilter]);


  // Auto-select first conversation so the layout always shows expanded
  useEffect(() => {
    if (!isMobile && !selectedConversation && filteredConversations.length > 0 && !loading) {
      setSelectedConversation(filteredConversations[0]);
    }
  }, [filteredConversations, loading]);

  const createConversationFromOffer = async (offerId: string) => {
    // Fetch the offer details to create a conversation entry
    const { data: offer, error } = await supabase
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
      .eq('id', offerId)
      .single();

    if (error) {
      console.error("createConversationFromOffer error:", error);
      toast({ title: "Nepodařilo se načíst detail konverzace: " + error.message, variant: "destructive" });
      return;
    }

    if (!offer) return;

    const job = offer.jobs as any;
    if (!job) return;

    const isWorker = offer.worker_id === user.id;
    const otherUserId = isWorker ? job.customer_id : offer.worker_id;
    
    // Fetch the other user's profile
    const workerData = offer.worker;
    let otherUser = Array.isArray(workerData) ? workerData[0] : workerData;
    
    if (isWorker) {
      const { data: customerProfile } = await supabase
        .from('public_profiles')
        .select('id, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();
      otherUser = customerProfile;
    }

    const jobTitle = job.service_subcategories?.name || job.title;
    const jobPhoto = job.photos && job.photos.length > 0 ? job.photos[0] : null;

    const newConversation = {
      id: `${offer.job_id}-${otherUserId}`,
      jobId: offer.job_id,
      jobTitle,
      jobStatus: job.status,
      offerStatus: offer.status,
      jobPhoto,
      otherUser,
      otherUserId,
      offerId: offer.id,
      lastMessage: null,
      unread: 0,
    };

    setSelectedConversation(newConversation);
  };

  const loadMessages = async () => {
    if (!selectedConversation || !user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('job_id', selectedConversation.jobId)
      .eq('offer_id', selectedConversation.offerId)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedConversation.otherUserId}),and(sender_id.eq.${selectedConversation.otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("loadMessages error:", error);
      toast({ title: "Nepodařilo se načíst zprávy: " + error.message, variant: "destructive" });
      return;
    }

    if (data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedConversation || !user) return;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('job_id', selectedConversation.jobId)
      .eq('receiver_id', user.id)
      .eq('sender_id', selectedConversation.otherUserId);
    
    // Also mark notifications as read in the new central system
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('type', 'new_message')
      .eq('read', false)
      .contains('metadata', { offerId: selectedConversation.offerId });

    // Mark offer as viewed by worker (if worker is viewing)
    if (isWorkerRoute) {
      await supabase
        .from('offers')
        .update({ worker_viewed: true })
        .eq('id', selectedConversation.offerId);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    const files = Array.from(fileList) as File[];
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      
      const compressed = await compressJobPhoto(file);
      const url = URL.createObjectURL(compressed);
      setSelectedPhotos(prev => [...prev, { file: compressed, url }]);
    }
    
    // Clear input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedPhoto = (index: number) => {
    setSelectedPhotos(prev => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].url);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && selectedPhotos.length === 0) || !selectedConversation || isUploading) return;
    hapticTap();

    setIsUploading(true);
    const messageToSend = newMessage;
    const currentPhotos = [...selectedPhotos];
    const tempId = generateId();
    
    // Optimistically add message to UI
    const optimisticMessage = {
      id: tempId,
      message: messageToSend,
      photos: currentPhotos.map(p => p.url),
      sender_id: user.id,
      receiver_id: selectedConversation.otherUserId,
      created_at: new Date().toISOString(),
      job_id: selectedConversation.jobId,
      offer_id: selectedConversation.offerId,
      read: false,
      sender: { full_name: 'Vy' }
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    setSelectedPhotos([]);

    // Keep focus
    requestAnimationFrame(() => {
      try {
        mobileTextareaRef.current?.focus({ preventScroll: true });
        desktopTextareaRef.current?.focus({ preventScroll: true });
      } catch (e) {}
      scrollMessagesToBottom();
    });

    try {
      const uploadedUrls: string[] = [];
      
      // Upload photos sequentially
      for (const photo of currentPhotos) {
        const fileName = `${generateId()}.webp`;
        const filePath = `chat/${selectedConversation.offerId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(filePath, photo.file);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('job-photos')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          job_id: selectedConversation.jobId,
          offer_id: selectedConversation.offerId,
          sender_id: user.id,
          receiver_id: selectedConversation.otherUserId,
          message: messageToSend,
          photos: uploadedUrls
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp ID with actual ID
      setMessages(prev => prev.map(m => m.id === tempId ? { ...data, sender: null } : m));
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      
      // Notify
      supabase.functions.invoke('notify-new-message', {
        body: {
          receiverId: selectedConversation.otherUserId,
          senderName: myProfile?.full_name || 'uživatele',
          messagePreview: messageToSend || (uploadedUrls.length > 0 ? "📷 Fotografie" : ""),
          jobTitle: selectedConversation.jobTitle,
          jobId: selectedConversation.jobId,
          offerId: selectedConversation.offerId,
        }
      }).catch(err => console.log('Push notification failed:', err));
    } catch (error) {
      console.error('Send error:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast({
        title: "Chyba",
        description: "Nepodařilo se odeslat zprávu",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <ContentLoader />;
  }

  // Mobile view - show either conversation list or selected conversation
  if (isMobile) {
    // Show conversation view
    if (selectedConversation) {
      return (
        <div
          className="flex flex-col h-full bg-background"
        >
          {/* Conversation header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex-shrink-0 border-b border-border/30 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <p 
                className="font-semibold truncate hover:underline cursor-pointer"
                onClick={() => navigate(isWorkerRoute ? '/remeslnik/probihajici' : '/zakaznik/prehled')}
              >
                {selectedConversation.jobTitle}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedConversation.otherUser?.full_name}
              </p>
            </div>
          </div>

          {/* Messages - scrollable area */}
          <div
            ref={messagesScrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-2"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="space-y-1 pb-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                       className={`max-w-[78%] rounded-2xl p-1.5 shadow-sm overflow-hidden ${
                        isMe
                           ? 'bg-primary text-primary-foreground rounded-br-md ml-auto'
                           : 'bg-card text-foreground rounded-bl-md mr-auto'
                      }`}
                    >
                      {msg.photos && msg.photos.length > 0 && (
                        <div className={`grid gap-1 mb-1.5 ${msg.photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {msg.photos.map((photo: string, idx: number) => (
                            <div key={idx} className="rounded-lg overflow-hidden border border-white/10 aspect-square">
                              <img 
                                src={photo} 
                                alt="" 
                                className="w-full h-full object-cover cursor-pointer" 
                                onClick={() => window.open(photo, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {msg.message && (
                        <p className="text-[14px] leading-tight px-2 py-0.5 whitespace-pre-wrap break-words">{msg.message}</p>
                      )}
                      
                      <p className={`text-[10px] sm:text-[11px] px-2 mt-0.5 text-right ${isMe ? 'opacity-70 text-white' : 'text-muted-foreground'}`}>
                        {formatMessageTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {pendingApprovalJob && (
                <InlineReviewPrompt 
                  job={pendingApprovalJob} 
                  onReviewSubmitted={handleReviewSubmitted} 
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          {/* Composer */}
          {!selectedConversation.isArchived ? (
            <div
               className="flex-shrink-0 flex flex-col pt-2 w-full px-2"
               style={{ 
                 paddingBottom: isKeyboardOpen 
                   ? '12px' 
                   : 'calc(env(safe-area-inset-bottom, 12px) + 15px)' 
               }}
            >
              {/* Photo Previews */}
              {selectedPhotos.length > 0 && (
                <div className="flex gap-2 mb-2 px-2 overflow-x-auto pb-1 scrollbar-hide">
                  {selectedPhotos.map((photo, index) => (
                    <div key={index} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeSelectedPhoto(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* The Pill Composer */}
              <div className="flex items-end gap-2 p-1 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden rounded-[26px] bg-[hsl(var(--list-item-header))] dark:bg-card">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoSelect} 
                />
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 text-muted-foreground/60 hover:text-primary rounded-full hover:bg-muted flex-shrink-0 ml-1 mb-0.5"
                >
                  <Camera className="h-5 w-5" />
                </Button>

                <Textarea
                  ref={mobileTextareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Zpráva..."
                  className="flex-1 min-h-[40px] max-h-32 py-2.5 resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none shadow-none bg-transparent text-[15px] leading-snug px-1"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />

                <Button 
                  onClick={sendMessage} 
                  size="icon" 
                  disabled={(!newMessage.trim() && selectedPhotos.length === 0) || isUploading}
                  className="h-10 w-10 rounded-full flex-shrink-0 self-end mr-1 mb-0.5 shadow-sm transition-all active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
                >
                  {isUploading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="h-[18px] w-[18px]" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 flex flex-col">
              {selectedConversation.needsReview && !showRatePrompt && (
                <div className="p-4 pt-0">
                  <Button
                    onClick={() => setShowRatePrompt(true)}
                    className="w-full h-11 rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold active:scale-95 transition-all"
                  >
                    Ohodnotit
                  </Button>
                </div>
              )}

              {selectedConversation.needsReview && showRatePrompt && (
                <div className="px-4 pb-4">
                  <InlineReviewPrompt 
                    job={{ ...selectedConversation.job, id: selectedConversation.jobId }} 
                    onReviewSubmitted={handleReviewSubmitted} 
                  />
                </div>
              )}

              <div 
                className="p-4 text-center bg-muted/80 backdrop-blur text-sm text-muted-foreground"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                Tato konverzace je archivována
              </div>
            </div>
          )}
        </div>
      );
    }

    // Show conversations list
    return (
      <div className="flex flex-col px-3 md:px-0 pt-1 pb-6" style={{ height: 'calc(100dvh - 73px - 5rem - env(safe-area-inset-bottom))' }}>
          <MessageFilterTabs 
            activeFilter={activeFilter} 
            onFilterChange={setActiveFilter} 
          />
        
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/20">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 transition-transform hover:scale-110">
                <p className="text-2xl">💬</p>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Žádné konverzace</h3>
              <p className="text-sm text-muted-foreground">
                {(isWorkerRoute ? "Zatím jste neobdrželi žádné nabídky." : "Zatím jste neodeslali žádné poptávky.")} 
              </p>
              {queryError && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive text-[12px] rounded-lg max-w-xs border border-destructive/20 font-mono">
                  Error: {(queryError as any).message}
                </div>
              )}
            </div>
          ) : (
            <div className="pt-[5px]">
              {filteredConversations.map((conv) => {
                const statusBadge = getJobStatusBadge(conv.jobStatus, conv.offerStatus, conv.isArchived);
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className="px-0 py-3 border-b border-border/30 cursor-pointer active:bg-secondary hover:bg-secondary/50 transition-colors"
                  >
                                    <div className="flex items-center gap-3">
                                      {/* Job photo with worker avatar badge */}
                                      <div className="relative flex-shrink-0">
                                        {conv.jobPhoto ? (
                                          <div className="h-12 w-12 rounded-xl overflow-hidden">
                                            <img src={conv.jobPhoto} alt="" className="w-full h-full object-cover" />
                                          </div>
                                        ) : (
                                          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                            <span className="text-xs text-muted-foreground">Foto</span>
                                          </div>
                                        )}
                                        {/* Worker avatar badge */}
                                        <Avatar className="h-6 w-6 absolute -bottom-1 -right-1 ring-2 ring-background">
                                          <AvatarImage src={conv.otherUser?.avatar_url} alt={conv.otherUser?.full_name} />
                                          <AvatarFallback className="text-[10px]">
                                            {conv.otherUser?.full_name?.charAt(0) || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] items-start gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.otherUser?.full_name}
                          </p>
                          <p className="text-sm font-medium truncate">
                            {conv.jobTitle}
                          </p>

                          <div className="flex items-center gap-2 mt-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                              {conv.lastMessage?.message || "Začněte konverzaci"}
                            </p>
                            {conv.unread > 0 && (
                              <span className="bg-primary text-primary-foreground text-[10px] w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center">
                                {conv.unread}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[5.75rem]">
                          {statusBadge.label !== "Probíhá" && (
                            <Badge variant={statusBadge.variant} className="text-xs px-2 py-0 h-5">
                              {statusBadge.label}
                            </Badge>
                          )}
                          {conv.needsReview && (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white text-[10px] px-1.5 h-4 border-none">
                              Ohodnotit
                            </Badge>
                          )}
                          <span className="text-xs text-foreground/60 whitespace-nowrap">
                            {conv.lastMessage?.created_at
                              ? formatLastMessageDate(conv.lastMessage.created_at)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Desktop view - two columns
  return (
    <div className="h-[calc(100dvh-73px)] flex flex-col overflow-hidden md:pb-6">
      <div className="flex-1 w-full px-3 md:px-0 pt-1 flex flex-col min-h-0">
        {/* Filter tabs - outside the card to match hledej layout */}
        <MessageFilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl border border-border/30 shadow-none">
          <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden min-h-0">
            {/* Conversations List */}
            <div className="md:col-span-1 border-r border-border/50 flex flex-col overflow-hidden min-h-0">
              
              <CardContent className="flex-1 overflow-hidden min-h-0 p-0">
                <ScrollArea className="h-full px-2 pb-0">
                  {filteredConversations.length === 0 ? (
                    <EmptyState
                      message={activeFilter === 'archived' ? 'Nemáte žádné archivované zprávy' : 'Nemáte žádné zprávy'}
                      buttonLabel={activeFilter !== 'archived' ? (isWorkerRoute ? 'Hledat zakázky' : 'Vytvořit poptávku') : undefined}
                      onButtonClick={activeFilter !== 'archived' ? () => navigate(isWorkerRoute ? '/remeslnik/hledej' : '/zakaznik/nova-zakazka') : undefined}
                    />
                  ) : (
                    <div className="space-y-1 pr-1 pt-[5px]">
                      {filteredConversations.map((conv) => {
                        const statusBadge = getJobStatusBadge(conv.jobStatus, conv.offerStatus, conv.isArchived);
                        return (
                          <div
                            key={conv.id}
                            onClick={() => setSelectedConversation(conv)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedConversation?.id === conv.id
                                ? "bg-[hsl(var(--list-item-header))]"
                                : "hover:bg-secondary"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                                      {/* Job photo with worker avatar badge */}
                                      <div className="relative flex-shrink-0">
                                        {conv.jobPhoto ? (
                                          <div className="h-12 w-12 rounded-xl overflow-hidden">
                                            <img src={conv.jobPhoto} alt="" className="w-full h-full object-cover" />
                                          </div>
                                        ) : (
                                          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                            <span className="text-[10px] text-muted-foreground">Foto</span>
                                          </div>
                                        )}
                                        {/* Worker avatar badge */}
                                        <Avatar className="h-6 w-6 absolute -bottom-1 -right-1 ring-2 ring-background">
                                          <AvatarImage src={conv.otherUser?.avatar_url} alt={conv.otherUser?.full_name} />
                                          <AvatarFallback className="text-[9px]">
                                            {conv.otherUser?.full_name?.charAt(0) || "?"}
                                          </AvatarFallback>
                                        </Avatar>
                                      </div>

                              <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] items-start gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground truncate">
                                    {(() => {
                                      const name = conv.otherUser?.full_name || '';
                                      const parts = name.trim().split(/\s+/);
                                      if (parts.length <= 1) return name;
                                      return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
                                    })()}
                                  </p>
                                  <p className="text-sm font-medium truncate">
                                    {conv.jobTitle}
                                  </p>

                                  <div className="flex items-center gap-2 mt-1 min-w-0">
                                    {conv.lastMessage ? (
                                      <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                                        {conv.lastMessage.message}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">
                                        Začněte konverzaci
                                      </p>
                                    )}
                                    {conv.unread > 0 && (
                                      <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {conv.unread}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[5.75rem]">
                                  {statusBadge.label !== "Probíhá" && (
                                    <Badge variant={statusBadge.variant} className="text-xs px-2 py-0 h-5">
                                      {statusBadge.label}
                                    </Badge>
                                  )}
                                  {conv.needsReview && (
                                    <Badge className="bg-green-500 hover:bg-green-600 text-white text-[10px] px-1.5 h-4 border-none">
                                      Ohodnotit
                                    </Badge>
                                  )}
                                  <span className="text-xs text-foreground/60 whitespace-nowrap">
                                    {conv.lastMessage?.created_at
                                      ? formatLastMessageDate(conv.lastMessage.created_at)
                                      : "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </div>

            {/* Messages */}
            <div className="md:col-span-2 flex flex-col overflow-hidden min-h-0">
              {selectedConversation ? (
                <>
                  {/* WhatsApp-style slim header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card flex-shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={selectedConversation.otherUser?.avatar_url} alt={selectedConversation.otherUser?.full_name} />
                      <AvatarFallback className="text-xs bg-primary/20 text-foreground">
                        {selectedConversation.otherUser?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-sm font-semibold truncate hover:underline cursor-pointer"
                        onClick={() => navigate(isWorkerRoute ? '/remeslnik/probihajici' : '/zakaznik/prehled')}
                      >
                        {selectedConversation.jobTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedConversation.otherUser?.full_name}
                      </p>
                    </div>
                  </div>

                  {/* Chat area with subtle background */}
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-secondary/30">
                    <ScrollArea className="flex-1 px-4 pt-2">
                      <div className="space-y-1 pr-2 pb-4">
                        {messages.map((msg) => {
                          const isMe = msg.sender_id === user.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[65%] rounded-2xl px-3 py-2 shadow-sm ${
                                  isMe
                                    ? 'bg-primary text-primary-foreground rounded-br-md'
                                    : 'bg-card text-foreground rounded-bl-md'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'opacity-70' : 'text-muted-foreground'}`}>
                                  {formatMessageTime(msg.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Review prompt for pending approval jobs */}
                        {pendingApprovalJob && (
                          <InlineReviewPrompt 
                            job={pendingApprovalJob} 
                            onReviewSubmitted={handleReviewSubmitted} 
                          />
                        )}

                        {selectedConversation.needsReview && showRatePrompt && (
                          <InlineReviewPrompt 
                            job={{ ...selectedConversation.job, id: selectedConversation.jobId }} 
                            onReviewSubmitted={handleReviewSubmitted} 
                          />
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    
                    {/* WhatsApp-style slim composer */}
                    {!selectedConversation.isArchived ? (
                      <div className="flex items-end gap-2 flex-shrink-0 px-4 py-2 bg-card border-t border-border/30">
                        <Textarea
                          ref={desktopTextareaRef}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Napište zprávu..."
                          className="min-h-[40px] max-h-[120px] resize-none text-sm rounded-2xl border-border/50 bg-[hsl(var(--list-item-header))] dark:bg-secondary/50 py-2.5"
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                        />
                        <Button onClick={sendMessage} size="icon" className="h-10 w-10 rounded-full flex-shrink-0">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      (selectedConversation.needsReview && !showRatePrompt) || 
                      (!isWorkerRoute && selectedConversation.isDirect && selectedConversation.offerStatus === 'rejected' && selectedConversation.jobStatus === 'pending') ? (
                        <div className="p-4 bg-card border-t border-border/30">
                          {selectedConversation.needsReview && !showRatePrompt && (
                            <Button 
                              onClick={() => setShowRatePrompt(true)}
                              className="w-full h-11 rounded-full bg-green-500 hover:bg-green-600 text-white font-semibold active:scale-95 transition-all"
                            >
                              Ohodnotit zakázku
                            </Button>
                          )}
                          
                          {!isWorkerRoute && selectedConversation.isDirect && selectedConversation.offerStatus === 'rejected' && selectedConversation.jobStatus === 'pending' && (
                            <Button 
                              onClick={handleOpenToAll}
                              className="w-full h-11 rounded-full bg-primary hover:bg-primary-hover text-white font-bold active:scale-95 transition-all"
                            >
                              Zpřístupnit všem řemeslníkům
                            </Button>
                          )}
                        </div>
                      ) : null
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 opacity-30" />
                  <p className="text-sm">
                    Vyberte konverzaci pro zobrazení zpráv
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Messages;
