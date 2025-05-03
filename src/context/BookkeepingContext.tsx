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
import { deleteTransaction as deleteTransactionService } from '@/services/vendorService';

const BookkeepingContext = createContext<BookkeepingContextType | undefined>(undefined);

export const BookkeepingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    fetchTransactions: fetchTransactionsFromHook
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
  
  const fetchTransactions = async (): Promise<void> => {
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
      
      const fetchedTransactions: Transaction[] = data.map((t) => ({
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
      }));
      
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
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast.error('Failed to refresh transactions');
    }
  };

  // Add a wrapper for deleteTransaction to match the signature in the interface
  const deleteTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const success = await deleteTransactionService(id);
      if (success) {
        return { success: true };
      }
      return { success: false, error: 'Failed to delete transaction' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
    fetchTransactions,
    findSimilarTransactions,
    deleteTransaction,
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
