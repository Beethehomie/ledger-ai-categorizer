
import { parse } from 'papaparse';
import { Transaction } from '@/types';
import { parseDate } from '@/utils/dateUtils';

interface RawCSVTransaction {
  date?: string;
  description?: string;
  amount?: string;
  category?: string;
  balance?: string;
  [key: string]: any;
}

export interface CSVParseResult {
  transactions: Transaction[];
  warnings: string[];
}

// Map common CSV header variations to our standard fields
const headerMappings: Record<string, string[]> = {
  date: ['date', 'trans date', 'transaction date', 'posted date', 'posting date', 'time', 'timestamp'],
  description: ['description', 'desc', 'memo', 'transaction description', 'narrative', 'details', 'transaction'],
  amount: ['amount', 'transaction amount', 'debit/credit', 'value', 'sum', 'money', 'transaction value'],
  category: ['category', 'transaction category', 'type', 'transaction type'],
  balance: ['balance', 'running balance', 'account balance']
};

export const calculateRunningBalance = (
  transactions: Transaction[],
  initialBalance: number = 0,
  balanceDate: Date = new Date()
): Transaction[] => {
  // Clone transactions to avoid mutating the original array
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });

  let runningBalance = initialBalance;
  
  return sortedTransactions.map(transaction => {
    // Adjust running balance based on transaction amount
    // For expenses (negative amounts), subtract from balance
    // For income (positive amounts), add to balance
    runningBalance += transaction.amount;
    
    return {
      ...transaction,
      balance: Number(runningBalance.toFixed(2))
    };
  });
};

export const validateCSVStructure = (csvContent: string): { 
  isValid: boolean; 
  headers: string[];
  errorMessage?: string;
} => {
  try {
    const result = parse(csvContent, { header: true });
    const headers = result.meta.fields || [];
    
    // Check if CSV has data
    if (!result.data || result.data.length === 0 || headers.length === 0) {
      return { 
        isValid: false, 
        headers: [],
        errorMessage: 'CSV file appears to be empty or has no headers'
      };
    }
    
    // Check for required headers (date, description, and amount)
    const lowercaseHeaders = headers.map(h => h.toLowerCase());
    
    const hasDate = headerMappings.date.some(h => lowercaseHeaders.includes(h));
    const hasDescription = headerMappings.description.some(h => lowercaseHeaders.includes(h));
    const hasAmount = headerMappings.amount.some(h => lowercaseHeaders.includes(h));
    
    if (!hasDate && !hasDescription && !hasAmount) {
      return {
        isValid: false,
        headers,
        errorMessage: 'CSV is missing required columns: date, description, and amount'
      };
    } else if (!hasDate) {
      return {
        isValid: false,
        headers,
        errorMessage: 'CSV is missing date column'
      };
    } else if (!hasDescription) {
      return {
        isValid: false,
        headers,
        errorMessage: 'CSV is missing description column'
      };
    } else if (!hasAmount) {
      return {
        isValid: false,
        headers,
        errorMessage: 'CSV is missing amount column'
      };
    }
    
    return { isValid: true, headers };
  } catch (error) {
    console.error('Error validating CSV:', error);
    return { 
      isValid: false, 
      headers: [],
      errorMessage: 'Invalid CSV format'
    };
  }
};

// Function to find the matching header in the CSV based on our mappings
function findMatchingHeader(headers: string[], targetField: string): string | null {
  const lowercaseHeaders = headers.map(h => h.toLowerCase());
  const mappings = headerMappings[targetField] || [];
  
  for (const mapping of mappings) {
    const index = lowercaseHeaders.indexOf(mapping);
    if (index !== -1) {
      return headers[index];
    }
  }
  
  return null;
}

// Clean up amount string and convert to number
function parseAmount(amountStr: string): number {
  // Handle various amount formats
  if (!amountStr) return 0;
  
  // Remove currency symbols, commas, and trim whitespace
  let cleanedAmount = amountStr.replace(/[£$€,]/g, '').trim();
  
  // Handle parentheses that indicate negative numbers
  if (cleanedAmount.startsWith('(') && cleanedAmount.endsWith(')')) {
    cleanedAmount = '-' + cleanedAmount.slice(1, -1);
  }
  
  // Try to convert to number
  const amount = parseFloat(cleanedAmount);
  return isNaN(amount) ? 0 : amount;
}

function generateId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export const parseCSV = (csvContent: string): CSVParseResult => {
  const result = parse(csvContent, { header: true });
  const headers = result.meta.fields || [];
  const transactions: Transaction[] = [];
  const warnings: string[] = [];
  
  // Find the relevant headers in the CSV
  const dateHeader = findMatchingHeader(headers, 'date');
  const descriptionHeader = findMatchingHeader(headers, 'description');
  const amountHeader = findMatchingHeader(headers, 'amount');
  const categoryHeader = findMatchingHeader(headers, 'category');
  const balanceHeader = findMatchingHeader(headers, 'balance');
  
  if (!dateHeader || !descriptionHeader || !amountHeader) {
    warnings.push('Could not identify all required columns. Using best guess.');
  }
  
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i] as RawCSVTransaction;
    
    // Skip empty rows
    if (!row || Object.keys(row).length === 0) continue;
    
    try {
      // Extract values from the row using the identified headers
      const dateValue = dateHeader ? row[dateHeader] : null;
      const descriptionValue = descriptionHeader ? row[descriptionHeader] : '';
      const amountValue = amountHeader ? row[amountHeader] : '0';
      const categoryValue = categoryHeader ? row[categoryHeader] : undefined;
      const balanceValue = balanceHeader ? row[balanceHeader] : undefined;
      
      // Skip row if missing required data
      if (!dateValue || !descriptionValue) {
        warnings.push(`Skipped row ${i + 1} due to missing required data`);
        continue;
      }
      
      // Parse date
      const parsedDate = parseDate(dateValue);
      if (!parsedDate) {
        warnings.push(`Failed to parse date: "${dateValue}" for row ${i + 1}`);
        continue;
      }
      
      // Parse amount
      const amount = parseAmount(amountValue);
      
      // Create transaction object
      const transaction: Transaction = {
        id: generateId(),
        date: parsedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        description: descriptionValue.trim(),
        amount: amount,
        category: categoryValue?.trim(),
        type: amount < 0 ? 'expense' : 'income', // Default type based on amount
        isVerified: false,
        balance: balanceValue ? parseAmount(balanceValue) : undefined,
      };
      
      transactions.push(transaction);
    } catch (error) {
      console.error(`Error processing row ${i + 1}:`, error);
      warnings.push(`Error processing row ${i + 1}`);
    }
  }
  
  return { transactions, warnings };
};

export const findDuplicateTransactions = (
  existingTransactions: Transaction[],
  newTransactions: Transaction[]
): Transaction[] => {
  return newTransactions.filter(newTx => {
    return existingTransactions.some(existingTx => 
      existingTx.date === newTx.date && 
      existingTx.amount === newTx.amount && 
      existingTx.description === newTx.description
    );
  });
};

export const isBalanceReconciled = (endingBalance: number, calculatedBalance: number): boolean => {
  // Allow for rounding errors by using a small tolerance
  const tolerance = 0.01; // 1 cent tolerance
  return Math.abs(endingBalance - calculatedBalance) <= tolerance;
};
