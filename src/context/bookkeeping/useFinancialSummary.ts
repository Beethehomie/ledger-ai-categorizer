
import { useState, useCallback } from 'react';
import { Transaction, Category, FinancialSummary, CategoryExpense } from '@/types';

export const useFinancialSummary = (transactions: Transaction[]) => {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    netProfit: 0,
    cashBalance: 0,
    income: 0,
    expenses: 0,
    netIncome: 0,
    expensesByCategory: []
  });
  
  const calculateFinancialSummary = useCallback(() => {
    // Only include verified transactions in financial calculations
    const verifiedTransactions = transactions.filter(t => t.isVerified);
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    // For expense categories breakdown
    const expensesByCategory: Record<string, number> = {};
    
    verifiedTransactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount || 0);
      
      if (transaction.type === 'income') {
        totalIncome += amount;
      } else if (transaction.type === 'expense') {
        totalExpenses += amount;
        
        // Aggregate expenses by category
        const category = transaction.category || 'Uncategorized';
        expensesByCategory[category] = (expensesByCategory[category] || 0) + amount;
      } else if (transaction.type === 'asset') {
        totalAssets += amount;
      } else if (transaction.type === 'liability') {
        totalLiabilities += amount;
      } else if (transaction.type === 'equity') {
        totalEquity += amount;
      }
    });
    
    // Convert expense categories to array format
    const expensesByCategoryArray: CategoryExpense[] = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    
    const netIncome = totalIncome - totalExpenses;
    const cashBalance = totalAssets - totalLiabilities + totalEquity;
    
    const summary: FinancialSummary = {
      totalIncome,
      totalExpenses,
      totalAssets,
      totalLiabilities,
      totalEquity,
      netProfit: netIncome,
      cashBalance,
      income: totalIncome,
      expenses: totalExpenses,
      netIncome,
      expensesByCategory: expensesByCategoryArray
    };
    
    setFinancialSummary(summary);
    return summary;
  }, [transactions]);
  
  return { financialSummary, calculateFinancialSummary };
};
