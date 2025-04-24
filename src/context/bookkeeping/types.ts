
import { Transaction, Category, Vendor, FinancialSummary } from '@/types';
import { BankConnectionRow } from '@/types/supabase';

export interface VendorItem {
  name: string;
  count: number;
  verified: boolean;
}

export interface BookkeepingContextType {
  transactions: Transaction[];
  categories: Category[];
  vendors: Vendor[];
  financialSummary: FinancialSummary;
  loading: boolean;
  aiAnalyzeLoading: boolean;
  bankConnections: BankConnectionRow[];
  addTransactions: (newTransactions: Transaction[]) => Promise<void>;
  updateTransaction: (updatedTransaction: Transaction) => Promise<void>;
  verifyTransaction: (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => Promise<void>;
  verifyVendor: (vendorName: string, approved: boolean) => Promise<void>;
  uploadCSV: (csvString: string, bankConnectionId?: string, initialBalance?: number, balanceDate?: Date, endBalance?: number) => Promise<void>;
  getFilteredTransactions: (statementType?: Transaction['statementType'], verified?: boolean, vendor?: string) => Transaction[];
  filterTransactionsByDate: (startDate?: Date, endDate?: Date) => Transaction[];
  getVendorsList: () => VendorItem[];
  calculateFinancialSummary: () => void;
  analyzeTransactionWithAI: (transaction: Transaction) => Promise<any>;
  getBankConnectionById: (id: string) => BankConnectionRow | undefined;
  removeDuplicateVendors: () => Promise<void>;
  fetchTransactionsForBankAccount: (bankAccountId: string) => Promise<Transaction[]>;
  batchVerifyVendorTransactions: (vendorName: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => Promise<void>;
  fetchTransactions: () => Promise<void>;
  findSimilarTransactions: (vendorName: string, allTransactions: Transaction[]) => Promise<Transaction[]>;
  deleteTransaction: (transactionId: string) => Promise<{ success: boolean, error?: string }>;
}
