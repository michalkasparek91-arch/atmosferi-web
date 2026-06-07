import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  points: number;
  phone_verified: boolean;
  xp_total: number;
  current_level: number;
  is_pro: boolean;
  bio: string | null;
  portfolio_photos: string[] | null;
  user_type: string;
  email: string;
  phone: string | null;
  company_id: string | null;
  wallet_points: number;
  ai_usage_count: number;
  is_promoted: boolean;
  slug: string | null;
}

export function useProfile() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async ({ signal }): Promise<UserProfile | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city, country, points, phone_verified, xp_total, current_level, is_pro, bio, portfolio_photos, user_type, email, phone, company_id, ai_usage_count, created_at, is_promoted, slug")
        .eq("id", session.user.id)
        .abortSignal(signal)
        .single();

      if (!data) return null;

      let wallet_points = data.points;

      // If user has a business, fetch business points
      if (data.company_id) {
        const { data: business } = await supabase
          .from("businesses")
          .select("points")
          .eq("id", data.company_id)
          .abortSignal(signal)
          .single();

        if (business) {
          wallet_points = business.points;
        }
      }

      // Ensure 'points' in the returned object reflects the active wallet balance
      // (Business points if available, otherwise personal)
      return {
        ...data,
        points: wallet_points,
        wallet_points
      } as UserProfile;
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const invalidateProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }, [queryClient]);

  return { profile, isLoading, error, invalidateProfile };
}
