
import React, { createContext, useContext } from 'react';
import { useTransactions } from './bookkeeping/useTransactions';
import { useVendors } from './bookkeeping/useVendors';
import { useFinancialSummary } from './bookkeeping/useFinancialSummary';
import { BookkeepingContextType } from './bookkeeping/types';

const BookkeepingContext = createContext<BookkeepingContextType | undefined>(undefined);

export const BookkeepingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    transactions,
    loading,
    aiAnalyzeLoading,
    bankConnections,
    addTransactions,
    updateTransaction,
    analyzeTransactionWithAI,
    uploadCSV,
    getFilteredTransactions,
    filterTransactionsByDate,
    fetchTransactionsForBankAccount,
    getBankConnectionById,
    deleteTransaction,
    fetchTransactions
  } = useTransactions([]);

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
    categories,
    financialSummary,
    calculateFinancialSummary
  } = useFinancialSummary(transactions, categories || []);

  const value: BookkeepingContextType = {
    transactions,
    categories,
    vendors,
    financialSummary,
    loading: loading || vendorsLoading,
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
    deleteTransaction
  };

  return (
    <BookkeepingContext.Provider value={value}>
      {children}
    </BookkeepingContext.Provider>
  );
};

export const useBookkeeping = (): BookkeepingContextType => {
  const context = useContext(BookkeepingContext);
  if (context === undefined) {
    throw new Error('useBookkeeping must be used within a BookkeepingProvider');
  }
  return context;
};
