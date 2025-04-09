

export type BankConnectionRow = {
  id: string;
  bank_name: string;
  connection_type: string;
  api_details: any;
  last_sync: string | null;
  user_id: string | null;
  active: boolean | null;
  created_at: string | null;
  display_name?: string;
}

export type VendorCategorizationRow = {
  id: string;
  vendor_name: string;
  category: string;
  type: string;
  statement_type: string;
  occurrences: number | null;
  confidence: number | null;
  verified: boolean | null;
  last_used: string | null;
  created_at: string | null;
}

