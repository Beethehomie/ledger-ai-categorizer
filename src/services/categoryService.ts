
import { Category } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

export async function addCategory(newCategory: Category) {
  try {
    // Check if the category already exists
    const { data: existingCategories, error: checkError } = await supabase
      .from('categories')
      .select('name')
      .eq('name', newCategory.name);
      
    if (checkError) {
      console.error('Error checking for existing category:', checkError);
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
      .from('categories')
      .insert({
        id: newCategory.id,
        name: newCategory.name,
        type: newCategory.type,
        statement_type: newCategory.statementType,
        keywords: newCategory.keywords
      });
    
    if (error) {
      console.error('Supabase error adding category:', error);
      // If the categories table doesn't exist yet, suggest creating it
      if (error.code === '42P01') { // undefined_table error code
        console.warn('Categories table may not exist yet');
        return { 
          success: false, 
          error: 'Categories table does not exist. Please set up the database first.' 
        };
      }
      return { success: false, error: error.message || 'Failed to add category' };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Error adding category:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

export async function updateCategory(category: Category) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: category.name,
        type: category.type,
        statement_type: category.statementType,
        keywords: category.keywords
      })
      .eq('id', category.id);
    
    if (error) {
      console.error('Supabase error updating category:', error);
      return { success: false, error: error.message || 'Failed to update category' };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('Error updating category:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}
