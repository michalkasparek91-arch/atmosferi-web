import { supabase } from "@/integrations/supabase/client";

const VAPID_KEY = "BJCYjKNsgTiqQIci-X68IprwhnQaQ_41jKoVNno3NJ_uEiO3tHWXW3HkmN4158nspyBSXVBeI-O7By-WaB9p1lE";

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const isMobile = (): boolean => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
export const isIOS = (): boolean => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
export const isMobilePWA = (): boolean => isMobile() && isStandalone();

export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

const parseUserAgentToDeviceName = (userAgent: string): string => {
  let browser = 'Browser';
  if (userAgent.includes('Edg/')) browser = 'Edge';
  else if (userAgent.includes('Chrome/')) browser = 'Chrome';
  else if (userAgent.includes('Firefox/')) browser = 'Firefox';
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) browser = 'Safari';
  
  let os = '';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'Mac';
  else if (userAgent.includes('iPhone')) os = 'iPhone';
  else if (userAgent.includes('iPad')) os = 'iPad';
  else if (userAgent.includes('Android')) os = 'Android';
  
  return os ? `${browser} (${os})` : browser;
};

export const deepUnregisterServiceWorkers = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker not supported');
  
  const regs = await navigator.serviceWorker.getRegistrations();
  let reg = regs.find(r => r.scope.startsWith(window.location.origin));
  
  if (!reg) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const retryRegs = await navigator.serviceWorker.getRegistrations();
    reg = retryRegs.find(r => r.scope.startsWith(window.location.origin));
  }

  if (!reg) {
    try {
      const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
      reg = await navigator.serviceWorker.register(swUrl, { scope: '/' });
    } catch (err: any) {
      throw new Error(`Service Worker not available (${err?.message || 'unknown error'})`);
    }
  }

  if (reg?.active) return reg;

  const worker = reg?.installing || reg?.waiting;
  if (worker) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('SW activation timeout')), 10000);
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') {
          clearTimeout(timeout);
          resolve();
        }
      });
      if (worker.state === 'activated') {
        clearTimeout(timeout);
        resolve();
      }
    });
    return reg!;
  }
  
  return await navigator.serviceWorker.ready;
};

export const logPushDiagnostic = async (userId: string, note: string, type = 'sync') => {
  try {
    await supabase.from('push_receipts').insert({
      type, note: `[${userId}] ${note}`, tag: `sync-${Date.now()}`, user_agent: navigator.userAgent
    });
  } catch (err) {}
};

export const subscribeToPush = async (userId: string, forceResubscribe = false, silent = false): Promise<boolean> => {
  console.log('[VAPID] Starting subscribeToPush');
  const killKey = `push_disabled_${userId}`;
  
  if (silent && localStorage.getItem(killKey) === 'true') return false;
  if (!silent) localStorage.removeItem(killKey);

  if (silent) {
    const { data: profile } = await supabase.from('profiles').select('push_notifications').eq('id', userId).single();
    if (profile && profile.push_notifications === false) return false;
  }

  if (isIOS() && !isStandalone()) {
    const error = new Error('iOS devices must add the app to home screen first');
    (error as any).code = 'IOS_NOT_STANDALONE';
    throw error;
  }
  
  if (!isPushSupported()) throw new Error('Push not supported');

  let permission = getNotificationPermission();
  if (permission === 'default') {
    if (silent) return false;
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    if (!silent) throw new Error('Notification permission denied');
    return false;
  }

  try {
    const registration = await registerServiceWorker();
    
    // Unsubscribe from any existing subscription to ensure we get a fresh one with our VAPID key
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
    }
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
    });

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      throw new Error("Failed to generate complete push subscription keys");
    }

    const deviceName = `${parseUserAgentToDeviceName(navigator.userAgent)}${isStandalone() ? ' (PWA)' : ''}`;

    const { error: upsertError } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: endpoint,
      p256dh_key: p256dh,
      auth_key: auth,
      user_agent: navigator.userAgent,
      device_name: deviceName
    }, { onConflict: 'user_id,endpoint' });
    
    if (upsertError) throw upsertError;

    const { error: updateError } = await supabase.from('profiles').update({ 
      push_notifications: true,
      push_new_jobs: true,
      push_new_messages: true,
      push_offer_accepted: true,
      push_new_offers: true,
      push_job_completed: true
    } as any).eq('id', userId);
      
    if (updateError) throw updateError;
    
    console.log('[VAPID] Successfully subscribed to native push notifications');
    return true;
  } catch (error) {
    console.error('[VAPID] Error subscribing:', error);
    throw error;
  }
};

export const unsubscribeFromPush = async (userId: string): Promise<boolean> => {
  try {
    const killKey = `push_disabled_${userId}`;
    localStorage.setItem(killKey, 'true');

    await supabase.from('profiles').update({ push_notifications: false }).eq('id', userId);

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }
    
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    return true;
  } catch (error) {
    throw error;
  }
};

export const isSubscribedToPush = async (timeoutMs = 3000): Promise<boolean> => {
  if (!isPushSupported()) return false;
    try {
      if (getNotificationPermission() !== 'granted') return false;
      
      const registration = await registerServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (err) {
      return false;
  }
};

export const checkAndRepairSubscription = async (userId: string): Promise<boolean> => {
  try {
    if (!isPushSupported()) return false;
    
    const hasBrowserToken = await isSubscribedToPush();
    let currentEndpoint = null;
    
    if (hasBrowserToken) {
       const registration = await registerServiceWorker();
       const sub = await registration.pushManager.getSubscription();
       if (sub) currentEndpoint = sub.endpoint;
    }
    
    const { data: dbSubs } = await supabase.from('push_subscriptions').select('endpoint').eq('user_id', userId);
    const dbEndpoints = dbSubs?.map(s => s.endpoint) || [];
    
    const { data: profile } = await supabase.from('profiles').select('push_notifications').eq('id', userId).single();
    
    if (profile?.push_notifications === false) {
      localStorage.setItem(`push_disabled_${userId}`, 'true');
      if (hasBrowserToken) {
        const registration = await registerServiceWorker();
        const sub = await registration.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('user_id', userId);
      }
      return false;
    }
    
    if (localStorage.getItem(`push_disabled_${userId}`) === 'true') return false;

    if (!hasBrowserToken) {
      if (getNotificationPermission() === 'granted') {
        return await subscribeToPush(userId, false, true);
      }
      return false;
    }

    if (currentEndpoint && !dbEndpoints.includes(currentEndpoint)) {
      console.log('[PushRepair] Browser token not in DB. Wiping local token to get a fresh one...');
      const registration = await registerServiceWorker();
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      return await subscribeToPush(userId, false, true);
    }

    return true;
  } catch (err) {
    return false;
  }
};

export const getPushDiagnostics = async (): Promise<any> => {
  return { permission: getNotificationPermission(), supported: isPushSupported() };
};

export const nukePushSystem = async (userId: string) => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) await reg.unregister();
  }
  await supabase.from('push_subscriptions').delete().eq('user_id', userId);
};
