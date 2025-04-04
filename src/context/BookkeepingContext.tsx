import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Transaction, Category, FinancialSummary } from '../types';
import { mockTransactions, mockCategories } from '../data/mockData';
import { parseCSV, categorizeByCriteria, analyzeTransactionWithAI } from '../utils/csvParser';
import { toast } from '@/utils/toast';

interface BookkeepingContextType {
  transactions: Transaction[];
  categories: Category[];
  financialSummary: FinancialSummary;
  loading: boolean;
  addTransactions: (newTransactions: Transaction[]) => void;
  updateTransaction: (updatedTransaction: Transaction) => void;
  verifyTransaction: (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => void;
  uploadCSV: (csvString: string) => void;
  getFilteredTransactions: (
    statementType?: Transaction['statementType'], 
    verified?: boolean
  ) => Transaction[];
  calculateFinancialSummary: () => void;
}

const initialFinancialSummary: FinancialSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  totalEquity: 0,
  netProfit: 0,
};

const BookkeepingContext = createContext<BookkeepingContextType | undefined>(undefined);

export const BookkeepingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(initialFinancialSummary);
  const [loading, setLoading] = useState<boolean>(false);

  const calculateFinancialSummary = () => {
    const summary: FinancialSummary = {
      totalIncome: 0,
      totalExpenses: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      netProfit: 0,
    };

    transactions.forEach(transaction => {
      if (!transaction.isVerified) return;

      const amount = Math.abs(transaction.amount);
      
      switch(transaction.type) {
        case 'income':
          summary.totalIncome += amount;
          break;
        case 'expense':
          summary.totalExpenses += amount;
          break;
        case 'asset':
          summary.totalAssets += amount;
          break;
        case 'liability':
          summary.totalLiabilities += amount;
          break;
        case 'equity':
          summary.totalEquity += amount;
          break;
      }
    });

    summary.netProfit = summary.totalIncome - summary.totalExpenses;
    
    setFinancialSummary(summary);
    return summary;
  };

  const addTransactions = (newTransactions: Transaction[]) => {
    setTransactions(prev => [...prev, ...newTransactions]);
    calculateFinancialSummary();
    toast.success(`Added ${newTransactions.length} transactions`);
  };

  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => 
      prev.map(transaction => 
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction
      )
    );
    calculateFinancialSummary();
  };

  const verifyTransaction = (id: string, category: string, type: Transaction['type'], statementType: Transaction['statementType']) => {
    setTransactions(prev => 
      prev.map(transaction => 
        transaction.id === id 
          ? { 
              ...transaction, 
              category, 
              type, 
              statementType, 
              isVerified: true 
            } 
          : transaction
      )
    );
    calculateFinancialSummary();
    toast.success('Transaction verified');
  };

  const uploadCSV = (csvString: string) => {
    setLoading(true);
    try {
      const parsedTransactions = parseCSV(csvString);
      
      // Process with AI for uncategorized transactions
      const processedTransactions = parsedTransactions.map(transaction => {
        if (!transaction.category) {
          const aiResult = analyzeTransactionWithAI(transaction);
          return {
            ...transaction,
            aiSuggestion: aiResult.aiSuggestion
          };
        }
        return transaction;
      });
      
      addTransactions(processedTransactions);
      toast.success(`Successfully processed ${processedTransactions.length} transactions`);
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error('Error processing CSV file');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransactions = (
    statementType?: Transaction['statementType'], 
    verified?: boolean
  ) => {
    return transactions.filter(transaction => {
      let include = true;
      
      if (statementType !== undefined) {
        include = include && transaction.statementType === statementType;
      }
      
      if (verified !== undefined) {
        include = include && transaction.isVerified === verified;
      }
      
      return include;
    });
  };

  React.useEffect(() => {
    calculateFinancialSummary();
  }, []);

  const value = {
    transactions,
    categories,
    financialSummary,
    loading,
    addTransactions,
    updateTransaction,
    verifyTransaction,
    uploadCSV,
    getFilteredTransactions,
    calculateFinancialSummary,
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
