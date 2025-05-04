
import Papa from 'papaparse';
import { ParseResult } from './types';
import { detectColumns } from './detectColumns';
import { parseDate } from './dateParser';
import { parseAmount } from './amountParser';
import { Transaction } from '@/types';

/**
 * Parse CSV content into transaction objects
 */
export function parseCSV(csvContent: string): ParseResult {
  const result: ParseResult = {
    transactions: [],
    warnings: []
  };

  try {
    // Parse the CSV content
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    });

    // Add parsing errors as warnings
    if (parseResult.errors && parseResult.errors.length > 0) {
      parseResult.errors.forEach(err => {
        result.warnings.push(`CSV Parse Error: ${err.message} at row ${err.row}`);
      });
    }

    // Check if we got any data
    if (!parseResult.data || !Array.isArray(parseResult.data) || parseResult.data.length === 0) {
      result.warnings.push('No valid data found in CSV');
      return result;
    }

    // Get headers and detect columns
    const headers = parseResult.meta.fields || [];
    const columns = detectColumns(headers);

    // Validate required columns
    if (!columns.dateColumn || !columns.descriptionColumn || 
        (!columns.amountColumn && (!columns.debitColumn && !columns.creditColumn))) {
      result.warnings.push('Could not identify required columns (date, description, amount) in CSV');
      return result;
    }

    // Process each row
    parseResult.data.forEach((row: any, index: number) => {
      try {
        // Get values from identified columns
        const dateValue = row[columns.dateColumn!];
        const descValue = row[columns.descriptionColumn!];
        const amountValue = columns.amountColumn ? row[columns.amountColumn] : undefined;
        const debitValue = columns.debitColumn ? row[columns.debitColumn] : undefined;
        const creditValue = columns.creditColumn ? row[columns.creditColumn] : undefined;

        // Skip if essential fields are missing
        if (!dateValue || !descValue || 
            (!amountValue && (!debitValue && !creditValue))) {
          result.warnings.push(`Skipping row ${index + 1}: Missing required data`);
          return;
        }

        // Parse date and amount
        const formattedDate = parseDate(dateValue);
        const amount = parseAmount(amountValue, debitValue, creditValue);

        // Create transaction object
        const transaction: Transaction = {
          id: `temp_${Date.now()}_${index}`,
          date: formattedDate,
          description: String(descValue).trim(),
          amount: amount,
          isVerified: false
        };

        result.transactions.push(transaction);
      } catch (err) {
        result.warnings.push(`Error processing row ${index + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

    return result;
  } catch (err) {
    result.warnings.push(`Error parsing CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return result;
  }
}

// Export all submodules
export * from './types';
export * from './detectColumns';
export * from './dateParser';
export * from './amountParser';
