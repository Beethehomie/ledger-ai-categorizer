
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { table, recordId, textField, limit } = await req.json();
    
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!openaiApiKey) {
      throw new Error("Missing OpenAI API key");
    }
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Define valid tables and their text fields
    const validConfigs = {
      'bank_transactions': ['description'],
      'vendor_categorizations': ['vendor_name', 'sample_description']
    };
    
    // Validate inputs
    if (!validConfigs[table]) {
      throw new Error(`Invalid table: ${table}`);
    }
    
    if (!validConfigs[table].includes(textField)) {
      throw new Error(`Invalid text field for ${table}: ${textField}`);
    }
    
    // Query for records that need embeddings
    let query = supabase.from(table).select('*').is('embedding', null);
    
    // Add specific record filter if provided
    if (recordId) {
      query = query.eq('id', recordId);
    }
    
    // Apply limit
    const batchSize = limit || 50;
    query = query.limit(batchSize);
    
    const { data: records, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Error fetching records: ${fetchError.message}`);
    }
    
    console.log(`Processing ${records.length} records from ${table}`);
    
    if (records.length === 0) {
      return new Response(
        JSON.stringify({ message: `No records found without embeddings in ${table}`, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Process each record
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const record of records) {
      try {
        let textToEmbed;
        
        if (table === 'vendor_categorizations' && textField === 'sample_description' && !record[textField]) {
          // Fall back to vendor_name if sample_description is empty
          textToEmbed = record.vendor_name;
        } else {
          textToEmbed = record[textField];
        }
        
        if (!textToEmbed || textToEmbed.trim() === "") {
          console.log(`Skipping record ${record.id} - no text to embed`);
          results.failed++;
          results.errors.push(`Record ${record.id}: No text to embed`);
          continue;
        }
        
        // Generate embedding using OpenAI
        const embedding = await generateEmbedding(textToEmbed, openaiApiKey);
        
        // Update the record with the embedding
        const { error: updateError } = await supabase
          .from(table)
          .update({ embedding })
          .eq("id", record.id);
        
        if (updateError) {
          throw new Error(`Error updating record: ${updateError.message}`);
        }
        
        console.log(`✅ Successfully embedded record ${record.id}`);
        results.success++;
      } catch (err) {
        console.error(`❌ Error processing record ${record.id}: ${err.message}`);
        results.failed++;
        results.errors.push(`Record ${record.id}: ${err.message}`);
      }
    }
    
    return new Response(
      JSON.stringify({
        message: `Embedding generation completed for ${table}`,
        results,
        totalProcessed: results.success + results.failed,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(`Error in function: ${error.message}`);
    
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

// Helper function to generate embedding for text using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error(`Error generating embedding: ${error.message}`);
    throw error;
  }
}
