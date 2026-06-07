import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SlotInfo {
  totalOffers: number;
  standardSlotsAvailable: number;
  proSlotsAvailable: number;
  isFullyClosed: boolean;
}

export interface ProStatus {
  isPro: boolean;
  proSince: string | null;
  proExpiresAt: string | null;
}

export const useProStatus = (userId?: string | null) => {
  const [proStatus, setProStatus] = useState<ProStatus>({
    isPro: false,
    proSince: null,
    proExpiresAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadProStatus(userId);
    } else {
      setLoading(false);
    }
  }, [userId]);

  const loadProStatus = async (id: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_pro, pro_since, pro_expires_at")
      .eq("id", id)
      .single();

    if (!error && data) {
      // Check if PRO is active (not expired)
      const isActive = data.is_pro && 
        (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date());
      
      setProStatus({
        isPro: isActive,
        proSince: data.pro_since,
        proExpiresAt: data.pro_expires_at,
      });
    }
    setLoading(false);
  };

  return { ...proStatus, loading, refresh: () => userId && loadProStatus(userId) };
};

export const useJobSlotInfo = (jobId: string | null) => {
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (jobId) {
      loadSlotInfo(jobId);
    } else {
      setLoading(false);
    }
  }, [jobId]);

  const loadSlotInfo = async (id: string) => {
    // Use the database function to get slot info
    const { data, error } = await supabase.rpc("get_job_slot_info", {
      job_id: id,
    });

    if (!error && data && data.length > 0) {
      const info = data[0];
      setSlotInfo({
        totalOffers: info.total_offers,
        standardSlotsAvailable: info.standard_slots_available,
        proSlotsAvailable: info.pro_slots_available,
        isFullyClosed: info.is_fully_closed,
      });
    }
    setLoading(false);
  };

  return { slotInfo, loading, refresh: () => jobId && loadSlotInfo(jobId) };
};

// Constants for slot limits
export const STANDARD_SLOT_LIMIT = 6;
export const PRO_SLOT_LIMIT = 8;

// Helper function to determine if a user can apply to a job
export const canApplyToJob = (
  slotInfo: SlotInfo | null,
  isPro: boolean
): { canApply: boolean; reason: string; isPrioritySlot: boolean } => {
  if (!slotInfo) {
    return { canApply: false, reason: "Načítání...", isPrioritySlot: false };
  }

  // Fully closed for everyone
  if (slotInfo.isFullyClosed) {
    return { 
      canApply: false, 
      reason: "Plná kapacita (8/8)", 
      isPrioritySlot: false 
    };
  }

  // Standard slots available (1-6)
  if (slotInfo.standardSlotsAvailable > 0) {
    return { canApply: true, reason: "", isPrioritySlot: false };
  }

  // Only PRO slots available (7-8)
  if (slotInfo.proSlotsAvailable > 0) {
    if (isPro) {
      return { 
        canApply: true, 
        reason: "Prioritní nabídka (PRO)", 
        isPrioritySlot: true 
      };
    } else {
      return { 
        canApply: false, 
        reason: `Plná kapacita (${slotInfo.totalOffers}/6). Odemknout s PRO.`, 
        isPrioritySlot: false 
      };
    }
  }

  return { canApply: false, reason: "Neznámá chyba", isPrioritySlot: false };
};

// Check slot availability without hook (for one-time checks)
export const checkJobSlotAvailability = async (
  jobId: string,
  userId: string
): Promise<{ 
  canApply: boolean; 
  reason: string; 
  isPrioritySlot: boolean;
  slotInfo: SlotInfo | null;
}> => {
  // Get slot info
  const { data: slotData } = await supabase.rpc("get_job_slot_info", {
    job_id: jobId,
  });

  if (!slotData || slotData.length === 0) {
    return { 
      canApply: false, 
      reason: "Nelze načíst informace o zakázce", 
      isPrioritySlot: false,
      slotInfo: null
    };
  }

  const slotInfo: SlotInfo = {
    totalOffers: slotData[0].total_offers,
    standardSlotsAvailable: slotData[0].standard_slots_available,
    proSlotsAvailable: slotData[0].pro_slots_available,
    isFullyClosed: slotData[0].is_fully_closed,
  };

  // Get user's PRO status
  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_pro, pro_expires_at")
    .eq("id", userId)
    .single();

  const isPro = profileData?.is_pro && 
    (!profileData?.pro_expires_at || new Date(profileData.pro_expires_at) > new Date());

  const result = canApplyToJob(slotInfo, isPro);
  return { ...result, slotInfo };
};
