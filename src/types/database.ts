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
          estimated_max_cents: number;
          final_amount_cents: number | null;
          hourly_rate_cents: number;
          id: string;
          location: unknown;
          mechanic_id: string;
          payment_status: Database["public"]["Enums"]["payment_status"];
          platform_fee_cents: number | null;
          problem_description: string | null;
          processing_until: string | null;
          refunded_cents: number;
          scheduled_end: string;
          scheduled_start: string;
          service_id: number;
          started_at: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          stripe_payment_intent_id: string | null;
          updated_at: string;
          urgency: Database["public"]["Enums"]["urgency"];
          vehicle_desc: string;
          vehicle_id: string | null;
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
          estimated_max_cents: number;
          final_amount_cents?: number | null;
          hourly_rate_cents: number;
          id?: string;
          location?: unknown;
          mechanic_id: string;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          platform_fee_cents?: number | null;
          problem_description?: string | null;
          processing_until?: string | null;
          refunded_cents?: number;
          scheduled_end: string;
          scheduled_start: string;
          service_id: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
          urgency?: Database["public"]["Enums"]["urgency"];
          vehicle_desc: string;
          vehicle_id?: string | null;
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
          estimated_max_cents?: number;
          final_amount_cents?: number | null;
          hourly_rate_cents?: number;
          id?: string;
          location?: unknown;
          mechanic_id?: string;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          platform_fee_cents?: number | null;
          problem_description?: string | null;
          processing_until?: string | null;
          refunded_cents?: number;
          scheduled_end?: string;
          scheduled_start?: string;
          service_id?: number;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["booking_status"];
          stripe_payment_intent_id?: string | null;
          updated_at?: string;
          urgency?: Database["public"]["Enums"]["urgency"];
          vehicle_desc?: string;
          vehicle_id?: string | null;
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
        };
        ComputedFields: never;
        Insert: {
          mechanic_id: string;
          service_id: number;
        };
        Update: {
          mechanic_id?: string;
          service_id?: number;
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
          verification_fee_status: Database["public"]["Enums"]["verification_fee_status"];
          verification_paid_at: string | null;
          verification_paid_cents: number;
          verification_payment_intent_id: string | null;
          verification_refunded_cents: number;
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
          verification_fee_status?: Database["public"]["Enums"]["verification_fee_status"];
          verification_paid_at?: string | null;
          verification_paid_cents?: number;
          verification_payment_intent_id?: string | null;
          verification_refunded_cents?: number;
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
          verification_fee_status?: Database["public"]["Enums"]["verification_fee_status"];
          verification_paid_at?: string | null;
          verification_paid_cents?: number;
          verification_payment_intent_id?: string | null;
          verification_refunded_cents?: number;
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
      verification_refunds: {
        Row: {
          amount_cents: number;
          booking_id: string;
          created_at: string;
          mechanic_id: string;
          stripe_refund_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          booking_id: string;
          created_at?: string;
          mechanic_id: string;
          stripe_refund_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          booking_id?: string;
          created_at?: string;
          mechanic_id?: string;
          stripe_refund_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verification_refunds_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_refunds_mechanic_id_fkey";
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
      claim_verification_refund: {
        Args: { p_booking_id: string; p_per_job_cents: number };
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
      refresh_mechanic_stats: { Args: { mid: string }; Returns: undefined };
      release_verification_refund: { Args: { p_booking_id: string }; Returns: undefined };
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
      verification_fee_status: "unpaid" | "paid" | "waived";
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
      verification_fee_status: ["unpaid", "paid", "waived"],
    },
  },
} as const;
