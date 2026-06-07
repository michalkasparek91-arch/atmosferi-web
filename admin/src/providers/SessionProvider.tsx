import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/hooks/use-profile";
import { withTimeout } from "@/lib/abort";

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, city, country, points, phone_verified, xp_total, current_level, is_pro, bio, portfolio_photos, user_type, email, phone, company_id')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (error) {
      console.error("[SessionProvider] Error fetching profile:", error);
      setProfile(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Hard safety net: never let isLoading stay true past 4s, no matter what.
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        console.warn("[SessionProvider] Safety timeout — forcing isLoading=false");
        setIsLoading(false);
      }
    }, 4000);

    const initSession = async () => {
      try {
        // Race getSession() against a 3s timeout so a parked fetch can never hang boot.
        const result = await withTimeout(
          supabase.auth.getSession(),
          3000,
          { data: { session: null }, error: null } as any
        );
        const initialSession = result?.data?.session ?? null;

        if (!isMounted) return;
        setSession(initialSession);
        setIsLoading(false); // Render immediately; profile loads in background

        if (initialSession) {
          // Fire and forget — consumers handle profile === null
          fetchProfile(initialSession.user.id);
        } else {
          // Standalone PWA cold-start retry (background, non-blocking)
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (navigator as any).standalone === true;
          if (isStandalone) {
            setTimeout(async () => {
              try {
                const { data: { session: retrySession } } = await supabase.auth.getSession();
                if (isMounted && retrySession) {
                  setSession(retrySession);
                  fetchProfile(retrySession.user.id);
                }
              } catch (e) {
                console.warn("[SessionProvider] Standalone retry failed:", e);
              }
            }, 500);
          }
        }
      } catch (err) {
        console.error("[SessionProvider] Error initializing session:", err);
        if (isMounted) setIsLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, user: session?.user ?? null, profile, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};
