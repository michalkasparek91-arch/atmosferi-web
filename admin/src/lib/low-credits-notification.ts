import { supabase } from "@/integrations/supabase/client";

const LOW_CREDITS_THRESHOLD = 9;

/**
 * Check if worker's credits dropped below threshold and send notification
 * Call this after every points deduction for workers
 */
export const checkAndNotifyLowCredits = async (
  workerId: string,
  newPointsBalance: number,
  workerName?: string,
  workerEmail?: string
): Promise<void> => {
  // Only notify if points dropped below threshold
  if (newPointsBalance >= LOW_CREDITS_THRESHOLD) {
    return;
  }

  try {
    // If we don't have worker info, fetch it
    let name = workerName;
    let email = workerEmail;

    if (!name || !email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', workerId)
        .single();

      if (profile) {
        name = name || profile.full_name;
        email = email || profile.email;
      }
    }

    // Send notification via edge function
    await supabase.functions.invoke('notify-worker-low-credits', {
      body: {
        workerId,
        currentPoints: newPointsBalance,
        workerName: name,
        workerEmail: email
      }
    });

    console.log('[LowCredits] Notification sent for worker:', workerId);
  } catch (error) {
    // Don't throw - this is a non-critical notification
    console.log('[LowCredits] Failed to send notification:', error);
  }
};
