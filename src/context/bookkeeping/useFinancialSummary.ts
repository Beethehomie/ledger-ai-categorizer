
import { useState, useEffect, useCallback } from 'react';
import { FinancialSummary, Transaction } from '@/types';
import { initialFinancialSummary } from './types';

export const useFinancialSummary = (transactions: Transaction[]) => {
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
