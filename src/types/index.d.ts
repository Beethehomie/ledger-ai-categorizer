
export type TransactionType = "income" | "expense" | "asset" | "liability" | "equity";
export type StatementType = "profit_loss" | "balance_sheet"; // Removed "operating" as it's not used
export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "CNY" | "INR";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
  type?: TransactionType;
  statementType?: StatementType;
  isVerified: boolean;
  aiSuggestion?: string;
  vendor?: string;
  vendorVerified?: boolean;
  confidenceScore?: number;
  bankAccountId?: string;
  bankAccountName?: string;
  balance?: number; // Running balance field
  accountId?: string; // Add accountId field for RLS policy
}
