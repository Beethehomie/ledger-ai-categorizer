
import { Transaction, Vendor } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

export async function addVendor(newVendor: Vendor) {
  try {
    // First, check if the vendor already exists to prevent duplicates
    const { data: existingVendors, error: checkError } = await supabase
      .from('vendor_categorizations')
      .select('vendor_name')
      .eq('vendor_name', newVendor.name);
      
    if (checkError) {
      console.error('Error checking for existing vendor:', checkError);
      return { 
        success: false, 
        error: checkError.message || 'Error checking for existing vendor' 
      };
    }
    
    if (existingVendors && existingVendors.length > 0) {
      return { 
        success: false, 
        error: `Vendor "${newVendor.name}" already exists` 
      };
    }
    
    // Insert the new vendor
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .insert({
        vendor_name: newVendor.name,
        category: newVendor.category || '',
        type: newVendor.type || 'expense',
        statement_type: newVendor.statementType || 'profit_loss',
        occurrences: 1,
        verified: false
      });
    
    if (error) {
      console.error('Supabase error:', error);
      return { success: false, error: error.message || 'Failed to add vendor' };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Error adding vendor:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

export async function findSimilarVendorTransactions(
  vendorName: string, 
  transactions: Transaction[], 
  findSimilarTransactions: Function
) {
  try {
    const similarTransactions = await findSimilarTransactions(vendorName, transactions);
    
    if (similarTransactions && similarTransactions.length > 0) {
      toast.success(`Found ${similarTransactions.length} similar transactions for vendor: ${vendorName}`);
    } else {
      toast.info('No similar transactions found');
    }
    
    return similarTransactions || [];
  } catch (err) {
    console.error('Error finding similar transactions:', err);
    toast.error('Failed to find similar transactions');
    return [];
  }
}
