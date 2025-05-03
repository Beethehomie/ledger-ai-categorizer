
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';

interface EmbeddingGenerationResult {
  success: boolean;
  message?: string;
  error?: string;
  totalProcessed?: number;
  results?: {
    success: number;
    failed: number;
    errors: string[];
  };
}

export interface VendorMatch {
  id: string;
  vendor_name: string;
  category: string;
  type: string;
  sample_description?: string;
  statement_type: string;
  similarity: number;
  confidence?: number; // Added for compatibility with VendorEmbeddings component
}

export const generateTransactionEmbeddings = async (
  limit: number = 50
): Promise<EmbeddingGenerationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        table: 'bank_transactions',
        textField: 'description',
        limit
      },
    });

    if (error) {
      console.error('Error generating transaction embeddings:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate embeddings',
      };
    }

    return {
      success: true,
      ...data
    };
  } catch (err) {
    console.error('Error in generateTransactionEmbeddings:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
};

export const generateVendorEmbeddings = async (
  limit: number = 50
): Promise<EmbeddingGenerationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        table: 'vendor_categorizations',
        textField: 'sample_description',
        limit
      },
    });

    if (error) {
      console.error('Error generating vendor embeddings:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate embeddings',
      };
    }

    return {
      success: true,
      ...data
    };
  } catch (err) {
    console.error('Error in generateVendorEmbeddings:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
};

export const findSimilarVendorsByDescription = async (
  description: string
): Promise<{
  success: boolean;
  results?: VendorMatch[];
  count?: number;
  error?: string;
}> => {
  try {
    // First generate an embedding for the description
    const embedding = await getEmbeddingForText(description);
    
    if (!embedding) {
      return {
        success: false,
        error: 'Failed to generate embedding for search'
      };
    }
    
    // Handle the RPC call by using the parameter object approach
    const { data, error } = await supabase.rpc(
      'match_vendors_by_embedding', 
      {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5
      }
    );
    
    if (error) {
      console.error('Error finding similar vendors:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    // Transform results to include confidence (for compatibility with VendorEmbeddings component)
    // Handle the case when data is null or undefined
    const vendors = data as VendorMatch[] || [];
    const transformedResults = vendors.map(vendor => ({
      ...vendor,
      confidence: Math.round(vendor.similarity * 100) // Convert similarity to percentage confidence
    }));
    
    return {
      success: true,
      results: transformedResults,
      count: transformedResults.length
    };
  } catch (err) {
    console.error('Error in findSimilarVendorsByDescription:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    };
  }
};

// Helper function to get embedding for text
async function getEmbeddingForText(text: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        text: text,
        generateOnly: true
      }
    });
    
    if (error || !data || !data.embedding) {
      console.error('Error getting embedding for text:', error || 'No embedding returned');
      return null;
    }
    
    return data.embedding;
  } catch (err) {
    console.error('Error in getEmbeddingForText:', err);
    return null;
  }
}
