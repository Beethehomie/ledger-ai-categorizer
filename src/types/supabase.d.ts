
// Add to existing types
export type BusinessContext = {
  country: string;
  industry: string;
  businessSize: string;
  paymentMethods: string[];
  currency: string;
  additionalInfo?: string;
};

export type BankConnectionRow = {
  id: string;
  bank_name: string;
  connection_type: string;
  user_id?: string;
  display_name?: string;
  api_details?: any;
  last_sync?: string;
  active?: boolean;
  created_at?: string;
};

// Add a type for vendor categorization row
export type VendorCategorizationRow = {
  id: string;
  vendor_name: string;
  category: string;
  type: string;
  statement_type: string;
  occurrences: number;
  verified: boolean;
  last_used?: string;
  created_at?: string;
  confidence?: number;
  sample_description?: string;
  embedding?: number[];
};
