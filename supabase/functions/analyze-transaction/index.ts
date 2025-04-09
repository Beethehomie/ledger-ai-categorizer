
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, amount, existingCategories } = await req.json();
    
    if (!description) {
      throw new Error("Transaction description is required");
    }

    console.log(`Analyzing transaction: "${description}" with amount ${amount}`);
    
    // First, check if we have a previous categorization for this vendor in our database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Extract potential vendor name from description
      const vendorName = extractVendorName(description);
      
      if (vendorName) {
        console.log(`Potential vendor name: ${vendorName}`);
        
        // Check if vendor exists in the database
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendor_categorizations')
          .select('*')
          .eq('vendor_name', vendorName)
          .eq('verified', true)
          .single();
          
        if (!vendorError && vendorData) {
          console.log(`Found verified vendor in database: ${vendorData.vendor_name}`);
          // Return category from database with high confidence
          return new Response(
            JSON.stringify({
              category: vendorData.category,
              type: vendorData.type,
              statementType: vendorData.statement_type,
              confidence: 0.95,
              vendorName: vendorData.vendor_name,
              source: 'database'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // If we get here, no vendor match was found in the database
    // Use OpenAI to categorize the transaction
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is required but not set');
    }
    
    const prompt = createAnalysisPrompt(description, amount, existingCategories);
    
    console.log('Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an AI assistant specialized in financial categorization.' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('OpenAI API response:', data);
    
    // Parse the response to extract category and confidence
    const content = data.choices[0].message.content;
    const result = parseOpenAIResponse(content);
    
    // Store the result in the database for future use
    if (supabaseUrl && supabaseKey && result.category && vendorName) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Check if this vendor already exists
      const { data: existingVendor } = await supabase
        .from('vendor_categorizations')
        .select('id')
        .eq('vendor_name', vendorName)
        .single();
        
      if (!existingVendor) {
        // Insert new vendor categorization
        await supabase
          .from('vendor_categorizations')
          .insert({
            vendor_name: vendorName,
            category: result.category,
            type: result.type,
            statement_type: result.statementType,
            confidence: result.confidence,
            verified: false,
            occurrences: 1,
            last_used: new Date().toISOString()
          });
          
        console.log(`Inserted new vendor categorization for ${vendorName}`);
      }
    }
    
    console.log('Analysis result:', result);
    
    return new Response(
      JSON.stringify({
        ...result,
        vendorName,
        source: 'ai'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in analyze-transaction function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Function to extract potential vendor name from description
function extractVendorName(description: string): string | null {
  // Remove special characters and extra spaces
  const cleanedDesc = description.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  
  // Split into words
  const words = cleanedDesc.split(' ');
  
  // If there are multiple words, take the first 2-3 words as the potential vendor name
  if (words.length >= 3) {
    return words.slice(0, 2).join(' ').toUpperCase();
  } else if (words.length >= 1) {
    return words[0].toUpperCase();
  }
  
  return null;
}

// Function to create a prompt for OpenAI
function createAnalysisPrompt(description: string, amount: number, existingCategories: string[]): string {
  return `
Please analyze this financial transaction and categorize it:

Transaction Description: "${description}"
Amount: ${amount}

Available Categories:
${existingCategories.join(', ')}

Please determine:
1. The most appropriate category from the list above
2. The transaction type (income, expense, asset, liability, or equity)
3. The statement type (profit_loss or balance_sheet)
4. Your confidence level in this categorization (0.0 to 1.0)

Return your analysis in the following JSON format ONLY (no additional text):
{
  "category": "selected category",
  "type": "transaction type",
  "statementType": "statement type",
  "confidence": confidence level
}
`;
}

// Function to parse OpenAI response
function parseOpenAIResponse(content: string) {
  try {
    // Try to extract any JSON objects from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const result = JSON.parse(jsonStr);
      
      return {
        category: result.category,
        type: result.type,
        statementType: result.statementType,
        confidence: result.confidence
      };
    }
    
    // If no JSON found, try to extract information from text
    return {
      category: 'Uncategorized',
      type: 'expense',
      statementType: 'profit_loss',
      confidence: 0.5
    };
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    return {
      category: 'Uncategorized',
      type: 'expense',
      statementType: 'profit_loss',
      confidence: 0.5
    };
  }
}
