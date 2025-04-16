
import { useState, useEffect, useCallback } from 'react';
import { FinancialSummary, Transaction } from '@/types';
import { initialFinancialSummary } from './types';

export const useFinancialSummary = (transactions: Transaction[]) => {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(initialFinancialSummary);

  const calculateFinancialSummary = useCallback((): FinancialSummary => {
    const summary: FinancialSummary = { ...initialFinancialSummary };

    transactions.forEach(transaction => {
      if (!transaction.isVerified) return;

      const amount = Math.abs(transaction.amount);
      
      switch(transaction.type) {
        case 'income':
          summary.totalIncome += amount;
          summary.cashBalance += amount;
          break;
        case 'expense':
          summary.totalExpenses += amount;
          summary.cashBalance -= amount;
          break;
        case 'asset':
          summary.totalAssets += amount;
          // For asset purchases, we reduce cash balance
          if (transaction.amount < 0) {
            summary.cashBalance -= amount;
          } else {
            // For asset sales, we increase cash balance
            summary.cashBalance += amount;
          }
          break;
        case 'liability':
          summary.totalLiabilities += amount;
          // For increased liabilities (e.g., taking a loan), we increase cash
          if (transaction.amount > 0) {
            summary.cashBalance += amount;
          } else {
            // For decreased liabilities (e.g., paying off debt), we decrease cash
            summary.cashBalance -= amount;
          }
          break;
        case 'equity':
          summary.totalEquity += amount;
          // For equity investments, we increase cash
          if (transaction.amount > 0) {
            summary.cashBalance += amount;
          } else {
            // For equity withdrawals, we decrease cash
            summary.cashBalance -= amount;
          }
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
