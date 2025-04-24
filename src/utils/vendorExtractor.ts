import { Vendor } from '../types';
import { Transaction } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { BusinessContext } from '@/types/supabase';

// Common prefixes and suffixes to remove from transaction descriptions
const COMMON_PREFIXES = [
  "POS PURCHASE ", "PURCHASE ", "FNB PAYMENT ", "PAYMENT ", "CARD PURCHASE ", 
  "DEBIT ORDER ", "EFT PAYMENT ", "DIRECT DEBIT ", "TRANSFER ", "ATM WITHDRAWAL ",
  "CREDIT ", "DEBIT ", "POS ", "TFR ", "TRANSACTION ", "PAYMENT TO ",
  "PYMT TO ", "DEP ", "WDL ", "ONLINE ", "ACH ", "DEPOSIT ", "WITHDRAWAL "
];

const COMMON_SUFFIXES = [
  " ACCOUNT", " CARD", " PAYMENT", " DEBIT", " CREDIT", " TRANSFER", " TXN", " TRANSACTION",
  " WITHDRAW", " DEPOSIT", " FEE", " CHARGE", " SERVICE", " LLC", " INC", " LTD", " LIMITED",
  " PTY", " (PTY)", " (PTY) LTD", " TECHNOLOGIES", " TECHNOLOGY", " SOLUTIONS", " CC",
  " #\\d+", " \\d+/\\d+", " \\d+-\\d+", " \\(\\d+\\)", " REF\\d+", " ID:\\d+"
];

// Words to remove entirely
const WORDS_TO_REMOVE = [
  "THE", "A", "AN", "AND", "OR", "AT", "ON", "IN", "TO", "FOR", "BY", "WITH", "FROM",
  "OF", "LTD", "LLC", "INC", "CO", "CORP", "CORPORATION", "PTY", "LIMITED",
  "PAYMENT", "TRANSFER", "TRANSACTION", "FEE", "CHARGE", "SERVICE"
];

/**
 * Extracts a concise vendor name from a transaction description
 * Enhanced with better pattern recognition and more extensive filtering
 */
export function extractVendorName(description: string): string {
  if (!description || typeof description !== 'string') return "Unknown";
  
  let vendor = description.trim().toUpperCase();
  
  // Remove common prefixes
  for (const prefix of COMMON_PREFIXES) {
    if (vendor.startsWith(prefix.toUpperCase())) {
      vendor = vendor.substring(prefix.length);
      break;
    }
  }
  
  // Remove common suffixes using regex for more flexible matching
  for (const suffix of COMMON_SUFFIXES) {
    const regex = new RegExp(`${suffix.toUpperCase()}$`, 'i');
    vendor = vendor.replace(regex, '');
  }
  
  // Remove transaction IDs and numbers (common patterns)
  vendor = vendor.replace(/\b\d{5,}\b/g, ""); // Remove long numbers
  vendor = vendor.replace(/\b[A-Z0-9]{10,}\b/g, ""); // Remove long alphanumeric strings
  vendor = vendor.replace(/REF:\s*\S+/gi, ""); // Remove reference numbers
  vendor = vendor.replace(/\d{2}\/\d{2}\/\d{2,4}/g, ""); // Remove dates
  vendor = vendor.replace(/\d+\.\d+/g, ""); // Remove decimal numbers
  vendor = vendor.replace(/\(\d+\)/g, ""); // Remove numbers in parentheses
  vendor = vendor.replace(/\d+\*+\d+/g, ""); // Remove patterns like 485442*7284
  vendor = vendor.replace(/\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4}/g, ""); // Remove dates like "17 Feb 2023"
  
  // Handle special case formats
  // Format: VENDOR*LOCATION or VENDOR*SERVICE
  if (vendor.includes('*')) {
    vendor = vendor.split('*')[0];
  }
  
  // Format: VENDOR-DETAILS or VENDOR/DETAILS
  if (vendor.includes('-') && !vendor.startsWith('-')) {
    vendor = vendor.split('-')[0];
  }
  if (vendor.includes('/') && !vendor.startsWith('/')) {
    vendor = vendor.split('/')[0];
  }
  
  // Split into words and filter out words to remove
  const words = vendor.split(/\s+/).filter(word => 
    word.length > 1 && !WORDS_TO_REMOVE.includes(word) && !/^\d+$/.test(word)
  );
  
  // Join words back and take the first 2 words max for conciseness
  vendor = words.slice(0, 2).join(" ");
  
  // Title case the final vendor name
  vendor = vendor.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
  
  // If vendor is empty after all processing, use "Unknown"
  if (!vendor.trim()) {
    return "Unknown";
  }
  
  return vendor.trim();
}

// Add a new function to extract vendors using the edge function
export async function extractVendorWithAI(description: string, existingVendors: string[] = []) {
  try {
    // Get business context if available
    let businessContext: BusinessContext = {};
    let country = "ZA";
    
    const { data: authData } = await supabase.auth.getSession();
    if (authData?.session?.user) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('business_context')
        .eq('id', authData.session.user.id)
        .single();
        
      if (!error && data && data.business_context) {
        // Type assertion to ensure correct typing
        const contextData = data.business_context as BusinessContext;
        businessContext = contextData;
        country = contextData.country || "ZA";
      }
    }
    
    const { data, error } = await supabase.functions.invoke('analyze-transaction-vendor', {
      body: { 
        description,
        existingVendors,
        country,
        context: businessContext
      }
    });
    
    if (error) {
      console.error("Error calling analyze-transaction-vendor:", error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error("Error in extractVendorWithAI:", err);
    // Fall back to local extraction
    return { 
      vendor: extractVendorName(description),
      isExisting: false,
      confidence: 0.5
    };
  }
}

/**
 * Checks if a vendor has been verified enough times to be considered reliable
 */
export function isVendorReliable(vendor: Vendor): boolean {
  return vendor.occurrences >= 5 && vendor.verified;
}

/**
 * Calculates similarity between two vendor names
 * Useful for finding similar vendors in the database
 */
export function calculateVendorSimilarity(vendor1: string, vendor2: string): number {
  const normalize = (str: string) => str.toLowerCase().trim();
  
  const v1 = normalize(vendor1);
  const v2 = normalize(vendor2);
  
  // Exact match
  if (v1 === v2) return 1.0;
  
  // One is substring of the other
  if (v1.includes(v2) || v2.includes(v1)) {
    const lengthRatio = Math.min(v1.length, v2.length) / Math.max(v1.length, v2.length);
    return 0.7 + (lengthRatio * 0.3); // Score between 0.7 and 1.0
  }
  
  // Convert to word sets
  const words1 = new Set(v1.split(/\s+/));
  const words2 = new Set(v2.split(/\s+/));
  
  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Process a batch of transactions to identify common patterns
 * and improve vendor extraction accuracy
 */
export function analyzeCommonPatterns(descriptions: string[]): Record<string, number> {
  if (!descriptions || descriptions.length < 3) {
    return {};
  }
  
  // Tokenize all descriptions to find common elements
  const words: Record<string, number> = {};
  const commonPrefixes: Record<string, number> = {};
  
  // First pass: identify common prefixes and terms
  descriptions.forEach(description => {
    if (!description) return;
    
    // Split into words and normalize
    const tokens = description.toUpperCase().split(/\s+/);
    
    // Track potential prefixes (first 1-3 words)
    const potentialPrefixes = [];
    for (let i = 0; i < Math.min(3, tokens.length); i++) {
      const prefix = tokens.slice(0, i+1).join(' ');
      potentialPrefixes.push(prefix);
      
      if (commonPrefixes[prefix]) {
        commonPrefixes[prefix]++;
      } else {
        commonPrefixes[prefix] = 1;
      }
    }
    
    // Track all words
    tokens.forEach(token => {
      // Skip short tokens, numbers, and common words
      if (token.length < 3 || /^\d+$/.test(token) || WORDS_TO_REMOVE.includes(token)) {
        return;
      }
      
      if (words[token]) {
        words[token]++;
      } else {
        words[token] = 1;
      }
    });
  });
  
  // Find prefixes that appear in more than 30% of descriptions
  const threshold = Math.max(2, Math.floor(descriptions.length * 0.3));
  const commonTokens = Object.entries(words)
    .filter(([word, count]) => count >= threshold)
    .reduce((acc, [word, count]) => {
      acc[word] = count;
      return acc;
    }, {} as Record<string, number>);
    
  const frequentPrefixes = Object.entries(commonPrefixes)
    .filter(([prefix, count]) => count >= threshold)
    .reduce((acc, [prefix, count]) => {
      acc[prefix] = count;
      return acc;
    }, {} as Record<string, number>);
    
  return {...commonTokens, ...frequentPrefixes};
}

// New function to use pattern analysis for better vendor extraction
export function extractVendorWithPatternAnalysis(
  description: string, 
  commonPatterns: Record<string, number>
): string {
  if (!description || typeof description !== 'string') return "Unknown";
  
  let vendor = description.trim().toUpperCase();
  
  // Remove common prefixes from patterns first
  for (const pattern of Object.keys(commonPatterns).sort((a, b) => b.length - a.length)) {
    if (vendor.startsWith(pattern)) {
      vendor = vendor.substring(pattern.length).trim();
      break;
    }
  }
  
  // Continue with regular extraction
  for (const prefix of COMMON_PREFIXES) {
    if (vendor.startsWith(prefix.toUpperCase())) {
      vendor = vendor.substring(prefix.length).trim();
      break;
    }
  }
  
  // Remove common suffixes using regex for more flexible matching
  for (const suffix of COMMON_SUFFIXES) {
    const regex = new RegExp(`${suffix.toUpperCase()}$`, 'i');
    vendor = vendor.replace(regex, '');
  }
  
  // Remove transaction IDs and numbers (common patterns)
  vendor = vendor.replace(/\b\d{5,}\b/g, ""); // Remove long numbers
  vendor = vendor.replace(/\b[A-Z0-9]{10,}\b/g, ""); // Remove long alphanumeric strings
  vendor = vendor.replace(/REF:\s*\S+/gi, ""); // Remove reference numbers
  vendor = vendor.replace(/\d{2}\/\d{2}\/\d{2,4}/g, ""); // Remove dates
  vendor = vendor.replace(/\d+\.\d+/g, ""); // Remove decimal numbers
  vendor = vendor.replace(/\(\d+\)/g, ""); // Remove numbers in parentheses
  vendor = vendor.replace(/\d+\*+\d+/g, ""); // Remove patterns like 485442*7284
  vendor = vendor.replace(/\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4}/g, ""); // Remove dates like "17 Feb 2023"
  
  // Handle special case formats
  // Format: VENDOR*LOCATION or VENDOR*SERVICE
  if (vendor.includes('*')) {
    vendor = vendor.split('*')[0];
  }
  
  // Format: VENDOR-DETAILS or VENDOR/DETAILS
  if (vendor.includes('-') && !vendor.startsWith('-')) {
    vendor = vendor.split('-')[0];
  }
  if (vendor.includes('/') && !vendor.startsWith('/')) {
    vendor = vendor.split('/')[0];
  }
  
  // Split into words and filter out words to remove
  const words = vendor.split(/\s+/).filter(word => 
    word.length > 1 && !WORDS_TO_REMOVE.includes(word) && !/^\d+$/.test(word)
  );
  
  // Join words back and take the first 2 words max for conciseness
  vendor = words.slice(0, 2).join(" ");
  
  // Title case the final vendor name
  vendor = vendor.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
  
  // If vendor is empty after all processing, use "Unknown"
  if (!vendor.trim()) {
    return "Unknown";
  }
  
  return vendor.trim();
}

// Add the missing function for AI transaction analysis
export const analyzeTransactionWithAI = async (transaction: Transaction, existingVendors: string[] = []) => {
  try {
    const result = await extractVendorWithAI(transaction.description, existingVendors);
    
    return {
      ...transaction,
      vendor: result.vendor,
      category: result.category || transaction.category,
      type: result.type || transaction.type,
      statementType: result.statementType || transaction.statementType,
      confidenceScore: result.confidence || transaction.confidenceScore,
    };
  } catch (err) {
    console.error("Error in analyzeTransactionWithAI:", err);
    return transaction;
  }
};

// Update the batch analysis function to use pattern analysis
export const batchAnalyzeTransactions = async (
  transactions: Transaction[],
  existingVendors: string[],
  updateTransaction: (transaction: Transaction) => Promise<void>
) => {
  const results = {
    processed: 0,
    updated: 0,
    errors: 0
  };
  
  // First, analyze all descriptions to find common patterns
  const descriptions = transactions
    .filter(t => !t.vendor || t.vendor === 'Unknown')
    .map(t => t.description);
    
  const commonPatterns = analyzeCommonPatterns(descriptions);
  
  // Process transactions 
  for (const transaction of transactions) {
    try {
      results.processed++;
      if (!transaction.vendor || transaction.vendor === 'Unknown') {
        // Use AI-based extraction when available
        try {
          const updatedTransaction = await analyzeTransactionWithAI(transaction, existingVendors);
          
          if (updatedTransaction.vendor && updatedTransaction.vendor !== 'Unknown') {
            await updateTransaction(updatedTransaction);
            results.updated++;
            continue;
          }
        } catch (err) {
          console.warn("AI extraction failed, falling back to pattern analysis:", err);
        }
        
        // Fall back to pattern-based extraction
        const vendorName = extractVendorWithPatternAnalysis(transaction.description, commonPatterns);
        if (vendorName && vendorName !== 'Unknown') {
          const updatedTransaction = {
            ...transaction,
            vendor: vendorName,
            confidenceScore: 0.6 // Pattern matching is less confident than AI
          };
          
          await updateTransaction(updatedTransaction);
          results.updated++;
        }
      }
    } catch (err) {
      console.error(`Error processing transaction ID ${transaction.id}`, err);
      results.errors++;
    }
  }
  
  return results;
};
