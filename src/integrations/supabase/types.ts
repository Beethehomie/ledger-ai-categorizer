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
      user_profiles: {
        Row: {
          business_context: Json | null
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
          id: string
          last_used: string | null
          occurrences: number | null
          statement_type: string
          type: string
          vendor_name: string
          verified: boolean | null
        }
        Insert: {
          category: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          last_used?: string | null
          occurrences?: number | null
          statement_type: string
          type: string
          vendor_name: string
          verified?: boolean | null
        }
        Update: {
          category?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          last_used?: string | null
          occurrences?: number | null
          statement_type?: string
          type?: string
          vendor_name?: string
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
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
