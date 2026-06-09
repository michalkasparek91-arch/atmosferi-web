export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      additional_costs: {
        Row: {
          added_by: string
          amount: number
          confirmed_at: string | null
          confirmed_by_other: boolean
          created_at: string
          description: string
          id: string
          job_id: string
          offer_id: string
          worker_id: string
        }
        Insert: {
          added_by?: string
          amount: number
          confirmed_at?: string | null
          confirmed_by_other?: boolean
          created_at?: string
          description: string
          id?: string
          job_id: string
          offer_id: string
          worker_id: string
        }
        Update: {
          added_by?: string
          amount?: number
          confirmed_at?: string | null
          confirmed_by_other?: boolean
          created_at?: string
          description?: string
          id?: string
          job_id?: string
          offer_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "additional_costs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_costs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_costs_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_costs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "additional_costs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read_at: string | null
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      articles: {
        Row: {
          category: string
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      automation_jobs: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          is_active: boolean | null
          job_name: string
          last_run_at: string | null
          last_run_error: string | null
          last_run_status: string | null
          metadata: Json | null
          schedule: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          is_active?: boolean | null
          job_name: string
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          metadata?: Json | null
          schedule?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          is_active?: boolean | null
          job_name?: string
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          metadata?: Json | null
          schedule?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      billing_profiles: {
        Row: {
          bank_account: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          dic: string | null
          ico: string | null
          street: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          bank_account?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          dic?: string | null
          ico?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          bank_account?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          dic?: string | null
          ico?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      broadcast_notifications: {
        Row: {
          admin_id: string
          body: string
          cleaned_up_count: number | null
          clicks_count: number | null
          content_payload: Json | null
          created_at: string
          failed_count: number
          id: string
          recipients_count: number
          scheduled_at: string | null
          sent_count: number
          status: string | null
          target_audience: string
          target_filters: Json | null
          title: string
          url: string | null
          variant_a_clicks: number | null
          variant_b_clicks: number | null
        }
        Insert: {
          admin_id: string
          body: string
          cleaned_up_count?: number | null
          clicks_count?: number | null
          content_payload?: Json | null
          created_at?: string
          failed_count?: number
          id?: string
          recipients_count?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string | null
          target_audience?: string
          target_filters?: Json | null
          title: string
          url?: string | null
          variant_a_clicks?: number | null
          variant_b_clicks?: number | null
        }
        Update: {
          admin_id?: string
          body?: string
          cleaned_up_count?: number | null
          clicks_count?: number | null
          content_payload?: Json | null
          created_at?: string
          failed_count?: number
          id?: string
          recipients_count?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string | null
          target_audience?: string
          target_filters?: Json | null
          title?: string
          url?: string | null
          variant_a_clicks?: number | null
          variant_b_clicks?: number | null
        }
        Relationships: []
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          status: string
          user_id: string | null
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          status: string
          user_id?: string | null
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          company_type: string
          created_at: string
          dic: string | null
          ico: string | null
          id: string
          name: string
          owner_id: string
          points: number
          updated_at: string
        }
        Insert: {
          company_type?: string
          created_at?: string
          dic?: string | null
          ico?: string | null
          id?: string
          name: string
          owner_id: string
          points?: number
          updated_at?: string
        }
        Update: {
          company_type?: string
          created_at?: string
          dic?: string | null
          ico?: string | null
          id?: string
          name?: string
          owner_id?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      calendar_shares: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          job_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          job_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          job_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_shares_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_shares_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_shares_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_shares_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_locatives: {
        Row: {
          city: string
          created_at: string
          locative_phrase: string
        }
        Insert: {
          city: string
          created_at?: string
          locative_phrase: string
        }
        Update: {
          city?: string
          created_at?: string
          locative_phrase?: string
        }
        Relationships: []
      }
      drip_email_log: {
        Row: {
          id: string
          lead_id: string | null
          sent_at: string
          template_slug: string
          user_id: string | null
        }
        Insert: {
          id?: string
          lead_id?: string | null
          sent_at?: string
          template_slug: string
          user_id?: string | null
        }
        Update: {
          id?: string
          lead_id?: string | null
          sent_at?: string
          template_slug?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drip_email_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "marketing_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_topic_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          intent: string | null
          kdi: number | null
          keyword: string
          last_error: string | null
          pillar_slug: string | null
          status: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          intent?: string | null
          kdi?: number | null
          keyword: string
          last_error?: string | null
          pillar_slug?: string | null
          status?: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          intent?: string | null
          kdi?: number | null
          keyword?: string
          last_error?: string | null
          pillar_slug?: string | null
          status?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          admin_id: string
          body: string
          clicks_count: number | null
          content_payload: Json | null
          created_at: string
          cta_text: string | null
          cta_url: string | null
          failed_count: number
          id: string
          is_ab_test: boolean
          job_id: string | null
          opens_count: number | null
          recipients_count: number
          scheduled_at: string | null
          sent_count: number
          status: string | null
          subject: string
          subject_b: string | null
          target_audience: string
          target_filters: Json | null
          title: string
          variant_a_opens: number | null
          variant_b_opens: number | null
          variant_distribution: number | null
        }
        Insert: {
          admin_id: string
          body: string
          clicks_count?: number | null
          content_payload?: Json | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          failed_count?: number
          id?: string
          is_ab_test?: boolean
          job_id?: string | null
          opens_count?: number | null
          recipients_count?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string | null
          subject: string
          subject_b?: string | null
          target_audience?: string
          target_filters?: Json | null
          title: string
          variant_a_opens?: number | null
          variant_b_opens?: number | null
          variant_distribution?: number | null
        }
        Update: {
          admin_id?: string
          body?: string
          clicks_count?: number | null
          content_payload?: Json | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          failed_count?: number
          id?: string
          is_ab_test?: boolean
          job_id?: string | null
          opens_count?: number | null
          recipients_count?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string | null
          subject?: string
          subject_b?: string | null
          target_audience?: string
          target_filters?: Json | null
          title?: string
          variant_a_opens?: number | null
          variant_b_opens?: number | null
          variant_distribution?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          ab_variant: string | null
          campaign_id: string | null
          created_at: string | null
          id: string
          recipient_email: string | null
          resend_id: string | null
          status: string | null
        }
        Insert: {
          ab_variant?: string | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          recipient_email?: string | null
          resend_id?: string | null
          status?: string | null
        }
        Update: {
          ab_variant?: string | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          recipient_email?: string | null
          resend_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_outbox: {
        Row: {
          created_at: string | null
          cta_text: string | null
          cta_url: string | null
          error_message: string | null
          full_body: string | null
          icebreaker: string | null
          id: string
          job_description_snippet: string | null
          job_id: string | null
          layout_type: string | null
          lead_id: string | null
          promo_banner_enabled: boolean | null
          promo_banner_text: string | null
          ps_footer_enabled: boolean | null
          ps_footer_text: string | null
          resend_id: string | null
          sent_at: string | null
          show_cta_button: boolean | null
          show_job_widget: boolean | null
          status: string | null
          subject: string | null
          template_slug: string | null
          urgency_banner_enabled: boolean | null
          urgency_banner_text: string | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          error_message?: string | null
          full_body?: string | null
          icebreaker?: string | null
          id?: string
          job_description_snippet?: string | null
          job_id?: string | null
          layout_type?: string | null
          lead_id?: string | null
          promo_banner_enabled?: boolean | null
          promo_banner_text?: string | null
          ps_footer_enabled?: boolean | null
          ps_footer_text?: string | null
          resend_id?: string | null
          sent_at?: string | null
          show_cta_button?: boolean | null
          show_job_widget?: boolean | null
          status?: string | null
          subject?: string | null
          template_slug?: string | null
          urgency_banner_enabled?: boolean | null
          urgency_banner_text?: string | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          error_message?: string | null
          full_body?: string | null
          icebreaker?: string | null
          id?: string
          job_description_snippet?: string | null
          job_id?: string | null
          layout_type?: string | null
          lead_id?: string | null
          promo_banner_enabled?: boolean | null
          promo_banner_text?: string | null
          ps_footer_enabled?: boolean | null
          ps_footer_text?: string | null
          resend_id?: string | null
          sent_at?: string | null
          show_cta_button?: boolean | null
          show_job_widget?: boolean | null
          status?: string | null
          subject?: string | null
          template_slug?: string | null
          urgency_banner_enabled?: boolean | null
          urgency_banner_text?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "marketing_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_template_slug_fkey"
            columns: ["template_slug"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "email_outbox_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string | null
          category: string
          created_at: string | null
          created_by: string | null
          cta_text: string | null
          cta_url: string | null
          drip_delay_days: number | null
          drip_series: string | null
          emoji: string | null
          greeting: string | null
          heading: string | null
          hero_image_url: string | null
          id: string
          is_enabled: boolean
          job_description_snippet: string | null
          layout_type: string | null
          name: string
          promo_banner_enabled: boolean | null
          promo_banner_text: string | null
          ps_footer_enabled: boolean | null
          ps_footer_text: string | null
          secondary_text: string | null
          segment_filters: Json | null
          sender_email: string | null
          show_cta_button: boolean | null
          show_job_widget: boolean | null
          slug: string | null
          subject: string | null
          target_role: string
          trigger_event: string | null
          trigger_type: string
          updated_at: string | null
          urgency_banner_enabled: boolean | null
          urgency_banner_text: string | null
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string | null
          drip_delay_days?: number | null
          drip_series?: string | null
          emoji?: string | null
          greeting?: string | null
          heading?: string | null
          hero_image_url?: string | null
          id?: string
          is_enabled?: boolean
          job_description_snippet?: string | null
          layout_type?: string | null
          name: string
          promo_banner_enabled?: boolean | null
          promo_banner_text?: string | null
          ps_footer_enabled?: boolean | null
          ps_footer_text?: string | null
          secondary_text?: string | null
          segment_filters?: Json | null
          sender_email?: string | null
          show_cta_button?: boolean | null
          show_job_widget?: boolean | null
          slug?: string | null
          subject?: string | null
          target_role?: string
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string | null
          urgency_banner_enabled?: boolean | null
          urgency_banner_text?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string | null
          drip_delay_days?: number | null
          drip_series?: string | null
          emoji?: string | null
          greeting?: string | null
          heading?: string | null
          hero_image_url?: string | null
          id?: string
          is_enabled?: boolean
          job_description_snippet?: string | null
          layout_type?: string | null
          name?: string
          promo_banner_enabled?: boolean | null
          promo_banner_text?: string | null
          ps_footer_enabled?: boolean | null
          ps_footer_text?: string | null
          secondary_text?: string | null
          segment_filters?: Json | null
          sender_email?: string | null
          show_cta_button?: boolean | null
          show_job_widget?: boolean | null
          slug?: string | null
          subject?: string | null
          target_role?: string
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string | null
          urgency_banner_enabled?: boolean | null
          urgency_banner_text?: string | null
        }
        Relationships: []
      }
      favorite_workers: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          worker_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_total: number
          amount_without_vat: number
          billing_snapshot: Json
          created_at: string
          currency: string
          id: string
          invoice_number: string
          issued_at: string
          items: Json
          pdf_url: string | null
          points_purchase_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tax_date: string
          user_id: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          amount_total: number
          amount_without_vat: number
          billing_snapshot?: Json
          created_at?: string
          currency?: string
          id?: string
          invoice_number: string
          issued_at?: string
          items?: Json
          pdf_url?: string | null
          points_purchase_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_date?: string
          user_id: string
          vat_amount: number
          vat_rate?: number
        }
        Update: {
          amount_total?: number
          amount_without_vat?: number
          billing_snapshot?: Json
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          items?: Json
          pdf_url?: string | null
          points_purchase_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tax_date?: string
          user_id?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_points_purchase_id_fkey"
            columns: ["points_purchase_id"]
            isOneToOne: false
            referencedRelation: "points_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posting_conversations: {
        Row: {
          collected_data: Json
          created_at: string
          created_job_id: string | null
          id: string
          messages: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collected_data?: Json
          created_at?: string
          created_job_id?: string | null
          id?: string
          messages?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collected_data?: Json
          created_at?: string
          created_job_id?: string | null
          id?: string
          messages?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_conversations_created_job_id_fkey"
            columns: ["created_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posting_conversations_created_job_id_fkey"
            columns: ["created_job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category_id: string
          city: string | null
          completion_photos: string[] | null
          created_at: string | null
          customer_id: string
          deadline_date: string | null
          deadline_type: string | null
          description: string
          final_price: number | null
          full_address: string | null
          id: string
          is_urgent: boolean
          latitude: number | null
          location: unknown
          longitude: number | null
          photos: string[] | null
          price_note: string | null
          progress_photos: string[] | null
          rejection_count: number
          rejection_reason: string | null
          slug: string | null
          sniper_auto_approve: boolean
          status: string
          subcategory_id: string
          title: string
          updated_at: string | null
          urgent_paid_at: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category_id: string
          city?: string | null
          completion_photos?: string[] | null
          created_at?: string | null
          customer_id: string
          deadline_date?: string | null
          deadline_type?: string | null
          description: string
          final_price?: number | null
          full_address?: string | null
          id?: string
          is_urgent?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          photos?: string[] | null
          price_note?: string | null
          progress_photos?: string[] | null
          rejection_count?: number
          rejection_reason?: string | null
          slug?: string | null
          sniper_auto_approve?: boolean
          status?: string
          subcategory_id: string
          title: string
          updated_at?: string | null
          urgent_paid_at?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string
          city?: string | null
          completion_photos?: string[] | null
          created_at?: string | null
          customer_id?: string
          deadline_date?: string | null
          deadline_type?: string | null
          description?: string
          final_price?: number | null
          full_address?: string | null
          id?: string
          is_urgent?: boolean
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          photos?: string[] | null
          price_note?: string | null
          progress_photos?: string[] | null
          rejection_count?: number
          rejection_reason?: string | null
          slug?: string | null
          sniper_auto_approve?: boolean
          status?: string
          subcategory_id?: string
          title?: string
          updated_at?: string | null
          urgent_paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "jobs_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "service_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_captures: {
        Row: {
          created_at: string
          email: string
          id: string
          request_text: string | null
          status: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          request_text?: string | null
          status?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          request_text?: string | null
          status?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          articles: Json | null
          audience_type: string
          body: string | null
          created_at: string
          cta_text: string | null
          cta_url: string | null
          emoji: string | null
          greeting: string | null
          hero_image_url: string | null
          html_body: string | null
          id: string
          layout_type: string
          secondary_text: string | null
          sender_email: string | null
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          articles?: Json | null
          audience_type: string
          body?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          emoji?: string | null
          greeting?: string | null
          hero_image_url?: string | null
          html_body?: string | null
          id?: string
          layout_type?: string
          secondary_text?: string | null
          sender_email?: string | null
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          articles?: Json | null
          audience_type?: string
          body?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          emoji?: string | null
          greeting?: string | null
          hero_image_url?: string | null
          html_body?: string | null
          id?: string
          layout_type?: string
          secondary_text?: string | null
          sender_email?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          ai_icebreaker: string | null
          avatar_url: string | null
          category: string | null
          city: string | null
          company_description: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string
          email_notifications: boolean | null
          engagement_score: number | null
          first_name_vocative: string | null
          full_address: string | null
          full_name: string | null
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
          id: string
          is_pro: boolean | null
          language: string | null
          last_activity: string | null
          latitude: number | null
          longitude: number | null
          marketing_notifications: boolean | null
          phone: string | null
          postal_code: string | null
          push_notifications: boolean | null
          referral_code: string | null
          secondary_emails: string[] | null
          slug: string | null
          source: string | null
          street_name: string | null
          street_number: string | null
          subcategory: string | null
          tags: string[] | null
          updated_at: string | null
          user_type: string | null
          website: string | null
        }
        Insert: {
          ai_icebreaker?: string | null
          avatar_url?: string | null
          category?: string | null
          city?: string | null
          company_description?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email: string
          email_notifications?: boolean | null
          engagement_score?: number | null
          first_name_vocative?: string | null
          full_address?: string | null
          full_name?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          is_pro?: boolean | null
          language?: string | null
          last_activity?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_notifications?: boolean | null
          phone?: string | null
          postal_code?: string | null
          push_notifications?: boolean | null
          referral_code?: string | null
          secondary_emails?: string[] | null
          slug?: string | null
          source?: string | null
          street_name?: string | null
          street_number?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_type?: string | null
          website?: string | null
        }
        Update: {
          ai_icebreaker?: string | null
          avatar_url?: string | null
          category?: string | null
          city?: string | null
          company_description?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string
          email_notifications?: boolean | null
          engagement_score?: number | null
          first_name_vocative?: string | null
          full_address?: string | null
          full_name?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          id?: string
          is_pro?: boolean | null
          language?: string | null
          last_activity?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_notifications?: boolean | null
          phone?: string | null
          postal_code?: string | null
          push_notifications?: boolean | null
          referral_code?: string | null
          secondary_emails?: string[] | null
          slug?: string | null
          source?: string | null
          street_name?: string | null
          street_number?: string | null
          subcategory?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      marketing_templates: {
        Row: {
          body: string | null
          created_at: string | null
          created_by: string | null
          cta_text: string | null
          cta_url: string | null
          description: string | null
          id: string
          is_ab_test: boolean | null
          name: string
          subject: string | null
          subject_b: string | null
          template_type: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          is_ab_test?: boolean | null
          name: string
          subject?: string | null
          subject_b?: string | null
          template_type?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string | null
          description?: string | null
          id?: string
          is_ab_test?: boolean | null
          name?: string
          subject?: string | null
          subject_b?: string | null
          template_type?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          message: string
          offer_id: string
          photos: string[] | null
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          message: string
          offer_id: string
          photos?: string[] | null
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          message?: string
          offer_id?: string
          photos?: string[] | null
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          availability: string | null
          created_at: string | null
          customer_viewed: boolean | null
          id: string
          is_direct: boolean | null
          job_id: string
          message: string
          photos: string[] | null
          price: number
          status: string
          updated_at: string | null
          worker_id: string
          worker_viewed: boolean | null
        }
        Insert: {
          availability?: string | null
          created_at?: string | null
          customer_viewed?: boolean | null
          id?: string
          is_direct?: boolean | null
          job_id: string
          message: string
          photos?: string[] | null
          price: number
          status?: string
          updated_at?: string | null
          worker_id: string
          worker_viewed?: boolean | null
        }
        Update: {
          availability?: string | null
          created_at?: string | null
          customer_viewed?: boolean | null
          id?: string
          is_direct?: boolean | null
          job_id?: string
          message?: string
          photos?: string[] | null
          price?: number
          status?: string
          updated_at?: string | null
          worker_id?: string
          worker_viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          gsc_coverage_state: string | null
          gsc_indexing_status: string | null
          gsc_inspect_error: string | null
          gsc_last_checked: string | null
          gsc_last_crawl_time: string | null
          gsc_robots_txt_status: string | null
          id: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          gsc_coverage_state?: string | null
          gsc_indexing_status?: string | null
          gsc_inspect_error?: string | null
          gsc_last_checked?: string | null
          gsc_last_crawl_time?: string | null
          gsc_robots_txt_status?: string | null
          id?: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          gsc_coverage_state?: string | null
          gsc_indexing_status?: string | null
          gsc_inspect_error?: string | null
          gsc_last_checked?: string | null
          gsc_last_crawl_time?: string | null
          gsc_robots_txt_status?: string | null
          id?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      phone_verification_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phone_verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      points_purchases: {
        Row: {
          created_at: string | null
          id: string
          payment_status: string
          points_amount: number
          price_czk: number
          refund_waiver_accepted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_status?: string
          points_amount: number
          price_czk: number
          refund_waiver_accepted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_status?: string
          points_amount?: number
          price_czk?: number
          refund_waiver_accepted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_usage_count: number | null
          avatar_url: string | null
          bio: string | null
          category: string | null
          city: string | null
          company_id: string | null
          company_type: string | null
          cookie_consent: Json | null
          cookie_consent_at: string | null
          country: string | null
          created_at: string | null
          current_level: number | null
          display_as_company: boolean
          email: string
          email_enabled: boolean | null
          email_job_completed: boolean | null
          email_low_credits: boolean | null
          email_new_jobs: boolean | null
          email_new_messages: boolean | null
          email_new_offers: boolean | null
          email_notifications: boolean | null
          email_offer_accepted: boolean | null
          engagement_score: number | null
          first_name_vocative: string | null
          full_address: string | null
          full_name: string
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
          header_url: string | null
          id: string
          is_admin: boolean | null
          is_pro: boolean
          is_promoted: boolean | null
          last_activity: string | null
          last_ai_usage_date: string | null
          last_jobs_viewed_at: string | null
          last_opened_at: string | null
          latitude: number | null
          level: number | null
          location: unknown
          longitude: number | null
          marketing_consent: boolean | null
          marketing_consent_at: string | null
          marketing_notifications: boolean | null
          notes: string | null
          phone: string | null
          phone_verified: boolean | null
          points: number
          portfolio_photos: string[] | null
          postal_code: string | null
          pro_expires_at: string | null
          pro_since: string | null
          push_enabled: boolean | null
          push_job_completed: boolean | null
          push_low_credits: boolean | null
          push_new_jobs: boolean | null
          push_new_messages: boolean | null
          push_new_offers: boolean | null
          push_notifications: boolean | null
          push_offer_accepted: boolean | null
          referral_code: string | null
          referral_reward_stage: string
          referred_by: string | null
          region: string | null
          secondary_emails: string[] | null
          slug: string | null
          street_name: string | null
          street_number: string | null
          subcategory: string | null
          tags: string[]
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          website: string | null
          xp_total: number | null
        }
        Insert: {
          ai_usage_count?: number | null
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          city?: string | null
          company_id?: string | null
          company_type?: string | null
          cookie_consent?: Json | null
          cookie_consent_at?: string | null
          country?: string | null
          created_at?: string | null
          current_level?: number | null
          display_as_company?: boolean
          email: string
          email_enabled?: boolean | null
          email_job_completed?: boolean | null
          email_low_credits?: boolean | null
          email_new_jobs?: boolean | null
          email_new_messages?: boolean | null
          email_new_offers?: boolean | null
          email_notifications?: boolean | null
          email_offer_accepted?: boolean | null
          engagement_score?: number | null
          first_name_vocative?: string | null
          full_address?: string | null
          full_name: string
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          header_url?: string | null
          id: string
          is_admin?: boolean | null
          is_pro?: boolean
          is_promoted?: boolean | null
          last_activity?: string | null
          last_ai_usage_date?: string | null
          last_jobs_viewed_at?: string | null
          last_opened_at?: string | null
          latitude?: number | null
          level?: number | null
          location?: unknown
          longitude?: number | null
          marketing_consent?: boolean | null
          marketing_consent_at?: string | null
          marketing_notifications?: boolean | null
          notes?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          points?: number
          portfolio_photos?: string[] | null
          postal_code?: string | null
          pro_expires_at?: string | null
          pro_since?: string | null
          push_enabled?: boolean | null
          push_job_completed?: boolean | null
          push_low_credits?: boolean | null
          push_new_jobs?: boolean | null
          push_new_messages?: boolean | null
          push_new_offers?: boolean | null
          push_notifications?: boolean | null
          push_offer_accepted?: boolean | null
          referral_code?: string | null
          referral_reward_stage?: string
          referred_by?: string | null
          region?: string | null
          secondary_emails?: string[] | null
          slug?: string | null
          street_name?: string | null
          street_number?: string | null
          subcategory?: string | null
          tags?: string[]
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          website?: string | null
          xp_total?: number | null
        }
        Update: {
          ai_usage_count?: number | null
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          city?: string | null
          company_id?: string | null
          company_type?: string | null
          cookie_consent?: Json | null
          cookie_consent_at?: string | null
          country?: string | null
          created_at?: string | null
          current_level?: number | null
          display_as_company?: boolean
          email?: string
          email_enabled?: boolean | null
          email_job_completed?: boolean | null
          email_low_credits?: boolean | null
          email_new_jobs?: boolean | null
          email_new_messages?: boolean | null
          email_new_offers?: boolean | null
          email_notifications?: boolean | null
          email_offer_accepted?: boolean | null
          engagement_score?: number | null
          first_name_vocative?: string | null
          full_address?: string | null
          full_name?: string
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_reviews_count?: number | null
          header_url?: string | null
          id?: string
          is_admin?: boolean | null
          is_pro?: boolean
          is_promoted?: boolean | null
          last_activity?: string | null
          last_ai_usage_date?: string | null
          last_jobs_viewed_at?: string | null
          last_opened_at?: string | null
          latitude?: number | null
          level?: number | null
          location?: unknown
          longitude?: number | null
          marketing_consent?: boolean | null
          marketing_consent_at?: string | null
          marketing_notifications?: boolean | null
          notes?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          points?: number
          portfolio_photos?: string[] | null
          postal_code?: string | null
          pro_expires_at?: string | null
          pro_since?: string | null
          push_enabled?: boolean | null
          push_job_completed?: boolean | null
          push_low_credits?: boolean | null
          push_new_jobs?: boolean | null
          push_new_messages?: boolean | null
          push_new_offers?: boolean | null
          push_notifications?: boolean | null
          push_offer_accepted?: boolean | null
          referral_code?: string | null
          referral_reward_stage?: string
          referred_by?: string | null
          region?: string | null
          secondary_emails?: string[] | null
          slug?: string | null
          street_name?: string | null
          street_number?: string | null
          subcategory?: string | null
          tags?: string[]
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          website?: string | null
          xp_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_redemptions: {
        Row: {
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          credit_amount: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Relationships: []
      }
      pseo_contents: {
        Row: {
          category_id: string | null
          city_slug: string
          content: string
          created_at: string | null
          id: string
          meta_description: string | null
          subcategory_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          city_slug: string
          content: string
          created_at?: string | null
          id?: string
          meta_description?: string | null
          subcategory_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          city_slug?: string
          content?: string
          created_at?: string | null
          id?: string
          meta_description?: string | null
          subcategory_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pseo_contents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "pseo_contents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pseo_contents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "pseo_contents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "service_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      pseo_generation_queue: {
        Row: {
          attempts: number
          category_id: string
          city_slug: string
          created_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          score: number
          status: string
          subcategory_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          category_id: string
          city_slug: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          score?: number
          status?: string
          subcategory_id?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          category_id?: string
          city_slug?: string
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          score?: number
          status?: string
          subcategory_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pseo_pageviews: {
        Row: {
          category_slug: string
          city_slug: string
          has_local_workers: boolean
          id: string
          is_bot: boolean
          referrer: string | null
          subcategory_slug: string | null
          viewed_at: string
          worker_count: number
        }
        Insert: {
          category_slug: string
          city_slug: string
          has_local_workers?: boolean
          id?: string
          is_bot?: boolean
          referrer?: string | null
          subcategory_slug?: string | null
          viewed_at?: string
          worker_count?: number
        }
        Update: {
          category_slug?: string
          city_slug?: string
          has_local_workers?: boolean
          id?: string
          is_bot?: boolean
          referrer?: string | null
          subcategory_slug?: string | null
          viewed_at?: string
          worker_count?: number
        }
        Relationships: []
      }
      push_queue: {
        Row: {
          body: string
          created_at: string | null
          icon: string | null
          id: string
          image: string | null
          scheduled_for: string
          status: string | null
          title: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          scheduled_for: string
          status?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          scheduled_for?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_receipts: {
        Row: {
          created_at: string
          endpoint_tail: string | null
          id: string
          note: string | null
          subscription_id: string | null
          tag: string | null
          type: string | null
          user_agent: string | null
          variant: string | null
        }
        Insert: {
          created_at?: string
          endpoint_tail?: string | null
          id?: string
          note?: string | null
          subscription_id?: string | null
          tag?: string | null
          type?: string | null
          user_agent?: string | null
          variant?: string | null
        }
        Update: {
          created_at?: string
          endpoint_tail?: string | null
          id?: string
          note?: string | null
          subscription_id?: string | null
          tag?: string | null
          type?: string | null
          user_agent?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_receipts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_name: string | null
          endpoint: string
          id: string
          p256dh_key: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_name?: string | null
          endpoint: string
          id?: string
          p256dh_key: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_name?: string | null
          endpoint?: string
          id?: string
          p256dh_key?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_templates: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          event_key: string
          id: string
          is_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          throttling_rule: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          event_key: string
          id?: string
          is_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          throttling_rule?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          event_key?: string
          id?: string
          is_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          throttling_rule?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      queued_notifications: {
        Row: {
          body: string
          created_at: string
          group_key: string
          id: string
          link: string | null
          payload: Json | null
          scheduled_at: string
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          group_key: string
          id?: string
          link?: string | null
          payload?: Json | null
          scheduled_at: string
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          group_key?: string
          id?: string
          link?: string | null
          payload?: Json | null
          scheduled_at?: string
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      radce_articles: {
        Row: {
          category_id: string | null
          content_html: string | null
          created_at: string | null
          id: string
          image_url: string | null
          slug: string | null
          social_snippet: string | null
          status: Database["public"]["Enums"]["article_status"] | null
          subcategory_id: string | null
          target_keyword: string | null
          title: string
          updated_at: string | null
          visual_prompt: string | null
        }
        Insert: {
          category_id?: string | null
          content_html?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          slug?: string | null
          social_snippet?: string | null
          status?: Database["public"]["Enums"]["article_status"] | null
          subcategory_id?: string | null
          target_keyword?: string | null
          title: string
          updated_at?: string | null
          visual_prompt?: string | null
        }
        Update: {
          category_id?: string | null
          content_html?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          slug?: string | null
          social_snippet?: string | null
          status?: Database["public"]["Enums"]["article_status"] | null
          subcategory_id?: string | null
          target_keyword?: string | null
          title?: string
          updated_at?: string | null
          visual_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radce_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "radce_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radce_articles_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "radce_articles_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "service_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_transactions: {
        Row: {
          created_at: string | null
          id: string
          referee_credits: number
          referee_id: string
          referrer_credits: number
          referrer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referee_credits?: number
          referee_id: string
          referrer_credits?: number
          referrer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referee_credits?: number
          referee_id?: string
          referrer_credits?: number
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_transactions_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          job_id: string | null
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          job_id?: string | null
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          job_id?: string | null
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_hidden: boolean
          job_id: string
          quality_cleanliness: number | null
          quality_communication: number | null
          quality_professionalism: number | null
          quality_punctuality: number | null
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean
          job_id: string
          quality_cleanliness?: number | null
          quality_communication?: number | null
          quality_professionalism?: number | null
          quality_punctuality?: number | null
          rating: number
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean
          job_id?: string
          quality_cleanliness?: number | null
          quality_communication?: number | null
          quality_professionalism?: number | null
          quality_punctuality?: number | null
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_crawl_health: {
        Row: {
          checked_at: string
          error: string | null
          id: string
          ok: boolean
          response_ms: number | null
          run_id: string
          status_code: number | null
          url: string
        }
        Insert: {
          checked_at?: string
          error?: string | null
          id?: string
          ok?: boolean
          response_ms?: number | null
          run_id: string
          status_code?: number | null
          url: string
        }
        Update: {
          checked_at?: string
          error?: string | null
          id?: string
          ok?: boolean
          response_ms?: number | null
          run_id?: string
          status_code?: number | null
          url?: string
        }
        Relationships: []
      }
      seo_cwv: {
        Row: {
          cls: number | null
          error: string | null
          fcp_ms: number | null
          id: string
          inp_ms: number | null
          lcp_ms: number | null
          measured_at: string
          performance_score: number | null
          raw: Json | null
          strategy: string
          ttfb_ms: number | null
          url: string
        }
        Insert: {
          cls?: number | null
          error?: string | null
          fcp_ms?: number | null
          id?: string
          inp_ms?: number | null
          lcp_ms?: number | null
          measured_at?: string
          performance_score?: number | null
          raw?: Json | null
          strategy?: string
          ttfb_ms?: number | null
          url: string
        }
        Update: {
          cls?: number | null
          error?: string | null
          fcp_ms?: number | null
          id?: string
          inp_ms?: number | null
          lcp_ms?: number | null
          measured_at?: string
          performance_score?: number | null
          raw?: Json | null
          strategy?: string
          ttfb_ms?: number | null
          url?: string
        }
        Relationships: []
      }
      seo_performance: {
        Row: {
          clicks: number
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number
          position: number | null
          url: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number
          position?: number | null
          url: string
        }
        Update: {
          clicks?: number
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number
          position?: number | null
          url?: string
        }
        Relationships: []
      }
      seo_title_variants: {
        Row: {
          active: boolean
          clicks: number
          created_at: string
          ctr: number | null
          ended_at: string | null
          id: string
          impressions: number
          started_at: string
          url: string
          variant: string
        }
        Insert: {
          active?: boolean
          clicks?: number
          created_at?: string
          ctr?: number | null
          ended_at?: string | null
          id?: string
          impressions?: number
          started_at?: string
          url: string
          variant: string
        }
        Update: {
          active?: boolean
          clicks?: number
          created_at?: string
          ctr?: number | null
          ended_at?: string | null
          id?: string
          impressions?: number
          started_at?: string
          url?: string
          variant?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          category_form: string | null
          created_at: string | null
          description: string | null
          icon: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          category_form?: string | null
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          category_form?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      service_subcategories: {
        Row: {
          category_form: string | null
          category_id: string
          created_at: string | null
          description: string | null
          display_level: string | null
          id: string
          name: string
          points_cost: number | null
          price_range: string | null
          search_terms: string[] | null
          section: string | null
          section_icon: string | null
          seo_keywords: string[] | null
          slug: string
          sort_order: number | null
          unit: string | null
        }
        Insert: {
          category_form?: string | null
          category_id: string
          created_at?: string | null
          description?: string | null
          display_level?: string | null
          id?: string
          name: string
          points_cost?: number | null
          price_range?: string | null
          search_terms?: string[] | null
          section?: string | null
          section_icon?: string | null
          seo_keywords?: string[] | null
          slug: string
          sort_order?: number | null
          unit?: string | null
        }
        Update: {
          category_form?: string | null
          category_id?: string
          created_at?: string | null
          description?: string | null
          display_level?: string | null
          id?: string
          name?: string
          points_cost?: number | null
          price_range?: string | null
          search_terms?: string[] | null
          section?: string | null
          section_icon?: string | null
          seo_keywords?: string[] | null
          slug?: string
          sort_order?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "service_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_appointments: {
        Row: {
          created_at: string
          id: string
          job_id: string
          visit_date: string
          visit_time: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          visit_date: string
          visit_time: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          visit_date?: string
          visit_time?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_appointments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_appointments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_appointments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_appointments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_outbox: {
        Row: {
          ai_message: string | null
          craftsman_id: string | null
          created_at: string | null
          id: string
          job_id: string | null
          lead_id: string | null
          phone_number: string
          status: Database["public"]["Enums"]["whatsapp_message_status"]
          template_slug: string | null
          updated_at: string | null
        }
        Insert: {
          ai_message?: string | null
          craftsman_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          phone_number: string
          status?: Database["public"]["Enums"]["whatsapp_message_status"]
          template_slug?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_message?: string | null
          craftsman_id?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          phone_number?: string
          status?: Database["public"]["Enums"]["whatsapp_message_status"]
          template_slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_outbox_craftsman_id_fkey"
            columns: ["craftsman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_outbox_craftsman_id_fkey"
            columns: ["craftsman_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_outbox_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_outbox_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_outbox_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "marketing_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_expanded_jobs: {
        Row: {
          id: string
          job_id: string
          unlocked_at: string | null
          worker_id: string
        }
        Insert: {
          id?: string
          job_id: string
          unlocked_at?: string | null
          worker_id: string
        }
        Update: {
          id?: string
          job_id?: string
          unlocked_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_expanded_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_expanded_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_expanded_jobs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_expanded_jobs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_services: {
        Row: {
          created_at: string | null
          id: string
          subcategory_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subcategory_id: string
          worker_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subcategory_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "public_demands"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "worker_services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "service_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_services_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_services_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_verifications: {
        Row: {
          company_address: string | null
          company_name: string | null
          created_at: string
          ico: string | null
          ico_declaration_accepted: boolean | null
          id: string
          id_card_path: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string | null
          trade_license_path: string | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          ico?: string | null
          ico_declaration_accepted?: boolean | null
          id?: string
          id_card_path?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          trade_license_path?: string | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          company_address?: string | null
          company_name?: string | null
          created_at?: string
          ico?: string | null
          ico_declaration_accepted?: boolean | null
          id?: string
          id_card_path?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          trade_license_path?: string | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_verifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_verifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      public_demands: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          city: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          deadline_date: string | null
          deadline_type: string | null
          description: string | null
          id: string | null
          photos: string[] | null
          price_note: string | null
          slug: string | null
          status: string | null
          subcategory_id: string | null
          subcategory_name: string | null
          subcategory_slug: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          city: string | null
          company_type: string | null
          country: string | null
          display_as_company: boolean | null
          email: string | null
          full_name: string | null
          header_url: string | null
          ico: string | null
          id: string | null
          is_pro: boolean | null
          phone: string | null
          portfolio_photos: string[] | null
          slug: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
      seo_crawl_health_latest: {
        Row: {
          checked_at: string | null
          error: string | null
          ok: boolean | null
          response_ms: number | null
          status_code: number | null
          url: string | null
        }
        Relationships: []
      }
      unified_contacts: {
        Row: {
          category: string | null
          city: string | null
          company_name: string | null
          contact_source: string | null
          created_at: string | null
          description: string | null
          email: string | null
          email_notifications: boolean | null
          engagement_score: number | null
          full_address: string | null
          full_name: string | null
          icebreaker: string | null
          id: string | null
          is_pro: boolean | null
          last_activity: string | null
          latitude: number | null
          longitude: number | null
          marketing_notifications: boolean | null
          outbox_id: string | null
          phone: string | null
          postal_code: string | null
          push_notifications: boolean | null
          referral_code: string | null
          secondary_emails: string[] | null
          street_name: string | null
          street_number: string | null
          subcategory: string | null
          tags: string[] | null
          user_type: string | null
          website: string | null
        }
        Relationships: []
      }
      unified_public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          city: string | null
          contact_source: string | null
          display_as_company: boolean | null
          full_name: string | null
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_reviews_count: number | null
          id: string | null
          is_pro: boolean | null
          latitude: number | null
          longitude: number | null
          rating: number | null
          review_count: number | null
          slug: string | null
          user_type: string | null
        }
        Relationships: []
      }
      unified_worker_services: {
        Row: {
          subcategory_id: string | null
          worker_id: string | null
          worker_source: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      add_user_points: {
        Args: { points_to_add: number; target_user_id: string }
        Returns: number
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      are_users_connected: {
        Args: { user_id_1: string; user_id_2: string }
        Returns: boolean
      }
      calculate_level: { Args: { xp: number }; Returns: number }
      check_email_exists: { Args: { _email: string }; Returns: boolean }
      create_business: {
        Args: {
          p_company_type?: string
          p_dic?: string
          p_ico?: string
          p_name: string
        }
        Returns: string
      }
      deduct_points: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_workers_for_job: {
        Args: {
          job_lat: number
          job_lng: number
          job_subcategory_id: string
          radius_meters?: number
        }
        Returns: {
          auth_key: string
          endpoint: string
          p256dh_key: string
          subscription_id: string
          worker_id: string
        }[]
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_active_pseo_combinations: {
        Args: never
        Returns: {
          category_slug: string
          city: string
          subcategory_slug: string
        }[]
      }
      get_all_profile_tags: { Args: never; Returns: string[] }
      get_all_sniper_reach_counts: {
        Args: never
        Returns: {
          job_id: string
          reach_count: number
        }[]
      }
      get_job_slot_info: {
        Args: { job_id: string }
        Returns: {
          is_fully_closed: boolean
          pro_slots_available: number
          standard_slots_available: number
          total_offers: number
        }[]
      }
      get_push_platform_stats: {
        Args: never
        Returns: {
          device_count: number
          platform_name: string
        }[]
      }
      get_suitable_workers_for_sniper: {
        Args: { p_job_id: string; p_radius_km?: number }
        Returns: {
          category: string
          city: string
          contact_source: string
          description: string
          distance_km: number
          email: string
          full_name: string
          icebreaker: string
          id: string
          matched_subcategory: string
          outbox_id: string
          phone: string
          subcategory: string
          tags: string[]
          user_type: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      increment_broadcast_clicks: {
        Args: { broadcast_id: string }
        Returns: undefined
      }
      increment_worker_ai_usage: { Args: { p_user_id: string }; Returns: Json }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_pro: { Args: { user_id: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      refund_and_delete_job: { Args: { p_job_id: string }; Returns: undefined }
      reset_stuck_automation_jobs: { Args: never; Returns: undefined }
      slugify: { Args: { "": string }; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      worker_can_view_calendar_share: {
        Args: { share_job_id: string; share_worker_id: string }
        Returns: boolean
      }
    }
    Enums: {
      article_status: "idea" | "draft" | "published"
      invoice_status: "paid" | "void"
      user_type: "customer" | "worker" | "both"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
      whatsapp_message_status:
        | "pending_verification"
        | "ready_for_admin"
        | "no_whatsapp"
        | "sent"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      article_status: ["idea", "draft", "published"],
      invoice_status: ["paid", "void"],
      user_type: ["customer", "worker", "both"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
      whatsapp_message_status: [
        "pending_verification",
        "ready_for_admin",
        "no_whatsapp",
        "sent",
      ],
    },
  },
} as const
