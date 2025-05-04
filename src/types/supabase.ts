
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bank_transactions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          vendor: string | null;
          category: string | null;
          type: string | null;
          statement_type: string | null;
          is_verified: boolean | null;
          vendor_verified: boolean | null;
          confidence_score: number | null;
          embedding: number[] | null;
          bank_account_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          vendor?: string | null;
          category?: string | null;
          type?: string | null;
          statement_type?: string | null;
          is_verified?: boolean | null;
          vendor_verified?: boolean | null;
          confidence_score?: number | null;
          embedding?: number[] | null;
          bank_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          description?: string;
          amount?: number;
          vendor?: string | null;
          category?: string | null;
          type?: string | null;
          statement_type?: string | null;
          is_verified?: boolean | null;
          vendor_verified?: boolean | null;
          confidence_score?: number | null;
          embedding?: number[] | null;
          bank_account_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
          subscription_tier: string;
          is_admin: boolean;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
          updated_at?: string;
          subscription_tier?: string;
          is_admin?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
          subscription_tier?: string;
          is_admin?: boolean;
        };
      };
      vendor_categorizations: {
        Row: {
          id: string;
          vendor_name: string;
          category: string | null;
          type: string | null;
          statement_type: string | null;
          sample_description: string | null;
          occurrences: number | null;
          verified: boolean | null;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
          last_used: string | null;
        };
        Insert: {
          id?: string;
          vendor_name: string;
          category?: string | null;
          type?: string | null;
          statement_type?: string | null;
          sample_description?: string | null;
          occurrences?: number | null;
          verified?: boolean | null;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
          last_used?: string | null;
        };
        Update: {
          id?: string;
          vendor_name?: string;
          category?: string | null;
          type?: string | null;
          statement_type?: string | null;
          sample_description?: string | null;
          occurrences?: number | null;
          verified?: boolean | null;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
          last_used?: string | null;
        };
      };
    };
  };
};

export type BankTransactionRow = Database['public']['Tables']['bank_transactions']['Row'];
export type VendorCategorizationRow = Database['public']['Tables']['vendor_categorizations']['Row'];
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
