
import React, { createContext, useContext, useState } from 'react';
import { useTransactions } from './useTransactions';
import { useVendors } from './useVendors';
import { useFinancialSummary } from './useFinancialSummary';
import { BookkeepingContextType } from './types';
import { Category } from '@/types';

// Default categories to use
const defaultCategories: Category[] = [
  { id: '1', name: 'Sales', type: 'income', statementType: 'profit_loss', keywords: ['sales', 'revenue', 'income'] },
  { id: '2', name: 'Expenses', type: 'expense', statementType: 'profit_loss', keywords: ['expense', 'cost', 'fee'] },
  // Add more default categories as needed
];

const BookkeepingContext = createContext<BookkeepingContextType | undefined>(undefined);

export const BookkeepingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  
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
    financialSummary,
    calculateFinancialSummary
  } = useFinancialSummary(transactions);

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
