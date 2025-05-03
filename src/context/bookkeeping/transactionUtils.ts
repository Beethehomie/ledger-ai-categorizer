import { Transaction } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { extractVendorName } from '@/utils/vendorExtractor';

export const saveTransactionsToSupabase = async (
  transactions: Transaction[], 
  userId: string
) => {
  try {
    // Log the data being sent to help with debugging
    console.log('Saving transactions to Supabase:', transactions.length, 'transactions');
    console.log('Sample transaction:', transactions[0]);
    
    const supabaseTransactions = transactions.map(t => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: t.category || null,
      type: t.type || null,
      statement_type: t.statementType || null,
      is_verified: t.isVerified || false,
      vendor: t.vendor || null,
      vendor_verified: t.vendorVerified || false,
      confidence_score: t.confidenceScore || null,
      bank_connection_id: t.bankAccountId || null,
      balance: t.balance || null,
      account_id: t.accountId || null, // Use accountId for RLS policy compliance
      user_id: userId
    }));
    
    const { data, error } = await supabase
      .from('bank_transactions')
      .insert(supabaseTransactions)
      .select();
      
    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    
    console.log('Supabase insert successful, returned data:', data?.length, 'rows');
    
    if (data) {
      // Update the transactions with the IDs from the database
      for (let i = 0; i < transactions.length; i++) {
        if (data[i]) {
          transactions[i].id = data[i].id;
        }
      }
    }
    
    return { data, transactions };
  } catch (err: any) {
    console.error('Error saving transactions to Supabase:', err);
    toast.error('Failed to save transactions to database');
    throw err;
  }
};

export const calculateRunningBalance = (
  parsedTransactions: Transaction[], 
  initialBalance: number,
  balanceDate: Date
): Transaction[] => {
  const sortedTransactions = [...parsedTransactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });
  
  let runningBalance = initialBalance;
  
  return sortedTransactions.map(transaction => {
    // Adjust balance based on transaction type and amount
    if (transaction.type === 'income') {
      runningBalance += Math.abs(transaction.amount);
    } else if (transaction.type === 'expense') {
      runningBalance -= Math.abs(transaction.amount);
    } else if (transaction.type === 'asset') {
      runningBalance -= Math.abs(transaction.amount);
    } else if (transaction.type === 'liability') {
      runningBalance += Math.abs(transaction.amount);
    } else {
      // Default behavior for unspecified types - assume expense if negative, income if positive
      if (transaction.amount < 0) {
        runningBalance += transaction.amount; // Amount is already negative
      } else {
        runningBalance += transaction.amount;
      }
    }
    
    return {
      ...transaction,
      balance: Number(runningBalance.toFixed(2))
    };
  });
};

export const processTransactions = (
  transactions: Transaction[]
): Transaction[] => {
  return transactions.map(transaction => {
    // Extract vendor name, always ensuring we have a value (will return "Unknown" if nothing found)
    const vendorName = transaction.vendor || extractVendorName(transaction.description);
    const vendor = vendorName || "Unknown";
    
    // Ensure amounts are properly handled
    const amount = Number(transaction.amount);
    
    // Determine transaction type based on amount if not already set
    const type = transaction.type || (amount < 0 ? 'expense' : 'income');
    
    // Determine statement type if not already set
    const statementType = transaction.statementType || 'profit_loss';
    
    return {
      ...transaction,
      amount: amount,
      type: type,
      statementType: statementType,
      vendor,
      vendorVerified: Boolean(transaction.vendorVerified),
      // Set confidence score - lower for unknown vendors, higher for known ones
      confidenceScore: vendor === "Unknown" ? 0.3 : transaction.confidenceScore || Math.random() * 0.5 + 0.5,
      isVerified: transaction.isVerified || false
    };
  });
};
