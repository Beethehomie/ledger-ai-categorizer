
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

/**
 * Generates embeddings for vendors without them in the database
 * @param batchSize The number of vendors to process (default: 50)
 * @returns A promise with the results of the operation
 */
export const generateVendorEmbeddings = async (batchSize = 50) => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-vendor-embeddings', {
      body: {
        action: 'generate',
        batchSize
      }
    });

    if (error) {
      console.error('Error generating vendor embeddings:', error);
      toast.error('Failed to generate vendor embeddings');
      return { success: false, error };
    }

    return { success: true, ...data };
  } catch (err) {
    console.error('Error calling generate-vendor-embeddings function:', err);
    toast.error('Failed to generate vendor embeddings');
    return { success: false, error: err };
  }
};

/**
 * Finds similar vendors based on a transaction description
 * @param description The description to find similar vendors for
 * @returns A promise with the similar vendors found
 */
export const findSimilarVendorsByDescription = async (description: string) => {
  if (!description) {
    return { success: false, results: [], error: 'No description provided' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-vendor-embeddings', {
      body: {
        action: 'search',
        description
      }
    });

    if (error) {
      console.error('Error finding similar vendors:', error);
      return { success: false, results: [], error };
    }

    return { success: true, ...data };
  } catch (err) {
    console.error('Error calling search vendors function:', err);
    return { success: false, results: [], error: err };
  }
};
