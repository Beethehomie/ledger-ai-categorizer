
import { Transaction } from '@/types';

export const calculateRunningBalance = (
  transactions: Transaction[],
  initialBalance = 0,
  balanceDate?: Date
): Transaction[] => {
  if (!transactions.length) return [];

  // Sort transactions by date (ascending)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  let runningBalance = initialBalance;

  // Calculate running balance
  return sortedTransactions.map((transaction) => {
    runningBalance += transaction.amount;
    return {
      ...transaction,
      balance: runningBalance
    };
  });
};

export const isCSVFormatValid = (csvData: string): boolean => {
  // Check if the CSV has required columns
  const lines = csvData.split('\n');
  if (lines.length < 2) return false;
  
  const header = lines[0].toLowerCase();
  
  // Check for required columns
  return header.includes('date') && 
         (header.includes('amount') || header.includes('debit') || header.includes('credit')) && 
         (header.includes('description') || header.includes('memo') || header.includes('notes'));
};

export const exportToCSV = (transactions: Transaction[]): string => {
  // Define the CSV header
  const header = ['Date', 'Description', 'Amount', 'Category', 'Type', 'Statement Type', 'Vendor', 'Verified'];
  
  // Format each transaction into a CSV row
  const rows = transactions.map(transaction => [
    transaction.date,
    `"${transaction.description.replace(/"/g, '""')}"`, // Escape quotes in description
    transaction.amount.toString(),
    transaction.category || '',
    transaction.type || '',
    transaction.statementType || '',
    transaction.vendor || '',
    transaction.isVerified ? 'Yes' : 'No'
  ]);
  
  // Combine header and rows
  const csvContent = [header.join(',')].concat(rows.map(row => row.join(','))).join('\n');
  
  return csvContent;
};

export const isBalanceReconciled = (
  transactions: Transaction[],
  expectedEndBalance: number
): boolean => {
  if (!transactions.length) return false;
  
  // Find the most recent transaction with a balance
  const transactionsWithBalance = transactions.filter(t => t.balance !== undefined);
  if (!transactionsWithBalance.length) return false;
  
  // Sort by date descending
  const sortedTransactions = [...transactionsWithBalance].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  const lastTransaction = sortedTransactions[0];
  const currentBalance = lastTransaction.balance || 0;
  
  // Check if the balance is close enough (within 0.01 to account for rounding)
  return Math.abs(currentBalance - expectedEndBalance) < 0.01;
};
