export const parseAmount = (amountString: string): number => {
  // Handle various amount formats
  if (!amountString || typeof amountString !== 'string') {
    return 0;
  }

  try {
    // Remove currency symbols and handle commas/spaces
    let cleaned = amountString.replace(/[^-0-9.,]/g, '');
    
    // Convert comma as decimal separator
    // If there's exactly one comma, and it seems to be a decimal separator
    if ((cleaned.match(/,/g) || []).length === 1 && cleaned.indexOf(',') > cleaned.length - 4) {
      cleaned = cleaned.replace(',', '.');
    } else {
      // Otherwise, remove commas (likely thousands separators)
      cleaned = cleaned.replace(/,/g, '');
    }
    
    // Parse the number
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  } catch (error) {
    console.error("Error parsing amount:", error);
    return 0;
  }
};
