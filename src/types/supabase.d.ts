
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Type for the bank connection row
export interface BankConnectionRow {
  id: string;
  bank_name: string;
  connection_type: string;
  user_id?: string;
  display_name?: string;
  api_details?: any;
  last_sync?: string;
  active?: boolean;
  created_at?: string;
}

// Type for business context
export interface BusinessContext {
  country: string;
  industry: string;
  businessSize: string;
  paymentMethods: string[];
  currency: string;
  additionalInfo?: string;
}

// Type for vendor categorization row
export interface VendorCategorizationRow {
  id: string;
  vendor_name: string;
  category: string | null;
  type: string | null;
  statement_type: string | null;
  occurrences: number | null;
  verified: boolean | null;
  last_used?: string | null;
  created_at: string;
  updated_at: string;
  sample_description?: string | null;
  embedding?: number[];
  confidence?: number;
}

export interface BankTransactionRow {
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
}

export interface UserProfileRow {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  subscription_tier: string;
  is_admin: boolean;
}
