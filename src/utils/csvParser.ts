
import { Transaction, Category } from "../types";
import { mockCategories } from "../data/mockData";

export const parseCSV = (csvString: string): Transaction[] => {
  // Skip the header line and split by newlines
  const rows = csvString.split('\n').slice(1).filter(row => row.trim() !== '');
  
  const transactions: Transaction[] = rows.map((row, index) => {
    const columns = row.split(',').map(col => col.trim());
    
    // Assume CSV structure: Date, Description, Amount
    // Adjust indices as needed based on your actual CSV structure
    if (columns.length >= 3) {
      const date = columns[0];
      const description = columns[1];
      const amount = parseFloat(columns[2].replace(/[^\d.-]/g, ''));
      
      // Generate a unique ID
      const id = (Date.now() + index).toString();
      
      const transaction: Transaction = {
        id,
        date,
        description,
        amount,
        isVerified: false,
      };
      
      // Try auto-categorization
      const categorization = categorizeByCriteria(transaction);
      if (categorization) {
        transaction.category = categorization.categoryName;
        transaction.type = categorization.type;
        transaction.statementType = categorization.statementType;
        transaction.aiSuggestion = categorization.categoryName;
      }
      
      return transaction;
    }
    
    // Return a default transaction if parsing fails
    return {
      id: (Date.now() + index).toString(),
      date: '',
      description: 'Error parsing row',
      amount: 0,
      isVerified: false,
    };
  });
  
  return transactions;
};

// Simulate AI-driven categorization using keyword matching
// In a real app, this would call an actual AI service
export const categorizeByCriteria = (transaction: Transaction): {
  categoryName: string;
  type: Transaction['type'];
  statementType: Transaction['statementType'];
} | null => {
  const description = transaction.description.toLowerCase();
  
  // Check each category for matching keywords
  for (const category of mockCategories) {
    for (const keyword of category.keywords) {
      if (description.includes(keyword.toLowerCase())) {
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
  let bestMatch = { categoryName: "", matchScore: 0 };
  
  // Check for partial keyword matches
  for (const category of mockCategories) {
    for (const keyword of category.keywords) {
      // Calculate simple string similarity (very basic for demo)
      const keywordParts = keyword.toLowerCase().split(' ');
      let matchScore = 0;
      
      for (const part of keywordParts) {
        if (description.includes(part)) {
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
  const headers = "Date,Description,Amount,Category,Type,Statement Type,Verified\n";
  
  const rows = transactions.map(t => {
    return `${t.date},"${t.description}",${t.amount},${t.category || ''},${t.type || ''},${t.statementType || ''},${t.isVerified}`;
  }).join('\n');
  
  return headers + rows;
};
