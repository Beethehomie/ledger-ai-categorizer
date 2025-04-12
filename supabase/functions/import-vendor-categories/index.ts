
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This is a much larger dataset of vendor categories
// In a real implementation, this could come from an uploaded file or API
const vendorCategories = [
  { vendor_name: "0161 LLC", category: "Contractors", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "1 Hotel South Beach", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "123RF", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "1977 fly & grill", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "1of10.com", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "1Password", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "24/7 Chat Services", category: "Contractors", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "2Checkout", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "350 Main Brasserie", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "5 AM LLC", category: "Contractors", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "5 Guys", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "6 & Sundry", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "7-Eleven", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "7x7 SF Airport", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Adobe", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Airbnb", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Alaska Airlines", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Amazon", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Amazon Web Services", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "American Airlines", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Amoeba Music", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Apple", category: "Equipment", type: "asset", statement_type: "balance_sheet" },
  { vendor_name: "Asana", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "AT&T", category: "Utilities", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Bank Fee", category: "Bank Charges", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Best Buy", category: "Equipment", type: "asset", statement_type: "balance_sheet" },
  { vendor_name: "Blue Bottle Coffee", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Canva", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Capital One", category: "Loans", type: "liability", statement_type: "balance_sheet" },
  { vendor_name: "Chase", category: "Loans", type: "liability", statement_type: "balance_sheet" },
  { vendor_name: "Chipotle", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Comcast", category: "Utilities", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Delta Airlines", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Digital Ocean", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Disney+", category: "Subscriptions", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Doordash", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Dropbox", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Ebay", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Etsy", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Facebook", category: "Advertising", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "FedEx", category: "Shipping", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Figma", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "GitHub", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Google", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Grubhub", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Heroku", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Hilton Hotels", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Home Depot", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Hyatt Hotels", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Indeed", category: "Recruiting", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Instagram", category: "Advertising", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Instacart", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Internal Revenue Service", category: "Taxes", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Intuit", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Jira", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "LinkedIn", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Lyft", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Mailchimp", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Marriott Hotels", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Microsoft", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Netflix", category: "Subscriptions", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "New York Times", category: "Subscriptions", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Nike", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Notion", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Office Depot", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "OpenAI", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "PayPal", category: "Bank Charges", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Postmates", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Quickbooks", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Ramp", category: "Bank Charges", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Salesforce", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Shopify", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Slack", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Southwest Airlines", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Spotify", category: "Subscriptions", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Square", category: "Bank Charges", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Squarespace", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Starbucks", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Staples", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Stripe", category: "Bank Charges", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Target", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "TikTok", category: "Advertising", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "T-Mobile", category: "Utilities", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Trader Joe's", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Twilio", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Twitter", category: "Advertising", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Uber", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Uber Eats", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "United Airlines", category: "Travel", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "UPS", category: "Shipping", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "USPS", category: "Shipping", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Verizon", category: "Utilities", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Walmart", category: "Office Supplies", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Webflow", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "WeWork", category: "Rent", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Whole Foods", category: "Food & Entertainment", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "WordPress", category: "Software", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "YouTube", category: "Advertising", type: "expense", statement_type: "profit_loss" },
  { vendor_name: "Zoom", category: "Software", type: "expense", statement_type: "profit_loss" }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get authentication from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    // Process in batches to avoid timeouts
    const batchSize = 50;
    let processedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < vendorCategories.length; i += batchSize) {
      const batch = vendorCategories.slice(i, i + batchSize);
      
      // Check if vendor already exists before inserting
      for (const vendor of batch) {
        const { data: existingVendor, error: lookupError } = await supabase
          .from('vendor_categorizations')
          .select('id')
          .eq('vendor_name', vendor.vendor_name)
          .maybeSingle();
          
        if (lookupError) {
          console.error(`Error looking up vendor ${vendor.vendor_name}:`, lookupError);
          errorCount++;
          continue;
        }
        
        if (!existingVendor) {
          // Add verified flag and occurrences for initial imports
          const vendorEntry = {
            ...vendor,
            verified: true,
            occurrences: 5, // Start with reasonable number to mark it as reliable
            created_at: new Date().toISOString(),
            last_used: new Date().toISOString(),
            confidence: 0.9
          };
          
          const { error: insertError } = await supabase
            .from('vendor_categorizations')
            .insert(vendorEntry);
            
          if (insertError) {
            console.error(`Error inserting vendor ${vendor.vendor_name}:`, insertError);
            errorCount++;
          } else {
            processedCount++;
          }
        } else {
          // Vendor exists, maybe update it here if needed
          console.log(`Vendor ${vendor.vendor_name} already exists, skipping...`);
        }
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} vendor categories with ${errorCount} errors.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in import-vendor-categories function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
