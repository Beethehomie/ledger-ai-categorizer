
import { Category } from '@/types';
import { fetchMockCategories } from '@/utils/mockCategoryUtils';
import { fetchCategories, addCategory, updateCategory } from '@/services/categoryService';
import { toast } from '@/utils/toast';

// Function to get categories from the database or fallback to mock data if empty
export async function getCategories(): Promise<Category[]> {
  try {
    const result = await fetchCategories();
    
    if (!result.success) {
      console.warn('Error fetching categories from database:', result.error);
      console.log('Falling back to mock categories');
      return fetchMockCategories();
    }
    
    // If we successfully fetched from the database but got no results,
    // we can seed the database with mock data
    if (result.data && result.data.length === 0) {
      console.log('No categories found in database, seeding with mock data');
      await seedCategoriesFromMock();
      return fetchMockCategories();
    }
    
    return result.data || [];
  } catch (err) {
    console.error('Error in getCategories:', err);
    return fetchMockCategories();
  }
}

// Seed the database with mock categories
async function seedCategoriesFromMock(): Promise<void> {
  try {
    const mockCategories = await fetchMockCategories();
    
    for (const category of mockCategories) {
      const result = await addCategory(category);
      if (!result.success) {
        console.warn(`Failed to seed category ${category.name}:`, result.error);
      }
    }
    
    toast.success('Initial categories created');
  } catch (err) {
    console.error('Error seeding categories:', err);
    toast.error('Failed to create initial categories');
  }
}

export { addCategory, updateCategory };
