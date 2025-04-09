
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  description: string;
  amount: number;
  existingCategories: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body
    const requestData: RequestBody = await req.json();
    const { description, amount, existingCategories } = requestData;

    // Create a new Supabase client
    const supabaseUrl = 'https://vfzzjnpkqbljhfdbbrqn.supabase.co';
    const supabaseKey = req.headers.get('Authorization')?.split(' ')[1] ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First check if we have a similar vendor already categorized in the database
    const vendorName = extractVendorName(description);
    
    const { data: existingVendor } = await supabase
      .from('vendor_categorizations')
      .select('*')
      .eq('vendor_name', vendorName)
      .maybeSingle();

    if (existingVendor && existingVendor.verified) {
      // Return the existing categorization if vendor is verified
      console.log(`Found verified vendor: ${vendorName}`);
      return new Response(
        JSON.stringify({
          category: existingVendor.category,
          type: existingVendor.type,
          statementType: existingVendor.statement_type,
          confidence: 0.99,
          source: 'database',
          vendorName,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not found or not verified, use OpenAI to analyze
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('Missing OpenAI API Key');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a financial accounting assistant that categorizes transactions for businesses. 
            You'll be given a transaction description and amount, and you need to classify it into the most appropriate 
            accounting category. Output ONLY a JSON object with three fields:
            1. "category": Pick from these categories or suggest a new one: ${existingCategories.join(', ')}
            2. "type": One of: "income", "expense", "asset", "liability", "equity"
            3. "statementType": Either "profit_loss" or "balance_sheet"
            4. "confidence": A number between 0 and 1 indicating your confidence level.
            Your response must be valid JSON without any additional text.`,
          },
          {
            role: 'user',
            content: `Transaction: "${description}", Amount: $${amount}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    const aiData = await response.json();
    
    if (!aiData.choices || !aiData.choices[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    // Parse the AI response
    const contentString = aiData.choices[0].message.content.trim();
    const aiResult = JSON.parse(contentString);

    // Save this categorization to the database for learning
    if (vendorName && aiResult.category && aiResult.type && aiResult.statementType) {
      if (existingVendor) {
        // Update existing vendor with new occurrence
        await supabase
          .from('vendor_categorizations')
          .update({
            occurrences: existingVendor.occurrences + 1,
            last_used: new Date().toISOString(),
          })
          .eq('id', existingVendor.id);
      } else {
        // Insert new vendor categorization
        await supabase.from('vendor_categorizations').insert({
          vendor_name: vendorName,
          category: aiResult.category,
          type: aiResult.type,
          statement_type: aiResult.statementType,
          confidence: aiResult.confidence,
          verified: false,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ...aiResult,
        vendorName,
        source: 'ai',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing transaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to extract vendor name from transaction description
function extractVendorName(description: string): string {
  if (!description) return "";
  
  let vendor = description.trim().toUpperCase();
  
  // Common prefixes to remove
  const commonPrefixes = [
    "POS PURCHASE ", "PURCHASE ", "FNB PAYMENT ", "PAYMENT ", "CARD PURCHASE ", 
    "DEBIT ORDER ", "EFT PAYMENT ", "DIRECT DEBIT ", "TRANSFER ", "ATM WITHDRAWAL ",
    "CREDIT ", "DEBIT ", "POS ", "TFR ", "TRANSACTION ", "PAYMENT TO "
  ];
  
  // Common suffixes to remove
  const commonSuffixes = [
    " ACCOUNT", " CARD", " PAYMENT", " DEBIT", " CREDIT", " TRANSFER", " TXN", " TRANSACTION",
    " WITHDRAW", " DEPOSIT", " FEE", " CHARGE", " SERVICE", " LLC", " INC", " LTD", " LIMITED",
    " PTY", " (PTY)", " (PTY) LTD", " TECHNOLOGIES", " TECHNOLOGY", " SOLUTIONS", " CC"
  ];
  
  // Words to remove entirely
  const wordsToRemove = [
    "THE", "A", "AN", "AND", "OR", "AT", "ON", "IN", "TO", "FOR", "BY", "WITH", "FROM",
    "OF", "LTD", "LLC", "INC", "CO", "CORP", "CORPORATION", "PTY", "LIMITED"
  ];
  
  // Remove common prefixes
  for (const prefix of commonPrefixes) {
    if (vendor.startsWith(prefix.toUpperCase())) {
      vendor = vendor.substring(prefix.length);
      break;
    }
  }
  
  // Remove common suffixes
  for (const suffix of commonSuffixes) {
    if (vendor.endsWith(suffix.toUpperCase())) {
      vendor = vendor.substring(0, vendor.length - suffix.length);
      break;
    }
  }
  
  // Remove transaction IDs and numbers
  vendor = vendor.replace(/\b\d{5,}\b/g, "");
  vendor = vendor.replace(/\b[A-Z0-9]{10,}\b/g, "");
  vendor = vendor.replace(/REF:\s*\S+/gi, "");
  vendor = vendor.replace(/\d{2}\/\d{2}\/\d{2,4}/g, "");
  vendor = vendor.replace(/\d+\.\d+/g, "");
  vendor = vendor.replace(/\(\d+\)/g, "");
  
  // Split into words and filter out words to remove
  const words = vendor.split(/\s+/).filter(word => 
    word.length > 1 && !wordsToRemove.includes(word)
  );
  
  // Join words back and take the first 3 words max for conciseness
  vendor = words.slice(0, 3).join(" ");
  
  // Title case the final vendor name
  vendor = vendor.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
  
  return vendor.trim();
}
