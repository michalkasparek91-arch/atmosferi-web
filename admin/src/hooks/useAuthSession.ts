import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAuthSession() {
  const [authEventFired, setAuthEventFired] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Push the fresh session into the shared cache so every consumer of
      // ['auth-session'] (including duplicate useQuery callsites) updates instantly.
      queryClient.setQueryData(['auth-session'], session);
      setAuthEventFired(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      // Race getSession against a 6s timeout so a parked fetch can't pin loading state.
      const timeoutPromise = new Promise<{ data: { session: any }, error: any }>((resolve) => {
        setTimeout(() => resolve({ data: { session: null }, error: null }), 6000);
      });
      let { data: { session }, error } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise,
      ]);

      // If no session and we are in a PWA/Standalone environment, retry once after 600ms
      // to handle cold start hydration race condition.
      if (!session && !error) {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                             (window.navigator as any).standalone;

        if (isStandalone) {
          await new Promise(resolve => setTimeout(resolve, 600));
          const retryTimeout = new Promise<{ data: { session: any } }>((resolve) => {
            setTimeout(() => resolve({ data: { session: null } }), 4000);
          });
          const retryRes = await Promise.race([
            supabase.auth.getSession(),
            retryTimeout,
          ]);
          session = retryRes.data.session;
        }
      }

      return session;
    },
    staleTime: Infinity,
  });

  const isAuthReady = !query.isLoading && (!!query.data || authEventFired);

  return {
    ...query,
    session: query.data,
    isAuthReady,
  };
}
