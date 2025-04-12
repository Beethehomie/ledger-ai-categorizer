
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bank_connections: {
        Row: {
          active: boolean
          api_details: Json | null
          bank_name: string
          connection_type: string
          created_at: string
          id: string
          last_sync: string | null
          user_id: string
          display_name: string | null
        }
        Insert: {
          active?: boolean
          api_details?: Json | null
          bank_name: string
          connection_type: string
          created_at?: string
          id?: string
          last_sync?: string | null
          user_id: string
          display_name?: string | null
        }
        Update: {
          active?: boolean
          api_details?: Json | null
          bank_name?: string
          connection_type?: string
          created_at?: string
          id?: string
          last_sync?: string | null
          user_id?: string
          display_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_connections_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      vendor_categorizations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          last_used: string | null
          occurrences: number | null
          statement_type: string | null
          type: string | null
          vendor_name: string
          verified: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          last_used?: string | null
          occurrences?: number | null
          statement_type?: string | null
          type?: string | null
          vendor_name: string
          verified?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          last_used?: string | null
          occurrences?: number | null
          statement_type?: string | null
          type?: string | null
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & { row: any })
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] & { row: any })
    : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & { row: any })
      ? PublicTableNameOrOptions
      : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] & { row: any })[TableName]["Row"]
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & { row: any })
    ? (Database["public"]["Tables"] & { row: any })[TableName]["Row"]
    : never

export type VendorCategorizationRow = Tables<'vendor_categorizations'>;
export interface BankConnectionRow {
  id: string;
  active: boolean;
  api_details: Json;
  bank_name: string;
  connection_type: string;
  created_at: string;
  last_sync: string | null;
  user_id: string;
  display_name: string | null;
}
