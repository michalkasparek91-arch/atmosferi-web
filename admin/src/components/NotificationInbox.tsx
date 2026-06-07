import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageSquare, Info, Zap, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/utils/haptics";

const getNotificationMetadata = (notification: any) => {
  return (notification?.metadata && typeof notification.metadata === "object" && !Array.isArray(notification.metadata))
    ? (notification.metadata as Record<string, any>)
    : {};
};

export function NotificationInbox() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const isWorkerRoute = location.pathname.startsWith('/remeslnik');

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ["user-notifications", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const messageOfferContext = useMemo(() => {
    return notifications.reduce<Record<string, "worker" | "customer">>((acc, notification: any) => {
      const offerId = getNotificationMetadata(notification).offerId as string | undefined;
      if (!offerId || acc[offerId]) return acc;

      acc[offerId] = notification.link?.startsWith('/remeslnik') ? 'worker' : 'customer';
      return acc;
    }, {});
  }, [notifications]);

  const messageOfferIds = useMemo(
    () => Object.keys(messageOfferContext),
    [messageOfferContext]
  );

  const { data: messageSenderNames = {} } = useQuery({
    queryKey: ["notification-message-senders", userId, messageOfferContext],
    queryFn: async () => {
      if (messageOfferIds.length === 0) return {} as Record<string, string>;

      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('id, worker_id, jobs(customer_id)')
        .in('id', messageOfferIds);

      if (offersError) throw offersError;

      const profileIds = Array.from(new Set(
        (offers || []).flatMap((offer: any) => {
          const customerId = offer.jobs?.customer_id;
          return [offer.worker_id, customerId].filter(Boolean);
        })
      ));

      if (profileIds.length === 0) return {} as Record<string, string>;

      const { data: profiles, error: profilesError } = await supabase
        .from('public_profiles')
        .select('id, full_name')
        .in('id', profileIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));

      return (offers || []).reduce<Record<string, string>>((acc, offer: any) => {
        const customerId = offer.jobs?.customer_id as string | undefined;
        const senderId = messageOfferContext[offer.id] === 'worker' ? customerId : offer.worker_id;
        const senderName = senderId ? profileMap.get(senderId) : null;

        if (senderName) {
          acc[offer.id] = senderName;
        }

        return acc;
      }, {});
    },
    enabled: !!userId && messageOfferIds.length > 0,
  });

  // Realtime subscription for instant badge updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetch();
          hapticTap(); // Gentle feedback on new notification
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  const markAsRead = useMutation({
    mutationFn: async (idOrIds: string | string[]) => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      const { error } = await supabase
        .from("user_notifications")
        .update({ read: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      // Also invalidate tab counts since they depend on this source
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
      queryClient.invalidateQueries({ queryKey: ["worker-tab-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["customer-tab-notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("user_notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
      queryClient.invalidateQueries({ queryKey: ["worker-tab-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["customer-tab-notifications"] });
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new_message': return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
      case 'low_credits': return <Zap className="h-3.5 w-3.5 text-primary" />;
      case 'offer_accepted': return <ShieldCheck className="h-3.5 w-3.5 text-primary" />;
      default: return <Info className="h-3.5 w-3.5 text-primary" />;
    }
  };

  const extractSenderNameFromTitle = (title: string) => {
    if (!title.startsWith("Nová zpráva od ")) return null;

    const extractedName = title.replace("Nová zpráva od ", "").trim();
    if (!extractedName || extractedName === 'Zpráva' || extractedName === 'uživatele') {
      return null;
    }

    return extractedName;
  };

  const displayNotifications = (() => {
    const consolidated: any[] = [];
    const messageGroups: Record<string, any[]> = {};

    notifications.forEach(n => {
      const metadata = getNotificationMetadata(n);
      const messageGroupKey = n.type === 'new_message'
        ? (metadata.senderId as string | undefined) || (metadata.offerId as string | undefined) || n.link || n.id
        : null;

      if (messageGroupKey) {
        if (!messageGroups[messageGroupKey]) messageGroups[messageGroupKey] = [];
        messageGroups[messageGroupKey].push(n);
      } else {
        consolidated.push(n);
      }
    });

    Object.values(messageGroups).forEach((group) => {
      const latest = group[0];
      const metadata = getNotificationMetadata(latest);
      const offerId = metadata.offerId as string | undefined;
      const senderName = messageSenderNames[offerId || '']
        || metadata.senderName
        || extractSenderNameFromTitle(latest.title);

      consolidated.push({
        ...latest,
        read: group.every((notification) => notification.read),
        title: senderName ? `Zpráva › ${senderName}` : 'Nová zpráva',
        body: latest.body,
        ids: group.map(n => n.id)
      });
    });

    return consolidated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  })();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full p-0 bg-card hover:bg-accent transition-all active:scale-95 group data-[state=open]:bg-accent"
        >
          <Bell className="h-5 w-5 text-foreground transition-colors" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center bg-[#FF3B30] text-white text-[10px] font-bold border-2 border-background rounded-full shadow-lg z-20">
              {unreadCount}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-[calc(100vw-32px)] md:w-96 p-0 shadow-2xl border-border/60 rounded-[2rem] md:rounded-3xl overflow-hidden backdrop-blur-xl bg-popover/95 flex flex-col max-h-[min(600px,80vh)]"
        )} 
        align="end"
        collisionPadding={16}
      >
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-border/40">
          <div>
            <h4 className="text-sm font-bold tracking-tight">Oznámení</h4>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Máte {unreadCount} nepřečtených</p>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] h-8 px-3 rounded-full text-primary hover:bg-primary/5 font-semibold"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              Přečíst vše
            </Button>
          )}
        </div>
        
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="max-h-[min(500px,65vh)] md:max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/40">
              <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 stroke-[1]" />
              </div>
              <p className="text-xs font-medium">Zatím žádná upozornění</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/30">
              {displayNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    hapticTap();
                    setOpen(false);
                    if (!n.read) markAsRead.mutate(n.ids || n.id);
                    if (n.type === 'low_credits') {
                      // Open the credits purchase dialog directly
                      window.dispatchEvent(new CustomEvent("open-points-purchase"));
                    } else if (n.link) {
                      navigate(n.link);
                    }
                  }}
                  className={cn(
                    "flex items-start gap-4 p-4 text-left transition-all hover:bg-accent/50 relative group",
                    !n.read && "bg-primary/[0.03]"
                  )}
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shadow-sm border border-border/40",
                      n.read ? "bg-muted text-slate-400" : "bg-card"
                    )}>
                      {getTypeIcon(n.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className={cn("text-[11px] font-bold truncate leading-tight", !n.read ? "text-foreground" : "text-foreground/60")}>
                        {n.title}
                      </span>
                      {n.link?.startsWith('/remeslnik') && (
                        <div className="ml-1.5 px-2 py-0.5 rounded-full bg-[hsl(var(--list-item-header))] flex items-center shrink-0 h-4.5">
                          <span className="text-[7.5px] font-black tracking-tighter text-[hsl(var(--sidebar-active-text))] leading-none uppercase">Pracovník</span>
                        </div>
                      )}
                      <span className="text-[9px] text-muted-foreground/50 whitespace-nowrap ml-2 font-medium">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: cs })}
                      </span>
                    </div>
                    <p className={cn(
                      "text-[11px] leading-relaxed line-clamp-2", 
                      !n.read ? "text-foreground/80 font-medium" : "text-muted-foreground/60"
                    )}>
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-primary rounded-full transition-all group-hover:h-5" />
                  )}
                </button>
              ))}
            </div>
          )}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t border-border/40 bg-muted/30 text-center">
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.1em] opacity-40">
               Historie posledních 20 oznámení
            </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
