
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");

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
    const { description, amount, existingCategories } = await req.json();
    
    const prompt = `
      Analyze this transaction: "${description}" with amount ${amount}.
      Categorize it into one of these categories: ${existingCategories.join(', ')}.
      Also determine if this is an 'income', 'expense', 'asset', 'liability', or 'equity' transaction.
      And determine if it belongs on a 'profit_loss' or 'balance_sheet' statement.
      Identify the vendor name from the description.
      
      Return the result as a JSON object with these fields:
      {
        "category": "the best matching category",
        "type": "income|expense|asset|liability|equity",
        "statementType": "profit_loss|balance_sheet",
        "confidence": a number between 0 and 1,
        "vendorName": "the vendor name extracted from description",
        "source": "ai"
      }
    `;

    console.log("Sending request to OpenAI with prompt:", prompt);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a financial analysis assistant that categorizes transactions. You only respond with valid JSON, no explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
      }),
    });

    const data = await response.json();
    console.log("OpenAI response:", data);

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from OpenAI");
    }

    let analysisResult;
    try {
      const content = data.choices[0].message.content;
      analysisResult = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", e);
      throw new Error("Invalid response format from OpenAI");
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-transaction function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
