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
  accountId?: string; // Account ID field for bank account reference
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  statementType: StatementType;
  keywords: string[];
  // Removed icon property as it was causing TypeScript errors
}

export interface Vendor {
  name: string;
  category: string;
  type: TransactionType;
  statementType: StatementType;
  occurrences: number;
  verified: boolean;
}

export interface VendorItem {
  name: string;
  count: number;
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
  income: number;
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
  label: string; // This field is required by the Column interface
  visible: boolean;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
}

export interface InitialBalanceInput {
  amount: number;
  date: string;
}

// Define component props that need refreshing status
export interface RefreshableComponentProps {
  refreshing?: boolean;
}

// Add explicit interfaces for our components that use the RefreshableComponentProps
export interface FinancialSummaryProps extends RefreshableComponentProps {}
export interface ChartSectionProps extends RefreshableComponentProps {}

export interface Column {
  id: string;
  label: string;
  visible: boolean;
}

export default {}; // Added to make it a module
