import { supabase } from "@/integrations/supabase/client";

type AnalyticsEvent = 
  | 'view_item'
  | 'begin_checkout'
  | 'purchase'
  | 'page_view'
  | 'pseo_pageview'
  | 'pseo_cta_click'
  | 'sign_up'
  | 'login'
  | 'session_start'
  | 'search'
  | 'conversion';

interface EventParams {
  item_id?: string;
  item_name?: string;
  value?: number;
  currency?: string;
  source?: string;
  campaign_id?: string;
  term?: string;
  type?: string;
  [key: string]: unknown;
}

class AnalyticsTracker {
  private initialized = false;
  private debug = import.meta.env.DEV;

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (this.debug) {
      console.log('[Analytics] Initialized');
    }
  }

  async track(event: AnalyticsEvent, params?: EventParams) {
    if (this.debug) {
      console.log(`[Analytics] Event: ${event}`, params);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('analytics_events' as any)
        .insert({
          event_type: event,
          user_id: user?.id,
          source: params?.source as string || (params?.page_path ? 'direct' : null),
          campaign_id: params?.campaign_id as string || null,
          metadata: params || {}
        });

      if (error && this.debug) {
        console.error('[Analytics] Error tracking event:', error);
      }
    } catch (e) {
      if (this.debug) {
        console.error('[Analytics] Failed to track event:', e);
      }
    }

    // Still keep a back-up in localStorage for current session persistence/debugging
    this.storeEvent(event, params);
  }

  private storeEvent(event: AnalyticsEvent, params?: EventParams) {
    try {
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push({
        event,
        params,
        timestamp: new Date().toISOString(),
      });
      const trimmed = events.slice(-100);
      localStorage.setItem('analytics_events', JSON.stringify(trimmed));
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Session Tracking
  trackSessionStart(source: 'landing' | 'email' | 'direct', campaignId?: string) {
    this.track('session_start', { source, campaign_id: campaignId });
  }

  // Search Tracking
  trackSearch(term: string) {
    this.track('search', { term });
  }

  // Conversion Tracking
  trackConversion(type: 'job_posted' | 'registration', metadata?: Record<string, unknown>) {
    this.track('conversion', { type, ...metadata });
  }

  // View Job Detail
  viewItem(itemId: string, itemName: string) {
    this.track('view_item', { item_id: itemId, item_name: itemName });
  }

  // Clicked Buy Credits
  beginCheckout(value: number, currency = 'CZK') {
    this.track('begin_checkout', { value, currency });
  }

  // Purchase Complete
  purchase(transactionId: string, value: number, currency = 'CZK') {
    this.track('purchase', { 
      transaction_id: transactionId,
      value, 
      currency 
    });
  }

  // Page View
  pageView(path: string, title?: string) {
    this.track('page_view', { page_path: path, page_title: title });
  }

  // pSEO Specific tracking
  trackPseoView(params: {
    category: string;
    subcategory?: string;
    city: string;
    has_workers: boolean;
    worker_count: number;
    path: string;
  }) {
    this.track('pseo_pageview', {
      type: 'pseo',
      ...params
    });
  }

  trackPseoCtaClick(params: {
    cta: string;
    category: string;
    subcategory?: string;
    city: string;
    path: string;
  }) {
    this.track('pseo_cta_click', {
      type: 'pseo_cta',
      ...params
    });
  }
}

export const analytics = new AnalyticsTracker();
