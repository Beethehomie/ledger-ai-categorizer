
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  description: string;
  existingVendors?: string[];
  country?: string;
  context?: {
    industry?: string;
    businessSize?: string;
    currency?: string;
  };
}

interface VendorResponse {
  vendor: string;
  category?: string;
  type?: string;
  statementType?: string;
  confidence: number;
  isExisting: boolean;
}

// Define the OpenAI API call
async function callOpenAI(
  description: string, 
  existingVendors: string[], 
  sampleDescriptions: Record<string, string>,
  country: string,
  context: any
) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key");
  }

  // Find examples of similar vendors to use for RAG
  const examples: string[] = [];
  if (Object.keys(sampleDescriptions).length > 0) {
    // Add a few examples from the sample descriptions as context
    const sampleEntries = Object.entries(sampleDescriptions).slice(0, 5);
    for (const [vendor, desc] of sampleEntries) {
      examples.push(`Description: "${desc}" → Extracted vendor: "${vendor}"`);
    }
  }

  const prompt = `
You are an AI assistant specialized in analyzing bank transaction descriptions for business bookkeeping.

Task: Extract the vendor name and categorize the transaction from the description provided.

Transaction description:
"${description}"

${examples.length > 0 ? "Examples of vendor extractions:\n" + examples.join("\n") : ""}

Existing vendors in the system: ${existingVendors.join(", ")}

Business Context:
- Country: ${country || "Unknown"}
- Industry: ${context?.industry || "General business"}
- Size: ${context?.businessSize || "Unknown"}
- Currency: ${context?.currency || "USD"}

Instructions:
1. Extract the most likely vendor name from the transaction description, removing generic terms like "PAYMENT TO", "ACH", "DEBIT", etc.
2. If the extracted vendor matches or is very similar to an existing vendor in the system, use the exact name from the existing vendors list.
3. If it's a new vendor, provide a clean, properly capitalized vendor name.
4. Always return a structured JSON response with the following fields:
   - vendor: The extracted or matched vendor name
   - category: A business expense/income category (e.g., "Software", "Rent", "Marketing Adspend", "Sales")
   - type: Either "income", "expense", "asset", "liability", or "equity"
   - statementType: Either "profit_loss" or "balance_sheet"
   - confidence: A number between 0 and 1 representing your confidence in this extraction and categorization
   - isExisting: Boolean indicating if this vendor matches an existing one in the system

Response format:
{
  "vendor": "Extracted Vendor Name",
  "category": "Category",
  "type": "expense|income|asset|liability|equity",
  "statementType": "profit_loss|balance_sheet",
  "confidence": 0.95,
  "isExisting": true|false
}
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a financial AI assistant for bookkeeping and transaction categorization."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse the JSON response
    return JSON.parse(content) as VendorResponse;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const requestData: AnalyzeRequest = await req.json();
    const { description, existingVendors = [], country = "US", context = {} } = requestData;
    
    if (!description) {
      throw new Error("Transaction description is required");
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    // Initialize Supabase client with admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch sample descriptions for RAG (Retrieval Augmented Generation)
    const { data: vendorSamples, error: samplesError } = await supabase
      .from('vendor_categorizations')
      .select('vendor_name, sample_description')
      .not('sample_description', 'is', null)
      .not('sample_description', 'eq', '');
      
    if (samplesError) {
      console.error("Error fetching sample descriptions:", samplesError);
    }
    
    // Build a dictionary of vendor sample descriptions
    const sampleDescriptions: Record<string, string> = {};
    if (vendorSamples) {
      vendorSamples.forEach(v => {
        if (v.sample_description && v.vendor_name) {
          sampleDescriptions[v.vendor_name] = v.sample_description;
        }
      });
    }
    
    // Call OpenAI to analyze the transaction
    const analysisResult = await callOpenAI(
      description, 
      existingVendors, 
      sampleDescriptions,
      country,
      context
    );
    
    // If this is a new vendor with high confidence, store the transaction description as a sample
    if (analysisResult.vendor && 
        analysisResult.confidence > 0.8 && 
        !analysisResult.isExisting) {
      
      try {
        // Try to insert as a new vendor if not exists
        const { error: insertError } = await supabase
          .from('vendor_categorizations')
          .insert({
            vendor_name: analysisResult.vendor,
            category: analysisResult.category || '',
            type: analysisResult.type || 'expense',
            statement_type: analysisResult.statementType || 'profit_loss',
            sample_description: description,
            occurrences: 1,
            verified: false,
            confidence: analysisResult.confidence
          })
          .select()
          .single();
          
        if (insertError && insertError.code === '23505') {
          // If vendor already exists but we have a new sample description
          const { error: updateError } = await supabase
            .from('vendor_categorizations')
            .update({
              sample_description: description
            })
            .eq('vendor_name', analysisResult.vendor)
            .is('sample_description', null);
            
          if (updateError) {
            console.error("Error updating sample description:", updateError);
          }
        } else if (insertError) {
          console.error("Error inserting new vendor:", insertError);
        }
      } catch (err) {
        console.error("Error saving vendor data:", err);
      }
    }
    
    // Return the analysis result
    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in analyze-transaction-vendor function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
