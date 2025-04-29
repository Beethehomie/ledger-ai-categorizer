
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { Vendor, StatementType } from '@/types';
import { Transaction } from '@/types';
import { VendorCategorizationRow } from '@/types/supabase';

export const updateVendorInSupabase = async (
  vendor: string,
  category: string,
  type: Transaction['type'],
  statementType: Transaction['statementType'],
  existingVendors: Vendor[]
) => {
  const existingVendorIndex = existingVendors.findIndex(v => v.name === vendor);
  
  if (existingVendorIndex >= 0) {
    const { error } = await supabase
      .from('vendor_categorizations')
      .update({
        occurrences: existingVendors[existingVendorIndex].occurrences + 1,
        last_used: new Date().toISOString()
      })
      .eq('vendor_name', vendor);
      
    if (error) {
      console.error('Error updating vendor in Supabase:', error);
      return { updatedVendors: existingVendors, success: false };
    }
    
    const updatedVendors = [...existingVendors];
    updatedVendors[existingVendorIndex].occurrences += 1;
    
    if (updatedVendors[existingVendorIndex].occurrences >= 5) {
      updatedVendors[existingVendorIndex].verified = true;
      
      await supabase
        .from('vendor_categorizations')
        .update({ verified: true })
        .eq('vendor_name', vendor);
    }
    
    return { updatedVendors, success: true };
  } else {
    const { error } = await supabase
      .from('vendor_categorizations')
      .insert({
        vendor_name: vendor,
        category,
        type,
        statement_type: statementType,
        occurrences: 1,
        verified: false,
        sample_description: '' // Initialize with empty sample
      });
      
    if (error) {
      console.error('Error adding vendor to Supabase:', error);
      return { updatedVendors: existingVendors, success: false };
    }
    
    const newVendorsList = [...existingVendors, {
      name: vendor,
      category,
      type,
      statementType: statementType as StatementType,
      occurrences: 1,
      verified: false
    }];
    
    return { updatedVendors: newVendorsList, success: true };
  }
};

export const updateVendorWithSampleDescription = async (
  vendor: string, 
  description: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .select('*')
      .eq('vendor_name', vendor)
      .single();

    if (error) {
      console.error('Error checking vendor sample description:', error);
      return false;
    }

    // Only update if we don't have a sample description yet
    if (!data.sample_description) {
      const { error: updateError } = await supabase
        .from('vendor_categorizations')
        .update({ sample_description: description })
        .eq('vendor_name', vendor);

      if (updateError) {
        console.error('Error updating vendor sample description:', updateError);
        return false;
      }
      
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error in updateVendorWithSampleDescription:', err);
    return false;
  }
};

export const removeDuplicateVendorsFromSupabase = async (): Promise<{ success: boolean, updatedVendors?: Vendor[] }> => {
  try {
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .select('*');
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      toast.info('No vendors found to check for duplicates');
      return { success: false };
    }
    
    const vendorMap = new Map<string, string[]>();
    data.forEach(v => {
      const name = v.vendor_name.toLowerCase().trim();
      const category = v.category;
      
      if (!vendorMap.has(name)) {
        vendorMap.set(name, [category]);
      } else {
        const categories = vendorMap.get(name) || [];
        if (!categories.includes(category)) {
          categories.push(category);
        }
        vendorMap.set(name, categories);
      }
    });
    
    const duplicates = [...vendorMap.entries()]
      .filter(([_, categories]) => categories.length > 1);
    
    if (duplicates.length === 0) {
      toast.success('No duplicate vendors found');
      return { success: true };
    }
    
    let removedCount = 0;
    
    for (const [name, _] of duplicates) {
      const { data: vendorRecords } = await supabase
        .from('vendor_categorizations')
        .select('*')
        .ilike('vendor_name', name);
        
      if (!vendorRecords || vendorRecords.length <= 1) continue;
      
      const sorted = [...vendorRecords].sort((a, b) => {
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;
        
        // Prefer records with sample descriptions
        if (a.sample_description && !b.sample_description) return -1;
        if (!a.sample_description && b.sample_description) return 1;
        
        return (b.occurrences || 0) - (a.occurrences || 0);
      });
      
      const keepId = sorted[0].id;
      const toDelete = sorted.slice(1).map(v => v.id);
      
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('vendor_categorizations')
          .delete()
          .in('id', toDelete);
          
        if (!deleteError) {
          removedCount += toDelete.length;
        }
      }
    }
    
    const { data: updatedVendors } = await supabase
      .from('vendor_categorizations')
      .select('*');
      
    if (updatedVendors) {
      const vendorsFromDB: Vendor[] = updatedVendors.map((v: VendorCategorizationRow) => {
        // Convert any 'operating' statementType to 'profit_loss' for backward compatibility
        let statementType: StatementType = 'profit_loss';
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
      
      toast.success(`Removed ${removedCount} duplicate vendor entries`);
      return { success: true, updatedVendors: vendorsFromDB };
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error removing duplicate vendors:', err);
    toast.error('Failed to remove duplicate vendors');
    return { success: false };
  }
};

// Function to get all vendor categorizations with their sample descriptions
export const getVendorCategorizations = async (): Promise<{
  vendors: Vendor[],
  samples: Record<string, string>
}> => {
  try {
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .select('*');

    if (error) throw error;

    if (!data || data.length === 0) {
      return { vendors: [], samples: {} };
    }

    // Build the samples dictionary for RAG features
    const samples: Record<string, string> = {};
    data.forEach((v: VendorCategorizationRow) => {
      if (v.sample_description) {
        samples[v.vendor_name] = v.sample_description;
      }
    });

    // Convert to Vendor objects
    const vendors: Vendor[] = data.map((v: VendorCategorizationRow) => {
      let statementType: StatementType = 'profit_loss';
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

    return { vendors, samples };
  } catch (err) {
    console.error('Error getting vendor categorizations:', err);
    return { vendors: [], samples: {} };
  }
};

// Function to import vendor data with sample descriptions in batch
export const importVendorCategorizations = async (
  vendors: Array<{
    name: string;
    category: string;
    type?: Transaction['type'];
    statementType?: Transaction['statementType'];
    sampleDescription?: string;
  }>
): Promise<{ success: boolean; message: string }> => {
  if (!vendors || vendors.length === 0) {
    return { success: false, message: 'No vendors provided for import' };
  }

  try {
    // Use the Supabase Edge Function for bulk import
    const { data, error } = await supabase.functions.invoke('import-vendor-categories', {
      body: { vendors }
    });

    if (error) {
      console.error('Error importing vendor categorizations:', error);
      return { success: false, message: `Import failed: ${error.message}` };
    }

    if (data) {
      return { 
        success: true, 
        message: `Successfully imported: ${data.inserted} inserted, ${data.updated} updated` 
      };
    }

    return { success: true, message: 'Vendors imported successfully' };
  } catch (err: any) {
    console.error('Error in importVendorCategorizations:', err);
    return { success: false, message: err.message || 'Unknown error during import' };
  }
};
