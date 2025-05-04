
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { OpenAI } from "https://esm.sh/openai@4.10.0";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY') || '',
});

// CORS headers for browser requests
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
    const { description, transactionId, batchProcess = false } = await req.json();

    // Validate input
    if (!description && !batchProcess) {
      throw new Error('Transaction description is required for single transaction categorization');
    }

    // Initialize Supabase client from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle batch processing of multiple transactions
    if (batchProcess) {
      // Fetch uncategorized transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, description')
        .is('vendor', null)
        .limit(10);
        
      if (error) {
        throw error;
      }
      
      if (!transactions || transactions.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No uncategorized transactions found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Process each transaction
      const results = [];
      for (const txn of transactions) {
        const result = await categorizeTransaction(txn.description);
        if (result) {
          // Update transaction in database
          await supabase
            .from('transactions')
            .update({
              vendor: result.vendor,
              category: result.category,
              type: result.type || 'expense',
              statement_type: result.statementType || 'profit_loss',
              confidence_score: result.confidence || 0.7
            })
            .eq('id', txn.id);
            
          results.push({ id: txn.id, result });
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          processed: results.length,
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Process single transaction
      const result = await categorizeTransaction(description);
      
      // If a specific transaction ID was provided, update it
      if (transactionId) {
        await supabase
          .from('transactions')
          .update({
            vendor: result.vendor,
            category: result.category,
            type: result.type || 'expense',
            statement_type: result.statementType || 'profit_loss',
            confidence_score: result.confidence || 0.7
          })
          .eq('id', transactionId);
      }
      
      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error("Error in categorize-transaction function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function categorizeTransaction(description: string) {
  try {
    const systemPrompt = 
      "You are an AI that extracts vendor names and accounting categories from bank transaction descriptions.\n" +
      "Respond in JSON format with keys: vendor, category, type, statementType, and confidence.\n";
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Transaction: "${description}"` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('Error categorizing transaction:', err);
    return null;
  }
}
