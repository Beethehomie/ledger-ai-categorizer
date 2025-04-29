
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";

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
    const { vendors } = await req.json();
    
    if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
      throw new Error("No vendors provided or invalid data format");
    }

    // Get Supabase credentials from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    // Create a Supabase client with the service role key (admin privileges)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const results = {
      inserted: 0,
      updated: 0,
      errors: 0,
      details: [] as Array<{vendor: string, status: string}>
    };

    // Process each vendor object
    for (const vendor of vendors) {
      if (!vendor.name || !vendor.category) {
        results.errors++;
        results.details.push({ 
          vendor: vendor.name || "Unknown", 
          status: "Missing required data" 
        });
        continue;
      }

      try {
        // Check if vendor already exists
        const { data: existingVendor, error: checkError } = await supabase
          .from('vendor_categorizations')
          .select('*')
          .eq('vendor_name', vendor.name)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        if (existingVendor) {
          // Update existing vendor
          const { error: updateError } = await supabase
            .from('vendor_categorizations')
            .update({
              category: vendor.category,
              type: vendor.type || existingVendor.type || 'expense',
              statement_type: vendor.statementType || existingVendor.statement_type || 'profit_loss',
              sample_description: vendor.sampleDescription || existingVendor.sample_description,
              occurrences: existingVendor.occurrences + 1,
              verified: true, // Mark as verified during import
              last_used: new Date().toISOString()
            })
            .eq('vendor_name', vendor.name);
            
          if (updateError) throw updateError;
          
          results.updated++;
          results.details.push({ 
            vendor: vendor.name, 
            status: "Updated" 
          });
        } else {
          // Insert new vendor
          const { error: insertError } = await supabase
            .from('vendor_categorizations')
            .insert({
              vendor_name: vendor.name,
              category: vendor.category,
              type: vendor.type || 'expense',
              statement_type: vendor.statementType || 'profit_loss',
              sample_description: vendor.sampleDescription || '',
              occurrences: 1,
              verified: true, // Mark as verified during import
              last_used: new Date().toISOString()
            });
            
          if (insertError) throw insertError;
          
          results.inserted++;
          results.details.push({ 
            vendor: vendor.name, 
            status: "Inserted" 
          });
        }
      } catch (vendorError) {
        console.error(`Error processing vendor ${vendor.name}:`, vendorError);
        results.errors++;
        results.details.push({ 
          vendor: vendor.name, 
          status: `Error: ${vendorError.message || "Unknown error"}` 
        });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error in import-vendor-categories function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
