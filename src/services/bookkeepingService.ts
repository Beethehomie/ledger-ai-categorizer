
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { Category, Transaction, Vendor, FinancialSummary } from '@/types';
import { BankConnectionRow } from '@/types/supabase';

export async function fetchVendors(): Promise<Vendor[]> {
  try {
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .select('*');
      
    if (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
    
    if (data) {
      const vendorsFromDB: Vendor[] = data.map((v) => {
        // Convert any 'operating' statementType to 'profit_loss' for backward compatibility
        let statementType: 'profit_loss' | 'balance_sheet' = 'profit_loss';
        if (v.statement_type === 'balance_sheet') {
          statementType = 'balance_sheet';
        }
        
        return {
          name: v.vendor_name || '',
          category: v.category || '',
          type: (v.type as Transaction['type']) || 'expense',
          statementType: statementType,
          occurrences: v.occurrences || 1,
          verified: v.verified || false
        };
      });
      
      return vendorsFromDB;
    }
    
    return [];
  } catch (err) {
    console.error('Error in fetchVendors:', err);
    throw err;
  }
}

export async function fetchTransactionsFromDatabase(): Promise<Transaction[]> {
  try {
    console.log('Fetching transactions from database');
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
    
    if (data) {
      console.log(`Fetched ${data.length} transactions from database`);
      const fetchedTransactions: Transaction[] = data.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        category: t.category || undefined,
        type: t.type as Transaction['type'] || undefined,
        statementType: t.statement_type as Transaction['statementType'] || undefined,
        isVerified: t.is_verified || false,
        aiSuggestion: undefined,
        vendor: t.vendor || undefined,
        vendorVerified: t.vendor_verified || false,
        confidenceScore: t.confidence_score ? Number(t.confidence_score) : undefined,
        bankAccountId: t.bank_connection_id || undefined,
        bankAccountName: undefined,
        balance: t.balance || undefined,
      }));
      
      return fetchedTransactions;
    }
    
    return [];
  } catch (err) {
    console.error('Error fetching transactions:', err);
    throw err;
  }
}

export async function updateTransactionInDatabase(transaction: Transaction): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .update({
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        type: transaction.type,
        statement_type: transaction.statementType,
        is_verified: transaction.isVerified,
        vendor: transaction.vendor,
        vendor_verified: transaction.vendorVerified,
        confidence_score: transaction.confidenceScore,
        balance: transaction.balance
      })
      .eq('id', transaction.id);

    if (error) {
      console.error('Error updating transaction:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error in updateTransactionInDatabase:', err);
    return false;
  }
}

export async function verifyVendorInDatabase(vendorName: string, approved: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vendor_categorizations')
      .update({ verified: approved })
      .eq('vendor_name', vendorName);
      
    if (error) {
      console.error('Error verifying vendor in database:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error in verifyVendorInDatabase:', err);
    return false;
  }
}

export function calculateVendorCounts(transactions: Transaction[], vendors: Vendor[]): { name: string; count: number; verified: boolean }[] {
  const vendorCounts: Record<string, { count: number; verified: boolean }> = {};
  
  transactions.forEach(transaction => {
    if (transaction.vendor) {
      if (!vendorCounts[transaction.vendor]) {
        const vendorInfo = vendors.find(v => v.name === transaction.vendor);
        vendorCounts[transaction.vendor] = { 
          count: 1, 
          verified: vendorInfo?.verified || false 
        };
      } else {
        vendorCounts[transaction.vendor].count += 1;
      }
    }
  });
  
  return Object.entries(vendorCounts)
    .map(([name, { count, verified }]) => ({ name, count, verified }))
    .sort((a, b) => b.count - a.count);
}

export function calculateFinancialSummary(transactions: Transaction[]): FinancialSummary {
  const summary: FinancialSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    netProfit: 0,
    cashBalance: 0,
    income: 0,
  };
  
  // Only include verified transactions in financial calculations
  const verifiedTransactions = transactions.filter(t => t.isVerified);
  
  verifiedTransactions.forEach(transaction => {
    const amount = transaction.amount || 0;
    
    if (transaction.type === 'income') {
      summary.totalIncome += amount;
      summary.income += amount;
    } else if (transaction.type === 'expense') {
      summary.totalExpenses += amount;
    } else if (transaction.type === 'asset') {
      summary.totalAssets += amount;
    } else if (transaction.type === 'liability') {
      summary.totalLiabilities += amount;
    } else if (transaction.type === 'equity') {
      summary.totalEquity += amount;
    }
  });
  
  summary.netProfit = summary.totalIncome - summary.totalExpenses;
  summary.cashBalance = summary.totalAssets - summary.totalLiabilities + summary.totalEquity;
  
  return summary;
}

// New function to find duplicates between existing and new transactions
export async function findDuplicatesInDatabase(newTransactions: Transaction[]): Promise<Transaction[]> {
  try {
    const duplicates: Transaction[] = [];
    
    for (const transaction of newTransactions) {
      // Check if a similar transaction already exists
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('date', transaction.date)
        .eq('description', transaction.description)
        .eq('amount', transaction.amount);
        
      if (error) {
        console.error('Error checking for duplicates:', error);
        continue;
      }
      
      if (data && data.length > 0) {
        duplicates.push(transaction);
      }
    }
    
    return duplicates;
  } catch (err) {
    console.error('Error in findDuplicatesInDatabase:', err);
    return [];
  }
}

// New function to update transaction balances
export async function updateTransactionBalances(
  transactions: Transaction[], 
  initialBalance: number = 0
): Promise<boolean> {
  try {
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    let runningBalance = initialBalance;
    
    for (const transaction of sortedTransactions) {
      runningBalance += transaction.amount;
      
      const { error } = await supabase
        .from('bank_transactions')
        .update({ balance: runningBalance })
        .eq('id', transaction.id);
        
      if (error) {
        console.error('Error updating balance:', error);
        return false;
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error in updateTransactionBalances:', err);
    return false;
  }
}

// New function to delete transactions in batch
export async function deleteTransactionsInBatch(transactionIds: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  try {
    for (const id of transactionIds) {
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error(`Error deleting transaction ${id}:`, error);
        failed++;
      } else {
        success++;
      }
    }
    
    return { success, failed };
  } catch (err) {
    console.error('Error in deleteTransactionsInBatch:', err);
    return { success, failed: transactionIds.length - success };
  }
}

// New function to reconcile account balance
export async function reconcileAccountBalance(
  bankAccountId: string, 
  endingBalance: number
): Promise<boolean> {
  try {
    // Get all transactions for the specified account
    const { data: transactions, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_connection_id', bankAccountId)
      .order('date', { ascending: true });
      
    if (error) {
      console.error('Error fetching transactions for reconciliation:', error);
      return false;
    }
    
    if (!transactions || transactions.length === 0) {
      return false;
    }
    
    // Get the last transaction's balance
    const lastTransaction = transactions[transactions.length - 1];
    const lastBalance = lastTransaction.balance || 0;
    
    // Check if the balance matches the expected ending balance
    // We allow a small difference to account for rounding
    const isReconciled = Math.abs(lastBalance - endingBalance) < 0.02;
    
    // Get the current bank connection to access its api_details
    const { data: connectionData, error: connectionError } = await supabase
      .from('bank_connections')
      .select('api_details')
      .eq('id', bankAccountId)
      .single();
      
    if (connectionError) {
      console.error('Error fetching bank connection:', connectionError);
      return false;
    }
    
    // Ensure api_details is an object before spreading
    const currentApiDetails = connectionData?.api_details || {};
    
    // Create the updated API details object without spreading potentially undefined values
    const updatedApiDetails = {
      ...(typeof currentApiDetails === 'object' ? currentApiDetails : {}),
      reconciled: isReconciled,
      expectedBalance: endingBalance,
      actualBalance: lastBalance
    };
    
    // Update the bank connection with reconciliation status
    const { error: updateError } = await supabase
      .from('bank_connections')
      .update({
        last_sync: new Date().toISOString(),
        api_details: updatedApiDetails
      })
      .eq('id', bankAccountId);
      
    if (updateError) {
      console.error('Error updating reconciliation status:', updateError);
      return false;
    }
    
    return isReconciled;
  } catch (err) {
    console.error('Error in reconcileAccountBalance:', err);
    return false;
  }
}
