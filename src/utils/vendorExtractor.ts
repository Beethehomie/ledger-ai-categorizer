/**
 * Utility to extract vendor names from transaction descriptions
 */

// Common prefixes and suffixes to remove for better vendor name extraction
const PREFIXES_TO_REMOVE = [
  'payment to', 'payment for', 'purchase at', 'pos purchase', 
  'card payment to', 'direct debit to', 'debit card purchase',
  'payment - thank you', 'pymt to', 'payment', 'purchase', 'debit'
];

const SUFFIXES_TO_REMOVE = [
  'ltd', 'llc', 'inc', 'limited', 'corporation', 'corp', 
  'ref:', 'reference:', 'ref no:', 'transaction:', 'txn:',
  'card ending in', 'card ending', 'card', 'account', 'acct',
  'invoice', 'inv', 'bill', 'payment', 'subscription', 'order'
];

// Common transaction descriptions to ignore for vendor extraction
const IGNORE_PATTERNS = [
  'transfer', 'salary', 'wage', 'dividend', 'interest', 
  'balance', 'withdrawal', 'deposit', 'fee', 'tax', 'refund',
  'atm', 'cash', 'cheque', 'check'
];

// Function to check if a description is likely not a vendor transaction
const isNonVendorTransaction = (description: string): boolean => {
  const lowerDesc = description.toLowerCase();
  return IGNORE_PATTERNS.some(pattern => lowerDesc.includes(pattern));
};

// Main function to extract vendor name from transaction description
export const extractVendorName = (description: string): string => {
  if (!description) return "Unknown";
  
  // Remove any non-alphanumeric characters (keep spaces)
  let cleanedDescription = description.replace(/[^a-zA-Z0-9 ]/g, ' ');
  
  // Convert to lowercase for consistent processing
  const lowerDesc = cleanedDescription.toLowerCase();
  
  // If this looks like a non-vendor transaction, mark as "Unknown"
  if (isNonVendorTransaction(lowerDesc)) {
    return "Unknown";
  }
  
  // Remove common prefixes
  for (const prefix of PREFIXES_TO_REMOVE) {
    if (lowerDesc.startsWith(prefix)) {
      cleanedDescription = cleanedDescription.substring(prefix.length).trim();
      break;
    }
    
    // Check if it has the prefix anywhere in the string
    const prefixIndex = lowerDesc.indexOf(` ${prefix} `);
    if (prefixIndex !== -1) {
      cleanedDescription = cleanedDescription.substring(prefixIndex + prefix.length + 2).trim();
      break;
    }
  }
  
  // Remove common suffixes
  for (const suffix of SUFFIXES_TO_REMOVE) {
    if (lowerDesc.endsWith(suffix)) {
      cleanedDescription = cleanedDescription.substring(0, cleanedDescription.length - suffix.length).trim();
      break;
    }
    
    // Check if it has the suffix anywhere in the string
    const suffixIndex = lowerDesc.indexOf(` ${suffix} `);
    if (suffixIndex !== -1) {
      cleanedDescription = cleanedDescription.substring(0, suffixIndex).trim();
      break;
    }
  }
  
  // Extract the first few words (likely the vendor name)
  const words = cleanedDescription.split(/\s+/);
  let vendorName = words.slice(0, Math.min(3, words.length)).join(' ');
  
  // Capitalize the first letter of each word
  vendorName = vendorName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // If we couldn't extract anything meaningful, return "Unknown"
  if (!vendorName || vendorName.length < 2) {
    return "Unknown";
  }
  
  return vendorName;
};

// Function to find similar vendor names in a list
export const findSimilarVendors = (
  vendorName: string, 
  existingVendors: string[]
): string[] => {
  if (!vendorName || vendorName === "Unknown") return [];
  
  const normalizedVendorName = vendorName.toLowerCase();
  
  return existingVendors.filter(vendor => {
    const normalizedExisting = vendor.toLowerCase();
    
    // Exact match
    if (normalizedExisting === normalizedVendorName) return true;
    
    // Contains match
    if (normalizedExisting.includes(normalizedVendorName) || 
        normalizedVendorName.includes(normalizedExisting)) return true;
    
    // Word similarity match
    const vendorWords = normalizedVendorName.split(/\s+/);
    const existingWords = normalizedExisting.split(/\s+/);
    
    // Check if more than half of words match
    const matchingWords = vendorWords.filter(word => 
      existingWords.some(existingWord => existingWord.includes(word) || word.includes(existingWord))
    );
    
    return matchingWords.length > vendorWords.length / 2;
  });
};
