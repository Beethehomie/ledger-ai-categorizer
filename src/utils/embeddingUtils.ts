
import { supabase } from '@/integrations/supabase/client';
import { toast } from './toast';

export interface EmbeddingResult {
  id: string;
  similarity: number;
  vendor?: string;
  category?: string;
  type?: string;
  statementType?: string;
}

export const generateEmbeddings = async (text: string): Promise<number[] | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: { text, generateOnly: true }
    });

    if (error) {
      console.error('Error generating embeddings:', error);
      toast.error('Failed to generate embeddings');
      return null;
    }

    return data?.embedding || null;
  } catch (err) {
    console.error('Error in generateEmbeddings:', err);
    toast.error('Failed to process embeddings');
    return null;
  }
};

export const findSimilarVendors = async (
  description: string,
  threshold = 0.7, 
  limit = 5
): Promise<EmbeddingResult[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('find-similar-vendors', {
      body: { 
        description,
        threshold,
        limit
      }
    });

    if (error) {
      console.error('Error finding similar vendors:', error);
      toast.error('Failed to find similar vendors');
      return [];
    }

    return data?.matches || [];
  } catch (err) {
    console.error('Error in findSimilarVendors:', err);
    toast.error('Failed to process vendor matching');
    return [];
  }
};

export const findMatchingCategories = async (
  description: string,
  threshold = 0.7
): Promise<EmbeddingResult[]> => {
  try {
    // Generate embedding for the description
    const embedding = await generateEmbeddings(description);
    
    if (!embedding) {
      return [];
    }
    
    // Use the Supabase RPC function with properly typed parameters
    const { data, error } = await supabase.rpc('match_vendors_by_embedding', {
      query_embedding: embedding as unknown as any[], // Fix the type issue with a proper type assertion
      match_threshold: threshold,
      match_count: 10
    });

    if (error) {
      console.error('Error finding matching categories:', error);
      toast.error('Failed to find matching categories');
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in findMatchingCategories:', err);
    toast.error('Failed to process category matching');
    return [];
  }
};
