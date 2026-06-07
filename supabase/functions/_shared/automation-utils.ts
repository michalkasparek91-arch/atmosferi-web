import { createClient } from "npm:@supabase/supabase-js@2";
import { createAndSendNotification } from "./notifications.ts";

// ─── Per-job presentation defaults ────────────────────────────────────
// Maps the canonical job_name (stored in automation_jobs.job_name) to
// the admin review surface and a default Czech body builder. Keeps the
// per-function code path untouched.
type JobMeta = Record<string, unknown> | undefined;

interface JobPresentation {
  link: string;
  buildBody: (metadata: JobMeta) => string;
}

const JOB_PRESENTATION: Record<string, JobPresentation> = {
  "AI Topic Discovery": {
    link: "/admin/magazin",
    buildBody: (m) => {
      const n = (m as any)?.count;
      return n ? `${n} nových témat čeká na schválení v Magazínu.` : "Nová témata připravena ke schválení.";
    },
  },
  "Magazine Content Generation": {
    link: "/admin/magazin",
    buildBody: (m) => {
      const t = (m as any)?.title;
      return t ? `Koncept článku „${t}" je připraven ke schválení.` : "Nový koncept článku připraven ke schválení.";
    },
  },
  "Newsletter Draft Generation": {
    link: "/admin/emaily",
    buildBody: (m) => {
      const s = (m as any)?.subject;
      return s ? `Koncept newsletteru „${s}" čeká na schválení.` : "Koncept newsletteru připraven ke schválení.";
    },
  },
  "PSEO Nightly Generation": {
    link: "/admin/seo-obsah",
    buildBody: (m) => {
      const total = (m as any)?.total ?? (m as any)?.processed;
      const succeeded = (m as any)?.succeeded;
      if (succeeded != null && total != null) {
        return `Vygenerováno ${succeeded}/${total} PSEO stránek. Zkontrolujte kvalitu před indexací.`;
      }
      return "Noční PSEO běh dokončen, zkontrolujte výstup.";
    },
  },
  "SEO Title A/B Optimization": {
    link: "/admin/seo-obsah",
    buildBody: (m) => {
      const r = (m as any)?.rotated ?? (m as any)?.updated;
      return r ? `Rotováno ${r} meta titulků. Zkontrolujte výsledky A/B testů.` : "A/B rotace meta titulků dokončena.";
    },
  },
  "Sniper Outreach Generation": {
    link: "/admin/emaily",
    buildBody: (m) => {
      const n = (m as any)?.generated_count;
      return n ? `${n} oslovovacích zpráv čeká na schválení v Outboxu.` : "Nové oslovovací zprávy připraveny ke schválení.";
    },
  },
  "Autonomous Web Discovery": {
    link: "/admin/emaily?tab=outbox",
    buildBody: (m) => {
      const c = (m as any)?.discovered_count;
      const j = (m as any)?.jobTitle;
      return `Pro zakázku „${j || 'Nová'}" bylo na webu objeveno ${c || 0} nových firem a uloženo do Outboxu.`;
    },
  },
};

async function notifyAdminsJobComplete(
  supabase: any,
  jobName: string,
  metadata: JobMeta,
  status: "success" | "failure",
  errorMessage?: string,
) {
  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_admin", true);

    if (!admins || admins.length === 0) return;

    const preset = JOB_PRESENTATION[jobName];
    const body = status === "failure"
      ? `Úloha selhala: ${errorMessage ?? "neznámá chyba"}`
      : preset?.buildBody(metadata) ?? "Úloha dokončena, zkontrolujte výstup.";
    const link = preset?.link ?? "/admin/prehled";
    const title = status === "failure"
      ? `⚠️ SEO Engine · ${jobName}`
      : `🤖 SEO Engine · ${jobName}`;

    await Promise.allSettled(
      admins.map((a: { id: string }) =>
        createAndSendNotification(supabase, {
          userId: a.id,
          title,
          body,
          type: "automation_review",
          link,
          metadata: { jobName, status, ...(metadata ?? {}) },
          sendPush: true,
          sendEmail: false,
        })
      ),
    );
  } catch (err) {
    console.error(`[automation] notifyAdmins failed for ${jobName}:`, err);
  }
}

export async function logJobStart(supabase: any, jobName: string) {
  console.log(`[automation] Starting job: ${jobName}`);
  return await supabase
    .from("automation_jobs")
    .update({ 
      last_run_at: new Date().toISOString(),
      last_run_status: "running",
      last_run_error: null 
    })
    .eq("job_name", jobName);
}

export async function logJobSuccess(supabase: any, jobName: string, metadata: Record<string, unknown> = {}) {
  console.log(`[automation] Job succeeded: ${jobName}`);
  const res = await supabase
    .from("automation_jobs")
    .update({ 
      last_run_status: "success",
      metadata: metadata,
      updated_at: new Date().toISOString()
    })
    .eq("job_name", jobName);
  // Fire-and-forget admin push so every scheduled engine job gets reviewed.
  await notifyAdminsJobComplete(supabase, jobName, metadata, "success");
  return res;
}

export async function logJobFailure(supabase: any, jobName: string, error: string) {
  console.error(`[automation] Job failed: ${jobName} - ${error}`);
  const res = await supabase
    .from("automation_jobs")
    .update({ 
      last_run_status: "failure",
      last_run_error: error,
      updated_at: new Date().toISOString()
    })
    .eq("job_name", jobName);
  await notifyAdminsJobComplete(supabase, jobName, undefined, "failure", error);
  return res;
}
