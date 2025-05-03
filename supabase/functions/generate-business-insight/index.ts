
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'https://deno.land/x/xhr@0.1.0/mod.ts';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const openAiKey = Deno.env.get('OPENAI_API_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey || !openAiKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { businessContext, userId } = await req.json();

    // Convert business context to a descriptive prompt
    let prompt = 'Generate a concise 1-2 sentence summary describing this business based on the following context:\n\n';
    
    // Core questions
    if (businessContext.businessDescription) {
      prompt += `Business Description: ${businessContext.businessDescription}\n`;
    }
    
    if (businessContext.incomeStreams) {
      prompt += `Income Streams: ${businessContext.incomeStreams}\n`;
    }
    
    if (businessContext.commonExpenses) {
      prompt += `Common Expenses: ${businessContext.commonExpenses}\n`;
    }
    
    if (businessContext.productType) {
      prompt += `Product Type: ${businessContext.productType}\n`;
    }
    
    if (businessContext.hasInventory !== undefined) {
      prompt += `Has Inventory: ${businessContext.hasInventory ? 'Yes' : 'No'}\n`;
    }
    
    if (businessContext.usesContractors !== undefined) {
      prompt += `Uses Contractors: ${businessContext.usesContractors ? 'Yes' : 'No'}\n`;
    }
    
    if (businessContext.paymentMethods) {
      prompt += `Payment Methods: ${businessContext.paymentMethods}\n`;
    }
    
    // Extended business model questions
    // Customer Segments
    const customerSegments = businessContext.customerSegments;
    if (customerSegments) {
      if (customerSegments.primaryCustomers) {
        prompt += `Primary Customers: ${customerSegments.primaryCustomers}\n`;
      }
      
      if (customerSegments.customerType) {
        prompt += `Customer Type: ${customerSegments.customerType}\n`;
      }
      
      if (customerSegments.customerLocation) {
        prompt += `Customer Location: ${customerSegments.customerLocation}\n`;
      }
      
      if (customerSegments.isNicheMarket !== undefined) {
        prompt += `Niche Market: ${customerSegments.isNicheMarket ? 'Yes' : 'No'}\n`;
      }
    }
    
    // Value Propositions
    const valueProps = businessContext.valuePropositions;
    if (valueProps) {
      if (valueProps.problemsSolved) {
        prompt += `Problems Solved: ${valueProps.problemsSolved}\n`;
      }
      
      if (valueProps.productServices) {
        prompt += `Products/Services: ${valueProps.productServices}\n`;
      }
      
      if (valueProps.competitiveAdvantage) {
        prompt += `Competitive Advantage: ${valueProps.competitiveAdvantage}\n`;
      }
      
      if (valueProps.uniqueFeatures) {
        prompt += `Unique Features: ${valueProps.uniqueFeatures}\n`;
      }
    }
    
    // Add other sections as needed for a comprehensive prompt
    
    // Generate AI insight using OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in business analytics. Generate a concise, insightful summary (1-2 sentences) about businesses based on contextual information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.5,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openAIData = await openAIResponse.json();
    const insight = openAIData.choices[0].message.content.trim();
    const timestamp = new Date().toISOString();

    // Update user profile with the AI insight and timestamp
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        business_insight: {
          summary: insight,
          generated_at: timestamp,
          context_snapshot: businessContext
        }
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Error updating user profile: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        insight,
        timestamp
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in generate-business-insight function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
