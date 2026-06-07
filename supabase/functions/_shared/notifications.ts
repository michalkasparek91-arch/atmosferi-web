import { createClient } from "npm:@supabase/supabase-js@2";
import vokativ from "npm:vokativ@1.0.0";
import { sendFCMPush } from "./fcm.ts";
import { sendEmail, type EmailPayload } from "./email.ts";

export interface NotificationOptions {
  userId: string;
  title: string;
  body: string;
  type: string;
  link?: string;
  metadata?: Record<string, any>;
  sendPush?: boolean;
  sendEmail?: boolean;
  emailPayload?: Partial<EmailPayload>;
  templateSlug?: string;
  templateVariables?: Record<string, string>;
}

export function replaceVariables(text: string, variables?: Record<string, string>): string {
  if (!text || !variables) return text;
  return text.replace(/{{([^}]+)}}/g, (match, key) => {
    return variables[key.trim()] !== undefined ? variables[key.trim()] : match;
  });
}

/**
 * Robust helper to get the Czech vocative (5th case) for a name.
 * Handles Deno/ESM import variations and name parsing.
 */
export function getVocative(fullOrFirstName: string): string {
  if (!fullOrFirstName) return '';
  
  // Extract only the first name if a full name was provided
  const firstName = fullOrFirstName.trim().split(/\s+/)[0];
  if (!firstName) return '';

  try {
    // Defensive check for ESM default export variations
    const vokativFn = typeof vokativ === 'function' ? vokativ : (vokativ as any).default;
    if (typeof vokativFn !== 'function') {
      console.warn('[getVocative] Vokativ library not loaded as function, falling back to original name');
      return firstName;
    }
    
    const result = vokativFn(firstName);
    return result || firstName;
  } catch (err) {
    console.error('[getVocative] Error calculating vocative:', err);
    return firstName;
  }
}

export async function createAndSendNotification(
  supabase: any,
  options: NotificationOptions
) {
  let { userId, title, body, type, link, metadata = {}, sendPush = true, sendEmail: shouldSendEmail = false, emailPayload = {}, templateSlug, templateVariables } = options;

  console.log(`[SharedNotification] Dispatching ${type} for ${userId}`);

  // 0. Fetch Template if provided
  let templateRecord = null;
  if (templateSlug) {
    const { data: tmpl } = await supabase
      .from('email_templates')
      .select('subject, body, heading, cta_text, emoji, name, layout_type')
      .eq('slug', templateSlug)
      .single();
      
    if (tmpl) {
      templateRecord = tmpl;
      console.log(`[SharedNotification] Found template for slug: ${templateSlug}`);
      
      // We assume the DB template subject becomes the push title and email subject
      if (tmpl.subject) {
        title = replaceVariables(tmpl.subject, templateVariables);
        emailPayload.subject = title;
      }
      
      // If the template has a specific heading, use it for the email hero title.
      if (tmpl.heading) {
        emailPayload.title = replaceVariables(tmpl.heading, templateVariables);
      }
      
      // We assume the DB template body becomes the push body and email body
      if (tmpl.body) {
        const parsedBody = replaceVariables(tmpl.body, templateVariables);
        emailPayload.body = parsedBody;
        // Strip HTML for push body and db body
        body = parsedBody.replace(/<[^>]*>?/gm, ''); 
      }
      
      if (tmpl.cta_text) {
        emailPayload.ctaText = replaceVariables(tmpl.cta_text, templateVariables);
      }
      
      if (tmpl.emoji) {
        emailPayload.emoji = tmpl.emoji;
      }
      
      if (tmpl.layout_type) {
        emailPayload.layoutType = tmpl.layout_type as any;
      }
    } else {
      console.warn(`[SharedNotification] Template slug ${templateSlug} not found in DB! Falling back to hardcoded strings.`);
    }
  }

  // 1. DB Insert
  const { data: notification, error: insertError } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      title,
      body,
      type,
      link,
      metadata
    })
    .select()
    .single();

  if (insertError) {
    console.error('[SharedNotification] DB Error:', insertError);
    throw insertError;
  }

  // 2. Fetch Profile including vocative info and granular preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      email, 
      full_name, 
      first_name_vocative, 
      push_notifications, 
      email_notifications,
      push_new_jobs,
      push_new_messages,
      push_new_offers,
      push_job_completed,
      push_offer_accepted,
      push_low_credits,
      email_new_jobs,
      email_new_messages,
      email_new_offers,
      email_job_completed,
      email_offer_accepted,
      email_low_credits
    `)
    .eq('id', userId)
    .single();

  // 3. Handle Greeting with correct Vocative case
  let greeting = emailPayload?.greeting;
  if (!greeting && profile) {
    const vocativeName = profile.first_name_vocative || getVocative(profile.full_name || '');
    if (vocativeName) {
      greeting = `Zdravíme, ${vocativeName}!`;
    } else {
      greeting = `Zdravíme!`;
    }
  }

  // Helper to check if a specific notification type is enabled for a given channel
  const isTypeEnabled = (channel: 'push' | 'email') => {
    if (!profile) return true; // fallback to sending if no profile found
    
    // Global switches take precedence if they are explicitly turned OFF
    if (channel === 'push' && profile.push_notifications === false) return false;
    if (channel === 'email' && profile.email_notifications === false) return false;

    // Granular switches based on type
    const prefix = channel === 'push' ? 'push' : 'email';
    
    switch (type) {
      case 'new_job_opportunity':
      case 'direct_inquiry':
        return profile[`${prefix}_new_jobs`] !== false;
      case 'new_message':
        return profile[`${prefix}_new_messages`] !== false;
      case 'new_offer':
        return profile[`${prefix}_new_offers`] !== false;
      case 'job_completed':
        return profile[`${prefix}_job_completed`] !== false;
      case 'offer_accepted':
        return profile[`${prefix}_offer_accepted`] !== false;
      case 'low_credits':
        return profile[`${prefix}_low_credits`] !== false;
      default:
        // For unknown types (like system alerts), default to true unless global is off
        return true;
    }
  };

  // 4. Web Push
  if (sendPush && isTypeEnabled('push')) {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subscriptions && subscriptions.length > 0) {
      const pushResults = await Promise.allSettled(
        subscriptions.map(async (sub: any) => {
          const result = await sendFCMPush(
            sub.endpoint,
            title,
            body,
            link,
            undefined,
            { ...metadata, type, notificationId: notification.id },
            sub.p256dh_key,
            sub.auth_key
          );
          
          // Clean up dead subscriptions
          const isDead = result.error?.code === 'messaging/registration-token-not-registered' || result.error?.code === 'messaging/invalid-registration-token';
          if (!result.success && isDead) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.log(`[SharedNotification] Removed dead FCM token ${sub.id}`);
          }
          return result;
        })
      );
      console.log(`[SharedNotification] Push results: ${pushResults.length} attempted`);
    }
  } else {
    console.log(`[SharedNotification] Push skipped for ${userId} (disabled in preferences)`);
  }

  // 5. Email
  if (shouldSendEmail && isTypeEnabled('email') && profile?.email) {
    await sendEmail({
      to: profile.email,
      subject: title,
      title: title,
      body: body,
      ctaText: 'Zobrazit',
      ctaUrl: `${Deno.env.get('SITE_URL') || 'https://zrobee.cz'}${link || '/'}`,
      emoji: '🔔',
      ...emailPayload,
      greeting // Use calculated greeting with vocative
    });
  }

  return notification;
}
