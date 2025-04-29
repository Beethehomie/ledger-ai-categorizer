
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const { description, existingVendors = [], country = "ZA", context = {} } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not available");
    }

    // Build a prompt that includes business context
    let systemPrompt = `You are an AI assistant specializing in financial transaction processing for businesses. 
Your task is to analyze a bank transaction description and extract the actual vendor name.

For a business transaction description like "${description}", identify the actual merchant or vendor name that
would represent this transaction in accounting records. Remove generic words like "POS PURCHASE", "PMT", "Debit", "ATM" etc.

If found in the list of existing vendors, use the exact same name to ensure consistency. Otherwise, extract a concise vendor name.

Return a JSON object with:
- vendor: The extracted vendor name
- isExisting: Boolean indicating if the vendor was found in the existing vendors list
- confidence: A score from 0.0 to 1.0 indicating confidence in the extraction
- category: A suitable accounting category (if not an existing vendor)
- type: The transaction type (income, expense, asset, liability) (if not an existing vendor)
- statementType: The statement type (profit_loss, balance_sheet) (if not an existing vendor)`;

    // Add business context to the prompt if available
    if (context && Object.keys(context).length > 0) {
      systemPrompt += `\n\nBusiness Context:
- Country: ${context.country || country || 'Unknown'}
- Industry: ${context.industry || 'Unknown'}
- Business Size: ${context.businessSize || 'Unknown'}
- Payment Methods: ${context.paymentMethods?.join(', ') || 'Unknown'}
- Currency: ${context.currency || 'Unknown'}`;
      
      if (context.additionalInfo) {
        systemPrompt += `\n- Additional Context: ${context.additionalInfo}`;
      }
    }

    // Add examples from the vendor categorizations database
    systemPrompt += `\n\nHere are some examples of previously correctly identified vendors:
- "STRIPE TRANSFER" → Stripe (Category: Sales)
- "CHECK 995785" → Dale Business Center (Category: Rent)
- "WAVE SV9T XXXXXX4751" → Wave (Category: Sales)
- "VISA DDA PUR AP - 469216 STARBUCKS STORE 00853 WEST HARTFORD * CT" → Starbucks (Category: Food & Entertainment)
- "OPORTUN BONUS" → OPORTUN BONUS (Category: Other Income)
- "VISA DDA PUR AP - 413746 TST WABI SABI WEST HA WEST HARTFORD * CT" → Wabi Sabi (Category: Food & Entertainment)
- "VISA DDA PUR AP - 420429 GOOGLE ADSXXXXXX1693 650 2530000 * CA" → Google Ads (Category: Marketing Adspend)
- "MOBILE DEPOSIT" → Mobile Deposit (Category: Sales)
- "VISA DDA PUR AP - 443106 CHIPOTLE 1421 WEST HARTFORD * CT" → Chipotle (Category: Food & Entertainment)
- "VISA DDA PUR AP - 401134 CARRD HTTPSCARRD CO * TN" → Carrd.co (Category: Software)
- "INTL ATM FEE" → International TXN fee (Category: Bank Charges & Fees)
- "INTL DDA PUR AP - 429347 SQ CAFE LANDWER UNIVERS TORONTO C AN" → Cafe Landwer (Category: Food & Entertainment)
- "AMAZON.COM SERVI PAYMENTS" → Amazon (Category: Office Supplies)
- "VISA DDA PUR AP - 469216 APPLE COM US 800 676 2775 * CA" → Apple (Category: Office Supplies)
- "VISA DDA PUR AP - 401134 PADDLE NET ALFRED APP PADDLE COM * NY" → Alfred App (Category: Software)`;

    // Add existing vendors to the prompt for context
    if (existingVendors && existingVendors.length > 0) {
      // Take only the first 20 to keep the prompt size manageable
      const vendorsToShow = existingVendors.slice(0, 20);
      systemPrompt += `\n\nExisting vendors in the system (use exact names if applicable): ${vendorsToShow.join(', ')}`;
    }

    // Add guidance on categories based on common patterns
    systemPrompt += `\n\nCommon categories for vendors:
- Software: SaaS products, subscriptions, digital tools
- Food & Entertainment: Restaurants, cafes, entertainment venues
- Travel: Airlines, hotels, car rentals, airport fees
- Office Supplies: Equipment, stationery, devices
- Marketing Adspend: Advertising platforms, marketing services
- Bank Charges & Fees: Transaction fees, account fees
- Insurance: Insurance payments
- Utilities: Electricity, water, internet, phone services
- Training, Education & Research: Courses, conferences, educational materials
- Sales: Income from customers, clients
- Interest Paid: Interest charges on loans or credit
- Other Income: Miscellaneous income sources
- Gifts: Client or employee gifts
- Events: Event venues, tickets, registration fees
- Merchant Processing Fees: Payment processing fees
- Shipping, Freight & Delivery: Shipping and courier services`;

    try {
      console.log("Sending request to OpenAI with description: " + description);
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAIApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Using the most efficient model for cost-effectiveness
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: `Please extract the vendor from this transaction description: "${description}"`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        })
      });

      const data = await response.json();
      console.log("OpenAI response received");

      if (!data.choices || data.choices.length === 0) {
        throw new Error("Invalid response from OpenAI");
      }

      // Parse the response content
      const responseContent = JSON.parse(data.choices[0].message.content);
      
      // Check if the vendor is in the existing vendors list
      const isExisting = existingVendors.some(
        v => v.toLowerCase() === responseContent.vendor.toLowerCase()
      );
      
      console.log(`Extracted vendor: ${responseContent.vendor}, isExisting: ${isExisting}, confidence: ${responseContent.confidence || 0.7}`);

      return new Response(
        JSON.stringify({
          vendor: responseContent.vendor,
          isExisting: isExisting || responseContent.isExisting || false,
          confidence: responseContent.confidence || 0.7,
          category: !isExisting ? responseContent.category : undefined,
          type: !isExisting ? responseContent.type : undefined,
          statementType: !isExisting ? responseContent.statementType : undefined
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (openAIError) {
      console.error("Error calling OpenAI:", openAIError);
      
      // Simple fallback vendor extraction if OpenAI fails
      const fallbackVendor = extractSimpleVendor(description);
      
      return new Response(
        JSON.stringify({
          vendor: fallbackVendor,
          isExisting: existingVendors.some(v => v.toLowerCase() === fallbackVendor.toLowerCase()),
          confidence: 0.4, // Lower confidence for fallback extraction
          category: null,
          type: "expense",
          statementType: "profit_loss"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error in analyze-transaction-vendor function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Simple fallback vendor extraction function
function extractSimpleVendor(description: string): string {
  if (!description) return "Unknown";
  
  // Common prefixes to remove
  const prefixes = [
    "POS PURCHASE ", "PURCHASE ", "FNB PAYMENT ", "PAYMENT ", "CARD PURCHASE ", 
    "DEBIT ORDER ", "EFT PAYMENT ", "DIRECT DEBIT ", "TRANSFER ", "ATM WITHDRAWAL ",
    "CREDIT ", "DEBIT ", "POS ", "TFR ", "TRANSACTION ", "PAYMENT TO ",
    "PYMT TO ", "DEP ", "WDL ", "ONLINE ", "ACH ", "DEPOSIT ", "WITHDRAWAL ",
    "VISA DDA PUR AP - ", "INTL DDA PUR AP - ", "DDA PURCHASE AP - "
  ];
  
  let vendor = description.trim();
  
  // Remove common prefixes
  for (const prefix of prefixes) {
    if (vendor.toUpperCase().startsWith(prefix.toUpperCase())) {
      vendor = vendor.substring(prefix.length).trim();
      break;
    }
  }
  
  // Remove numbers and special characters at the beginning
  vendor = vendor.replace(/^[\d\W]+/, '');
  
  // Extract first set of meaningful words, try to avoid long strings of numbers
  const words = vendor.split(/\s+/);
  const relevantWords = [];
  
  for (let i = 0; i < Math.min(3, words.length); i++) {
    if (words[i] && !/^\d+$/.test(words[i])) {
      relevantWords.push(words[i]);
    }
  }
  
  if (relevantWords.length > 0) {
    return relevantWords.join(' ');
  }
  
  // If no relevant words found, just return the first word or "Unknown"
  return words[0] || "Unknown";
}
