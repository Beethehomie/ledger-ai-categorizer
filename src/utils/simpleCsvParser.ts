
import Papa from 'papaparse';

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  vendor?: string;
  category?: string;
  type?: 'income' | 'expense' | 'transfer';
  statementType?: 'profit_loss' | 'balance_sheet';
  isVerified?: boolean;
  confidenceScore?: number;
}

export interface ParseResult {
  transactions: Transaction[];
  warnings: string[];
}

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

    // Map CSV columns to our transaction structure
    const headers = parseResult.meta.fields || [];
    const headersLower = headers.map(h => h.toLowerCase());

    // Find the relevant columns
    const dateColumn = headersLower.find(h => 
      h.includes('date') || h.includes('time') || h === 'dt'
    );
    const descColumn = headersLower.find(h => 
      h.includes('desc') || h.includes('narration') || h.includes('memo') || 
      h.includes('note') || h.includes('transaction')
    );
    const amountColumn = headersLower.find(h => 
      h.includes('amount') || h.includes('sum') || h.includes('value') || 
      h === 'amt' || h === 'debit' || h === 'credit'
    );
    
    // Validate required columns
    if (!dateColumn || !descColumn || !amountColumn) {
      result.warnings.push('Could not identify required columns (date, description, amount) in CSV');
      return result;
    }

    // Process each row
    parseResult.data.forEach((row: any, index: number) => {
      try {
        // Get values from identified columns
        let dateValue = row[dateColumn];
        let descValue = row[descColumn];
        let amountValue = row[amountColumn];

        // Skip if essential fields are missing
        if (!dateValue || !descValue || amountValue === undefined) {
          result.warnings.push(`Skipping row ${index + 1}: Missing required data`);
          return;
        }

        // Try to parse date
        let formattedDate: string;
        try {
          // Handle common date formats
          const dateParts = dateValue.split(/[-/./]/);
          if (dateParts.length === 3) {
            // Assume MM/DD/YYYY or DD/MM/YYYY
            let year, month, day;
            
            // Check if the first part looks like a year
            if (dateParts[0].length === 4 && !isNaN(dateParts[0])) {
              // YYYY-MM-DD
              year = dateParts[0];
              month = dateParts[1].padStart(2, '0');
              day = dateParts[2].padStart(2, '0');
            } else {
              // MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY for simplicity
              month = dateParts[0].padStart(2, '0');
              day = dateParts[1].padStart(2, '0');
              year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
            }
            formattedDate = `${year}-${month}-${day}`;
          } else {
            // Try to parse as ISO date
            const dateObj = new Date(dateValue);
            if (isNaN(dateObj.getTime())) {
              throw new Error('Invalid date');
            }
            formattedDate = dateObj.toISOString().split('T')[0];
          }
        } catch (err) {
          result.warnings.push(`Warning row ${index + 1}: Invalid date format, using current date`);
          formattedDate = new Date().toISOString().split('T')[0];
        }

        // Try to parse amount
        let amount: number;
        try {
          // Handle amount format
          let amountStr = String(amountValue)
            .replace(/[^0-9.,\-]/g, '') // Remove all except digits, dots, commas, and minus
            .replace(/,/g, '.'); // Replace commas with dots for decimal
          
          // Handle separate debit/credit columns
          if (headersLower.includes('debit') && headersLower.includes('credit')) {
            const debit = row[headersLower.find(h => h.includes('debit'))];
            const credit = row[headersLower.find(h => h.includes('credit'))];
            
            if (debit && debit !== '0' && debit !== '0.00') {
              amountStr = `-${String(debit).replace(/[^0-9.,]/g, '')}`;
            } else if (credit && credit !== '0' && credit !== '0.00') {
              amountStr = String(credit).replace(/[^0-9.,]/g, '');
            }
          }
          
          amount = parseFloat(amountStr);
          
          if (isNaN(amount)) {
            throw new Error('Invalid amount format');
          }
        } catch (err) {
          result.warnings.push(`Warning row ${index + 1}: Invalid amount format, using 0`);
          amount = 0;
        }

        // Create transaction object
        const transaction: Transaction = {
          date: formattedDate,
          description: String(descValue).trim(),
          amount: amount
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
