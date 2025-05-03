
// Import statements
import { parseDate, formatDateYYYYMMDD } from '@/utils/dateUtils';
import Papa from 'papaparse';
import { Transaction } from '@/types';
import { toast } from '@/utils/toast';

/**
 * Result of CSV parsing with transactions and any warnings
 */
export interface CSVParseResult {
  transactions: Transaction[];
  warnings: string[];
}

/**
 * Validate CSV structure to ensure it has necessary columns
 */
export const validateCSVStructure = (csvData: string) => {
  try {
    const { data, meta } = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      preview: 5, // Only validate the first 5 rows
    });
    
    const headers = meta.fields || [];
    
    // Check if we have at least some rows
    if (data.length === 0) {
      return {
        isValid: false,
        headers: [],
        errorMessage: 'CSV file is empty or has no valid data rows'
      };
    }
    
    // Check for required column types (date, amount, description)
    let hasDateColumn = false;
    let hasAmountColumn = false;
    let hasDescriptionColumn = false;
    
    const dateColumnNames = ['Date', 'date', 'DATE', 'TransactionDate', 'Transaction Date', 'Posting Date'];
    const amountColumnNames = ['Amount', 'amount', 'AMOUNT', 'Value', 'value', 'Debit', 'Credit'];
    const descColumnNames = ['Description', 'description', 'DESC', 'Narrative', 'Reference', 'Memo', 'Payee'];
    
    for (const header of headers) {
      if (dateColumnNames.includes(header)) hasDateColumn = true;
      if (amountColumnNames.includes(header)) hasAmountColumn = true;
      if (descColumnNames.includes(header)) hasDescriptionColumn = true;
    }
    
    // Check if we have the minimum required columns
    if (!hasDateColumn || !hasAmountColumn || !hasDescriptionColumn) {
      const missing = [];
      if (!hasDateColumn) missing.push('date');
      if (!hasAmountColumn) missing.push('amount');
      if (!hasDescriptionColumn) missing.push('description');
      
      return {
        isValid: false,
        headers,
        errorMessage: `CSV is missing required columns: ${missing.join(', ')}`
      };
    }
    
    return {
      isValid: true,
      headers
    };
    
  } catch (error) {
    console.error('Error validating CSV:', error);
    return {
      isValid: false,
      headers: [],
      errorMessage: `Failed to validate CSV: ${error}`
    };
  }
};

/**
 * Parse CSV data into Transaction objects and return a CSVParseResult
 * @param csvData Raw CSV data as string
 * @returns CSVParseResult with transactions and warnings
 */
export const parseCSV = (csvData: string): CSVParseResult => {
  const warnings: string[] = [];
  
  try {
    const { data } = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const transactions: Transaction[] = data.map((row: any, index: number) => {
      // Find date column - try common names
      const dateValue = row.Date || row.date || row.DATE || row.TransactionDate || row['Transaction Date'] || row['Posting Date'] || '';
      
      // Find amount column - try common names
      let amountValue = row.Amount || row.amount || row.AMOUNT || row.Value || row.value || row.Debit || row.Credit || '0';
      
      // Handle negative amounts in various formats
      if (typeof amountValue === 'string') {
        // Remove currency symbols and commas
        amountValue = amountValue.replace(/[$£€,]/g, '');
        
        // Check if there's a separate debit/credit column
        if (row.Debit && row.Credit) {
          amountValue = row.Debit ? `-${row.Debit.replace(/[$£€,]/g, '')}` : row.Credit.replace(/[$£€,]/g, '');
        }
      }
      
      // Find description column - try common names
      const descriptionValue = row.Description || row.description || row.DESC || row.Narrative || row.Reference || row.Memo || row.Payee || '';
      
      // Parse date
      const parsedDate = parseDate(dateValue);
      const formattedDate = parsedDate ? formatDateYYYYMMDD(parsedDate) : new Date().toISOString().split('T')[0];
      
      // Parse amount
      const amount = parseFloat(amountValue);
      
      if (!parsedDate) {
        warnings.push(`Row ${index + 1}: Could not parse date "${dateValue}", using current date`);
      }
      
      if (isNaN(amount)) {
        warnings.push(`Row ${index + 1}: Could not parse amount "${amountValue}", using 0`);
      }
      
      return {
        id: `temp-${index}`,
        date: formattedDate,
        description: descriptionValue,
        amount: isNaN(amount) ? 0 : amount,
        isVerified: false,
      };
    });

    return { transactions, warnings };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    warnings.push(`CSV parsing error: ${error}`);
    return { transactions: [], warnings };
  }
};

/**
 * Check for duplicate transactions in a transaction array
 */
export const findDuplicateTransactions = (transactions: Transaction[]): Transaction[] => {
  const duplicates: Transaction[] = [];
  const seen = new Map<string, Transaction>();
  
  transactions.forEach(transaction => {
    // Create a key combining date, amount, and description
    const key = `${transaction.date}-${transaction.amount}-${transaction.description}`;
    if (seen.has(key)) {
      duplicates.push(transaction);
    } else {
      seen.set(key, transaction);
    }
  });
  
  return duplicates;
};

/**
 * Calculate running balance for each transaction in the array
 */
export const calculateRunningBalance = (
  transactions: Transaction[], 
  initialBalance: number = 0,
  balanceDate: Date = new Date()
): Transaction[] => {
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });
  
  let runningBalance = initialBalance;
  
  return sortedTransactions.map(transaction => {
    // Update running balance based on transaction amount
    runningBalance += transaction.amount;
    
    return {
      ...transaction,
      balance: Number(runningBalance.toFixed(2))
    };
  });
};

/**
 * Check if two balances are reconciled (within a small tolerance)
 * @param currentBalance Current calculated balance
 * @param statementBalance Statement balance to compare against
 * @returns True if the balances match within tolerance
 */
export const isBalanceReconciled = (currentBalance: number, statementBalance: number): boolean => {
  // Allow for a small difference due to rounding (1 cent)
  const tolerance = 0.01;
  return Math.abs(currentBalance - statementBalance) <= tolerance;
};

/**
 * Export transactions to a CSV file
 * @param transactions Array of transactions to export
 * @param filename Name of the file to download
 */
export const exportToCSV = (transactions: Transaction[], filename = 'transactions.csv'): string => {
  try {
    if (!transactions || transactions.length === 0) {
      toast.error('No transactions to export');
      return '';
    }

    // Prepare data for CSV export
    const data = transactions.map(t => ({
      'Date': t.date,
      'Description': t.description,
      'Amount': t.amount,
      'Category': t.category || '',
      'Vendor': t.vendor || '',
      'Type': t.type || '',
      'Balance': t.balance || '',
      'Verified': t.isVerified ? 'Yes' : 'No',
      'Account': t.bankAccountName || ''
    }));

    // Generate CSV string
    const csv = Papa.unparse(data);
    
    toast.success(`Prepared ${transactions.length} transactions for export`);
    
    return csv;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    toast.error('Failed to export transactions');
    return '';
  }
};
