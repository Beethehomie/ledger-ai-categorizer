
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!openaiApiKey) {
  throw new Error("Missing OpenAI API key");
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

// Create a Supabase client with the service role key (needed for database operations)
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, description, batchSize } = await req.json();
    
    // Handle different actions
    if (action === "generate") {
      // Generate embeddings for vendors without them
      return await generateEmbeddings(batchSize || 50);
    } else if (action === "search") {
      // Search for similar vendors based on description
      if (!description) {
        return new Response(
          JSON.stringify({
            error: "Description is required for search action"
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          }
        );
      }
      return await findSimilarVendors(description);
    } else {
      // Default to generating embeddings for backward compatibility
      return await generateEmbeddings(batchSize || 50);
    }
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

// Function to generate embeddings for vendors without them
async function generateEmbeddings(batchSize: number) {
  console.log(`Processing up to ${batchSize} vendors without embeddings...`);

  // Get vendors without embeddings
  const { data: vendors, error: fetchError } = await supabase
    .from("vendor_categorizations")
    .select("id, vendor_name, sample_description")
    .is("embedding", null)
    .limit(batchSize);

  if (fetchError) {
    throw new Error(`Error fetching vendors: ${fetchError.message}`);
  }

  console.log(`Found ${vendors.length} vendors without embeddings`);

  if (vendors.length === 0) {
    return new Response(
      JSON.stringify({ 
        message: "No vendors found without embeddings", 
        processed: 0 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }

  // Process each vendor
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const vendor of vendors) {
    try {
      // Use sample_description if available, otherwise use vendor_name
      const textToEmbed = vendor.sample_description || vendor.vendor_name;
      
      if (!textToEmbed || textToEmbed.trim() === "") {
        console.log(`Skipping vendor ${vendor.id} - no text to embed`);
        results.failed++;
        results.errors.push(`Vendor ${vendor.id}: No text to embed`);
        continue;
      }

      // Generate embedding using OpenAI API
      const embedding = await generateEmbeddingForText(textToEmbed);

      // Update the vendor with the embedding
      const { error: updateError } = await supabase
        .from("vendor_categorizations")
        .update({ embedding })
        .eq("id", vendor.id);

      if (updateError) {
        throw new Error(`Error updating vendor: ${updateError.message}`);
      }

      console.log(`✅ Successfully embedded vendor: ${vendor.vendor_name}`);
      results.success++;
    } catch (err) {
      console.error(`❌ Error processing vendor ${vendor.id}: ${err.message}`);
      results.failed++;
      results.errors.push(`Vendor ${vendor.id}: ${err.message}`);
    }
  }

  return new Response(
    JSON.stringify({
      message: "Embedding generation completed",
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
}

// Function to find similar vendors based on a description
async function findSimilarVendors(description: string) {
  if (!description || description.trim() === "") {
    throw new Error("Empty description provided");
  }
  
  console.log(`Finding similar vendors for description: "${description.substring(0, 30)}..."`);

  // Generate embedding for the input description
  const embedding = await generateEmbeddingForText(description);

  // Query database for similar vendors using the match_vendors_by_embedding function
  const { data: similarVendors, error } = await supabase.rpc(
    "match_vendors_by_embedding",
    {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 3
    }
  );

  if (error) {
    console.error("Error finding similar vendors:", error);
    throw new Error(`Error finding similar vendors: ${error.message}`);
  }

  // Format results for frontend
  const results = similarVendors.map(vendor => ({
    vendor_name: vendor.vendor_name,
    category: vendor.category,
    type: vendor.type,
    statement_type: vendor.statement_type,
    confidence: Math.round(vendor.similarity * 100), // Convert to percentage
    sample_description: vendor.sample_description
  }));

  return new Response(
    JSON.stringify({
      results,
      count: results.length,
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

// Helper function to generate embedding for a text using OpenAI
async function generateEmbeddingForText(text: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
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
