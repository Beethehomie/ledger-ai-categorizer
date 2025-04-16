
import { useState, useEffect, useCallback } from 'react';
import { FinancialSummary, Transaction } from '@/types';

export const useFinancialSummary = (transactions: Transaction[]) => {
  const initialFinancialSummary: FinancialSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    netProfit: 0,
    cashBalance: 0,
    income: 0, // Add this line
  };

  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(initialFinancialSummary);

  const calculateFinancialSummary = useCallback((): FinancialSummary => {
    const summary: FinancialSummary = { ...initialFinancialSummary };
    
    // Get the most recent balance from transactions with a balance property
    const transactionsWithBalance = transactions
      .filter(t => t.balance !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // If we have any transactions with a balance, use the most recent one as the starting point
    if (transactionsWithBalance.length > 0) {
      summary.cashBalance = transactionsWithBalance[0].balance || 0;
    }
    
    // Calculate other financial metrics
    transactions.forEach(transaction => {
      if (!transaction.isVerified) return;

      const amount = Math.abs(transaction.amount);
      
      switch(transaction.type) {
        case 'income':
          summary.totalIncome += amount;
          summary.income += amount; // Add this line
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
  }, [transactions]);

  // Make sure to recalculate whenever transactions change
  useEffect(() => {
    calculateFinancialSummary();
  }, [transactions, calculateFinancialSummary]);

  return {
    financialSummary,
    calculateFinancialSummary
  };
};
