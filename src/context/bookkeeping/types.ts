
import { Transaction, Vendor, Category, FinancialSummary } from "@/types";
import { BankConnectionRow } from "@/types/supabase";

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
  addTransactions: (transactions: Transaction[]) => Promise<Transaction[] | void>;
  updateTransaction: (transaction: Transaction) => Promise<boolean | void>;
  verifyTransaction: (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => Promise<void>;
  verifyVendor: (vendorName: string, approved: boolean) => Promise<void>;
  uploadCSV: (preparedTransactions: Transaction[], bankConnectionId?: string, initialBalance?: number, balanceDate?: Date, endBalance?: number) => Promise<void>;
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
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  getBankAccountIdFromConnection: (bankConnectionId: string) => Promise<string | null>;
}
