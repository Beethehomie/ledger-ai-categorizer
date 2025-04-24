
import { Transaction, Vendor } from '@/types';
import { extractVendorWithAI } from '@/utils/vendorExtractor';
import { supabase } from '@/integrations/supabase/client';

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

/**
 * Adds a new vendor to the database
 * @param vendor The vendor object to add
 * @returns An object with a success flag and optional error message
 */
export const addVendor = async (vendor: Vendor): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase
      .from('vendor_categorizations')
      .insert({
        vendor_name: vendor.name,
        category: vendor.category || '',
        type: vendor.type || 'expense',
        statement_type: vendor.statementType || 'profit_loss',
        occurrences: vendor.occurrences || 1,
        verified: vendor.verified || false,
        last_used: new Date().toISOString()
      });

    if (error) throw error;
    
    return { success: true };
  } catch (err) {
    console.error('Error adding vendor:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to add vendor to database' 
    };
  }
};

