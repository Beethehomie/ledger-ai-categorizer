
// Basic type definitions
export type TransactionType = "income" | "expense" | "asset" | "liability" | "transfer" | "equity";
export type StatementType = "profit_loss" | "balance_sheet";
export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "CNY" | "INR";

// Transaction types
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  vendor?: string;
  category?: string;
  type?: TransactionType;
  statementType?: StatementType;
  isVerified: boolean;
  vendorVerified?: boolean;
  confidenceScore?: number;
  bankAccountId?: string;
  bankAccountName?: string;
  balance?: number;
  accountId?: string;
  aiSuggestion?: string;
}

// Vendor types
export interface Vendor {
  name: string;
  category?: string;
  type?: TransactionType;
  statementType?: StatementType;
  occurrences: number;
  verified: boolean;
}

export interface VendorItem {
  name: string;
  count: number;
  verified: boolean;
}

// Category types
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  statementType: StatementType;
  keywords?: string[];
}

// Financial data types
export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netProfit: number;
  cashBalance: number;
  income: number;
  expenses: number;
  netIncome: number;
  assets: number;
  liabilities: number;
  equity: number;
  categorizedExpenses: {[key: string]: number};
  categorizedIncome: {[key: string]: number};
  monthlyData: MonthlyFinancialData[];
}

export interface MonthlyFinancialData {
  month: string;
  income: number;
  expenses: number;
  netIncome: number;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category?: string;
}

// UI related types
export interface TableColumn {
  id: string;
  label: string;
  visible: boolean;
  name?: string; // Add name property since it's being used in the code
}

export interface Column {
  id: string;
  label: string;
  visible: boolean;
}

export interface ChartSectionProps {
  data: any[];
  title: string;
  description?: string;
  refreshing?: boolean; // Add refreshing property
}

export interface CurrencySettings {
  code: Currency;
  symbol: string;
  position: 'before' | 'after';
  dateFormat: string;
  locale: string;
  decimalPlaces?: number; // Add decimalPlaces property
}

// Embedding related types
export interface EmbeddingResult {
  id: string;
  similarity: number;
  vendor_name?: string;
  category?: string;
  type?: string;
  statement_type?: string;
  sample_description?: string;
  vendor?: string; // Add vendor property
}
