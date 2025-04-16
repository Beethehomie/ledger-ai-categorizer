
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

export const cleanupOldTransactions = async (olderThan: Date) => {
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .lt('date', olderThan.toISOString());

    if (error) throw error;
    
    toast.success('Successfully cleaned up old transactions');
  } catch (err) {
    console.error('Error cleaning up old transactions:', err);
    toast.error('Failed to clean up old transactions');
  }
};

export const optimizeVendorCategories = async () => {
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
  } catch (err) {
    console.error('Error optimizing vendor categories:', err);
    toast.error('Failed to optimize vendor categories');
  }
};

export const verifyBankReconciliation = async (bankConnectionId: string, expectedBalance: number, asOfDate: Date) => {
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
