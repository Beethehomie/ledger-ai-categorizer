
import { ColumnMapping } from './types';

/**
 * Detects relevant columns in the CSV based on common naming patterns
 */
export function detectColumns(headers: string[]): ColumnMapping {
  const headersLower = headers.map(h => h.toLowerCase().trim());
  
  // Find the relevant columns
  const dateColumn = headersLower.find(h => 
    h.includes('date') || h.includes('time') || h === 'dt'
  ) || null;
  
  const descriptionColumn = headersLower.find(h => 
    h.includes('desc') || h.includes('narration') || h.includes('memo') || 
    h.includes('note') || h.includes('transaction')
  ) || null;
  
  const amountColumn = headersLower.find(h => 
    h.includes('amount') || h.includes('sum') || h.includes('value') || 
    h === 'amt'
  ) || null;

  const debitColumn = headersLower.find(h => 
    h.includes('debit') || h.includes('withdrawal') || h.includes('expense')
  ) || null;

  const creditColumn = headersLower.find(h => 
    h.includes('credit') || h.includes('deposit') || h.includes('income')
  ) || null;
  
  return {
    dateColumn,
    descriptionColumn,
    amountColumn,
    debitColumn,
    creditColumn
  };
}
