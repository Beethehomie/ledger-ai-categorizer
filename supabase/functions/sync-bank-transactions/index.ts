import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to get real stats and data from the database
const getSystemStats = async (supabase) => {
  try {
    // Get transaction count
    const { count: transactionCount, error: transactionError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    // Get vendor categorizations count
    const { count: vendorCount, error: vendorError } = await supabase
      .from('vendor_categorizations')
      .select('*', { count: 'exact', head: true });
    
    // Get bank connections count
    const { count: bankConnectionCount, error: bankError } = await supabase
      .from('bank_connections')
      .select('*', { count: 'exact', head: true });
    
    // Get verified categories count
    const { count: verifiedCategoriesCount, error: verifiedError } = await supabase
      .from('vendor_categorizations')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true);
    
    if (transactionError || vendorError || bankError || verifiedError) {
      throw new Error('Error getting system stats');
    }
    
    return {
      transactionCount: transactionCount || 0,
      vendorCount: vendorCount || 0,
      bankConnectionCount: bankConnectionCount || 0,
      verifiedCategoriesCount: verifiedCategoriesCount || 0
    };
  } catch (error) {
    console.error('Error in getSystemStats:', error);
    return {
      transactionCount: 0,
      vendorCount: 0,
      bankConnectionCount: 0,
      verifiedCategoriesCount: 0
    };
  }
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
    const { connectionId, getStats } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials are missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // If only requesting stats, return those
    if (getStats) {
      const stats = await getSystemStats(supabase);
      return new Response(
        JSON.stringify({ 
          success: true,
          stats
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Otherwise handle transaction syncing
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
    await supabase
      .from('bank_connections')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', connectionId);
    
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
