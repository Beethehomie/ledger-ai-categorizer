
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Extract vendor name from the description with enhanced context
    const extractionResult = await extractVendorWithContext(description, existingVendors, country, context);

    return new Response(
      JSON.stringify(extractionResult),
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

interface BusinessContext {
  country?: string;
  industry?: string;
  businessSize?: string;
  paymentMethods?: string[];
  currency?: string;
  additionalInfo?: string;
}

async function extractVendorWithContext(
  description: string, 
  existingVendors: string[] = [], 
  country = "ZA", 
  context: BusinessContext = {}
): Promise<{
  vendor: string;
  isExisting: boolean;
  confidence: number;
  category?: string;
  type?: string;
  statementType?: string;
}> {
  if (!openAIKey) {
    throw new Error('OpenAI API key is not configured');
  }

  // Format business context for the prompt
  const businessContextPrompt = formatBusinessContext(context);
  
  // Construct country-specific patterns to ignore
  const countryPatterns = getCountrySpecificPatterns(country);
  
  // Format existing vendors for the prompt
  const existingVendorsText = existingVendors.length > 0 
    ? `Existing vendors in the system: ${existingVendors.join(', ')}` 
    : 'There are no existing vendors in the system yet.';

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
            'You are a financial assistant tasked with extracting the most accurate vendor name from transaction descriptions. ' +
            'Your goal is to provide a concise, standardized vendor name that represents the actual business entity. ' +
            'Specific rules:\n\n' +
            '1. Remove transaction IDs, dates, reference numbers, and card numbers\n' +
            '2. Do not include banking terms like "POS", "PURCHASE", "PMT", "DEBIT", "CREDIT", etc.\n' +
            '3. Identify the actual business entity, not transaction types or descriptions\n' +
            '4. If multiple words appear to be part of the vendor name, use proper capitalization (e.g., "Pick N Pay" not "PICK N PAY")\n' +
            '5. For chain stores or franchises, extract just the main brand name when appropriate\n' +
            '6. When multiple possible vendors appear, use web searchability to determine which is most likely the actual vendor\n\n' +
            `${countryPatterns}\n\n` +
            `${businessContextPrompt}\n\n` +
            `${existingVendorsText}\n\n` +
            'Respond with JSON only. Include:\n' +
            '- vendor: The extracted vendor name\n' +
            '- confidence: A score from 0 to 1 indicating your confidence in the extraction\n' +
            '- isExisting: Whether this matches (or is very similar to) an existing vendor\n' +
            '- category: If this appears to be a new vendor, suggest an accounting category\n' +
            '- type: Suggest "income", "expense", "transfer", "asset", or "liability"\n' +
            '- statementType: Suggest "profit_loss" or "balance_sheet"\n\n'
        },
        {
          role: 'user',
          content: `Transaction description: "${description}"`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    console.error('OpenAI API error response:', await response.text());
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    const result = JSON.parse(content);
    return {
      vendor: result.vendor,
      isExisting: result.isExisting || false,
      confidence: result.confidence || 0.7,
      category: result.category,
      type: result.type,
      statementType: result.statementType
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
  }
}

function formatBusinessContext(context: BusinessContext): string {
  if (Object.keys(context).length === 0) {
    return 'No specific business context provided.';
  }

  let contextPrompt = 'Business context:\n';
  
  if (context.country) contextPrompt += `- Country: ${context.country}\n`;
  if (context.industry) contextPrompt += `- Industry: ${context.industry}\n`;
  if (context.businessSize) contextPrompt += `- Business size: ${context.businessSize}\n`;
  if (context.currency) contextPrompt += `- Primary currency: ${context.currency}\n`;
  
  if (context.paymentMethods && context.paymentMethods.length > 0) {
    contextPrompt += `- Payment methods: ${context.paymentMethods.join(', ')}\n`;
  }
  
  if (context.additionalInfo) {
    contextPrompt += `- Additional info: ${context.additionalInfo}\n`;
  }
  
  return contextPrompt;
}

function getCountrySpecificPatterns(country: string): string {
  const patterns: Record<string, string> = {
    'ZA': 'South African patterns to ignore: "EFT", "POS PURCHASE", "INTERNET TFR", "NATREFNO", "CASHSEND", "PAYMENT RECEIVED", "CHEQUE CARD", "TRANSFER", "FNB APP", "FNB CONNECT", "ABSA", "NETBANK", "ATM", "STANDARD BANK", "CAPITEC", "NEDBANK", "CASHSEND", "INSTANT PAYMENT", "PAYMENT FROM", "EWALLET", "DEBIT ORDER", "CREDIT", "DEBIT", "CC PAYMENT"',
    'US': 'US patterns to ignore: "ACH", "ZELLE", "VENMO", "XFER", "DDA", "POS", "VISA", "MASTERCARD", "AMEX", "CHASE", "CITI", "BOFA", "WELLS FARGO", "CAPITAL ONE", "PAYPAL", "DEBIT CARD", "CREDIT CARD", "AUTOPAY", "DIRECT DEPOSIT", "ONLINE PAYMENT", "CHECK #"',
    'UK': 'UK patterns to ignore: "FASTER PAYMENT", "DIRECT DEBIT", "STANDING ORDER", "BACS", "CHAPS", "LINK", "HSBC", "BARCLAYS", "LLOYDS", "NatWest", "SANTANDER", "HALIFAX", "TSB", "VISA", "MASTERCARD", "AMEX", "CASHPOINT", "ATM", "PAYMENT", "PURCHASE"',
    'CA': 'Canadian patterns to ignore: "INTERAC", "E-TRANSFER", "ETRANSFER", "PAYMENT", "DEBIT", "CREDIT", "BMO", "RBC", "CIBC", "SCOTIABANK", "TD", "ATM", "ABM", "TRANSACTION", "VISA", "MASTERCARD", "AMEX", "TFR", "TRANSFER", "PAY", "BILLS"',
    'AU': 'Australian patterns to ignore: "BPAY", "OSKO", "PAYID", "NPP", "EFTPOS", "COMMONWEALTH", "NAB", "ANZ", "WESTPAC", "BENDIGO", "ING", "ST GEORGE", "MACQUARIE", "PAYMENT", "TRANSFER", "ATM", "CARD", "DIRECT DEBIT", "DEBIT", "CREDIT"'
  };
  
  return patterns[country] || 'Common patterns to ignore: "PAYMENT", "TRANSFER", "DEBIT", "CREDIT", "POS", "ATM", "CARD", "PURCHASE", "REFERENCE", "REF", "TXN", "TFR", "DIRECT DEBIT"';
}
