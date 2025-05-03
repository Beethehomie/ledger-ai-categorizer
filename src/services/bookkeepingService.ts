
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types';
import { toast } from '@/utils/toast';

export const findDuplicatesInDatabase = async (transactions: Transaction[]): Promise<Transaction[]> => {
  const duplicates: Transaction[] = [];
  
  try {
    // Group transactions by date, amount, and description to batch check for duplicates
    const transactionGroups: Record<string, Transaction[]> = {};
    
    transactions.forEach(transaction => {
      // Create a key combining date, amount, and description
      const key = `${transaction.date}-${transaction.amount}-${transaction.description}`;
      if (!transactionGroups[key]) {
        transactionGroups[key] = [];
      }
      transactionGroups[key].push(transaction);
    });
    
    // Check each group against the database
    for (const key in transactionGroups) {
      const group = transactionGroups[key];
      const sampleTransaction = group[0];
      
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('date', sampleTransaction.date)
        .eq('amount', sampleTransaction.amount)
        .eq('description', sampleTransaction.description);
        
      if (error) {
        console.error('Error checking for duplicates:', error);
        continue;
      }
      
      if (data && data.length > 0) {
        // If matches found, mark these transactions as duplicates
        duplicates.push(...group);
      }
    }
    
    return duplicates;
  } catch (err) {
    console.error('Error in findDuplicatesInDatabase:', err);
    return [];
  }
};

export const reconcileAccountBalance = async (bankConnectionId: string, expectedBalance: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('balance')
      .eq('bank_connection_id', bankConnectionId)
      .order('date', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error('Error fetching latest balance:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.warn('No transactions found for reconciliation');
      return false;
    }
    
    const latestBalance = data[0].balance || 0;
    
    // Allow for a small difference due to rounding or calculation differences
    const tolerance = 0.01; // 1 cent tolerance
    return Math.abs(latestBalance - expectedBalance) <= tolerance;
  } catch (err) {
    console.error('Error in reconcileAccountBalance:', err);
    return false;
  }
};

export const updateTransactionBalances = async (bankAccountId: string, initialBalance: number = 0): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_connection_id', bankAccountId)
      .order('date', { ascending: true });
      
    if (error) {
      console.error('Error fetching transactions for balance update:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.warn('No transactions found for balance update');
      return true; // Nothing to update
    }
    
    let runningBalance = initialBalance;
    const updates = [];
    
    for (const transaction of data) {
      runningBalance += Number(transaction.amount);
      updates.push({
        id: transaction.id,
        balance: Number(runningBalance.toFixed(2))
      });
    }
    
    // Update transactions in batches to avoid timeouts
    const batchSize = 50;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('bank_transactions')
          .update({ balance: update.balance })
          .eq('id', update.id);
          
        if (updateError) {
          console.error('Error updating balance:', updateError);
          return false;
        }
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error in updateTransactionBalances:', err);
    return false;
  }
};

export const getBankAccountIdFromConnection = async (bankConnectionId: string): Promise<string | null> => {
  try {
    // In this implementation, we assume the bank_connection_id can be used directly
    // as the account_id when needed, since there's no direct mapping in the database
    // This is a simplified approach; in a real app, you might query a mapping table
    
    // First check if the connection exists
    const { data, error } = await supabase
      .from('bank_connections')
      .select('id')
      .eq('id', bankConnectionId)
      .single();
      
    if (error || !data) {
      console.error('Error getting bank connection:', error);
      return null;
    }
    
    // Return the connection ID as the account ID for now
    return bankConnectionId;
  } catch (err) {
    console.error('Error in getBankAccountIdFromConnection:', err);
    return null;
  }
};
