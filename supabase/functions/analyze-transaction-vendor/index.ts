
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIKey = Deno.env.get('OPENAI_API_KEY');

// Enhanced common prefixes and suffixes to remove
const COMMON_PREFIXES = [
  "POS PURCHASE", "PURCHASE", "FNB PAYMENT", "PAYMENT", "CARD PURCHASE", 
  "DEBIT ORDER", "EFT PAYMENT", "DIRECT DEBIT", "TRANSFER", "ATM WITHDRAWAL",
  "CREDIT", "DEBIT", "POS", "TFR", "TRANSACTION", "PAYMENT TO",
  "PYMT TO", "DEP", "WDL", "ONLINE", "ACH", "DEPOSIT", "WITHDRAWAL",
  "CHQ", "CHEQUE", "CHECK", "CASH", "PMT", "STMT", "STATEMENT",
  "INTERNET TRF", "INTERNET PAYMENT", "INTERNET BANKING", "INTERNET TRANSFER",
  "NEDBANK", "ABSA", "CAPITEC", "FIRST NATIONAL BANK", "STANDARD BANK",
  "VISA", "MASTERCARD", "AMEX", "PAYPAL", "SUBSCRIPTION",
  "SALARY", "WAGES", "CASHBACK", "REFUND", "REVERSAL", "INTEREST",
  "MONTHLY FEE", "SERVICE FEE", "ACCOUNT FEE", "BANK CHARGES",
  "UTILITY", "RENT", "INS", "INSURANCE"
];

const COMMON_SUFFIXES = [
  "ACCOUNT", "CARD", "PAYMENT", "DEBIT", "CREDIT", "TRANSFER", "TXN", "TRANSACTION",
  "WITHDRAW", "DEPOSIT", "FEE", "CHARGE", "SERVICE", "LLC", "INC", "LTD", "LIMITED",
  "PTY", "(PTY)", "(PTY) LTD", "TECHNOLOGIES", "TECHNOLOGY", "SOLUTIONS", "CC",
  "#\\d+", "\\d+/\\d+", "\\d+-\\d+", "\\(\\d+\\)", "REF\\d+", "ID:\\d+",
  "\\*+\\d+\\*+", "\\d{6}\\*+\\d{4}", "VISA", "MASTERCARD", "\\d{2}/\\d{2}/\\d{2,4}",
  "SUBSCRIPTION", "MONTHLY", "ANNUAL", "RECURRING", "ONCE-OFF",
  "SETTLEMENT", "PURCHASE", "PAYMENT", "TRANSACTION", "BANK",
  " SA$", " ZA$", " US$", " UK$", " \\w{2}$" // Country codes at the end
];

// Words to remove entirely
const WORDS_TO_REMOVE = [
  "THE", "A", "AN", "AND", "OR", "AT", "ON", "IN", "TO", "FOR", "BY", "WITH", "FROM",
  "OF", "LTD", "LLC", "INC", "CO", "CORP", "CORPORATION", "PTY", "LIMITED",
  "PAYMENT", "TRANSFER", "TRANSACTION", "FEE", "CHARGE", "SERVICE",
  "REF", "REFERENCE", "ID", "NUM", "NUMBER", "DATE", "TIME", "AMOUNT",
  "DEBIT", "CREDIT", "ACCT", "ACCOUNT", "CARD", "STMT", "STATEMENT",
  "PYMT", "PMT", "PAY", "POS", "ATM", "EFT", "TFR", "ACH", "INT",
  "WITHDRAWAL", "DEPOSIT", "PURCHASE", "DIRECT", "ORDER", "ONLINE", "WEB",
  "BANK", "CHQ", "CHECK", "CHEQUE", "CASH", "MEMO", "DESCRIPTION"
];

// Country-specific context terms
const COUNTRY_CONTEXT = {
  "ZA": {
    commonTerms: ["CHECKERS", "WOOLWORTHS", "PICK N PAY", "SPAR", "GAME", "MAKRO", "TAKEALOT"],
    bankNames: ["ABSA", "CAPITEC", "FNB", "NEDBANK", "STANDARD BANK", "DISCOVERY"]
  },
  "US": {
    commonTerms: ["WALMART", "TARGET", "COSTCO", "KROGER", "WALGREENS", "CVS", "AMAZON"],
    bankNames: ["CHASE", "BANK OF AMERICA", "WELLS FARGO", "CITI", "CAPITAL ONE"]
  },
  "UK": {
    commonTerms: ["TESCO", "SAINSBURY", "ASDA", "MORRISONS", "BOOTS", "JOHN LEWIS"],
    bankNames: ["BARCLAYS", "HSBC", "LLOYDS", "NATWEST", "SANTANDER"]
  }
};

// Clean up a vendor name by removing unnecessary parts
function cleanVendorName(text: string, country: string = "ZA"): string {
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
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '') // Remove dates in various formats
    .replace(/\d{1,2}-\d{1,2}-\d{2,4}/g, '') // Remove dates in dash format
    .replace(/\d{1,2}\s+[A-Za-z]{3,}\s+\d{2,4}/g, '') // Remove dates like "17 Feb 2023"
    .replace(/\d+\.\d+/g, '') // Remove decimal numbers
    .replace(/\(\d+\)/g, '') // Remove numbers in parentheses
    .replace(/[\\\/\-\*\:\#]+/g, ' ') // Replace special characters with spaces
    .replace(/\d+\/\d+/g, '') // Remove fraction-like numbers
    .replace(/\b\d{1,5}\b/g, '') // Remove isolated numbers up to 5 digits
    .replace(/\d+\*+\d+/g, '') // Remove patterns like "485442*7284"
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Split into words and filter out common words and short strings
  const words = vendor.split(/\s+/).filter(word => 
    word.length > 1 && 
    !WORDS_TO_REMOVE.includes(word) && 
    !/^\d+$/.test(word)
  );
  
  // Try to identify known vendors based on country context
  const countryContext = COUNTRY_CONTEXT[country] || COUNTRY_CONTEXT["ZA"];
  const knownTerms = new Set(countryContext.commonTerms);
  
  const recognizedWords = words.filter(word => knownTerms.has(word));
  if (recognizedWords.length > 0) {
    vendor = recognizedWords.join(" ");
  } else {
    // Join words back together and take first 2 words max
    vendor = words.slice(0, 2).join(" ");
  }
  
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
    const { description, existingVendors = [], country = "ZA", context = {} } = await req.json();

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Transaction description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First try local extraction
    const localVendor = cleanVendorName(description, country);
    console.log("Local vendor extraction result:", localVendor);

    // If OpenAI key is available, try AI extraction
    if (openAIKey && (localVendor === "Unknown" || localVendor.length < 3)) {
      try {
        // Create a system prompt that includes business context
        const businessContext = `
          Country: ${country || "Unknown"}
          Industry: ${context.industry || "Unknown"}
          Payment Methods: ${context.paymentMethods?.join(", ") || "Various"}
          Business Size: ${context.businessSize || "Unknown"}
        `;

        console.log("Requesting AI analysis with context:", businessContext);
        
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
                  'Extract only the essential vendor or merchant name from transaction descriptions. ' +
                  'Remove all transaction IDs, dates, reference numbers, and other non-vendor information. ' +
                  'Focus on finding the actual business name, not descriptive elements. ' +
                  'For example "POS Purchase Checkers Od Sun Val 485442*7284 17 Feb" should return just "Checkers". ' +
                  'Consider the following context about the business when determining which vendor might be most relevant: ' +
                  businessContext + '\n' +
                  'Respond with ONLY the vendor name, nothing else. Keep it concise.'
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
        const aiVendor = data.choices[0].message.content.trim();
        console.log("AI vendor extraction result:", aiVendor);

        // Clean the AI response just to be sure
        const finalVendor = aiVendor.replace(/^"(.*)"$/, "$1").trim();
        
        if (finalVendor && finalVendor !== "Unknown") {
          return new Response(
            JSON.stringify({ 
              vendor: finalVendor,
              isExisting: existingVendors.includes(finalVendor),
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
