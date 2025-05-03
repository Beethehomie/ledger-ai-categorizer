// Add missing import at the top (keeping existing imports)
import { parseDate, formatDateYYYYMMDD } from '@/utils/dateUtils';
import Papa from 'papaparse';
import { Transaction } from '@/types';
import { toast } from '@/utils/toast';

/**
 * Parse CSV data into Transaction objects
 * @param csvData Raw CSV data as string
 * @returns Array of Transaction objects
 */
export const parseCSV = (csvData: string): Transaction[] => {
  try {
    const { data } = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    return data.map((row: any, index: number) => {
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
      
      return {
        id: `temp-${index}`,
        date: formattedDate,
        description: descriptionValue,
        amount: isNaN(amount) ? 0 : amount,
        isVerified: false,
      };
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
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
export const exportToCSV = (transactions: Transaction[], filename = 'transactions.csv'): void => {
  try {
    if (!transactions || transactions.length === 0) {
      toast.error('No transactions to export');
      return;
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
    
    // Create a blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Set up download
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Append to document, trigger download and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${transactions.length} transactions to ${filename}`);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    toast.error('Failed to export transactions');
  }
};
