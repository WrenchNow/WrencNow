export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          data: NonNullable<Json>;
          entity: string;
          entity_id: string | null;
          id: number;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          entity: string;
          entity_id?: string | null;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          entity?: string;
          entity_id?: string | null;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_codes: {
        Row: {
          attempts: number;
          booking_id: string;
          code: string;
          created_at: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          booking_id: string;
          code: string;
          created_at?: string;
          verified_at?: string | null;
        };
        Update: {
          attempts?: number;
          booking_id?: string;
          code?: string;
          created_at?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "booking_codes_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_parts: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          mechanic_id: string;
          name: string;
          part_number: string | null;
          purchased_at: string | null;
          quantity: number;
          quoted_unit_cents: number;
          receipt_cents: number | null;
          receipt_path: string | null;
          status: Database["public"]["Enums"]["part_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          mechanic_id: string;
          name: string;
          part_number?: string | null;
          purchased_at?: string | null;
          quantity?: number;
          quoted_unit_cents: number;
          receipt_cents?: number | null;
          receipt_path?: string | null;
          status?: Database["public"]["Enums"]["part_status"];
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          mechanic_id?: string;
          name?: string;
          part_number?: string | null;
          purchased_at?: string | null;
          quantity?: number;
          quoted_unit_cents?: number;
          receipt_cents?: number | null;
          receipt_path?: string | null;
          status?: Database["public"]["Enums"]["part_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_parts_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_parts_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          accepted_at: string | null;
          address: string;
          admin_override: boolean;
          arrived_at: string | null;
          arrived_distance_m: number | null;
          arrived_location: unknown;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          completed_at: string | null;
          created_at: string;
          currency: string;
          customer_id: string;
          customer_no_show_fee_cents: number | null;
          en_route_at: string | null;
          estimate_approved_at: string | null;
          estimated_max_cents: number;
          final_amount_cents: number | null;
          hold_cents: number | null;
          hourly_rate_cents: number;
          id: string;
          labor_cents: number | null;
          labor_max_cents: number | null;
          location: unknown;
          mechanic_id: string;
          onboarding_fee_cents: number;
          parts_approved_at: string | null;
          parts_approved_cents: number | null;
          parts_cents: number | null;
          parts_estimate_cents: number;
          parts_handling_cents: number | null;
          parts_quote_sent_at: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          platform_fee_cents: number | null;
          problem_description: string | null;
          processing_fee_cents: number;
          processing_until: string | null;
          refunded_cents: number;
          return_old_parts: boolean;
          scheduled_end: string;
          scheduled_start: string;
          service_id: number;
          started_at: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          stripe_payment_intent_id: string | null;
          topup_authorized_cents: number;
          topup_payment_intent_id: string | null;
          updated_at: string;
          urgency: Database["public"]["Enums"]["urgency"];
          vehicle_desc: string;
          vehicle_id: string | null;
          vehicle_make: string | null;
          vehicle_model: string | null;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          address: string;
          admin_override?: boolean;
          arrived_at?: string | null;
          arrived_distance_m?: number | null;
          arrived_location?: unknown;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          customer_id: string;
          customer_no_show_fee_cents?: number | null;
          en_route_at?: string | null;
          estimate_approved_at?: string | null;
          estimated_max_cents: number;
          final_amount_cents?: number | null;
          hold_cents?: number | null;
          hourly_rate_cents: number;
          id?: string;
          labor_cents?: number | null;
          labor_max_cents?: number | null;
          location?: unknown;
          mechanic_id: string;
          onboarding_fee_cents?: number;
          parts_approved_at?: string | null;
          parts_approved_cents?: number | null;
          parts_cents?: number | null;
          parts_estimate_cents?: number;
          parts_handling_cents?: number | null;
          parts_quote_sent_at?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          platform_fee_cents?: number | null;
          problem_description?: string | null;
          processing_fee_cents?: number;
          processing_until?: string | null;
          refunded_cents?: number;
          return_old_parts?: boolean;
          scheduled_end: string;
          scheduled_start: string;
          service_id: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          stripe_payment_intent_id?: string | null;
          topup_authorized_cents?: number;
          topup_payment_intent_id?: string | null;
          updated_at?: string;
          urgency?: Database["public"]["Enums"]["urgency"];
          vehicle_desc: string;
          vehicle_id?: string | null;
          vehicle_make?: string | null;
          vehicle_model?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          address?: string;
          admin_override?: boolean;
          arrived_at?: string | null;
          arrived_distance_m?: number | null;
          arrived_location?: unknown;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          customer_no_show_fee_cents?: number | null;
          en_route_at?: string | null;
          estimate_approved_at?: string | null;
          estimated_max_cents?: number;
          final_amount_cents?: number | null;
          hold_cents?: number | null;
          hourly_rate_cents?: number;
          id?: string;
          labor_cents?: number | null;
          labor_max_cents?: number | null;
          location?: unknown;
          mechanic_id?: string;
          onboarding_fee_cents?: number;
          parts_approved_at?: string | null;
          parts_approved_cents?: number | null;
          parts_cents?: number | null;
          parts_estimate_cents?: number;
          parts_handling_cents?: number | null;
          parts_quote_sent_at?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          platform_fee_cents?: number | null;
          problem_description?: string | null;
          processing_fee_cents?: number;
          processing_until?: string | null;
          refunded_cents?: number;
          return_old_parts?: boolean;
          scheduled_end?: string;
          scheduled_start?: string;
          service_id?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          stripe_payment_intent_id?: string | null;
          topup_authorized_cents?: number;
          topup_payment_intent_id?: string | null;
          updated_at?: string;
          urgency?: Database["public"]["Enums"]["urgency"];
          vehicle_desc?: string;
          vehicle_id?: string | null;
          vehicle_make?: string | null;
          vehicle_model?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey";
            columns: ["cancelled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      ledger_entries: {
        Row: {
          amount_cents: number;
          booking_id: string | null;
          created_at: string;
          currency: string;
          id: string;
          mechanic_id: string | null;
          stripe_object_id: string | null;
          type: Database["public"]["Enums"]["ledger_type"];
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          booking_id?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          mechanic_id?: string | null;
          stripe_object_id?: string | null;
          type: Database["public"]["Enums"]["ledger_type"];
        };
        Update: {
          amount_cents?: number;
          booking_id?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          mechanic_id?: string | null;
          stripe_object_id?: string | null;
          type?: Database["public"]["Enums"]["ledger_type"];
        };
        Relationships: [
          {
            foreignKeyName: "ledger_entries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ledger_entries_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
        ];
      };
      mechanic_services: {
        Row: {
          mechanic_id: string;
          service_id: number;
          typical_parts_cents: number | null;
        };
        ComputedFields: never;
        Insert: {
          mechanic_id: string;
          service_id: number;
          typical_parts_cents?: number | null;
        };
        Update: {
          mechanic_id?: string;
          service_id?: number;
          typical_parts_cents?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "mechanic_services_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mechanic_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      mechanics: {
        Row: {
          agreed_terms_at: string | null;
          bio: string | null;
          certifications: string[];
          check_status: Database["public"]["Enums"]["check_status"];
          checkr_candidate_id: string | null;
          checkr_invitation_id: string | null;
          checkr_report_id: string | null;
          city: string | null;
          completed_jobs: number;
          created_at: string;
          display_name: string | null;
          featured_until: string | null;
          has_tools: boolean;
          has_transport: boolean;
          hourly_rate_cents: number | null;
          id: string;
          insurance_doc_path: string | null;
          insurance_expires_on: string | null;
          insurance_pending_expires_on: string | null;
          insurance_policy_number: string | null;
          insurance_provider: string | null;
          insurance_reviewed_at: string | null;
          insurance_status: Database["public"]["Enums"]["insurance_status"];
          insurance_submitted_at: string | null;
          is_live: boolean | null;
          location: unknown;
          no_show_count: number;
          onboarding_fee_collected_cents: number;
          onboarding_fee_total_cents: number;
          onboarding_submitted_at: string | null;
          online: boolean;
          photo_url: string | null;
          rating_avg: number | null;
          review_count: number;
          service_radius_miles: number;
          skill_tier: Database["public"]["Enums"]["skill_tier"];
          specialties: string[];
          status: Database["public"]["Enums"]["mechanic_status"];
          stripe_account_id: string | null;
          stripe_charges_enabled: boolean;
          stripe_customer_id: string | null;
          stripe_payouts_enabled: boolean;
          stripe_subscription_id: string | null;
          updated_at: string;
          warranty_days: number;
          years_experience: number | null;
        };
        ComputedFields: never;
        Insert: {
          agreed_terms_at?: string | null;
          bio?: string | null;
          certifications?: string[];
          check_status?: Database["public"]["Enums"]["check_status"];
          checkr_candidate_id?: string | null;
          checkr_invitation_id?: string | null;
          checkr_report_id?: string | null;
          city?: string | null;
          completed_jobs?: number;
          created_at?: string;
          display_name?: string | null;
          featured_until?: string | null;
          has_tools?: boolean;
          has_transport?: boolean;
          hourly_rate_cents?: number | null;
          id: string;
          insurance_doc_path?: string | null;
          insurance_expires_on?: string | null;
          insurance_pending_expires_on?: string | null;
          insurance_policy_number?: string | null;
          insurance_provider?: string | null;
          insurance_reviewed_at?: string | null;
          insurance_status?: Database["public"]["Enums"]["insurance_status"];
          insurance_submitted_at?: string | null;
          is_live?: never;
          location?: unknown;
          no_show_count?: number;
          onboarding_fee_collected_cents?: number;
          onboarding_fee_total_cents?: number;
          onboarding_submitted_at?: string | null;
          online?: boolean;
          photo_url?: string | null;
          rating_avg?: number | null;
          review_count?: number;
          service_radius_miles?: number;
          skill_tier?: Database["public"]["Enums"]["skill_tier"];
          specialties?: string[];
          status?: Database["public"]["Enums"]["mechanic_status"];
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          stripe_customer_id?: string | null;
          stripe_payouts_enabled?: boolean;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          warranty_days?: number;
          years_experience?: number | null;
        };
        Update: {
          agreed_terms_at?: string | null;
          bio?: string | null;
          certifications?: string[];
          check_status?: Database["public"]["Enums"]["check_status"];
          checkr_candidate_id?: string | null;
          checkr_invitation_id?: string | null;
          checkr_report_id?: string | null;
          city?: string | null;
          completed_jobs?: number;
          created_at?: string;
          display_name?: string | null;
          featured_until?: string | null;
          has_tools?: boolean;
          has_transport?: boolean;
          hourly_rate_cents?: number | null;
          id?: string;
          insurance_doc_path?: string | null;
          insurance_expires_on?: string | null;
          insurance_pending_expires_on?: string | null;
          insurance_policy_number?: string | null;
          insurance_provider?: string | null;
          insurance_reviewed_at?: string | null;
          insurance_status?: Database["public"]["Enums"]["insurance_status"];
          insurance_submitted_at?: string | null;
          is_live?: never;
          location?: unknown;
          no_show_count?: number;
          onboarding_fee_collected_cents?: number;
          onboarding_fee_total_cents?: number;
          onboarding_submitted_at?: string | null;
          online?: boolean;
          photo_url?: string | null;
          rating_avg?: number | null;
          review_count?: number;
          service_radius_miles?: number;
          skill_tier?: Database["public"]["Enums"]["skill_tier"];
          specialties?: string[];
          status?: Database["public"]["Enums"]["mechanic_status"];
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          stripe_customer_id?: string | null;
          stripe_payouts_enabled?: boolean;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          warranty_days?: number;
          years_experience?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "mechanics_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      no_shows: {
        Row: {
          booking_id: string;
          created_at: string;
          id: string;
          mechanic_id: string;
          reason: string | null;
          reported_by: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          created_at?: string;
          id?: string;
          mechanic_id: string;
          reason?: string | null;
          reported_by: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          id?: string;
          mechanic_id?: string;
          reason?: string | null;
          reported_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "no_shows_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "no_shows_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "no_shows_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          channel: string;
          created_at: string;
          error: string | null;
          id: number;
          key: string;
          recipient: string;
          status: string;
          template: string;
        };
        ComputedFields: never;
        Insert: {
          channel: string;
          created_at?: string;
          error?: string | null;
          id?: never;
          key: string;
          recipient: string;
          status?: string;
          template: string;
        };
        Update: {
          channel?: string;
          created_at?: string;
          error?: string | null;
          id?: never;
          key?: string;
          recipient?: string;
          status?: string;
          template?: string;
        };
        Relationships: [];
      };
      onboarding_fee_charges: {
        Row: {
          amount_cents: number;
          booking_id: string;
          created_at: string;
          mechanic_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          booking_id: string;
          created_at?: string;
          mechanic_id: string;
        };
        Update: {
          amount_cents?: number;
          booking_id?: string;
          created_at?: string;
          mechanic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_fee_charges_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_fee_charges_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
        ];
      };
      open_requests: {
        Row: {
          created_at: string;
          customer_id: string | null;
          details: string | null;
          email: string;
          id: string;
          location_text: string;
          matched_mechanic_id: string | null;
          name: string;
          phone: string | null;
          service_slug: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          customer_id?: string | null;
          details?: string | null;
          email: string;
          id?: string;
          location_text: string;
          matched_mechanic_id?: string | null;
          name: string;
          phone?: string | null;
          service_slug?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string | null;
          details?: string | null;
          email?: string;
          id?: string;
          location_text?: string;
          matched_mechanic_id?: string | null;
          name?: string;
          phone?: string | null;
          service_slug?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "open_requests_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "open_requests_matched_mechanic_id_fkey";
            columns: ["matched_mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_reports: {
        Row: {
          booking_id: string | null;
          created_at: string;
          details: string | null;
          id: string;
          mechanic_id: string | null;
          method: string | null;
          reporter_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          mechanic_id?: string | null;
          method?: string | null;
          reporter_id: string;
          status?: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          mechanic_id?: string | null;
          method?: string | null;
          reporter_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_reports_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_reports_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"] | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"] | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          body: string | null;
          booking_id: string;
          created_at: string;
          customer_id: string;
          id: string;
          mechanic_id: string;
          rating: number;
          reviewer_name: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          booking_id: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          mechanic_id: string;
          rating: number;
          reviewer_name: string;
          updated_at?: string;
        };
        Update: {
          body?: string | null;
          booking_id?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          mechanic_id?: string;
          rating?: number;
          reviewer_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean;
          description: string;
          est_minutes_max: number;
          est_minutes_min: number;
          icon: string;
          id: number;
          name: string;
          required_tier: Database["public"]["Enums"]["skill_tier"];
          slug: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          description: string;
          est_minutes_max: number;
          est_minutes_min: number;
          icon?: string;
          id?: number;
          name: string;
          required_tier: Database["public"]["Enums"]["skill_tier"];
          slug: string;
          sort?: number;
        };
        Update: {
          active?: boolean;
          description?: string;
          est_minutes_max?: number;
          est_minutes_min?: number;
          icon?: string;
          id?: number;
          name?: string;
          required_tier?: Database["public"]["Enums"]["skill_tier"];
          slug?: string;
          sort?: number;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          created_at: string;
          id: string;
          make: string;
          model: string;
          nickname: string | null;
          owner_id: string;
          trim: string | null;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          make: string;
          model: string;
          nickname?: string | null;
          owner_id: string;
          trim?: string | null;
          year: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          make?: string;
          model?: string;
          nickname?: string | null;
          owner_id?: string;
          trim?: string | null;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      warranty_claims: {
        Row: {
          booking_id: string;
          created_at: string;
          customer_id: string;
          description: string;
          id: string;
          mechanic_id: string;
          resolution: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          created_at?: string;
          customer_id: string;
          description: string;
          id?: string;
          mechanic_id: string;
          resolution?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string;
          customer_id?: string;
          description?: string;
          id?: string;
          mechanic_id?: string;
          resolution?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warranty_claims_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warranty_claims_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warranty_claims_mechanic_id_fkey";
            columns: ["mechanic_id"];
            isOneToOne: false;
            referencedRelation: "mechanics";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          event_id: string;
          provider: string;
          received_at: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          provider: string;
          received_at?: string;
          type: string;
        };
        Update: {
          event_id?: string;
          provider?: string;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      choose_role: { Args: { r: Database["public"]["Enums"]["user_role"] }; Returns: undefined };
      claim_onboarding_fee: {
        Args: {
          p_booking_id: string;
          p_final_cents: number;
          p_per_job_cents: number;
          p_platform_fee_cents: number;
        };
        Returns: number;
      };
      distance_to_booking_m: {
        Args: { p_booking_id: string; p_lat: number; p_lng: number };
        Returns: number;
      };
      get_public_mechanic: {
        Args: { mechanic_id: string };
        Returns: {
          bio: string;
          certifications: string[];
          check_clear: boolean;
          city: string;
          completed_jobs: number;
          display_name: string;
          featured: boolean;
          hourly_rate_cents: number;
          id: string;
          member_since: string;
          no_show_count: number;
          online: boolean;
          photo_url: string;
          rating_avg: number;
          review_count: number;
          service_radius_miles: number;
          skill_tier: Database["public"]["Enums"]["skill_tier"];
          specialties: string[];
          years_experience: number;
        }[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      mechanic_busy_slots: {
        Args: { from_ts: string; mechanic_id: string; to_ts: string };
        Returns: {
          scheduled_end: string;
          scheduled_start: string;
        }[];
      };
      mechanic_is_live: { Args: { mid: string }; Returns: boolean };
      mechanic_warranty_days: { Args: { mid: string }; Returns: number };
      refresh_mechanic_stats: { Args: { mid: string }; Returns: undefined };
      release_onboarding_fee: { Args: { p_booking_id: string }; Returns: number };
      search_mechanics: {
        Args: { lat: number; lng: number; max_results?: number; service_slug?: string };
        Returns: {
          city: string;
          completed_jobs: number;
          display_name: string;
          distance_miles: number;
          featured: boolean;
          hourly_rate_cents: number;
          id: string;
          no_show_count: number;
          online: boolean;
          photo_url: string;
          rating_avg: number;
          review_count: number;
          skill_tier: Database["public"]["Enums"]["skill_tier"];
          specialties: string[];
          years_experience: number;
        }[];
      };
      tier_rank: { Args: { t: Database["public"]["Enums"]["skill_tier"] }; Returns: number };
      typical_parts_cost: {
        Args: { p_make: string; p_model: string; p_service_id: number };
        Returns: {
          basis: string;
          cents: number;
          sample: number;
        }[];
      };
    };
    Enums: {
      booking_status:
        | "requested"
        | "accepted"
        | "en_route"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
        | "customer_no_show";
      check_status:
        | "not_started"
        | "invited"
        | "pending"
        | "clear"
        | "consider"
        | "suspended"
        | "canceled";
      insurance_status: "none" | "submitted" | "verified" | "rejected";
      ledger_type: "charge" | "platform_fee" | "refund" | "dispute" | "subscription";
      mechanic_status: "pending" | "approved" | "paused" | "rejected" | "suspended";
      part_status: "quoted" | "approved" | "declined" | "purchased" | "removed";
      payment_status:
        | "unpaid"
        | "authorized"
        | "captured"
        | "canceled"
        | "refunded"
        | "partially_refunded"
        | "disputed"
        | "failed";
      skill_tier: "basic" | "certified" | "master";
      urgency: "flexible" | "soon" | "today" | "stranded";
      user_role: "customer" | "mechanic" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "requested",
        "accepted",
        "en_route",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "customer_no_show",
      ],
      check_status: [
        "not_started",
        "invited",
        "pending",
        "clear",
        "consider",
        "suspended",
        "canceled",
      ],
      insurance_status: ["none", "submitted", "verified", "rejected"],
      ledger_type: ["charge", "platform_fee", "refund", "dispute", "subscription"],
      mechanic_status: ["pending", "approved", "paused", "rejected", "suspended"],
      part_status: ["quoted", "approved", "declined", "purchased", "removed"],
      payment_status: [
        "unpaid",
        "authorized",
        "captured",
        "canceled",
        "refunded",
        "partially_refunded",
        "disputed",
        "failed",
      ],
      skill_tier: ["basic", "certified", "master"],
      urgency: ["flexible", "soon", "today", "stranded"],
      user_role: ["customer", "mechanic", "admin"],
    },
  },
} as const;
