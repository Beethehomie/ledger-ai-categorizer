import { Transaction, Category } from "../types";
import { mockCategories } from "../data/mockData";
import { extractVendorName } from "./vendorExtractor";

export interface CSVParseResult {
  transactions: Transaction[];
  warnings: string[];
  headers: string[];
  mappedFields: Record<string, string>;
}

export const validateCSVStructure = (csvString: string): { 
  isValid: boolean; 
  headers: string[];
  errorMessage?: string;
} => {
  if (!csvString || typeof csvString !== 'string') {
    return { isValid: false, headers: [], errorMessage: 'Invalid CSV content' };
  }

  const lines = csvString.split('\n');
  if (lines.length < 2) {
    return { isValid: false, headers: [], errorMessage: 'CSV file must have at least a header row and one data row' };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  
  // Check for required headers (case insensitive)
  const requiredFields = ['date', 'description', 'amount'];
  const lowerCaseHeaders = headers.map(h => h.toLowerCase());
  
  const missingFields = requiredFields.filter(field => 
    !lowerCaseHeaders.some(header => header.includes(field))
  );

  if (missingFields.length > 0) {
    return { 
      isValid: false, 
      headers,
      errorMessage: `Required fields missing: ${missingFields.join(', ')}. Please ensure your CSV has Date, Description, and Amount columns.` 
    };
  }

  return { isValid: true, headers };
};

export const mapCSVHeaders = (headers: string[]): Record<string, string> => {
  const lowerCaseHeaders = headers.map(h => h.toLowerCase());
  const fieldMapping: Record<string, string> = {};
  
  // Map headers to standard fields
  headers.forEach((header, index) => {
    const lowerHeader = lowerCaseHeaders[index];
    
    if (lowerHeader.includes('date')) {
      fieldMapping['date'] = header;
    } else if (lowerHeader.includes('desc')) {
      fieldMapping['description'] = header;
    } else if (lowerHeader.includes('amount') || lowerHeader.includes('sum') || lowerHeader.includes('value')) {
      fieldMapping['amount'] = header;
    } else if (lowerHeader.includes('balance')) {
      fieldMapping['balance'] = header;
    } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
      fieldMapping['category'] = header;
    }
  });
  
  return fieldMapping;
};

export const parseCSV = (csvString: string): CSVParseResult => {
  const result: CSVParseResult = {
    transactions: [],
    warnings: [],
    headers: [],
    mappedFields: {}
  };
  
  // Validate CSV structure
  const validation = validateCSVStructure(csvString);
  if (!validation.isValid) {
    result.warnings.push(validation.errorMessage || 'Invalid CSV format');
    return result;
  }
  
  // Get headers and map them
  result.headers = validation.headers;
  result.mappedFields = mapCSVHeaders(validation.headers);
  
  // Skip the header line and split by newlines
  const rows = csvString.split('\n').slice(1).filter(row => row.trim() !== '');
  
  // Find indexes for required fields
  const headerIndexes = result.headers.reduce<Record<string, number>>((acc, header, index) => {
    Object.entries(result.mappedFields).forEach(([field, mappedHeader]) => {
      if (mappedHeader === header) {
        acc[field] = index;
      }
    });
    return acc;
  }, {});
  
  if (!('date' in headerIndexes) || !('description' in headerIndexes) || !('amount' in headerIndexes)) {
    result.warnings.push('Could not identify all required fields (date, description, amount)');
    return result;
  }
  
  result.transactions = rows.map((row, index) => {
    // Handle values that might contain commas by looking for quoted values
    const values: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"' && (i === 0 || row[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Add the last value
    
    // Clean up quotes from values
    const cleanValues = values.map(val => {
      if (val.startsWith('"') && val.endsWith('"')) {
        return val.slice(1, -1).replace(/""/g, '"');
      }
      return val.trim();
    });
    
    // Extract values using mapped indexes
    const date = cleanValues[headerIndexes.date] || '';
    const description = cleanValues[headerIndexes.description] || '';
    let amount = 0;
    let balance = undefined;
    
    // Parse amount, handling various formats
    try {
      const amountStr = cleanValues[headerIndexes.amount] || '0';
      // Remove currency symbols, handle parentheses for negative values
      const cleanAmount = amountStr
        .replace(/[$£€]/g, '')
        .replace(/,/g, '')
        .replace(/\(([^)]+)\)/, '-$1')
        .trim();
      
      amount = parseFloat(cleanAmount);
      
      // If amount is NaN, add a warning
      if (isNaN(amount)) {
        result.warnings.push(`Could not parse amount "${amountStr}" on row ${index + 2}`);
        amount = 0;
      }
    } catch (e) {
      result.warnings.push(`Error parsing amount on row ${index + 2}`);
      amount = 0;
    }
    
    // Parse balance if available
    if ('balance' in headerIndexes) {
      try {
        const balanceStr = cleanValues[headerIndexes.balance] || '';
        const cleanBalance = balanceStr
          .replace(/[$£€]/g, '')
          .replace(/,/g, '')
          .replace(/\(([^)]+)\)/, '-$1')
          .trim();
        
        balance = parseFloat(cleanBalance);
        if (isNaN(balance)) {
          balance = undefined;
        }
      } catch (e) {
        // Ignore balance parsing errors
      }
    }
    
    // Generate a unique ID
    const id = `temp-${Date.now()}-${index}`;
    
    // Extract vendor name from description, ensuring we always get a value
    const vendorName = extractVendorName(description);
    
    // Create transaction object
    const transaction: Transaction = {
      id,
      date,
      description,
      amount,
      isVerified: false,
      vendor: vendorName
    };
    
    // Add balance if available
    if (balance !== undefined) {
      transaction.balance = balance;
    }
    
    // Try auto-categorization
    const categorization = categorizeByCriteria(transaction);
    if (categorization) {
      transaction.category = categorization.categoryName;
      transaction.type = categorization.type;
      transaction.statementType = categorization.statementType;
      transaction.aiSuggestion = categorization.categoryName;
    }
    
    return transaction;
  });
  
  return result;
};

// Simulate AI-driven categorization using keyword matching
// In a real app, this would call an actual AI service
export const categorizeByCriteria = (transaction: Transaction): {
  categoryName: string;
  type: Transaction['type'];
  statementType: Transaction['statementType'];
} | null => {
  const description = transaction.description.toLowerCase();
  const vendor = transaction.vendor?.toLowerCase() || '';
  
  // Check each category for matching keywords
  for (const category of mockCategories) {
    for (const keyword of category.keywords) {
      if (description.includes(keyword.toLowerCase()) || vendor.includes(keyword.toLowerCase())) {
        return {
          categoryName: category.name,
          type: category.type,
          statementType: category.statementType,
        };
      }
    }
  }
  
  // No clear match found
  return null;
};

// Simulate AI analysis for transactions that couldn't be automatically categorized
export const analyzeTransactionWithAI = (transaction: Transaction): {
  aiSuggestion: string;
  confidence: number;
} => {
  // In a real app, this would call an AI service like OpenAI or a custom model
  // For now, we're implementing a basic "smart" logic for demonstration
  
  const description = transaction.description.toLowerCase();
  const vendor = transaction.vendor?.toLowerCase() || '';
  let bestMatch = { categoryName: "", matchScore: 0 };
  
  // Check for partial keyword matches
  for (const category of mockCategories) {
    for (const keyword of category.keywords) {
      // Calculate simple string similarity (very basic for demo)
      const keywordParts = keyword.toLowerCase().split(' ');
      let matchScore = 0;
      
      for (const part of keywordParts) {
        if (description.includes(part) || vendor.includes(part)) {
          matchScore += 1;
        }
      }
      
      if (matchScore > bestMatch.matchScore) {
        bestMatch = { categoryName: category.name, matchScore };
      }
    }
  }
  
  // If no matches found, make an educated guess based on amount
  if (bestMatch.matchScore === 0) {
    if (transaction.amount > 0) {
      return { aiSuggestion: "Sales Revenue", confidence: 0.4 };
    } else {
      return { aiSuggestion: "Office Supplies", confidence: 0.3 };
    }
  }
  
  // Calculate confidence based on match quality
  const confidence = Math.min(0.5 + (bestMatch.matchScore * 0.1), 0.9);
  
  return {
    aiSuggestion: bestMatch.categoryName,
    confidence,
  };
};

export const exportToCSV = (transactions: Transaction[]): string => {
  const headers = "Date,Description,Amount,Category,Type,Statement Type,Vendor,Balance,Verified\n";
  
  const rows = transactions.map(t => {
    return `${t.date},"${t.description}",${t.amount},${t.category || ''},${t.type || ''},${t.statementType || ''},${t.vendor || ''},${t.balance || ''},${t.isVerified}`;
  }).join('\n');
  
  return headers + rows;
};

export const calculateRunningBalance = (
  transactions: Transaction[],
  initialBalance: number,
  balanceDate?: Date
): Transaction[] => {
  // Clone the transactions to avoid mutating the original array
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB; // Sort by date ascending
  });

  let runningBalance = initialBalance;
  
  return sortedTransactions.map(transaction => {
    // Update the running balance with this transaction
    runningBalance += transaction.amount;
    
    // Create a new transaction object with the balance
    return {
      ...transaction,
      balance: Number(runningBalance.toFixed(2)) // Round to 2 decimal places and convert back to number
    };
  });
};

export const isBalanceReconciled = (
  transactions: Transaction[],
  expectedEndBalance?: number
): boolean => {
  if (!expectedEndBalance || transactions.length === 0) return false;
  
  // Get the last transaction's balance
  const lastTransaction = transactions[transactions.length - 1];
  const lastBalance = lastTransaction.balance;
  
  if (lastBalance === undefined) return false;
  
  // Compare with expected balance (allow small rounding differences)
  return Math.abs(lastBalance - expectedEndBalance) < 0.02;
};
