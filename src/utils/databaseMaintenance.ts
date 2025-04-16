
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

/**
 * Removes transactions older than the specified date
 * @param olderThan Date threshold for removal
 * @returns Promise<boolean> indicating success
 */
export const cleanupOldTransactions = async (olderThan: Date): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .lt('date', olderThan.toISOString());

    if (error) throw error;
    
    toast.success('Successfully cleaned up old transactions');
    return true;
  } catch (err) {
    console.error('Error cleaning up old transactions:', err);
    toast.error('Failed to clean up old transactions');
    return false;
  }
};

/**
 * Optimizes vendor categories by removing unused ones
 * @returns Promise<boolean> indicating success
 */
export const optimizeVendorCategories = async (): Promise<boolean> => {
  try {
    // Delete vendor categories that haven't been used in 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { error } = await supabase
      .from('vendor_categorizations')
      .delete()
      .lt('last_used', sixMonthsAgo.toISOString())
      .eq('verified', false);

    if (error) throw error;
    
    toast.success('Successfully optimized vendor categories');
    return true;
  } catch (err) {
    console.error('Error optimizing vendor categories:', err);
    toast.error('Failed to optimize vendor categories');
    return false;
  }
};

/**
 * Verifies bank reconciliation by comparing expected and actual balances
 * @param bankConnectionId The bank connection ID
 * @param expectedBalance The expected balance
 * @param asOfDate The date to check the balance as of
 * @returns Reconciliation result object
 */
export const verifyBankReconciliation = async (
  bankConnectionId: string, 
  expectedBalance: number, 
  asOfDate: Date
): Promise<{
  reconciled: boolean;
  difference?: number;
  actualBalance?: number;
  error?: any;
}> => {
  try {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select('balance')
      .eq('bank_connection_id', bankConnectionId)
      .lte('date', asOfDate.toISOString())
      .order('date', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    if (data && data.length > 0) {
      const latestBalance = Number(data[0].balance);
      const difference = Math.abs(latestBalance - expectedBalance);
      
      if (difference < 0.02) { // Allow small rounding differences (e.g. $0.01)
        return { reconciled: true, difference: 0 };
      }
      
      return { reconciled: false, difference, actualBalance: latestBalance };
    }
    
    return { reconciled: false, difference: expectedBalance, actualBalance: 0 };
  } catch (err) {
    console.error('Error verifying bank reconciliation:', err);
    return { reconciled: false, error: err };
  }
};
