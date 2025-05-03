
import { Transaction } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { processTransactionsWithAI } from '@/services/vendorService';

// Process transactions before saving
export const processTransactions = async (transactions: Transaction[]): Promise<Transaction[]> => {
  // First, add the basic processing (IDs, defaults, etc.)
  const basicProcessed = transactions.map(transaction => ({
    ...transaction,
    id: transaction.id || uuidv4(),
    isVerified: transaction.isVerified || false,
    type: transaction.type || determineTxnType(transaction),
    statementType: transaction.statementType || determineStatementType(transaction)
  }));
  
  // Then run AI processing if there are any transactions without vendors
  const needsAiProcessing = basicProcessed.some(t => !t.vendor);
  
  if (needsAiProcessing) {
    try {
      return await processTransactionsWithAI(basicProcessed);
    } catch (err) {
      console.error('Error in AI processing:', err);
      // Fall back to basic processing if AI fails
      return basicProcessed;
    }
  }
  
  return basicProcessed;
};

// Determine transaction type based on amount
const determineTxnType = (transaction: Transaction): Transaction['type'] => {
  if (transaction.amount > 0) {
    return 'income';
  } else {
    return 'expense';
  }
};

// Determine statement type
const determineStatementType = (transaction: Transaction): Transaction['statementType'] => {
  return 'profit_loss'; // Default to profit/loss statement
};

// Save transactions to Supabase
export const saveTransactionsToSupabase = async (
  transactions: Transaction[],
  userId: string
): Promise<{ transactions: Transaction[]; errors: any[] }> => {
  const savedTransactions: Transaction[] = [];
  const errors: any[] = [];
  
  // Process transactions with AI to get vendors
  const processedTransactions = await processTransactions(transactions);

  // Process in batches to avoid timeouts
  const batchSize = 20;
  const batches = Math.ceil(processedTransactions.length / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, processedTransactions.length);
    const batch = processedTransactions.slice(start, end);
    
    const transactionsToInsert = batch.map(txn => ({
      description: txn.description,
      amount: txn.amount,
      date: txn.date,
      category: txn.category || null,
      type: txn.type || null,
      statement_type: txn.statementType || null,
      is_verified: txn.isVerified || false,
      vendor: txn.vendor || null,
      vendor_verified: txn.vendorVerified || false,
      confidence_score: txn.confidenceScore || null,
      bank_connection_id: txn.bankAccountId || null,
      balance: txn.balance || null,
      user_id: userId,
      account_id: txn.accountId || txn.bankAccountId || null, // Use accountId if available, fallback to bankAccountId
    }));
    
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(transactionsToInsert)
        .select();
        
      if (error) {
        console.error('Error batch saving transactions:', error);
        errors.push(error);
      } else if (data) {
        const mapped = data.map(t => ({
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
        savedTransactions.push(...mapped);
      }
      
      // Generate embeddings for the saved transactions
      if (data && data.length > 0) {
        try {
          await supabase.functions.invoke('generate-embeddings', {
            body: {
              table: 'bank_transactions',
              textField: 'description',
              limit: batch.length
            }
          });
        } catch (embeddingError) {
          console.error('Error generating embeddings:', embeddingError);
          // Non-blocking error - we can continue even if embedding fails
        }
      }
    } catch (err) {
      console.error('Error in saveTransactionsToSupabase:', err);
      errors.push(err);
      
      // Log more details for debugging
      console.error('Failed batch data:', transactionsToInsert);
    }
  }
  
  return { transactions: savedTransactions, errors };
};
