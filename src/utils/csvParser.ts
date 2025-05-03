
import { Transaction } from '@/types';
import Papa from 'papaparse';
import { format } from 'date-fns';

// Interface for CSV parsing result
export interface CSVParseResult {
  transactions: Transaction[];
  warnings: string[];
}

// Function to validate CSV structure
export const validateCSVStructure = (csvContent: string): {
  isValid: boolean;
  headers: string[];
  errorMessage?: string;
} => {
  try {
    // Check if csvContent is a string and not empty
    if (!csvContent || typeof csvContent !== 'string') {
      return {
        isValid: false,
        headers: [],
        errorMessage: 'CSV content is empty or invalid'
      };
    }
    
    // Parse the first row to get headers
    const firstLine = csvContent.split('\n')[0];
    if (!firstLine) {
      return {
        isValid: false,
        headers: [],
        errorMessage: 'CSV file appears to be empty'
      };
    }
    
    const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
    
    // Check for required columns
    const hasDateColumn = headers.some(h => h.includes('date'));
    const hasDescriptionColumn = headers.some(h => 
      h.includes('desc') || h.includes('narration') || h.includes('memo') || h.includes('note')
    );
    const hasAmountColumn = headers.some(h => 
      h.includes('amount') || h.includes('sum') || h.includes('value')
    );
    
    if (!hasDateColumn || !hasDescriptionColumn || !hasAmountColumn) {
      const missing = [];
      if (!hasDateColumn) missing.push('date');
      if (!hasDescriptionColumn) missing.push('description');
      if (!hasAmountColumn) missing.push('amount');
      
      return {
        isValid: false,
        headers,
        errorMessage: `CSV file is missing required columns: ${missing.join(', ')}`
      };
    }
    
    return {
      isValid: true,
      headers
    };
  } catch (err) {
    console.error('Error validating CSV structure:', err);
    return {
      isValid: false,
      headers: [],
      errorMessage: 'Error validating CSV structure'
    };
  }
};

// Parse CSV function
export const parseCSV = (csvContent: string): CSVParseResult => {
  const result: CSVParseResult = {
    transactions: [],
    warnings: []
  };
  
  try {
    const parsedCsv = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    
    if (parsedCsv.errors && parsedCsv.errors.length > 0) {
      parsedCsv.errors.forEach(err => {
        result.warnings.push(`CSV Parse Error: ${err.message} at row ${err.row}`);
      });
    }
    
    if (!parsedCsv.data || !Array.isArray(parsedCsv.data)) {
      result.warnings.push('CSV parsing resulted in no valid data');
      return result;
    }
    
    // Detect column names from the headers
    const headers = parsedCsv.meta.fields || [];
    const lowercaseHeaders = headers.map(h => h.toLowerCase());
    
    // Determine which columns to use
    const dateColumnIndex = lowercaseHeaders.findIndex(h => h.includes('date'));
    const descColumnIndex = lowercaseHeaders.findIndex(h => 
      h.includes('desc') || h.includes('narration') || h.includes('memo') || h.includes('note')
    );
    const amountColumnIndex = lowercaseHeaders.findIndex(h => 
      h.includes('amount') || h.includes('sum') || h.includes('value')
    );
    
    if (dateColumnIndex === -1 || descColumnIndex === -1 || amountColumnIndex === -1) {
      result.warnings.push('Could not detect one or more required columns');
      return result;
    }
    
    const dateColumnName = headers[dateColumnIndex];
    const descColumnName = headers[descColumnIndex];
    const amountColumnName = headers[amountColumnIndex];
    
    // Process each row
    parsedCsv.data.forEach((row: any, index: number) => {
      if (!row || typeof row !== 'object') {
        result.warnings.push(`Skipped row ${index + 1}: Invalid row format`);
        return;
      }
      
      const dateValue = row[dateColumnName];
      const descValue = row[descColumnName];
      let amountValue = row[amountColumnName];
      
      // Skip rows with missing essential data
      if (!dateValue || !descValue || amountValue === undefined) {
        result.warnings.push(`Skipped row ${index + 1}: Missing required data`);
        return;
      }
      
      // Parse date
      let formattedDate: string;
      try {
        const dateObj = new Date(dateValue);
        formattedDate = format(dateObj, 'yyyy-MM-dd');
      } catch (err) {
        result.warnings.push(`Warning for row ${index + 1}: Invalid date format, using current date`);
        formattedDate = format(new Date(), 'yyyy-MM-dd');
      }
      
      // Parse amount
      let amount: number;
      try {
        // Remove currency symbols and commas
        const cleanAmount = String(amountValue)
          .replace(/[^-0-9.,]/g, '')
          .replace(/,/g, '.');
          
        // Find the last period (as decimal separator)
        const lastPeriodIndex = cleanAmount.lastIndexOf('.');
        
        if (lastPeriodIndex !== -1) {
          // Handle case with decimal separator
          const integerPart = cleanAmount.substring(0, lastPeriodIndex).replace(/\./g, '');
          const decimalPart = cleanAmount.substring(lastPeriodIndex + 1);
          amount = parseFloat(`${integerPart}.${decimalPart}`);
        } else {
          // No decimal separator
          amount = parseFloat(cleanAmount);
        }
        
        if (isNaN(amount)) {
          throw new Error('Invalid amount');
        }
      } catch (err) {
        result.warnings.push(`Warning for row ${index + 1}: Invalid amount format, using 0`);
        amount = 0;
      }
      
      // Create transaction object
      const transaction: Transaction = {
        id: `temp_${Date.now()}_${index}`, // Temporary ID until saved to DB
        date: formattedDate,
        description: String(descValue),
        amount: amount,
        isVerified: false,
        vendorVerified: false,
        // These properties will be added later in the processing
        // vendor, type, statementType, confidenceScore, etc.
      };
      
      result.transactions.push(transaction);
    });
    
    // Add warning if no transactions were parsed
    if (result.transactions.length === 0) {
      result.warnings.push('No valid transactions could be parsed from the CSV');
    }
    
    return result;
  } catch (err) {
    console.error('Error parsing CSV:', err);
    result.warnings.push(`Error parsing CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return result;
  }
};

// Function to find duplicate transactions between arrays
export const findDuplicateTransactions = (
  existingTransactions: Transaction[],
  newTransactions: Transaction[]
): Transaction[] => {
  const duplicates: Transaction[] = [];
  
  for (const newTransaction of newTransactions) {
    const isDuplicate = existingTransactions.some(existingTransaction => 
      existingTransaction.date === newTransaction.date &&
      existingTransaction.description === newTransaction.description &&
      Math.abs(existingTransaction.amount - newTransaction.amount) < 0.01 // Allow small rounding differences
    );
    
    if (isDuplicate) {
      duplicates.push(newTransaction);
    }
  }
  
  return duplicates;
};

// Calculate running balance for a list of transactions
export const calculateRunningBalance = (
  transactions: Transaction[],
  initialBalance: number,
  balanceDate: Date
): Transaction[] => {
  // First sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });
  
  let runningBalance = initialBalance;
  
  return sortedTransactions.map(transaction => {
    // Adjust the balance based on transaction type and amount
    if (transaction.type === 'income') {
      runningBalance += Math.abs(transaction.amount);
    } else if (transaction.type === 'expense') {
      runningBalance -= Math.abs(transaction.amount);
    } else if (transaction.type === 'asset') {
      runningBalance -= Math.abs(transaction.amount);
    } else if (transaction.type === 'liability') {
      runningBalance += Math.abs(transaction.amount);
    } else {
      // Default behavior - use the sign of the amount
      runningBalance += transaction.amount;
    }
    
    return {
      ...transaction,
      balance: Number(runningBalance.toFixed(2))
    };
  });
};

// Check if the transactions reconcile with an expected ending balance
export const isBalanceReconciled = (
  transactions: Transaction[],
  expectedEndingBalance: number
): boolean => {
  if (transactions.length === 0) return false;
  
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });
  
  // Get the last transaction's balance
  const lastTransaction = sortedTransactions[sortedTransactions.length - 1];
  const lastBalance = lastTransaction.balance || 0;
  
  // Compare with expected balance (allow for small rounding differences)
  return Math.abs(lastBalance - expectedEndingBalance) < 0.02;
};

// Export transactions to CSV
export const exportToCSV = (transactions: Transaction[]): string => {
  // Prepare data for CSV export
  const data = transactions.map(t => ({
    Date: t.date,
    Description: t.description,
    Amount: t.amount.toFixed(2),
    Vendor: t.vendor || '',
    Category: t.category || '',
    Type: t.type || '',
    'Statement Type': t.statementType || '',
    Verified: t.isVerified ? 'Yes' : 'No',
    'Vendor Verified': t.vendorVerified ? 'Yes' : 'No',
    Balance: t.balance ? t.balance.toFixed(2) : ''
  }));
  
  return Papa.unparse(data);
};
