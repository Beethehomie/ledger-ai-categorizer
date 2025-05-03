
import { Transaction } from '@/types';
import Papa from 'papaparse';

export interface CSVParseResult {
  transactions: Transaction[];
  warnings?: string[];
}

export const parseCSV = (csvData: string): Promise<CSVParseResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // Processing logic for parsing CSV
          const transactions: Transaction[] = [];
          const warnings: string[] = [];
          
          // Map CSV data to transaction objects
          results.data.forEach((row: any, index: number) => {
            try {
              const transaction: Transaction = {
                id: `temp-${index}`,
                date: row.date || row.Date || new Date().toISOString().split('T')[0],
                description: row.description || row.Description || row.memo || row.Memo || 'Unknown',
                amount: parseFloat(row.amount || row.Amount || 0),
                // Add other fields as needed
              };
              transactions.push(transaction);
            } catch (err) {
              warnings.push(`Row ${index + 1}: ${(err as Error).message}`);
            }
          });
          
          resolve({ transactions, warnings });
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const exportToCSV = (transactions: Transaction[], filename?: string): string => {
  try {
    const fields = ['date', 'description', 'amount', 'category', 'vendor', 'type', 'statementType', 'balance'];
    const rows = transactions.map(transaction => {
      return {
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category || '',
        vendor: transaction.vendor || '',
        type: transaction.type || '',
        statementType: transaction.statementType || '',
        balance: transaction.balance || ''
      };
    });
    
    return Papa.unparse(rows, {
      fields,
      quotes: true
    });
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return '';
  }
};

export const isBalanceReconciled = (currentBalance: number, expectedBalance: number): boolean => {
  // Allow for a small tolerance due to floating point calculations
  const tolerance = 0.01; // 1 cent tolerance
  return Math.abs(currentBalance - expectedBalance) <= tolerance;
};

export const validateCSVStructure = (parsedData: any[]): string[] => {
  const requiredFields = ['date', 'description', 'amount'];
  const warnings: string[] = [];
  
  // Check if required fields exist
  const sampleRow = parsedData[0] || {};
  const headers = Object.keys(sampleRow).map(h => h.toLowerCase());
  
  requiredFields.forEach(field => {
    if (!headers.includes(field.toLowerCase()) && 
        !headers.includes(field.charAt(0).toUpperCase() + field.slice(1).toLowerCase())) {
      warnings.push(`Missing required field: ${field}`);
    }
  });
  
  return warnings;
};

export const findDuplicateTransactions = (
  transactions: Transaction[],
  existingTransactions: Transaction[]
): Transaction[] => {
  // Find potential duplicates based on date, amount, and description
  return transactions.filter(newTx => 
    existingTransactions.some(existingTx => 
      existingTx.date === newTx.date && 
      existingTx.amount === newTx.amount &&
      existingTx.description === newTx.description
    )
  );
};

export const calculateRunningBalance = (
  parsedTransactions: Transaction[], 
  initialBalance: number = 0,
  balanceDate: Date = new Date()
): Transaction[] => {
  const sortedTransactions = [...parsedTransactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });
  
  let runningBalance = initialBalance;
  
  return sortedTransactions.map(transaction => {
    // Adjust balance based on transaction type and amount
    if (transaction.type === 'income') {
      runningBalance += Math.abs(transaction.amount);
    } else if (transaction.type === 'expense') {
      runningBalance -= Math.abs(transaction.amount);
    } else if (transaction.type === 'asset') {
      runningBalance -= Math.abs(transaction.amount);
    } else if (transaction.type === 'liability') {
      runningBalance += Math.abs(transaction.amount);
    } else {
      // Default behavior for unspecified types - assume expense if negative, income if positive
      runningBalance += transaction.amount;
    }
    
    return {
      ...transaction,
      balance: Number(runningBalance.toFixed(2))
    };
  });
};
