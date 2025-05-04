
import { supabase } from '@/integrations/supabase/client';

/**
 * Generates embeddings for transactions
 * @param tableName The table name to generate embeddings for
 * @param column The column to generate embeddings for
 * @param limit The maximum number of rows to process
 */
export const generateEmbeddings = async (
  tableName: string,
  column: string = 'description',
  limit: number = 100
): Promise<{ success: boolean; count: number }> => {
  try {
    // Call the Supabase Edge Function to generate embeddings
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        tableName,
        column,
        limit
      }
    });

    if (error) {
      console.error('Error generating embeddings:', error);
      return { success: false, count: 0 };
    }

    return {
      success: true,
      count: data?.count || 0
    };
  } catch (error) {
    console.error('Exception generating embeddings:', error);
    return { success: false, count: 0 };
  }
};

/**
 * Searches for similar transactions based on description
 * @param description The description to search for
 * @param threshold The similarity threshold (0-1)
 * @param limit The maximum number of results
 */
export const findSimilarTransactions = async (
  description: string,
  threshold: number = 0.7,
  limit: number = 5
) => {
  try {
    // First, generate an embedding for the query text
    const { data: embedding, error: embeddingError } = await supabase.functions.invoke(
      'generate-transaction-embeddings',
      {
        body: {
          text: description,
          generateOnly: true
        }
      }
    );

    if (embeddingError || !embedding) {
      console.error('Error generating query embedding:', embeddingError);
      return { success: false, results: [] };
    }

    // Use the generated embedding to find similar transactions
    const { data: matchResults, error: matchError } = await supabase.rpc(
      'match_by_embedding' as string,
      {
        source_table: 'transactions',
        embedding_column: 'embedding',
        return_columns: 'id, date, description, amount, category, vendor',
        query_embedding: embedding.embedding,
        match_threshold: threshold,
        match_count: limit
      }
    );

    if (matchError) {
      console.error('Error finding similar transactions:', matchError);
      return { success: false, results: [] };
    }

    return {
      success: true,
      results: matchResults || []
    };
  } catch (error) {
    console.error('Exception finding similar transactions:', error);
    return { success: false, results: [] };
  }
};
