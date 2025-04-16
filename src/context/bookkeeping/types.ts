
import { Transaction as BaseTransaction, Category, FinancialSummary, Vendor, TransactionType, StatementType } from '@/types';
import { BankConnectionRow, BankTransactionRow, VendorCategorizationRow } from '@/types/supabase';

export interface BookkeepingContextType {
  transactions: BaseTransaction[];
  categories: Category[];
  vendors: Vendor[];
  financialSummary: FinancialSummary;
  loading: boolean;
  aiAnalyzeLoading: boolean;
  bankConnections: BankConnectionRow[];
  addTransactions: (newTransactions: BaseTransaction[]) => void;
  updateTransaction: (updatedTransaction: BaseTransaction) => void;
  verifyTransaction: (id: string, category: string, type: BaseTransaction['type'], statementType: BaseTransaction['statementType']) => void;
  verifyVendor: (vendorName: string, approved: boolean) => void;
  uploadCSV: (csvString: string, bankConnectionId?: string, initialBalance?: number, balanceDate?: Date, endBalance?: number) => void;
  getFilteredTransactions: (
    statementType?: BaseTransaction['statementType'], 
    verified?: boolean,
    vendor?: string
  ) => BaseTransaction[];
  filterTransactionsByDate: (
    startDate?: Date,
    endDate?: Date
  ) => BaseTransaction[];
  getVendorsList: () => { name: string; count: number; verified: boolean; }[];
  calculateFinancialSummary: () => void;
  analyzeTransactionWithAI: (transaction: BaseTransaction) => Promise<any>;
  getBankConnectionById: (id: string) => BankConnectionRow | undefined;
  removeDuplicateVendors: () => Promise<boolean>;
  fetchTransactionsForBankAccount: (bankAccountId: string) => Promise<BaseTransaction[]>;
  batchVerifyVendorTransactions: (vendorName: string, category: string, type: BaseTransaction['type'], statementType: BaseTransaction['statementType']) => void;
  fetchTransactions: () => Promise<void>;
}

export const initialFinancialSummary: FinancialSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  totalEquity: 0,
  netProfit: 0,
  cashBalance: 0,
};
