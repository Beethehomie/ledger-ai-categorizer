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
      ai_usage_stats: {
        Row: {
          created_at: string
          error_message: string | null
          function_name: string
          id: string
          model: string | null
          request_type: string | null
          status: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          model?: string | null
          request_type?: string | null
          status?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          model?: string | null
          request_type?: string | null
          status?: string | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_id: string
          account_name: string
          created_at: string
          current_balance: number
          starting_balance: number
          starting_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          account_name: string
          created_at?: string
          current_balance?: number
          starting_balance?: number
          starting_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_name?: string
          created_at?: string
          current_balance?: number
          starting_balance?: number
          starting_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          active: boolean | null
          api_details: Json | null
          bank_name: string
          connection_type: string
          created_at: string | null
          display_name: string | null
          id: string
          last_sync: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          api_details?: Json | null
          bank_name: string
          connection_type: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_sync?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          api_details?: Json | null
          bank_name?: string
          connection_type?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_sync?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          account_id: string | null
          amount: number
          balance: number | null
          bank_connection_id: string | null
          category: string | null
          confidence_score: number | null
          created_at: string | null
          date: string
          description: string
          embedding: string | null
          id: string
          is_verified: boolean | null
          statement_type: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          vendor: string | null
          vendor_verified: boolean | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          balance?: number | null
          bank_connection_id?: string | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          date: string
          description: string
          embedding?: string | null
          id?: string
          is_verified?: boolean | null
          statement_type?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor?: string | null
          vendor_verified?: boolean | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          balance?: number | null
          bank_connection_id?: string | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          date?: string
          description?: string
          embedding?: string | null
          id?: string
          is_verified?: boolean | null
          statement_type?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor?: string | null
          vendor_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      business_insights: {
        Row: {
          ai_processing_status: string
          ai_summary: string | null
          business_model: string | null
          created_at: string
          description: string | null
          error_log: Json | null
          id: string
          industry: string | null
          previous_versions: Json | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ai_processing_status?: string
          ai_summary?: string | null
          business_model?: string | null
          created_at?: string
          description?: string | null
          error_log?: Json | null
          id?: string
          industry?: string | null
          previous_versions?: Json | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          ai_processing_status?: string
          ai_summary?: string | null
          business_model?: string | null
          created_at?: string
          description?: string | null
          error_log?: Json | null
          id?: string
          industry?: string | null
          previous_versions?: Json | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          business_context: Json | null
          business_insight: Json | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          business_context?: Json | null
          business_insight?: Json | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          business_context?: Json | null
          business_insight?: Json | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_categorizations: {
        Row: {
          category: string
          confidence: number | null
          created_at: string | null
          embedding: string | null
          id: string
          last_used: string | null
          occurrences: number | null
          sample_description: string | null
          statement_type: string
          type: string
          vendor_name: string
          verified: boolean | null
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          last_used?: string | null
          occurrences?: number | null
          sample_description?: string | null
          statement_type: string
          type: string
          vendor_name: string
          verified?: boolean | null
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          last_used?: string | null
          occurrences?: number | null
          sample_description?: string | null
          statement_type?: string
          type?: string
          vendor_name?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      vendor_embeddings: {
        Row: {
          description: string
          embedding: string | null
          id: string
          vendor_name: string
        }
        Insert: {
          description: string
          embedding?: string | null
          id?: string
          vendor_name: string
        }
        Update: {
          description?: string
          embedding?: string | null
          id?: string
          vendor_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      get_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_vendors_by_embedding: {
        Args:
          | { embedding: string }
          | {
              param1: Database["public"]["CompositeTypes"]["type1"]
              param2: Database["public"]["CompositeTypes"]["type2"]
            }
          | { parameter_name: string }
          | {
              query_embedding: string
              match_threshold: number
              match_count: number
            }
        Returns: {
          id: string
          vendor_name: string
          category: string
          type: string
          sample_description: string
          statement_type: string
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      type1: {
        field1: string | null
        field2: number | null
      }
      type2: {
        field1: string | null
        field2: number | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
