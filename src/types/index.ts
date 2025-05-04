
export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  vendor?: string;
  category?: string;
  type?: 'income' | 'expense' | 'transfer' | 'asset' | 'liability';
  statementType?: 'profit_loss' | 'balance_sheet';
  isVerified?: boolean;
  vendorVerified?: boolean;
  confidenceScore?: number;
  bankAccountId?: string;
  balance?: number;
};

export type Vendor = {
  name: string;
  category?: string;
  type?: Transaction['type'];
  statementType?: Transaction['statementType'];
  occurrences: number;
  verified: boolean;
};

export type VendorItem = {
  name: string;
  count: number;
  verified: boolean;
};

export type EmbeddingResult = {
  id: string;
  similarity: number;
  vendor_name?: string;
  category?: string;
  type?: string;
  statement_type?: string;
  sample_description?: string;
};
