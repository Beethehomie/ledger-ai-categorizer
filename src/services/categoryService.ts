
import { Category } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/errorLogger';

export async function addCategory(newCategory: Category) {
  try {
    // Check if the category already exists
    const { data: existingCategories, error: checkError } = await supabase
      .from('vendor_categorizations')
      .select('vendor_name')
      .eq('vendor_name', newCategory.name);
      
    if (checkError) {
      logError('categoryService.addCategory.check', checkError);
      return { 
        success: false, 
        error: checkError.message || 'Error checking for existing category' 
      };
    }
    
    if (existingCategories && existingCategories.length > 0) {
      return { 
        success: false, 
        error: `Category "${newCategory.name}" already exists` 
      };
    }
    
    // Insert the new category
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .insert({
        id: newCategory.id,
        vendor_name: newCategory.name,
        type: newCategory.type,
        statement_type: newCategory.statementType,
        category: newCategory.name, // Using the category name as its own category
        verified: true,
        confidence: 1.0
      });
    
    if (error) {
      logError('categoryService.addCategory.insert', error);
      return { success: false, error: error.message || 'Failed to add category' };
    }
    
    return { success: true, data };
  } catch (err) {
    logError('categoryService.addCategory.exception', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

export async function updateCategory(category: Category) {
  try {
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .update({
        vendor_name: category.name,
        type: category.type,
        statement_type: category.statementType,
        category: category.name // Using the category name as its own category
      })
      .eq('id', category.id);
    
    if (error) {
      logError('categoryService.updateCategory', error);
      return { success: false, error: error.message || 'Failed to update category' };
    }
    
    return { success: true, data };
  } catch (err) {
    logError('categoryService.updateCategory.exception', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

// Helper function to convert from vendor_categorizations table to Category type
export function mapVendorCategorizationToCategory(vendorCategorization: any): Category {
  return {
    id: vendorCategorization.id,
    name: vendorCategorization.vendor_name,
    type: vendorCategorization.type as any,
    statementType: vendorCategorization.statement_type as any,
    keywords: [] // Keywords aren't stored in vendor_categorizations
  };
}

// Function to fetch all categories
export async function fetchCategories(): Promise<{ success: boolean; data?: Category[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('vendor_categorizations')
      .select('*')
      .eq('verified', true);
    
    if (error) {
      logError('categoryService.fetchCategories', error);
      return { success: false, error: error.message || 'Failed to fetch categories' };
    }
    
    // Map the vendor_categorizations to Category type
    const categories = data.map(mapVendorCategorizationToCategory);
    
    return { success: true, data: categories };
  } catch (err) {
    logError('categoryService.fetchCategories.exception', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}
