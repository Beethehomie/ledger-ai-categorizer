
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTransactions } from './bookkeeping/useTransactions';
import { useVendors } from './bookkeeping/useVendors';
import { useFinancialSummary } from './bookkeeping/useFinancialSummary';
import { BookkeepingContextType, VendorItem } from './bookkeeping/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BankConnectionRow } from '@/types/supabase';
import { Category, Transaction, Vendor } from '@/types';
import { toast } from '@/utils/toast';
import { getCategories } from '@/utils/categoryAdapter';
import { logError } from '@/utils/errorLogger';
import { getBankAccountIdFromConnection } from '@/services/bookkeepingService';

const BookkeepingContext = createContext<BookkeepingContextType>({
  transactions: [],
  categories: [],
  vendors: [],
  financialSummary: {
    totalIncome: 0,
    totalExpenses: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    netProfit: 0,
    cashBalance: 0,
    income: 0
  },
  loading: false,
  aiAnalyzeLoading: false,
  bankConnections: [],
  addTransactions: async () => Promise.resolve([]),
  updateTransaction: async () => Promise.resolve(false),
  verifyTransaction: async () => Promise.resolve(),
  verifyVendor: async () => Promise.resolve(),
  uploadCSV: async () => Promise.resolve(),
  getFilteredTransactions: () => [],
  filterTransactionsByDate: () => [],
  getVendorsList: () => [],
  calculateFinancialSummary: () => {},
  analyzeTransactionWithAI: async () => Promise.resolve(null),
  getBankConnectionById: (id: string) => undefined,
  removeDuplicateVendors: async () => Promise.resolve(),
  fetchTransactionsForBankAccount: async () => Promise.resolve([]),
  batchVerifyVendorTransactions: async () => Promise.resolve(),
  fetchTransactions: async () => Promise.resolve(),
  findSimilarTransactions: (vendorName: string, allTransactions: Transaction[]) => Promise.resolve([]),
  deleteTransaction: async () => ({ success: false }),
  getBankAccountIdFromConnection: async () => null,
});

interface BookkeepingProviderProps {
  children: React.ReactNode;
}

export const BookkeepingProvider: React.FC<BookkeepingProviderProps> = ({ 
  children 
}) => {
  const { session } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankConnections, setBankConnections] = useState<BankConnectionRow[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (err) {
        logError('BookkeepingContext.loadCategories', err);
        toast.error('Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };
    
    loadCategories();
  }, []);
  
  useEffect(() => {
    if (!session) return;

    const fetchBankConnections = async () => {
      try {
        const { data, error } = await supabase
          .from('bank_connections')
          .select('*')
          .order('bank_name', { ascending: true });
          
        if (error) {
          logError('BookkeepingContext.fetchBankConnections', error);
          return;
        }
        
        if (data) {
          const transformedData: BankConnectionRow[] = data.map(conn => ({
            ...conn,
            display_name: conn.display_name || conn.bank_name
          }));
          setBankConnections(transformedData);
        }
      } catch (err) {
        logError('BookkeepingContext.fetchBankConnections', err);
      }
    };
    
    fetchBankConnections();
  }, [session]);
  
  const {
    transactions,
    loading: transactionsLoading,
    aiAnalyzeLoading,
    addTransactions,
    updateTransaction,
    analyzeTransactionWithAI,
    uploadCSV,
    getFilteredTransactions,
    filterTransactionsByDate,
    fetchTransactionsForBankAccount,
    getBankConnectionById,
    setTransactions,
    fetchTransactions: fetchTransactionsFromHook,
    deleteTransaction: deleteTransactionFromHook,
    getBankAccountIdFromConnection: getBankAccountIdFromConnectionHook
  } = useTransactions(bankConnections);
  
  const {
    vendors,
    loading: vendorsLoading,
    verifyVendor,
    verifyTransaction,
    batchVerifyVendorTransactions,
    removeDuplicateVendors,
    getVendorsList,
    findSimilarTransactions
  } = useVendors(transactions, updateTransaction);
  
  const {
    financialSummary,
    calculateFinancialSummary
  } = useFinancialSummary(transactions);
  
  const loading = transactionsLoading || vendorsLoading || loadingCategories;
  
  useEffect(() => {
    if (!session) return;
    
    const fetchAllTransactions = async () => {
      console.log('BookkeepingContext: Fetching transactions...');
      if (!session) {
        toast.error('You must be logged in to fetch transactions');
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('bank_transactions')
          .select('*')
          .order('date', { ascending: false });
          
        if (error) {
          console.error('Error fetching transactions:', error);
          toast.error('Failed to fetch transactions');
          return;
        }
        
        if (data) {
          const fetchedTransactions: Transaction[] = data.map((t) => {
            return {
              id: t.id,
              date: t.date,
              description: t.description,
              amount: Number(t.amount),
              category: t.category || undefined,
              type: t.type as Transaction['type'] || undefined,
              statementType: t.statement_type as Transaction['statementType'] || undefined,
              isVerified: t.is_verified || false,
              aiSuggestion: undefined,
              vendor: t.vendor || undefined,
              vendorVerified: t.vendor_verified || false,
              confidenceScore: t.confidence_score ? Number(t.confidence_score) : undefined,
              bankAccountId: t.bank_connection_id || undefined,
              bankAccountName: undefined,
              balance: t.balance || undefined,
              accountId: t.bank_connection_id || undefined // Using bank_connection_id as a fallback
            };
          });
          
          if (fetchedTransactions.length > 0) {
            for (const transaction of fetchedTransactions) {
              if (transaction.bankAccountId) {
                const bankConnection = bankConnections.find(conn => conn.id === transaction.bankAccountId);
                if (bankConnection) {
                  transaction.bankAccountName = bankConnection.display_name || bankConnection.bank_name;
                }
              }
            }
          }
          
          setTransactions(fetchedTransactions);
          
          setTimeout(() => calculateFinancialSummary(), 100);
          
          toast.success('Transactions refreshed successfully');
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        toast.error('Failed to refresh transactions');
      }
    };
    
    fetchAllTransactions();
  }, [session, bankConnections, calculateFinancialSummary, setTransactions]);
  
  // Wrapper for deleteTransaction that returns a success/error object
  const deleteTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await deleteTransactionFromHook(id);
      return { success: result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete transaction' };
    }
  };

  // Helper function to get account ID from connection, exporting for the interface
  const getBankAccountIdFromConnectionHelper = async (bankConnectionId: string): Promise<string | null> => {
    try {
      return await getBankAccountIdFromConnectionHook(bankConnectionId);
    } catch (err) {
      console.error('Error in getBankAccountIdFromConnection:', err);
      return null;
    }
  };
  
  const value: BookkeepingContextType = {
    transactions,
    categories,
    vendors,
    financialSummary,
    loading,
    aiAnalyzeLoading,
    bankConnections,
    addTransactions,
    updateTransaction,
    verifyTransaction,
    verifyVendor,
    uploadCSV,
    getFilteredTransactions,
    filterTransactionsByDate,
    getVendorsList,
    calculateFinancialSummary,
    analyzeTransactionWithAI,
    getBankConnectionById,
    removeDuplicateVendors,
    fetchTransactionsForBankAccount,
    batchVerifyVendorTransactions,
    fetchTransactions: fetchTransactionsFromHook,
    findSimilarTransactions,
    deleteTransaction,
    getBankAccountIdFromConnection: getBankAccountIdFromConnectionHelper,
  };

  return (
    <BookkeepingContext.Provider value={value}>
      {children}
    </BookkeepingContext.Provider>
  );
};

export const useBookkeeping = () => {
  const context = useContext(BookkeepingContext);
  if (context === undefined) {
    throw new Error('useBookkeeping must be used within a BookkeepingProvider');
  }
  return context;
};
