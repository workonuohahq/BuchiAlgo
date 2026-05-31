export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: number;
          alphanumeric_id: string;
          join_verified: boolean;
          verified_at: string | null;
          scan_credits: number;
          referred_by: string | null;
          is_premium: boolean;
          premium_until: string | null;
          created_at: string;
          updated_at: string;
          role: "user" | "admin";
        };
        Insert: {
          id?: string;
          telegram_id: number;
          alphanumeric_id: string;
          join_verified?: boolean;
          verified_at?: string | null;
          scan_credits?: number;
          referred_by?: string | null;
          is_premium?: boolean;
          premium_until?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: "user" | "admin";
        };
        Update: {
          id?: string;
          telegram_id?: number;
          alphanumeric_id?: string;
          join_verified?: boolean;
          verified_at?: string | null;
          scan_credits?: number;
          referred_by?: string | null;
          is_premium?: boolean;
          premium_until?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: "user" | "admin";
        };
      };
      system_config: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
      };
      subscription_tiers: {
        Row: {
          id: string;
          name: string;
          price: number;
          billing_cycle: string;
          scan_limit: number;
          features: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          billing_cycle: string;
          scan_limit: number;
          features: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          billing_cycle?: string;
          scan_limit?: number;
          features?: string[];
          is_active?: boolean;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          provider_type: "paystack" | "nowpayments" | "manual";
          provider_tx_id: string | null;
          amount: number;
          status: "pending" | "completed" | "failed";
          proof_image_url: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider_type: "paystack" | "nowpayments" | "manual";
          provider_tx_id?: string | null;
          amount: number;
          status?: "pending" | "completed" | "failed";
          proof_image_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider_type?: "paystack" | "nowpayments" | "manual";
          provider_tx_id?: string | null;
          amount?: number;
          status?: "pending" | "completed" | "failed";
          proof_image_url?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      affiliate_applications: {
        Row: {
          id: string;
          user_id: string;
          form_data: Json;
          status: "pending" | "approved" | "rejected";
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          form_data: Json;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          form_data?: Json;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
        };
      };
      payout_requests: {
        Row: {
          id: string;
          affiliate_id: string;
          amount: number;
          status: "pending" | "paid";
          routing_data: Json;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          affiliate_id: string;
          amount: number;
          status?: "pending" | "paid";
          routing_data: Json;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          affiliate_id?: string;
          amount?: number;
          status?: "pending" | "paid";
          routing_data?: Json;
          processed_at?: string | null;
          created_at?: string;
        };
      };
      referral_tracking: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          credits_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          credits_awarded: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          credits_awarded?: number;
          created_at?: string;
        };
      };
      broadcast_messages: {
        Row: {
          id: string;
          admin_id: string;
          message: string;
          filters: Json;
          status: "pending" | "sending" | "completed" | "failed";
          sent_count: number;
          failed_count: number;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          admin_id: string;
          message: string;
          filters: Json;
          status?: "pending" | "sending" | "completed" | "failed";
          sent_count?: number;
          failed_count?: number;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          admin_id?: string;
          message?: string;
          filters?: Json;
          status?: "pending" | "sending" | "completed" | "failed";
          sent_count?: number;
          failed_count?: number;
          created_at?: string;
          sent_at?: string | null;
        };
      };
    };
  };
}
