
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types';

export const findDuplicatesInDatabase = async (
  newTransactions: Transaction[]
): Promise<Transaction[]> => {
  if (newTransactions.length === 0) return [];
  
  const duplicates: Transaction[] = [];
  
  for (const transaction of newTransactions) {
    // Check for existing transactions with same date, description, and amount
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('date', transaction.date)
      .eq('description', transaction.description)
      .eq('amount', transaction.amount)
      .limit(1);
      
    if (error) {
      console.error('Error checking for duplicates:', error);
      continue;
    }
    
    if (data && data.length > 0) {
      duplicates.push(transaction);
    }
  }
  
  return duplicates;
};

export const reconcileAccountBalance = async (
  bankAccountId: string,
  targetBalance: number
): Promise<boolean> => {
  try {
    // Get most recent balance for the account
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('balance')
      .eq('bank_connection_id', bankAccountId)
      .order('date', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error('Error fetching transaction balance:', error);
      return false;
    }
    
    if (data && data.length > 0) {
      const currentBalance = Number(data[0].balance);
      // Allow for small rounding differences (2 cents or less)
      return Math.abs(currentBalance - targetBalance) < 0.02;
    }
    
    return false;
  } catch (err) {
    console.error('Error in reconcileAccountBalance:', err);
    return false;
  }
};

export const updateTransactionBalances = async (
  bankAccountId: string,
  initialBalance: number
): Promise<boolean> => {
  try {
    // Get all transactions for the bank account, ordered by date
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_connection_id', bankAccountId)
      .order('date', { ascending: true });
      
    if (error) {
      console.error('Error fetching transactions:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      return false;
    }
    
    let runningBalance = initialBalance;
    let success = true;
    
    // Update balances in sequence
    for (const transaction of data) {
      runningBalance += Number(transaction.amount);
      
      const { error: updateError } = await supabase
        .from('bank_transactions')
        .update({ balance: runningBalance })
        .eq('id', transaction.id);
        
      if (updateError) {
        console.error('Error updating transaction balance:', updateError);
        success = false;
      }
    }
    
    return success;
  } catch (err) {
    console.error('Error in updateTransactionBalances:', err);
    return false;
  }
};

export const getBankAccountIdFromConnection = async (
  bankConnectionId: string
): Promise<string | null> => {
  try {
    console.log('Getting bank account ID for connection:', bankConnectionId);
    
    // First try to find a direct mapping if it exists
    const { data: mappingData, error: mappingError } = await supabase
      .from('bank_accounts')
      .select('account_id')
      .eq('account_name', bankConnectionId)
      .maybeSingle();
      
    if (!mappingError && mappingData?.account_id) {
      console.log('Found direct mapping for bankConnectionId:', mappingData.account_id);
      return mappingData.account_id;
    }
    
    // If no direct mapping, try to find the bank account by matching names
    const { data: connectionData, error: connectionError } = await supabase
      .from('bank_connections')
      .select('bank_name, display_name')
      .eq('id', bankConnectionId)
      .maybeSingle();
      
    if (connectionError || !connectionData) {
      console.error('Error or no data found for bank connection:', connectionError || 'No data');
      return null;
    }
    
    const bankName = connectionData.bank_name;
    const displayName = connectionData.display_name || bankName;
    
    // Try to find bank account with matching name
    const { data: accountData, error: accountError } = await supabase
      .from('bank_accounts')
      .select('account_id')
      .or(`account_name.eq.${bankName},account_name.eq.${displayName}`)
      .maybeSingle();
      
    if (accountError) {
      console.error('Error finding bank account:', accountError);
      return null;
    }
    
    if (accountData?.account_id) {
      console.log('Found account ID by name matching:', accountData.account_id);
      return accountData.account_id;
    }
    
    // As a fallback, just return the bankConnectionId itself
    console.log('No matching bank account found, using connection ID as fallback');
    return bankConnectionId;
  } catch (err) {
    console.error('Error in getBankAccountIdFromConnection:', err);
    return null;
  }
};
