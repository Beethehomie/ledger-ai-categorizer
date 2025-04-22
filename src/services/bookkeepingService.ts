
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
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
    
    if (data) {
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
        confidence_score: transaction.confidenceScore
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
