
import { Vendor } from '../types';

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
  if (!description) return "";
  
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
  
  // Join words back and take the first 3 words max for conciseness
  vendor = words.slice(0, 3).join(" ");
  
  // Title case the final vendor name
  vendor = vendor.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
  
  return vendor.trim();
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
