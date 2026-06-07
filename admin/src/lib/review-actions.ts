import { supabase } from "@/integrations/supabase/client";

interface QualityRatings {
  punctuality?: number;
  communication?: number;
  cleanliness?: number;
  professionalism?: number;
}

interface SubmitReviewParams {
  jobId: string;
  rating: number;
  comment?: string;
  qualities?: QualityRatings;
}

interface SubmitReviewResult {
  success: boolean;
  error?: string;
}

export async function submitReview({
  jobId,
  rating,
  comment,
  qualities,
}: SubmitReviewParams): Promise<SubmitReviewResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    // Get worker_id from the accepted offer
    let { data: offerData } = await supabase
      .from('offers')
      .select('worker_id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .maybeSingle();

    // Fallback: if no accepted offer, take the first one (for resilience)
    if (!offerData) {
      const { data: anyOffer } = await supabase
        .from('offers')
        .select('worker_id')
        .eq('job_id', jobId)
        .limit(1)
        .maybeSingle();
      
      offerData = anyOffer;
    }

    if (!offerData) throw new Error("No offer found to associate this review with");

    // Build review data
    const reviewData: Record<string, unknown> = {
      job_id: jobId,
      reviewer_id: session.user.id,
      reviewee_id: offerData.worker_id,
      rating,
      comment: comment || null,
    };

    // Add quality ratings if set
    if (qualities) {
      if (qualities.punctuality && qualities.punctuality > 0) reviewData.quality_punctuality = qualities.punctuality;
      if (qualities.communication && qualities.communication > 0) reviewData.quality_communication = qualities.communication;
      if (qualities.cleanliness && qualities.cleanliness > 0) reviewData.quality_cleanliness = qualities.cleanliness;
      if (qualities.professionalism && qualities.professionalism > 0) reviewData.quality_professionalism = qualities.professionalism;
    }

    const { error: reviewError } = await supabase
      .from('reviews')
      .insert(reviewData as any);

    if (reviewError) throw reviewError;

    // Update job status to completed
    const { error: jobError } = await supabase
      .from('jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);

    if (jobError) throw jobError;

    // Get customer name for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .single();

    // Get job title
    const { data: jobData } = await supabase
      .from('jobs')
      .select('title, service_subcategories(name)')
      .eq('id', jobId)
      .single();

    // Notify worker that job was approved (fire and forget)
    supabase.functions.invoke('notify-worker-job-approved', {
      body: {
        workerId: offerData.worker_id,
        jobTitle: (jobData?.service_subcategories as any)?.name || jobData?.title || 'Zakázka',
        customerName: profile?.full_name || 'Zákazník',
        rating,
      }
    }).catch(err => console.log('[Push] Failed to notify worker of approval:', err));

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return { success: false, error: error.message || 'Nepodařilo se odeslat hodnocení' };
  }
}

/**
 * Approve a job without submitting a review.
 * Sets job status to 'completed' with no review row.
 */
export async function approveWithoutReview(jobId: string): Promise<SubmitReviewResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const { error: jobError } = await supabase
      .from('jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);

    if (jobError) throw jobError;

    // Notify worker (fire and forget)
    let { data: offerData } = await supabase
      .from('offers')
      .select('worker_id')
      .eq('job_id', jobId)
      .eq('status', 'accepted')
      .maybeSingle();

    // Fallback notification recipient
    if (!offerData) {
      const { data: anyOffer } = await supabase
        .from('offers')
        .select('worker_id')
        .eq('job_id', jobId)
        .limit(1)
        .maybeSingle();
      
      offerData = anyOffer;
    }

    if (offerData) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      const { data: jobData } = await supabase
        .from('jobs')
        .select('title, service_subcategories(name)')
        .eq('id', jobId)
        .single();

      supabase.functions.invoke('notify-worker-job-approved', {
        body: {
          workerId: offerData.worker_id,
          jobTitle: (jobData?.service_subcategories as any)?.name || jobData?.title || 'Zakázka',
          customerName: profile?.full_name || 'Zákazník',
          rating: null,
        }
      }).catch(err => console.log('[Push] Failed to notify worker of approval:', err));
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error approving without review:', error);
    return { success: false, error: error.message || 'Nepodařilo se schválit zakázku' };
  }
}

/**
 * Reject a job completion — set status back to 'in_progress',
 * store rejection reason, and increment rejection_count.
 */
export async function rejectCompletion(jobId: string, reason: string): Promise<SubmitReviewResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    // Get current rejection_count
    const { data: jobData, error: fetchError } = await supabase
      .from('jobs')
      .select('rejection_count')
      .eq('id', jobId)
      .single();

    if (fetchError) throw fetchError;

    const currentCount = (jobData as any)?.rejection_count || 0;

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'in_progress',
        rejection_reason: reason,
        rejection_count: currentCount + 1,
      } as any)
      .eq('id', jobId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting completion:', error);
    return { success: false, error: error.message || 'Nepodařilo se odmítnout dokončení' };
  }
}
