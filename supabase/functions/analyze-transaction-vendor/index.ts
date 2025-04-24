
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIKey = Deno.env.get('OPENAI_API_KEY');

// Common prefixes and suffixes to remove
const COMMON_PREFIXES = [
  "POS PURCHASE", "PURCHASE", "FNB PAYMENT", "PAYMENT", "CARD PURCHASE", 
  "DEBIT ORDER", "EFT PAYMENT", "DIRECT DEBIT", "TRANSFER", "ATM WITHDRAWAL",
  "CREDIT", "DEBIT", "POS", "TFR", "TRANSACTION", "PAYMENT TO",
  "PYMT TO", "DEP", "WDL", "ONLINE", "ACH", "DEPOSIT", "WITHDRAWAL",
  "CHQ", "CHEQUE", "CHECK", "CASH", "PMT", "STMT", "STATEMENT"
];

const COMMON_SUFFIXES = [
  "ACCOUNT", "CARD", "PAYMENT", "DEBIT", "CREDIT", "TRANSFER", "TXN", "TRANSACTION",
  "WITHDRAW", "DEPOSIT", "FEE", "CHARGE", "SERVICE", "LLC", "INC", "LTD", "LIMITED",
  "PTY", "(PTY)", "(PTY) LTD", "TECHNOLOGIES", "TECHNOLOGY", "SOLUTIONS", "CC",
  "#\\d+", "\\d+/\\d+", "\\d+-\\d+", "\\(\\d+\\)", "REF\\d+", "ID:\\d+",
  "\\*+\\d+\\*+", "\\d{6}\\*+\\d{4}", "VISA", "MASTERCARD", "\\d{2}/\\d{2}/\\d{2,4}"
];

// Words to remove entirely
const WORDS_TO_REMOVE = [
  "THE", "A", "AN", "AND", "OR", "AT", "ON", "IN", "TO", "FOR", "BY", "WITH", "FROM",
  "OF", "LTD", "LLC", "INC", "CO", "CORP", "CORPORATION", "PTY", "LIMITED",
  "PAYMENT", "TRANSFER", "TRANSACTION", "FEE", "CHARGE", "SERVICE",
  "REF", "REFERENCE", "ID", "NUM", "NUMBER", "DATE", "TIME", "AMOUNT"
];

// Clean up a vendor name by removing unnecessary parts
function cleanVendorName(text: string): string {
  if (!text) return "Unknown";
  
  let vendor = text.trim().toUpperCase();
  
  // Remove all occurrences of common prefixes
  for (const prefix of COMMON_PREFIXES) {
    const regex = new RegExp(`^${prefix}\\s+`, 'i');
    vendor = vendor.replace(regex, '');
  }
  
  // Remove all occurrences of common suffixes
  for (const suffix of COMMON_SUFFIXES) {
    const regex = new RegExp(`\\s+${suffix}$`, 'i');
    vendor = vendor.replace(regex, '');
  }
  
  // Remove transaction IDs, reference numbers, and dates
  vendor = vendor
    .replace(/\b\d{5,}\b/g, '') // Remove long numbers
    .replace(/\b[A-Z0-9]{10,}\b/g, '') // Remove long alphanumeric strings
    .replace(/REF:\s*\S+/gi, '') // Remove reference numbers
    .replace(/\d{2}\/\d{2}\/\d{2,4}/g, '') // Remove dates
    .replace(/\d+\.\d+/g, '') // Remove decimal numbers
    .replace(/\(\d+\)/g, '') // Remove numbers in parentheses
    .replace(/[\\\/\-\*\:\#]+/g, ' ') // Replace special characters with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Split into words and filter out common words and short strings
  const words = vendor.split(/\s+/).filter(word => 
    word.length > 1 && 
    !WORDS_TO_REMOVE.includes(word) && 
    !/^\d+$/.test(word)
  );
  
  // Join words back together and take first 3 words max
  vendor = words.slice(0, 3).join(" ");
  
  // Title case the final vendor name
  vendor = vendor.replace(/\w\S*/g, txt => 
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
  
  return vendor.trim() || "Unknown";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, existingVendors = [] } = await req.json();

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Transaction description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First try local extraction
    const localVendor = cleanVendorName(description);
    console.log("Local vendor extraction result:", localVendor);

    // If OpenAI key is available, try AI extraction
    if (openAIKey && localVendor === "Unknown") {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 
                  'Extract a clean, standardized vendor name from transaction descriptions. ' +
                  'Remove transaction IDs, dates, reference numbers, and other non-vendor information. ' +
                  'For example, "AMAZON MKTPLACE 09/15 #28492" should return just "Amazon". ' +
                  'Respond with ONLY the vendor name, nothing else.'
              },
              {
                role: 'user',
                content: `Extract the vendor name from this transaction description: "${description}"`
              }
            ],
            temperature: 0.3,
            max_tokens: 50,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const aiVendor = cleanVendorName(data.choices[0].message.content.trim());
        console.log("AI vendor extraction result:", aiVendor);

        if (aiVendor && aiVendor !== "Unknown") {
          return new Response(
            JSON.stringify({ 
              vendor: aiVendor,
              isExisting: existingVendors.includes(aiVendor),
              confidence: 0.85
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (err) {
        console.error('Error in AI vendor extraction:', err);
        // Fall through to use local extraction result
      }
    }

    // Return local extraction result if AI failed or wasn't available
    return new Response(
      JSON.stringify({ 
        vendor: localVendor,
        isExisting: existingVendors.includes(localVendor),
        confidence: 0.7
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-transaction-vendor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
