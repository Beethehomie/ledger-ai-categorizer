
import { Transaction } from '@/types';

export const useTransactionFilter = () => {
  const filterTransactions = (
    transactions: Transaction[],
    filter: 'all' | 'unverified' | 'profit_loss' | 'balance_sheet' | 'by_vendor' | 'review',
    vendorName?: string
  ) => {
    return transactions.filter(transaction => {
      if (filter === 'unverified') {
        return !transaction.isVerified;
      } else if (filter === 'profit_loss') {
        return transaction.statementType === 'profit_loss';
      } else if (filter === 'balance_sheet') {
        return transaction.statementType === 'balance_sheet';
      } else if (filter === 'by_vendor' && vendorName) {
        return transaction.vendor === vendorName;
      } else if (filter === 'review') {
        return transaction.confidenceScore !== undefined && 
               transaction.confidenceScore < 0.5 && 
               !transaction.isVerified;
      }
      return true;
    });
  };

  return { filterTransactions };
};
