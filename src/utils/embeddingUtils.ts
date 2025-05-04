
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

/**
 * Generate embedding for text using Supabase Edge Function
 */
export async function getEmbeddingForText(text: string): Promise<number[]> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        text,
        generateOnly: true
      }
    });

    if (error) {
      throw new Error(`Error generating embedding: ${error.message}`);
    }

    if (!data || !data.embedding) {
      throw new Error("No embedding returned from the API");
    }

    return data.embedding as number[];
  } catch (err) {
    console.error("Error in getEmbeddingForText:", err);
    toast.error("Failed to generate text embedding");
    throw err;
  }
}

/**
 * Generic function to find similar items based on semantic similarity
 * @param procedure - The name of the RPC procedure to call ('match_vendors' or 'match_categories')
 * @param text - The text to find similar items for
 * @param limit - Maximum number of results to return
 * @param threshold - Minimum similarity threshold (0-1)
 * @returns Array of matching items with similarity scores
 */
export async function findSimilarItems<T>(
  procedure: string,
  text: string,
  limit: number = 5,
  threshold: number = 0.5
): Promise<T[]> {
  try {
    const embedding = await getEmbeddingForText(text);
    
    // Define proper parameters with correct types
    const params = {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit
    };
    
    // Use type assertion to handle the dynamic procedure name
    const { data, error } = await supabase
      .rpc(procedure as any, params);
    
    if (error) {
      throw new Error(`Error finding similar items with ${procedure}: ${error.message}`);
    }
    
    return data || [];
  } catch (err) {
    console.error(`Error in findSimilarItems(${procedure}):`, err);
    toast.error(`Failed to find similar items with ${procedure}`);
    return [];
  }
}

/**
 * Find similar vendors based on text description
 * @param text - The text to find similar vendors for
 * @param limit - Maximum number of results to return
 * @param threshold - Minimum similarity threshold (0-1)
 * @returns Array of matching vendors with similarity scores
 */
export async function findSimilarVendors(text: string, limit: number = 5, threshold: number = 0.5) {
  return findSimilarItems('match_vendors', text, limit, threshold);
}

/**
 * Find similar categories based on text description
 * @param text - The text to find similar categories for
 * @param limit - Maximum number of results to return
 * @param threshold - Minimum similarity threshold (0-1)
 * @returns Array of matching categories with similarity scores
 */
export async function findSimilarCategories(text: string, limit: number = 5, threshold: number = 0.5) {
  return findSimilarItems('match_categories', text, limit, threshold);
}

/**
 * Interface for vendor match results
 */
export interface VendorMatch {
  vendor_name: string;
  category: string;
  type: string;
  statement_type: string;
  similarity: number;
  confidence?: number;
  sample_description?: string;
}

/**
 * Generate embeddings for vendors using Supabase Edge Function
 */
export async function generateVendorEmbeddings(batchSize: number = 50): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-vendor-embeddings', {
      body: {
        action: "generate",
        batchSize
      }
    });

    if (error) {
      throw new Error(`Error generating vendor embeddings: ${error.message}`);
    }

    return {
      success: true,
      ...data
    };
  } catch (err) {
    console.error("Error in generateVendorEmbeddings:", err);
    toast.error("Failed to generate vendor embeddings");
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}

/**
 * Find similar vendors by description using Supabase Edge Function
 */
export async function findSimilarVendorsByDescription(description: string): Promise<{success: boolean; results?: VendorMatch[]; error?: string}> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-vendor-embeddings', {
      body: {
        action: "search",
        description
      }
    });

    if (error) {
      throw new Error(`Error finding similar vendors: ${error.message}`);
    }

    return {
      success: true,
      results: data.results || []
    };
  } catch (err) {
    console.error("Error in findSimilarVendorsByDescription:", err);
    toast.error("Failed to find similar vendors by description");
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}
