import { supabase } from "@/integrations/supabase/client";

interface AcceptOfferParams {
  offerId: string;
  jobId: string;
  customerId: string;
  workerId: string;
  subcategoryName?: string;
  offerAvailability?: string;
}

/**
 * Accepts an offer and updates all related data consistently:
 * 1. Updates offer status to 'accepted' and sets worker_viewed to false
 * 2. Updates job status to 'in_progress'
 * 3. Rejects all other pending offers for the same job
 * 4. Creates an automatic welcome message from customer to worker
 * 5. Sends push notification to worker about accepted offer
 */
export async function acceptOffer({
  offerId,
  jobId,
  customerId,
  workerId,
  subcategoryName = 'práce',
  offerAvailability
}: AcceptOfferParams): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update the accepted offer - set worker_viewed to false for notification
    const { error: offerError } = await supabase
      .from('offers')
      .update({ 
        status: 'accepted', 
        worker_viewed: false 
      })
      .eq('id', offerId);

    if (offerError) {
      console.error('Error accepting offer:', offerError);
      return { success: false, error: offerError.message };
    }

    // 2. Update job status to in_progress and set deadline from offer availability
    const jobUpdate: { status: string; deadline_date?: string; deadline_type?: string } = { 
      status: 'in_progress' 
    };
    
    // If offer has availability, set it as job deadline
    if (offerAvailability) {
      jobUpdate.deadline_date = offerAvailability;
      jobUpdate.deadline_type = 'specific';
    }
    
    const { error: jobError } = await supabase
      .from('jobs')
      .update(jobUpdate)
      .eq('id', jobId);

    if (jobError) {
      console.error('Error updating job status:', jobError);
      return { success: false, error: jobError.message };
    }

    // 3. Reject all other pending offers for this job
    const { error: rejectError } = await supabase
      .from('offers')
      .update({ status: 'rejected' })
      .eq('job_id', jobId)
      .eq('status', 'pending')
      .neq('id', offerId);

    if (rejectError) {
      console.error('Error rejecting other offers:', rejectError);
      // Non-fatal - continue anyway
    }

    // 4. Create automatic welcome message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        job_id: jobId,
        offer_id: offerId,
        sender_id: customerId,
        receiver_id: workerId,
        message: `🎉 Vaše nabídka na zakázku "${subcategoryName}" byla přijata! Můžete mě kontaktovat pro domluvení detailů.`,
      });

    if (messageError) {
      console.error('Error creating welcome message:', messageError);
      // Non-fatal - continue anyway
    }

    // 5. Send push notification to worker about accepted offer
    try {
      // Get customer name for the notification
      const { data: customerProfile } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('id', customerId)
        .single();

      await supabase.functions.invoke('notify-worker-offer-accepted', {
        body: {
          workerId,
          customerName: customerProfile?.full_name || 'Zákazník',
          jobTitle: subcategoryName,
          jobId,
          offerId
        }
      });
    } catch (notifyError) {
      console.error('Error sending offer accepted notification:', notifyError);
      // Non-fatal - continue anyway
    }

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error in acceptOffer:', error);
    return { success: false, error: error.message };
  }
}
