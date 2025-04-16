
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to check for existing vendor categorizations
const findVendorCategorization = async (supabase, description) => {
  // Extract potential vendor name from the description
  const vendorName = description.split(' - ')[0]?.trim() || description.split(' ')[0]?.trim();
  
  if (!vendorName) return null;
  
  // Look for exact match first
  let { data, error } = await supabase
    .from('vendor_categorizations')
    .select('*')
    .eq('vendor_name', vendorName)
    .order('occurrences', { ascending: false })
    .limit(1);
    
  if (data && data.length > 0) {
    console.log(`Found exact vendor match: ${vendorName}`);
    return {
      category: data[0].category,
      type: data[0].type,
      statementType: data[0].statement_type,
      confidence: 0.95,
      vendorName: data[0].vendor_name,
      source: 'database_exact'
    };
  }
  
  // Look for partial match if exact match not found
  // Using ilike with wildcards for better matching
  ({ data, error } = await supabase
    .from('vendor_categorizations')
    .select('*')
    .ilike('vendor_name', `%${vendorName}%`)
    .order('occurrences', { ascending: false })
    .limit(5));
    
  if (error || !data || data.length === 0) {
    console.log(`No vendor matches found for: ${vendorName}`);
    return null;
  }
  
  // If we have multiple partial matches, find the best one based on similarity score
  let bestMatch = null;
  let highestSimilarity = 0;
  
  for (const vendor of data) {
    // Calculate a simple similarity score between vendorName and vendor.vendor_name
    const similarity = calculateSimilarity(vendorName.toLowerCase(), vendor.vendor_name.toLowerCase());
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = vendor;
    }
  }
  
  if (bestMatch && highestSimilarity > 0.5) {
    console.log(`Found partial vendor match: ${bestMatch.vendor_name} (similarity: ${highestSimilarity.toFixed(2)})`);
    return {
      category: bestMatch.category,
      type: bestMatch.type,
      statementType: bestMatch.statement_type,
      confidence: 0.7 + (highestSimilarity * 0.2), // Confidence based on similarity
      vendorName: bestMatch.vendor_name,
      source: 'database_partial'
    };
  }
  
  console.log(`No good vendor matches found for: ${vendorName}`);
  return null;
};

// Simple string similarity function (Jaccard similarity)
const calculateSimilarity = (str1, str2) => {
  // Convert strings to sets of words
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  // Calculate intersection and union sizes
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  // Return Jaccard similarity
  return intersection.size / union.size;
};

// Function to analyze transaction with a rule-based approach
// Used as a fallback when vendor matching and AI analysis fail
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
    source: 'rules'
  };
};

// Function to analyze transaction with OpenAI
const analyzeTransactionWithAI = async (description, amount, existingCategories) => {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.error("OpenAI API key not found in environment variables");
    return null;
  }
  
  const configuration = new Configuration({ apiKey: openaiApiKey });
  const openai = new OpenAIApi(configuration);
  
  try {
    // Prepare system message with existing categories to guide the AI
    let systemMessage = "You are a financial transaction categorizer. Categorize the transaction into the most appropriate category based on its description and amount.";
    
    if (existingCategories && existingCategories.length > 0) {
      systemMessage += ` Use one of these existing categories if possible: ${existingCategories.join(', ')}. If none match well, suggest the best category.`;
    }
    
    // Convert the amount to a more interpretable format for the AI
    const amountDescription = amount > 0 ? `+${amount} (income)` : `${amount} (expense)`;
    
    const response = await openai.createChatCompletion({
      model: "gpt-4o-mini", // Using a smaller, more cost-effective model
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `Transaction description: "${description}". Amount: ${amountDescription}. Categorize this transaction as specifically as possible.` }
      ],
      temperature: 0.3, // Lower temperature for more deterministic results
      max_tokens: 150, // Limiting token usage
    });
    
    const aiResponse = response.data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      console.error("No response from OpenAI");
      return null;
    }
    
    console.log(`AI response: ${aiResponse}`);
    
    // Parse the AI response to extract structured data
    const categoryMatch = aiResponse.match(/category:\s*(.*?)(?:\.|$)/i);
    const typeMatch = aiResponse.match(/type:\s*(income|expense|asset|liability|equity)(?:\.|$)/i);
    const statementMatch = aiResponse.match(/statement type:\s*(operating|investing|financing|profit_loss|balance_sheet)(?:\.|$)/i);
    
    const category = categoryMatch ? categoryMatch[1].trim() : 'Miscellaneous';
    const type = typeMatch ? typeMatch[1].toLowerCase() : (amount > 0 ? 'income' : 'expense');
    const statementType = statementMatch ? statementMatch[1].toLowerCase() : 'operating';
    
    // Estimate confidence based on how specific the AI's response is
    let confidence = 0.7; // Base confidence
    if (categoryMatch && typeMatch && statementMatch) {
      confidence = 0.85; // High confidence if all fields were extracted
    } else if (!categoryMatch || category === 'Miscellaneous') {
      confidence = 0.5; // Lower confidence if category is generic
    }
    
    return {
      category,
      type,
      statementType,
      confidence,
      vendorName: description.split(' - ')[0]?.trim() || description.split(' ')[0]?.trim(),
      source: 'ai'
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return null;
  }
};

// Function to ensure a transaction has category information
// Uses a cascading approach: vendor match -> AI -> rules
const ensureTransactionCategorization = async (supabase, description, amount, existingCategories) => {
  console.log(`Processing transaction: "${description}" with amount ${amount}`);
  
  // Step 1: Try to find the vendor in our database
  const vendorMatch = await findVendorCategorization(supabase, description);
  if (vendorMatch) {
    console.log(`Categorized using vendor match: ${JSON.stringify(vendorMatch)}`);
    return vendorMatch;
  }
  
  // Step 2: If no vendor match, try AI analysis if OpenAI key is available
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (openaiApiKey) {
    try {
      const aiResult = await analyzeTransactionWithAI(description, amount, existingCategories);
      if (aiResult) {
        console.log(`Categorized using AI: ${JSON.stringify(aiResult)}`);
        return aiResult;
      }
    } catch (error) {
      console.error("Error during AI analysis:", error);
      // Fallthrough to rules-based approach
    }
  } else {
    console.log("OpenAI API key not configured, skipping AI analysis");
  }
  
  // Step 3: Fallback to rule-based approach
  const rulesResult = analyzeTransactionWithRules(description, amount, existingCategories);
  console.log(`Categorized using rules: ${JSON.stringify(rulesResult)}`);
  return rulesResult;
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
    
    // Use the enhanced categorization function
    const result = await ensureTransactionCategorization(
      supabase, 
      description, 
      amount, 
      existingCategories
    );
    
    console.log(`Final categorization result: ${JSON.stringify(result)}`);
    
    return new Response(
      JSON.stringify(result),
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
