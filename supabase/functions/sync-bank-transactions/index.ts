
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock function to simulate getting transactions from a bank API
const fetchTransactionsFromBank = async (connectionId) => {
  // This would normally connect to a real bank API
  // For demo purposes, return mock transactions
  return [
    {
      date: new Date().toISOString().split('T')[0],
      description: "Sample Bank Transaction - Monthly Salary",
      amount: 5000.00
    },
    {
      date: new Date().toISOString().split('T')[0],
      description: "Sample Bank Transaction - Office Supplies",
      amount: -120.50
    },
    {
      date: new Date().toISOString().split('T')[0],
      description: "Sample Bank Transaction - Client Payment",
      amount: 1500.00
    }
  ];
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();
    
    if (!connectionId) {
      throw new Error("Connection ID is required");
    }

    console.log(`Syncing transactions for connection ID: ${connectionId}`);

    // In a real implementation, we would:
    // 1. Retrieve the connection details from the database
    // 2. Use those details to authenticate with the bank's API
    // 3. Fetch real transactions
    // For this demo, we'll use mock data
    const transactions = await fetchTransactionsFromBank(connectionId);
    
    // Update the last_sync timestamp in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase
        .from('bank_connections')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', connectionId);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        transactions: transactions 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in sync-bank-transactions function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
