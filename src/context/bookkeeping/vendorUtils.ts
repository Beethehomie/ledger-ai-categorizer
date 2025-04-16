
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { Vendor, StatementType } from '@/types';
import { Transaction } from '@/types';

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
        verified: false
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

export const removeDuplicateVendorsFromSupabase = async (): Promise<{ success: boolean, updatedVendors?: Vendor[] }> => {
  try {
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .select('vendor_name, category');
      
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
      const vendorsFromDB: Vendor[] = updatedVendors.map((v) => {
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
