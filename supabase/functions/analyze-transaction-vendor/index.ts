
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, existingVendors = [] } = await req.json();

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Transaction description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract vendor name from the description
    const vendorName = await extractVendorName(description);
    console.log("Extracted vendor:", vendorName);

    // Check if vendor exists in the provided list
    const vendorExists = existingVendors.some(v => 
      v.toLowerCase() === vendorName.toLowerCase()
    );

    let categoryInfo = null;
    
    // If this is a new vendor, suggest a category
    if (!vendorExists) {
      categoryInfo = await suggestCategory(vendorName);
      console.log("Category suggestion:", categoryInfo);
    }

    return new Response(
      JSON.stringify({ 
        vendor: vendorName, 
        isExisting: vendorExists,
        category: categoryInfo?.category || null,
        confidence: categoryInfo?.confidence || null,
        type: categoryInfo?.type || null,
        statementType: categoryInfo?.statementType || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-transaction-vendor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractVendorName(description: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 
            'You are a financial assistant tasked with extracting vendor names from transaction descriptions. ' +
            'Your goal is to provide a concise, standardized vendor name. ' +
            'Remove transaction IDs, dates, reference numbers, and other non-vendor information. ' +
            'For example, "AMAZON MKTPLACE 09/15 #28492" should return just "Amazon". ' +
            'Respond with ONLY the vendor name, nothing else.'
        },
        {
          role: 'user',
          content: `Extract the vendor name from this transaction description: "${description}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function suggestCategory(vendorName: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 
            'You are a financial accounting expert specialized in categorizing vendors according to IFRS ' +
            '(International Financial Reporting Standards). ' +
            'Based on vendor names, you classify them into appropriate accounting categories.\n\n' +
            'For each vendor, you need to determine:\n' +
            '1. The appropriate category name\n' +
            '2. The transaction type (income, expense, asset, liability, equity)\n' +
            '3. The financial statement it belongs to (profit_loss or balance_sheet)\n' +
            '4. A confidence score from 0 to 1 indicating how certain you are of this classification\n\n' +
            'For types:\n' +
            '- income: Money coming in (revenue, sales)\n' +
            '- expense: Money going out (costs, purchases)\n' +
            '- asset: Resources owned (cash, equipment)\n' +
            '- liability: Obligations (loans, payables)\n' +
            '- equity: Ownership interest\n\n' +
            'For statement types:\n' +
            '- profit_loss: Income and expense transactions\n' +
            '- balance_sheet: Asset, liability, and equity transactions\n\n' +
            'Your response should be in JSON format with category, type, statementType, and confidence.'
        },
        {
          role: 'user',
          content: 
            `Categorize this vendor: "${vendorName}"\n\n` +
            'Respond with JSON only in this exact format: {"category": "Category Name", "type": "income|expense|asset|liability|equity", "statementType": "profit_loss|balance_sheet", "confidence": 0.XX}'
        }
      ],
      temperature: 0.2,
      max_tokens: 150,
    }),
  });

  const data = await response.json();
  const responseText = data.choices[0].message.content.trim();
  
  try {
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No valid JSON found in response');
    }
  } catch (error) {
    console.error('Error parsing AI response:', error, 'Response was:', responseText);
    return {
      category: 'Uncategorized',
      type: 'expense',
      statementType: 'profit_loss',
      confidence: 0.1
    };
  }
}
