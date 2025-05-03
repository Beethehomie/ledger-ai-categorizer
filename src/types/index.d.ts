
// This is a partial update to add the accountId field to the Transaction interface.
// We're assuming the Transaction interface exists in this file.

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  type?: 'income' | 'expense' | 'asset' | 'liability' | 'equity';
  statementType?: 'profit_loss' | 'balance_sheet';
  isVerified: boolean;
  aiSuggestion?: string;
  vendor?: string;
  vendorVerified?: boolean;
  confidenceScore?: number;
  bankAccountId?: string;
  bankAccountName?: string;
  balance?: number;
  accountId?: string; // Add this field
}
