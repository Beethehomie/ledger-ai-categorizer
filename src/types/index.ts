
export type TransactionType = "income" | "expense" | "asset" | "liability" | "equity";
export type StatementType = "profit_loss" | "balance_sheet";

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
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  statementType: StatementType;
  keywords: string[];
}

export interface Vendor {
  name: string;
  category: string;
  type: TransactionType;
  statementType: StatementType;
  occurrences: number;
  verified: boolean;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netProfit: number;
}

export interface BankConnection {
  id: string;
  bank_name: string;
  connection_type: string;
  api_details: any;
  last_sync: string | null;
}

export interface AIAnalysisResult {
  category: string;
  type: TransactionType;
  statementType: StatementType;
  confidence: number;
  vendorName: string;
  source: 'ai' | 'database';
}
