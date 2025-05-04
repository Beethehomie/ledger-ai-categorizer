
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { OpenAI } from "https://esm.sh/openai@4.10.0";

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') || '',
});

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
    // Parse request body
    const { tableName = 'transactions', textField = 'description', limit = 50, id = null } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Build query to fetch records that don't have embeddings
    let query = supabase
      .from(tableName)
      .select(`id, ${textField}`)
      .is('embedding', null)
      .limit(limit);
      
    // If a specific record ID is provided, only process that one
    if (id) {
      query = supabase
        .from(tableName)
        .select(`id, ${textField}`)
        .eq('id', id)
        .limit(1);
    }
    
    const { data: records, error: fetchError } = await query;
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: id ? 'Record not found' : 'No records found without embeddings',
          totalProcessed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process each record and generate embeddings
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const record of records) {
      try {
        const textContent = record[textField];
        
        if (!textContent) {
          results.failed++;
          results.errors.push(`Record ${record.id} has no text content`);
          continue;
        }
        
        // Generate embedding using OpenAI API
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: textContent,
          encoding_format: "float"
        });
        
        const embedding = embeddingResponse.data[0].embedding;
        
        // Update the record with the embedding
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ embedding })
          .eq('id', record.id);
          
        if (updateError) {
          results.failed++;
          results.errors.push(`Failed to update record ${record.id}: ${updateError.message}`);
        } else {
          results.success++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing record ${record.id}: ${err.message || 'Unknown error'}`);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        totalProcessed: records.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-transaction-embeddings function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
