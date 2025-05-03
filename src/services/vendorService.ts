
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { Transaction, Vendor } from '@/types';

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

// Add a new vendor to the database
export const addVendor = async (vendor: Vendor): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('vendor_categorizations')
      .insert({
        vendor_name: vendor.name,
        category: vendor.category,
        type: vendor.type,
        statement_type: vendor.statementType,
        occurrences: vendor.occurrences,
        verified: vendor.verified
      });
      
    if (error) {
      console.error('Error adding vendor:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in addVendor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
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

