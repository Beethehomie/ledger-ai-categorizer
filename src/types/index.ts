export type TransactionType = "income" | "expense" | "asset" | "liability" | "equity";
export type StatementType = "profit_loss" | "balance_sheet" | "operating";
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
  cashBalance: number;
}

export interface AIAnalysisResult {
  category: string;
  type: TransactionType;
  statementType: StatementType;
  confidence: number;
  vendorName: string;
  source: 'ai' | 'database';
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

export interface CurrencySettings {
  code: Currency;
  symbol: string;
  locale: string;
  decimalPlaces: number;
}

// Table column definition for column filtering
export interface TableColumn {
  id: string;
  name: string;
  visible: boolean;
}
