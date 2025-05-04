
/**
 * Parse and normalize amount values from different formats
 */
export function parseAmount(
  amountValue: string | undefined, 
  debitValue?: string | undefined, 
  creditValue?: string | undefined
): number {
  try {
    // Handle separate debit/credit columns first
    if ((debitValue && debitValue.trim() !== '0' && debitValue.trim() !== '0.00') || 
        (creditValue && creditValue.trim() !== '0' && creditValue.trim() !== '0.00')) {
      
      if (debitValue && debitValue.trim() !== '0' && debitValue.trim() !== '0.00') {
        // Debit is negative
        const cleanDebit = String(debitValue).replace(/[^0-9.,]/g, '');
        return -parseFloat(cleanDebit.replace(/,/g, '.'));
      } else if (creditValue && creditValue.trim() !== '0' && creditValue.trim() !== '0.00') {
        // Credit is positive
        const cleanCredit = String(creditValue).replace(/[^0-9.,]/g, '');
        return parseFloat(cleanCredit.replace(/,/g, '.'));
      }
    }
    
    // Handle single amount column if provided
    if (amountValue !== undefined) {
      // Normalize amount format
      let amountStr = String(amountValue)
        .replace(/[^0-9.,\-]/g, '') // Remove all except digits, dots, commas, and minus
        .replace(/,/g, '.'); // Replace commas with dots for decimal
      
      return parseFloat(amountStr);
    }
    
    throw new Error('Invalid amount format');
  } catch (err) {
    return 0;
  }
}
