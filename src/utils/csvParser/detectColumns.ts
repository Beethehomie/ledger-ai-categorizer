
import { ColumnMapping } from './types';

export const detectColumns = (headers: string[]): ColumnMapping => {
  const lowerCaseHeaders = headers.map(h => h.toLowerCase());
  const mapping: ColumnMapping = { date: -1, description: -1, amount: -1 };

  // Find date column
  mapping.date = lowerCaseHeaders.findIndex(h => 
    h.includes('date') || 
    h.includes('time') || 
    h === 'dt'
  );
  
  // Find description/memo/narrative column
  mapping.description = lowerCaseHeaders.findIndex(h => 
    h.includes('desc') || 
    h.includes('narr') || 
    h.includes('memo') || 
    h.includes('note') || 
    h.includes('trans') || 
    h === 'text'
  );
  
  // Find amount column
  let amountIndex = lowerCaseHeaders.findIndex(h => 
    h === 'amount' || 
    h.includes('amt') || 
    h.includes('sum') || 
    h === 'total'
  );
  
  // If no simple amount column, try to find debit/credit columns
  if (amountIndex === -1) {
    const debitIndex = lowerCaseHeaders.findIndex(h => 
      h.includes('debit') || 
      h.includes('dr') || 
      h.includes('payment') || 
      h === 'paid'
    );
    
    const creditIndex = lowerCaseHeaders.findIndex(h => 
      h.includes('credit') || 
      h.includes('cr') || 
      h.includes('deposit') || 
      h === 'received'
    );
    
    if (debitIndex !== -1) {
      mapping.debit = debitIndex;
    }
    
    if (creditIndex !== -1) {
      mapping.credit = creditIndex;
    }
  } else {
    mapping.amount = amountIndex;
  }

  // If we still don't have main columns, make best guesses
  if (mapping.date === -1) mapping.date = 0;
  if (mapping.description === -1) mapping.description = 1;
  if (mapping.amount === -1 && !mapping.hasOwnProperty('debit') && !mapping.hasOwnProperty('credit')) {
    mapping.amount = 2;
  }
  
  return mapping;
};
