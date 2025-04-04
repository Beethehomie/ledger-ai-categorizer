
import { Vendor } from '../types';

// Common prefixes and suffixes to remove from transaction descriptions
const COMMON_PREFIXES = [
  "POS PURCHASE ", "PURCHASE ", "FNB PAYMENT ", "PAYMENT ", "CARD PURCHASE ", 
  "DEBIT ORDER ", "EFT PAYMENT ", "DIRECT DEBIT ", "TRANSFER ", "ATM WITHDRAWAL ",
  "CREDIT ", "DEBIT ", "POS ", "TFR ", "TRANSACTION ", "PAYMENT TO "
];

const COMMON_SUFFIXES = [
  " ACCOUNT", " CARD", " PAYMENT", " DEBIT", " CREDIT", " TRANSFER", " TXN", " TRANSACTION",
  " WITHDRAW", " DEPOSIT", " FEE", " CHARGE", " SERVICE", " LLC", " INC", " LTD", " LIMITED",
  " PTY", " (PTY)", " (PTY) LTD", " TECHNOLOGIES", " TECHNOLOGY", " SOLUTIONS", " CC"
];

// Words to remove entirely
const WORDS_TO_REMOVE = [
  "THE", "A", "AN", "AND", "OR", "AT", "ON", "IN", "TO", "FOR", "BY", "WITH", "FROM",
  "OF", "LTD", "LLC", "INC", "CO", "CORP", "CORPORATION", "PTY", "LIMITED"
];

/**
 * Extracts a concise vendor name from a transaction description
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
  
  // Remove common suffixes
  for (const suffix of COMMON_SUFFIXES) {
    if (vendor.endsWith(suffix.toUpperCase())) {
      vendor = vendor.substring(0, vendor.length - suffix.length);
      break;
    }
  }
  
  // Remove transaction IDs and numbers (common patterns)
  vendor = vendor.replace(/\b\d{5,}\b/g, ""); // Remove long numbers
  vendor = vendor.replace(/\b[A-Z0-9]{10,}\b/g, ""); // Remove long alphanumeric strings
  vendor = vendor.replace(/REF:\s*\S+/gi, ""); // Remove reference numbers
  vendor = vendor.replace(/\d{2}\/\d{2}\/\d{2,4}/g, ""); // Remove dates
  vendor = vendor.replace(/\d+\.\d+/g, ""); // Remove decimal numbers
  vendor = vendor.replace(/\(\d+\)/g, ""); // Remove numbers in parentheses
  
  // Split into words and filter out words to remove
  const words = vendor.split(/\s+/).filter(word => 
    word.length > 1 && !WORDS_TO_REMOVE.includes(word)
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
