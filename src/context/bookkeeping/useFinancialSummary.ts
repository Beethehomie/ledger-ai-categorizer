
import { useState, useEffect } from 'react';
import { FinancialSummary, Transaction } from '@/types';
import { initialFinancialSummary } from './types';

export const useFinancialSummary = (transactions: Transaction[]) => {
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(initialFinancialSummary);

  const calculateFinancialSummary = () => {
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
          summary.cashBalance -= amount;
          break;
        case 'liability':
          summary.totalLiabilities += amount;
          summary.cashBalance += amount;
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

  useEffect(() => {
    calculateFinancialSummary();
  }, [transactions]);

  return {
    financialSummary,
    calculateFinancialSummary
  };
};
