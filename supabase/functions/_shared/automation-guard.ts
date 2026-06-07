// Shared pause/enable guard for autonomous engine jobs.
// Returns true when the job should run, false when it should exit early.
//
// Checks two layers:
//   1) Master kill-switch: app_settings.automation_paused
//   2) Per-job toggle:    automation_jobs.is_active for the given function_name
//
// `dripPaused` checks app_settings.drip_paused instead, for lifecycle emails.

export async function isAutomationAllowed(
  supabase: any,
  functionName: string,
): Promise<{ allowed: boolean; reason?: string; metadata?: any }> {
  try {
    const { data: master } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "automation_paused")
      .maybeSingle();
    if (master?.value === true || (master?.value as any)?.paused === true) {
      return { allowed: false, reason: "automation_paused (master switch)" };
    }

    const { data: job } = await supabase
      .from("automation_jobs")
      .select("is_active, metadata")
      .eq("function_name", functionName)
      .maybeSingle();
    if (job && job.is_active === false) {
      return { allowed: false, reason: `job ${functionName} disabled`, metadata: job.metadata };
    }
    return { allowed: true, metadata: job?.metadata };
  } catch (err) {
    console.error("[automation-guard] check failed, defaulting to allowed:", err);
    return { allowed: true };
  }
}

export async function isDripAllowed(
  supabase: any,
  functionName?: string,
): Promise<{ allowed: boolean; reason?: string; metadata?: any }> {
  try {
    const { data: master } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "automation_paused")
      .maybeSingle();
    if (master?.value === true || (master?.value as any)?.paused === true) {
      return { allowed: false, reason: "automation_paused (master switch)" };
    }
    const { data: drip } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "drip_paused")
      .maybeSingle();
    if (drip?.value === true || (drip?.value as any)?.paused === true) {
      return { allowed: false, reason: "drip_paused" };
    }
    
    let metadata: any = null;
    if (functionName) {
      const { data: job } = await supabase
        .from("automation_jobs")
        .select("metadata")
        .eq("function_name", functionName)
        .maybeSingle();
      metadata = job?.metadata;
    }
    
    return { allowed: true, metadata };
  } catch (err) {
    console.error("[automation-guard] drip check failed:", err);
    return { allowed: true };
  }
}
