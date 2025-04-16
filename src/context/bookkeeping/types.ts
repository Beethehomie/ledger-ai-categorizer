
import { Transaction, Category, FinancialSummary } from '@/types';
import { BankConnectionRow } from '@/types/supabase';

export const initialFinancialSummary: FinancialSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  netProfit: 0,
  cashBalance: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  totalEquity: 0
};

export interface BookkeepingContextType {
  transactions: Transaction[];
  categories: Category[];
  vendors: string[];
  financialSummary: FinancialSummary;
  loading: boolean;
  aiAnalyzeLoading: boolean;
  bankConnections: BankConnectionRow[];
  
  addTransactions: (transactions: Transaction[]) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  verifyTransaction: (transactionId: string, verified: boolean) => Promise<void>;
  verifyVendor: (vendorName: string, verified: boolean) => Promise<void>;
  uploadCSV: (csvString: string, bankAccountId?: string, initialBalance?: number, balanceDate?: Date, endBalance?: number) => Promise<void>;
  getFilteredTransactions: (statementType?: Transaction['statementType'], verified?: boolean, vendor?: string) => Transaction[];
  filterTransactionsByDate: (startDate?: Date, endDate?: Date) => Transaction[];
  getVendorsList: () => string[];
  calculateFinancialSummary: () => any;
  analyzeTransactionWithAI: (transaction: Transaction) => Promise<any>;
  getBankConnectionById: (id: string) => BankConnectionRow | undefined;
  removeDuplicateVendors: () => Promise<void>;
  fetchTransactionsForBankAccount: (bankAccountId: string) => Promise<Transaction[]>;
  batchVerifyVendorTransactions: (vendorName: string, verified: boolean) => Promise<void>;
  fetchTransactions: () => Promise<void>;
}
