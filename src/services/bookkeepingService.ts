
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types';

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

export const updateTransactionBalances = async (
  bankAccountId: string,
  initialBalance: number = 0
): Promise<boolean> => {
  try {
    // Get all transactions for this bank account, sorted by date
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .order('date', { ascending: true });
      
    if (error) throw error;
    if (!data || data.length === 0) return true;
    
    // Calculate running balance
    let runningBalance = initialBalance;
    const updates = data.map(transaction => {
      runningBalance += Number(transaction.amount);
      return {
        id: transaction.id,
        balance: runningBalance
      };
    });
    
    // Update transactions with new balances
    for (const update of updates) {
      const { error } = await supabase
        .from('bank_transactions')
        .update({ balance: update.balance })
        .eq('id', update.id);
        
      if (error) throw error;
    }
    
    return true;
  } catch (err) {
    console.error('Error updating transaction balances:', err);
    return false;
  }
};

export const getBankAccountIdFromConnection = async (
  bankConnectionId: string
): Promise<string | null> => {
  // In a real implementation, you'd query your database to get the associated account ID
  // For now, we'll just return the bankConnectionId itself as a simple approach
  return bankConnectionId;
};
