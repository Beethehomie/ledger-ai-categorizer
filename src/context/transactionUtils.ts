
import { Transaction } from '@/types';
import { supabase } from '@/integrations/supabase/client';

/**
 * Process transactions before saving them to the database
 * This includes assigning types, categories, etc.
 */
export const processTransactions = async (
  transactions: Transaction[]
): Promise<Transaction[]> => {
  return transactions.map(transaction => {
    // Ensure all required fields have default values
    return {
      ...transaction,
      isVerified: transaction.isVerified || false,
      vendorVerified: transaction.vendorVerified || false,
    };
  });
};

/**
 * Save transactions to Supabase
 */
export const saveTransactionsToSupabase = async (
  transactions: Transaction[],
  userId: string
): Promise<{ success: boolean; transactions: Transaction[]; errors?: string[] }> => {
  try {
    const errors: string[] = [];
    const savedTransactions: Transaction[] = [];
    
    // Insert transactions in batches to avoid possible payload limits
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      
      // Transform transactions to database format
      const dbTransactions = batch.map(transaction => ({
        user_id: userId,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        vendor: transaction.vendor || null,
        category: transaction.category || null,
        type: transaction.type || null,
        statement_type: transaction.statementType || null,
        is_verified: transaction.isVerified || false,
        vendor_verified: transaction.vendorVerified || false,
        confidence_score: transaction.confidenceScore || null,
        bank_account_id: transaction.bankAccountId || null,
        balance: transaction.balance || null,
        account_id: transaction.accountId || null
      }));
      
      // Insert transactions into the bank_transactions table
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(dbTransactions)
        .select();
        
      if (error) {
        console.error('Error inserting transactions:', error);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`);
      } else if (data) {
        // Map returned data back to Transaction type
        const insertedTransactions: Transaction[] = data.map(t => ({
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
          bankAccountId: t.bank_account_id || undefined,
          balance: t.balance ? Number(t.balance) : undefined,
          accountId: t.account_id || undefined,
        }));
        
        savedTransactions.push(...insertedTransactions);
      }
    }
    
    return {
      success: errors.length === 0,
      transactions: savedTransactions,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (err) {
    console.error('Error in saveTransactionsToSupabase:', err);
    throw err;
  }
};

export const findDuplicatesInDatabase = async (
  transactions: Transaction[]
): Promise<Transaction[]> => {
  // This is a simplified implementation - in a real app, we'd need
  // a more sophisticated algorithm to detect duplicates
  const duplicates: Transaction[] = [];
  
  for (const transaction of transactions) {
    const { data } = await supabase
      .from('bank_transactions')
      .select('id, date, description, amount')
      .eq('date', transaction.date)
      .eq('amount', transaction.amount)
      .limit(1);
      
    if (data && data.length > 0) {
      duplicates.push(transaction);
    }
  }
  
  return duplicates;
};

export const reconcileAccountBalance = async (
  bankConnectionId: string
): Promise<boolean> => {
  // In a real app, we'd implement logic to check if the account is reconciled
  return true;
};

export const getBankAccountIdFromConnection = async (
  bankConnectionId: string
): Promise<string | null> => {
  // In a real app, we'd query the database for the account ID
  // associated with this bank connection
  return bankConnectionId;
};
