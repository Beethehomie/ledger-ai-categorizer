
import { parse } from 'papaparse';
import { parseDate } from './dateParser';
import { parseAmount } from './amountParser';
import { detectColumns } from './detectColumns';
import { Transaction } from '@/types';
import { CSVParseResult } from './types';

export { parseDate, parseAmount, detectColumns };

export const parseCSV = (csvContent: string): CSVParseResult => {
  const result: CSVParseResult = {
    transactions: [],
    warnings: []
  };

  try {
    // Parse CSV using PapaParse
    const parsedCsv = parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsedCsv.errors && parsedCsv.errors.length > 0) {
      parsedCsv.errors.forEach(err => {
        result.warnings.push(`CSV Parse Error: ${err.message} at row ${err.row}`);
      });
    }

    if (!parsedCsv.data || !Array.isArray(parsedCsv.data) || parsedCsv.data.length === 0) {
      result.warnings.push('CSV file contains no valid data');
      return result;
    }

    // Detect column mappings from headers
    const headers = parsedCsv.meta.fields || [];
    const columnMapping = detectColumns(headers);

    if (
      columnMapping.date === -1 || 
      columnMapping.description === -1 || 
      (columnMapping.amount === -1 && !('debit' in columnMapping) && !('credit' in columnMapping))
    ) {
      result.warnings.push('Could not detect required columns (date, description, amount)');
    }

    // Process each row
    parsedCsv.data.forEach((row: any, index: number) => {
      try {
        // Extract values using column mapping
        const dateValue = row[headers[columnMapping.date]];
        const descriptionValue = row[headers[columnMapping.description]];
        
        // Extract amount - handle both single amount and debit/credit columns
        let amount: number;
        if (columnMapping.amount !== -1) {
          amount = parseAmount(row[headers[columnMapping.amount]]);
        } else if ('debit' in columnMapping && 'credit' in columnMapping) {
          const debitAmount = parseAmount(row[headers[columnMapping.debit]]);
          const creditAmount = parseAmount(row[headers[columnMapping.credit]]);
          
          // Debit is negative, credit is positive
          amount = creditAmount - debitAmount;
        } else {
          result.warnings.push(`Row ${index + 1}: Could not determine amount`);
          return;
        }

        // Skip rows with missing essential data
        if (!dateValue || !descriptionValue) {
          result.warnings.push(`Row ${index + 1}: Missing date or description`);
          return;
        }

        // Parse date
        const parsedDate = parseDate(dateValue);

        // Create transaction object
        const transaction: Transaction = {
          id: `temp_${Date.now()}_${index}`,
          date: parsedDate,
          description: descriptionValue,
          amount: amount,
          isVerified: false,
          vendorVerified: false,
        };

        result.transactions.push(transaction);
      } catch (err) {
        result.warnings.push(`Row ${index + 1}: Error processing row`);
        console.error(`Error processing row ${index}:`, err);
      }
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
