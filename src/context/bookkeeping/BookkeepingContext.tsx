
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { mockCategories } from '@/data/mockData';
import { Category, Transaction } from '@/types';
import { useTransactions } from './useTransactions';
import { useVendors } from './useVendors';
import { useFinancialSummary } from './useFinancialSummary';
import { BookkeepingContextType } from './types';
import { useAuth } from '../AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BankConnectionRow } from '@/types/supabase';

const BookkeepingContext = createContext<BookkeepingContextType | undefined>(undefined);

export const BookkeepingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [bankConnections, setBankConnections] = useState<BankConnectionRow[]>([]);
  
  // Fetch bank connections
  useEffect(() => {
    if (!session) return;

    const fetchBankConnections = async () => {
      try {
        const { data, error } = await supabase
          .from('bank_connections')
          .select('*')
          .order('bank_name', { ascending: true });
          
        if (error) {
          console.error('Error fetching bank connections:', error);
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
        console.error('Error in fetchBankConnections:', err);
      }
    };
    
    fetchBankConnections();
  }, [session]);
  
  // Initialize hooks
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
    setTransactions
  } = useTransactions(bankConnections);
  
  const {
    vendors,
    loading: vendorsLoading,
    verifyVendor,
    verifyTransaction,
    batchVerifyVendorTransactions,
    removeDuplicateVendors,
    getVendorsList
  } = useVendors(transactions, updateTransaction);
  
  const {
    financialSummary,
    calculateFinancialSummary
  } = useFinancialSummary(transactions);
  
  // Combine loading states
  const loading = transactionsLoading || vendorsLoading;
  
  // Construct the context value
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
