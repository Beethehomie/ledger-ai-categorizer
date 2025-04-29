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
    const { description, existingVendors = [], country = "ZA", context = {} } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not available");
    }

    // Build a prompt that includes business context
    let systemPrompt = `You are an AI assistant specializing in financial transaction processing for businesses. 
Your task is to analyze a bank transaction description and extract the actual vendor name.

For a business transaction description like "${description}", identify the actual merchant or vendor name that
would represent this transaction in accounting records. Remove generic words like "POS PURCHASE", "PMT", "Debit", "ATM" etc.

If found in the list of existing vendors, use the exact same name to ensure consistency. Otherwise, extract a concise vendor name.

Return a JSON object with:
- vendor: The extracted vendor name
- isExisting: Boolean indicating if the vendor was found in the existing vendors list
- confidence: A score from 0.0 to 1.0 indicating confidence in the extraction
- category: A suitable accounting category (if not an existing vendor)
- type: The transaction type (income, expense, asset, liability) (if not an existing vendor)
- statementType: The statement type (profit_loss, balance_sheet) (if not an existing vendor)`;

    // Add business context to the prompt if available
    if (context && Object.keys(context).length > 0) {
      systemPrompt += `\n\nBusiness Context:
- Country: ${context.country || country || 'Unknown'}
- Industry: ${context.industry || 'Unknown'}
- Business Size: ${context.businessSize || 'Unknown'}
- Payment Methods: ${context.paymentMethods?.join(', ') || 'Unknown'}
- Currency: ${context.currency || 'Unknown'}`;
      
      if (context.additionalInfo) {
        systemPrompt += `\n- Additional Context: ${context.additionalInfo}`;
      }
    }

    // Add examples from the provided dataset
    systemPrompt += `\n\nHere are some examples of previously correctly identified vendors:
- "STRIPE TRANSFER" → Stripe
- "CHECK 995785" → Dale Business Center
- "WAVE SV9T XXXXXX4751" → Wave
- "ACH BATCH - TWO FRIENDLY NER" → Two Friendly Nerds
- "TDBANK BILL PAY CHECK - THAO HAU" → Thao Hau
- "VISA DDA PUR AP - 479338 US IP ATTORNEYS PC SAN DIEGO * CA" → US IP Attorneys
- "VISA DDA PUR AP - 469216 STARBUCKS STORE 00853 WEST HARTFORD * CT" → Starbucks`;

    // Add existing vendors to the prompt for context
    if (existingVendors && existingVendors.length > 0) {
      // Take only the first 20 to keep the prompt size manageable
      const vendorsToShow = existingVendors.slice(0, 20);
      systemPrompt += `\n\nExisting vendors in the system (use exact names if applicable): ${vendorsToShow.join(', ')}`;
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
            content: `Please extract the vendor from this transaction description: "${description}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("Invalid response from OpenAI");
    }

    // Parse the response content
    const responseContent = JSON.parse(data.choices[0].message.content);
    
    // Check if the vendor is in the existing vendors list
    const isExisting = existingVendors.some(
      v => v.toLowerCase() === responseContent.vendor.toLowerCase()
    );

    return new Response(
      JSON.stringify({
        vendor: responseContent.vendor,
        isExisting: isExisting || responseContent.isExisting || false,
        confidence: responseContent.confidence || 0.7,
        category: !isExisting ? responseContent.category : undefined,
        type: !isExisting ? responseContent.type : undefined,
        statementType: !isExisting ? responseContent.statementType : undefined
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
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
