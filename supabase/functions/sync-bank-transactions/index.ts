
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BankConnection {
  id: string;
  bank_name: string;
  connection_type: string;
  api_details: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();
    
    // Create a new Supabase client
    const supabaseUrl = 'https://vfzzjnpkqbljhfdbbrqn.supabase.co';
    const supabaseKey = req.headers.get('Authorization')?.split(' ')[1] ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the user ID from the JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Fetch the bank connection details
    const { data: connection, error: connectionError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      throw new Error(`Failed to fetch bank connection: ${connectionError?.message}`);
    }
    
    // This would be where we connect to various banking APIs
    // For now, we'll simulate a successful connection with placeholder data
    const mockTransactions = [
      {
        date: new Date().toISOString().split('T')[0],
        description: 'API TEST: Office Supplies Store',
        amount: -125.75,
      },
      {
        date: new Date().toISOString().split('T')[0], 
        description: 'API TEST: Client Payment XYZ Corp',
        amount: 1500.00,
      },
      {
        date: new Date().toISOString().split('T')[0],
        description: 'API TEST: Monthly Software Subscription',
        amount: -49.99,
      }
    ];
    
    // Update the last sync time
    await supabase
      .from('bank_connections')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', connectionId);
    
    // Return the transactions
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bank synchronization successful',
        transactions: mockTransactions,
        connection: {
          id: connection.id,
          bank_name: connection.bank_name, 
          last_sync: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error syncing bank transactions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
