
// Add the new functions to your existing service file
import { Transaction } from '@/types';
import { extractVendorWithAI } from '@/utils/vendorExtractor';

interface FindSimilarTransactionsFunction {
  (vendorName: string, transactions: Transaction[]): Promise<Transaction[]>;
}

export const findSimilarVendorTransactions = async (
  vendorName: string,
  transactions: Transaction[],
  findSimilarTransactions: FindSimilarTransactionsFunction
): Promise<Transaction[]> => {
  try {
    // First use the existing similar transactions finder
    const similarTransactions = await findSimilarTransactions(vendorName, transactions);
    
    // Then return the results
    return similarTransactions;
  } catch (err) {
    console.error('Error in findSimilarVendorTransactions:', err);
    return [];
  }
};

export const analyzeTransactionWithAI = async (transaction: Transaction, existingVendors: string[]) => {
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
    console.error('Error in analyzeTransactionWithAI:', err);
    return transaction;
  }
};

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
  
  for (const transaction of transactions) {
    try {
      results.processed++;
      if (!transaction.vendor || transaction.vendor === 'Unknown') {
        const updatedTransaction = await analyzeTransactionWithAI(transaction, existingVendors);
        
        if (updatedTransaction.vendor && updatedTransaction.vendor !== 'Unknown') {
          await updateTransaction(updatedTransaction);
          results.updated++;
        }
      }
    } catch (err) {
      console.error(`Error processing transaction ID ${transaction.id}:`, err);
      results.errors++;
    }
  }
  
  return results;
};
