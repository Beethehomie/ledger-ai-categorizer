
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
    const { description, amount, existingCategories, businessContext } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not available");
    }

    // Build a prompt that includes business context if available
    let systemPrompt = `You are an AI assistant specializing in financial transaction categorization. Analyze the transaction description and suggest the most appropriate category, transaction type (income/expense/asset/liability), and statement type (profit_loss/balance_sheet).`;
    
    // Add business context to the prompt if available
    if (businessContext) {
      systemPrompt += `\n\nBusiness Context:
- Country: ${businessContext.country || 'Unknown'}
- Industry: ${businessContext.industry || 'Unknown'}
- Business Size: ${businessContext.businessSize || 'Unknown'}
- Payment Methods: ${businessContext.paymentMethods?.join(', ') || 'Unknown'}
- Currency: ${businessContext.currency || 'Unknown'}`;
      
      if (businessContext.additionalInfo) {
        systemPrompt += `\n- Additional Context: ${businessContext.additionalInfo}`;
      }
    }

    // Build a list of existing categories
    let categoriesPrompt = "";
    if (existingCategories && existingCategories.length > 0) {
      categoriesPrompt = `\n\nConsider using one of these existing categories if appropriate: ${existingCategories.join(', ')}`;
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
            content: systemPrompt + categoriesPrompt
          },
          {
            role: "user",
            content: `Transaction: "${description}", Amount: ${amount}`
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

    return new Response(
      JSON.stringify({
        category: responseContent.category || "Unknown",
        type: responseContent.type || "expense",
        statementType: responseContent.statementType || "profit_loss",
        confidence: responseContent.confidence || 0.7,
        vendor: responseContent.vendor || null
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in analyze-transaction function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
