
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const { description, existingVendors, country, context } = await req.json();
    
    if (!description || description.trim() === '') {
      throw new Error("Description is required");
    }
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not available");
    }

    // Build a prompt with business context if available
    let systemPrompt = `You are an AI assistant specializing in financial vendor extraction. 
    Given a bank transaction description, identify the vendor name and suggest a category for this transaction.
    Extract only the main business or vendor name from the description, excluding any transaction references, dates, or other metadata.`;
    
    if (context) {
      systemPrompt += `\n\nBusiness Context:
      - Country: ${context.country || country || 'Unknown'}
      - Industry: ${context.industry || 'Unknown'}
      - Business Size: ${context.businessSize || 'Unknown'}`;
    }

    // Add known vendors to prompt
    if (existingVendors && existingVendors.length > 0) {
      systemPrompt += `\n\nKnown vendors (use these if the transaction appears to be from one of them): ${existingVendors.slice(0, 20).join(', ')}`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Transaction description: "${description}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("Invalid response from OpenAI");
    }

    const result = JSON.parse(data.choices[0].message.content);
    
    // Check if the extracted vendor is in the known vendors list
    const isExisting = existingVendors && existingVendors.includes(result.vendor);

    return new Response(
      JSON.stringify({
        vendor: result.vendor,
        category: result.category || null,
        type: result.type || "expense",
        statementType: result.statementType || "profit_loss",
        confidence: result.confidence || 0.7,
        isExisting: isExisting
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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
