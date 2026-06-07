import webpush from "npm:web-push@3.6.7";

// Configure web-push with VAPID details
const publicVapidKey = Deno.env.get('VAPID_PUBLIC_KEY');
const privateVapidKey = Deno.env.get('VAPID_PRIVATE_KEY');

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:admin@zrobee.cz',
    publicVapidKey,
    privateVapidKey
  );
} else {
  console.error('[web-push] Missing VAPID keys in environment. Push notifications will fail.');
}

/**
 * Sends a standard Web Push notification using the VAPID protocol.
 */
export async function sendFCMPush(
  token: string, 
  title: string, 
  body: string, 
  url: string | null | undefined = null,
  imageUrl: string | null | undefined = null,
  dataPayload: any = {}, 
  p256dh: string | null | undefined = null,
  auth: string | null | undefined = null
) {
  if (!p256dh || !auth || p256dh === 'fcm' || auth === 'fcm') {
    console.error(`[web-push] Cannot send push to token ${token.substring(0, 30)} because it lacks VAPID keys. User must re-subscribe.`);
    return { success: false, error: { code: 'missing-vapid-keys' } };
  }

  const pushSubscription = {
    endpoint: token,
    keys: {
      p256dh: p256dh,
      auth: auth
    }
  };

  const payload = JSON.stringify({
    notification: {
      title: title,
      body: body,
      icon: imageUrl || '/icons/icon-192x192.png'
    },
    data: {
      url: url || "https://zrobee.cz",
      ...dataPayload
    }
  });

  try {
    console.log(`[web-push] Sending web push to endpoint...`);
    const response = await webpush.sendNotification(pushSubscription, payload);
    return { success: true, messageId: `wp-${Date.now()}` };
  } catch (error: any) {
    console.error('[web-push] Error sending message:', error);
    if (error.statusCode === 404 || error.statusCode === 410) {
      return { success: false, error: { code: 'messaging/invalid-registration-token' } }; // Fake FCM error code for backward compatibility with caller cleanup logic
    }
    return { success: false, error };
  }
}
