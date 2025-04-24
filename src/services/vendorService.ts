
import { Transaction, Vendor } from '@/types';
import { extractVendorName, extractVendorWithAI } from '@/utils/vendorExtractor';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/errorLogger';

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
    logError('findSimilarVendorTransactions', err);
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
    logError('analyzeTransactionWithAI', err);
    // Use local extraction as fallback when AI fails
    const vendorName = extractVendorName(transaction.description);
    return {
      ...transaction,
      vendor: vendorName,
      confidenceScore: 0.4 // Lower confidence for local extraction
    };
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
    errors: 0,
    aiProcessed: 0,
    fallbackProcessed: 0
  };
  
  for (const transaction of transactions) {
    try {
      results.processed++;
      if (!transaction.vendor || transaction.vendor === 'Unknown') {
        let updatedTransaction;
        
        try {
          // Try AI analysis first
          updatedTransaction = await analyzeTransactionWithAI(transaction, existingVendors);
          results.aiProcessed++;
        } catch (err) {
          // Log the error but continue with fallback
          logError(`AI analysis failed for transaction ID ${transaction.id}`, err);
          
          // Use simple extraction as fallback
          const vendorName = extractVendorName(transaction.description);
          updatedTransaction = {
            ...transaction,
            vendor: vendorName,
            confidenceScore: 0.4 // Lower confidence for fallback method
          };
          results.fallbackProcessed++;
        }
        
        if (updatedTransaction.vendor && updatedTransaction.vendor !== 'Unknown') {
          await updateTransaction(updatedTransaction);
          results.updated++;
        }
      }
    } catch (err) {
      logError(`Error processing transaction ID ${transaction.id}`, err);
      results.errors++;
    }
  }
  
  console.log("Batch analysis results:", results);
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

    if (error) {
      // Check if the error is due to duplicate vendor name
      if (error.code === '23505') {
        // Update the existing vendor with the new data
        const { error: updateError } = await supabase
          .from('vendor_categorizations')
          .update({
            last_used: new Date().toISOString(),
            occurrences: vendor.occurrences || 1
          })
          .eq('vendor_name', vendor.name);
          
        if (updateError) throw updateError;
        
        return { success: true };
      }
      throw error;
    }
    
    return { success: true };
  } catch (err) {
    logError('Error adding vendor', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to add vendor to database' 
    };
  }
};

/**
 * Deletes a transaction from the database
 * @param transactionId The ID of the transaction to delete
 * @returns An object with a success flag and optional error message
 */
export const deleteTransaction = async (transactionId: string): Promise<{ success: boolean, error?: string }> => {
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .match({ id: transactionId });

    if (error) throw error;
    
    return { success: true };
  } catch (err) {
    logError('Error deleting transaction', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to delete transaction from database' 
    };
  }
};
