import { Transaction } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

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
        bank_connection_id: transaction.bankAccountId || null,
        balance: transaction.balance || null,
        account_id: transaction.accountId || null
      }));
      
      // Insert transactions into the bank_transactions table (not vendor_categorizations)
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
          bankAccountId: t.bank_connection_id || undefined,
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

export const updateTransactionWithBankInfo = (transaction: Transaction, bankConnections: any[]) => {
  // If transaction already has bank account info, return it as is
  if (transaction.bankAccountName) {
    return transaction;
  }

  // Try to find the bank connection by bankAccountId
  if (transaction.bankAccountId) {
    const bankConnection = bankConnections.find(conn => conn.id === transaction.bankAccountId);
    if (bankConnection) {
      return {
        ...transaction,
        bankAccountName: bankConnection.display_name || bankConnection.bank_name
      };
    }
  }

  // Try to find the bank connection by accountId as a fallback
  if (transaction.accountId) {
    const bankConnection = bankConnections.find(conn => conn.id === transaction.accountId);
    if (bankConnection) {
      return {
        ...transaction,
        bankAccountId: transaction.accountId,
        bankAccountName: bankConnection.display_name || bankConnection.bank_name
      };
    }
  }

  return transaction;
};
