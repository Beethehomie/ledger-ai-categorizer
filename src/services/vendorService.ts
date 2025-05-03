import { supabase } from '@/integrations/supabase/client';
import { Transaction, Vendor } from '@/types';
import { toast } from '@/utils/toast';

// Find similar transactions based on a vendor name
export const findSimilarVendorTransactions = async (
  vendorName: string,
  transactions: Transaction[]
): Promise<Transaction[]> => {
  try {
    // Get transactions for this vendor
    const vendorTransactions = transactions.filter(t => 
      t.vendor === vendorName || 
      t.description.toLowerCase().includes(vendorName.toLowerCase())
    );
    
    // If we already have enough transactions for this vendor, return them
    if (vendorTransactions.length >= 5) {
      return vendorTransactions;
    }
    
    // Otherwise, try to find more using the vendor name
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .or(`vendor.eq.${vendorName},description.ilike.%${vendorName}%`)
      .order('date', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error finding similar vendor transactions:', error);
      toast.error('Failed to find similar transactions');
      return vendorTransactions;
    }
    
    // Map the database results to the Transaction type
    const dbTransactions = data.map((t): Transaction => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      category: t.category || undefined,
      type: t.type as Transaction['type'] || undefined,
      statementType: t.statement_type as Transaction['statementType'] || undefined,
      isVerified: t.is_verified || false,
      vendor: t.vendor || undefined,
      vendorVerified: t.vendor_verified || false,
      confidenceScore: t.confidence_score ? Number(t.confidence_score) : undefined,
      bankAccountId: t.bank_connection_id || undefined,
      balance: t.balance || undefined,
      accountId: t.account_id || undefined,
    }));
    
    // Merge the results without duplicates
    const allTransactions = [...vendorTransactions];
    
    dbTransactions.forEach(dbTxn => {
      if (!allTransactions.some(t => t.id === dbTxn.id)) {
        allTransactions.push(dbTxn);
      }
    });
    
    return allTransactions;
  } catch (err) {
    console.error('Error in findSimilarVendorTransactions:', err);
    toast.error('Failed to process vendor transactions');
    return [];
  }
};

// Add a new vendor to the database
export const addVendor = async (vendor: Vendor): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('vendor_categorizations')
      .insert({
        vendor_name: vendor.name,
        category: vendor.category,
        type: vendor.type,
        statement_type: vendor.statementType,
        occurrences: vendor.occurrences,
        verified: vendor.verified
      });
      
    if (error) {
      console.error('Error adding vendor:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in addVendor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
};

// Delete a transaction
export const deleteTransaction = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteTransaction:', error);
    toast.error('Failed to delete transaction');
    return false;
  }
};

// Process transactions with AI
export const processTransactionsWithAI = async (
  transactions: Transaction[]
): Promise<Transaction[]> => {
  if (!transactions || transactions.length === 0) {
    return [];
  }
  
  const processedTransactions = [...transactions];
  const vendorCache = new Map<string, { vendor: string, category: string, type: string, statementType: string }>();
  
  // Get list of existing vendor names to help the AI
  const { data: vendorData } = await supabase
    .from('vendor_categorizations')
    .select('vendor_name')
    .order('occurrences', { ascending: false })
    .limit(100);
    
  const existingVendors = vendorData?.map(v => v.vendor_name) || [];
  
  // Process each transaction that doesn't have a vendor or is unverified
  for (let i = 0; i < processedTransactions.length; i++) {
    const txn = processedTransactions[i];
    
    // Skip if already has verified vendor
    if (txn.vendor && txn.vendorVerified) {
      continue;
    }
    
    try {
      // Check if we've already processed a similar description
      const similarKey = Array.from(vendorCache.keys()).find(key => 
        txn.description.toLowerCase().includes(key.toLowerCase())
      );
      
      if (similarKey) {
        const cached = vendorCache.get(similarKey)!;
        processedTransactions[i] = {
          ...txn,
          vendor: cached.vendor,
          category: txn.category || cached.category,
          type: txn.type || cached.type as Transaction['type'],
          statementType: txn.statementType || cached.statementType as Transaction['statementType'],
          confidenceScore: 0.8, // Higher confidence for cache hits
        };
        continue;
      }
      
      // Call the AI to extract vendor
      const { data, error } = await supabase.functions.invoke('analyze-transaction-vendor', {
        body: {
          description: txn.description,
          existingVendors
        }
      });
      
      if (error) {
        console.error(`Error processing transaction ${i}:`, error);
        continue;
      }
      
      if (data && data.vendor) {
        processedTransactions[i] = {
          ...txn,
          vendor: data.vendor,
          category: txn.category || data.category,
          type: txn.type || data.type as Transaction['type'],
          statementType: txn.statementType || data.statementType as Transaction['statementType'],
          confidenceScore: data.confidence,
        };
        
        // Add to cache for similar descriptions
        vendorCache.set(txn.description, {
          vendor: data.vendor,
          category: data.category,
          type: data.type,
          statementType: data.statementType
        });
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`Error processing transaction ${i}:`, err);
    }
  }
  
  return processedTransactions;
};

// Update a vendor with AI
export const updateVendorWithAI = async (
  transaction: Transaction
): Promise<Transaction> => {
  try {
    if (!transaction.description) {
      return transaction;
    }
    
    // Call the AI to extract vendor
    const { data, error } = await supabase.functions.invoke('analyze-transaction-vendor', {
      body: {
        description: transaction.description
      }
    });
    
    if (error) {
      console.error('Error updating vendor with AI:', error);
      toast.error('Failed to extract vendor information');
      return transaction;
    }
    
    if (data && data.vendor) {
      return {
        ...transaction,
        vendor: data.vendor,
        category: transaction.category || data.category || undefined,
        type: transaction.type || data.type as Transaction['type'] || undefined,
        statementType: transaction.statementType || data.statementType as Transaction['statementType'] || undefined,
        confidenceScore: data.confidence || 0.7,
      };
    }
    
    return transaction;
  } catch (err) {
    console.error('Error in updateVendorWithAI:', err);
    toast.error('Failed to process vendor information');
    return transaction;
  }
};
