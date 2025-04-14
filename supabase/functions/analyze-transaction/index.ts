
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to check for existing vendor categorizations
const findVendorCategorization = async (supabase, description) => {
  // Extract potential vendor name from the description
  // This is a simple extraction, in a real app you'd have more sophisticated logic
  const vendorName = description.split(' - ')[0]?.trim() || description.split(' ')[0]?.trim();
  
  if (!vendorName) return null;
  
  // Look for existing categorizations of this vendor
  const { data, error } = await supabase
    .from('vendor_categorizations')
    .select('*')
    .ilike('vendor_name', `%${vendorName}%`)
    .order('occurrences', { ascending: false })
    .limit(1);
    
  if (error || !data || data.length === 0) {
    return null;
  }
  
  return {
    category: data[0].category,
    type: data[0].type,
    statementType: data[0].statement_type,
    confidence: 0.85,
    vendorName: data[0].vendor_name,
    source: 'database'
  };
};

// Function to analyze transaction with a rule-based approach
// In a production application, this would be a real AI model like OpenAI
const analyzeTransactionWithRules = (description, amount, existingCategories) => {
  // Convert description to lowercase for easier matching
  const lcDescription = description.toLowerCase();
  
  // Default values
  let category = 'Uncategorized';
  let type = 'expense';
  let statementType = 'operating';
  let confidence = 0.5;
  
  // Simple rule-based categorization
  // Income indicators
  if (
    lcDescription.includes('salary') || 
    lcDescription.includes('income') || 
    lcDescription.includes('revenue') || 
    lcDescription.includes('payment received') ||
    lcDescription.includes('client payment') ||
    amount > 0
  ) {
    type = 'income';
    statementType = 'profit_loss';
    confidence = 0.8;
    
    if (lcDescription.includes('salary')) {
      category = 'Salary';
      confidence = 0.9;
    } else if (lcDescription.includes('client') || lcDescription.includes('customer')) {
      category = 'Client Revenue';
      confidence = 0.85;
    } else {
      category = 'Other Income';
    }
  }
  // Expense indicators
  else if (amount < 0 || true) { // Fallback to expense if not identified as income
    type = 'expense';
    statementType = 'profit_loss';
    
    // Office expenses
    if (
      lcDescription.includes('office') || 
      lcDescription.includes('supplies') || 
      lcDescription.includes('stationery')
    ) {
      category = 'Office Supplies';
      confidence = 0.85;
    }
    // Utilities
    else if (
      lcDescription.includes('utility') || 
      lcDescription.includes('electricity') || 
      lcDescription.includes('water') ||
      lcDescription.includes('gas') ||
      lcDescription.includes('internet') ||
      lcDescription.includes('phone')
    ) {
      category = 'Utilities';
      confidence = 0.9;
    }
    // Rent
    else if (
      lcDescription.includes('rent') || 
      lcDescription.includes('lease')
    ) {
      category = 'Rent';
      confidence = 0.95;
    }
    // Travel
    else if (
      lcDescription.includes('travel') || 
      lcDescription.includes('hotel') ||
      lcDescription.includes('flight') ||
      lcDescription.includes('uber') ||
      lcDescription.includes('taxi')
    ) {
      category = 'Travel';
      confidence = 0.85;
    }
    // Meals
    else if (
      lcDescription.includes('restaurant') || 
      lcDescription.includes('dining') ||
      lcDescription.includes('lunch') ||
      lcDescription.includes('dinner') ||
      lcDescription.includes('food')
    ) {
      category = 'Meals & Entertainment';
      confidence = 0.8;
    }
    // Software
    else if (
      lcDescription.includes('software') || 
      lcDescription.includes('subscription') ||
      lcDescription.includes('saas') ||
      lcDescription.includes('license')
    ) {
      category = 'Software Subscriptions';
      confidence = 0.9;
    }
    // Marketing
    else if (
      lcDescription.includes('marketing') || 
      lcDescription.includes('advertising') ||
      lcDescription.includes('promotion') ||
      lcDescription.includes('facebook') ||
      lcDescription.includes('google ads')
    ) {
      category = 'Marketing & Advertising';
      confidence = 0.85;
    }
    // Insurance
    else if (
      lcDescription.includes('insurance') || 
      lcDescription.includes('policy')
    ) {
      category = 'Insurance';
      confidence = 0.9;
    }
    // If we couldn't categorize
    else {
      category = 'Miscellaneous Expense';
      confidence = 0.3;
    }
  }
  
  // Check if the determined category is in the list of existing categories
  if (existingCategories && existingCategories.length > 0) {
    // If we have a direct match, great!
    if (!existingCategories.includes(category)) {
      // Try to find the closest match
      let bestMatch = null;
      let bestMatchScore = 0;
      
      existingCategories.forEach(existingCat => {
        // Simple string similarity check
        const lcExistingCat = existingCat.toLowerCase();
        const lcCategory = category.toLowerCase();
        
        let score = 0;
        if (lcExistingCat.includes(lcCategory) || lcCategory.includes(lcExistingCat)) {
          score = 0.5;
        }
        
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatch = existingCat;
        }
      });
      
      if (bestMatch && bestMatchScore > 0.3) {
        category = bestMatch;
        confidence = Math.min(confidence, 0.7); // Reduce confidence for inexact matches
      }
    }
  }
  
  return {
    category,
    type,
    statementType,
    confidence,
    vendorName: description.split(' - ')[0]?.trim() || description.split(' ')[0]?.trim(),
    source: 'ai'
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, amount, existingCategories } = await req.json();
    
    console.log(`Analyzing transaction: "${description}" with amount ${amount}`);
    
    if (!description) {
      throw new Error("Transaction description is required");
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials are missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // First check if we have an existing vendor categorization
    const existingVendor = await findVendorCategorization(supabase, description);
    
    if (existingVendor) {
      console.log(`Found existing vendor categorization: ${JSON.stringify(existingVendor)}`);
      return new Response(
        JSON.stringify(existingVendor),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If no existing vendor categorization, use rule-based analysis
    const analysis = analyzeTransactionWithRules(description, amount, existingCategories);
    
    console.log(`Analysis result: ${JSON.stringify(analysis)}`);
    
    return new Response(
      JSON.stringify(analysis),
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
