
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { Transaction } from '@/types';

// Find similar transactions based on a vendor name
export const findSimilarVendorTransactions = async (
  vendorName: string,
  transactions: Transaction[]
): Promise<Transaction[]> => {
  try {
    // If no vendor name provided, return empty array
    if (!vendorName) return [];
    
    // Filter transactions that might match this vendor
    const similarTransactions = transactions.filter(transaction => {
      // Skip if it already has this vendor
      if (transaction.vendor === vendorName) return false;
      
      // Simple string similarity check
      const description = transaction.description.toLowerCase();
      const vendor = vendorName.toLowerCase();
      
      // Check if vendor name appears in description
      return description.includes(vendor) || 
        // Or check if more than half of the vendor words are in the description
        vendor.split(' ').filter(word => description.includes(word)).length > (vendor.split(' ').length / 2);
    });
    
    return similarTransactions;
  } catch (error) {
    console.error('Error in findSimilarVendorTransactions:', error);
    return [];
  }
};

// Delete a transaction
export const deleteTransaction = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteTransaction:', error);
    toast.error('Failed to delete transaction');
    return false;
  }
};
