// Cookie consent types and utilities
import { supabase } from "@/integrations/supabase/client";

export interface CookieConsent {
  necessary: boolean; // Always true
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  version: string;
}

const CONSENT_KEY = 'zrobee_cookie_consent';
const CURRENT_VERSION = '1.1';
const EXPIRATION_DAYS = 365; // 12 months

export const getConsent = (): CookieConsent | null => {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      const consent: CookieConsent = JSON.parse(stored);
      
      // Check version
      if (consent.version !== CURRENT_VERSION) {
        console.log('[CookieConsent] Version mismatch, re-prompting...');
        return null;
      }

      // Check expiration (12 months)
      const diff = Date.now() - consent.timestamp;
      if (diff > EXPIRATION_DAYS * 24 * 60 * 60 * 1000) {
        console.log('[CookieConsent] Consent expired, re-prompting...');
        return null;
      }

      return consent;
    }
  } catch (e) {
    console.error('Error reading cookie consent:', e);
  }
  return null;
};

export const setConsent = async (consent: CookieConsent): Promise<void> => {
  try {
    // Add version if missing
    if (!consent.version) consent.version = CURRENT_VERSION;
    
    // 1. Save to LocalStorage
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    
    // 2. Update Google Consent Mode
    updateGoogleConsentMode(consent);

    // 3. Sync to Database if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ 
          cookie_consent: consent as any, // Cast to any as JSONB
          cookie_consent_at: new Date().toISOString()
        })
        .eq('id', session.user.id);
      
      console.log('[CookieConsent] Synced to database for user:', session.user.id);
    }
  } catch (e) {
    console.error('Error saving cookie consent:', e);
  }
};

export const hasConsent = (): boolean => {
  return getConsent() !== null;
};

export const acceptAll = async (): Promise<CookieConsent> => {
  const consent: CookieConsent = {
    necessary: true,
    analytics: true,
    marketing: true,
    timestamp: Date.now(),
    version: CURRENT_VERSION
  };
  await setConsent(consent);
  return consent;
};

export const rejectOptional = async (): Promise<CookieConsent> => {
  const consent: CookieConsent = {
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: Date.now(),
    version: CURRENT_VERSION
  };
  await setConsent(consent);
  return consent;
};

export const saveCustomConsent = async (analytics: boolean, marketing: boolean): Promise<CookieConsent> => {
  const consent: CookieConsent = {
    necessary: true,
    analytics,
    marketing,
    timestamp: Date.now(),
    version: CURRENT_VERSION
  };
  await setConsent(consent);
  return consent;
};

/**
 * Syncs the local consent with the database.
 * This should be called on app mount and after login.
 */
export const syncConsentWithDatabase = async (): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('cookie_consent')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) return;

    const dbConsent = profile.cookie_consent as unknown as CookieConsent;
    const localConsent = getConsent();

    // Case 1: Cloud has valid, current consent -> Update Local (The Superpower)
    if (dbConsent && dbConsent.version === CURRENT_VERSION) {
      // Check if DB consent is actually newer or if local is missing
      if (!localConsent || dbConsent.timestamp > localConsent.timestamp) {
        console.log('[CookieConsent] Cloud sync: Updating local storage from database');
        localStorage.setItem(CONSENT_KEY, JSON.stringify(dbConsent));
        updateGoogleConsentMode(dbConsent);
      }
    } 
    // Case 2: Local has consent but Cloud is empty -> Migrate to Cloud
    else if (localConsent && localConsent.version === CURRENT_VERSION && !dbConsent) {
      console.log('[CookieConsent] Cloud sync: Migrating local consent to database');
      await supabase
        .from('profiles')
        .update({ 
          cookie_consent: localConsent as any,
          cookie_consent_at: new Date(localConsent.timestamp).toISOString()
        })
        .eq('id', session.user.id);
    }
  } catch (e) {
    console.warn('[CookieConsent] Sync failed:', e);
  }
};

// Google Consent Mode v2 integration
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export const updateGoogleConsentMode = (consent: CookieConsent): void => {
  window.dataLayer = window.dataLayer || [];
  
  // Use proper gtag('consent', 'update') syntax for Consent Mode v2
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      'analytics_storage': consent.analytics ? 'granted' : 'denied',
      'ad_storage': consent.marketing ? 'granted' : 'denied',
      'ad_user_data': consent.marketing ? 'granted' : 'denied',
      'ad_personalization': consent.marketing ? 'granted' : 'denied',
    });
  } else {
    // Fallback: define gtag and push
    function gtag(...args: any[]) { window.dataLayer.push(arguments); }
    gtag('consent', 'update', {
      'analytics_storage': consent.analytics ? 'granted' : 'denied',
      'ad_storage': consent.marketing ? 'granted' : 'denied',
      'ad_user_data': consent.marketing ? 'granted' : 'denied',
      'ad_personalization': consent.marketing ? 'granted' : 'denied',
    });
  }
};

// Initialize consent mode — defaults are now set in index.html (before GTM).
// This function only restores saved consent if React boots after GTM.
export const initializeConsentMode = (): void => {
  const existingConsent = getConsent();
  if (existingConsent) {
    updateGoogleConsentMode(existingConsent);
  }
  // Default denied state is already set synchronously in index.html
};
