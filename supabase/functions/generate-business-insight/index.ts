
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
    
    if (businessContext.entityType) {
      prompt += `Entity Type: ${businessContext.entityType === 'business' ? 'Business' : 'Individual'}\n`;
    }
    
    if (businessContext.country) {
      prompt += `Country: ${businessContext.country}\n`;
    }
    
    if (businessContext.industry) {
      prompt += `Industry: ${businessContext.industry}\n`;
    }
    
    if (businessContext.businessModel) {
      prompt += `Business Model: ${businessContext.businessModel}\n`;
    }
    
    if (businessContext.businessDescription) {
      prompt += `Description: ${businessContext.businessDescription}\n`;
    }
    
    if (businessContext.revenueChannels) {
      prompt += `Revenue Channels: ${businessContext.revenueChannels}\n`;
    }

    if (businessContext.hasEmployees) {
      prompt += `Employees: ${businessContext.hasEmployees}\n`;
    }

    if (businessContext.mixedUseAccount !== undefined) {
      prompt += `Mixed Use Account: ${businessContext.mixedUseAccount ? 'Yes' : 'No'}\n`;
    }

    if (businessContext.incomeTypes && businessContext.incomeTypes.length > 0) {
      prompt += `Income Types: ${businessContext.incomeTypes.join(', ')}\n`;
    }

    if (businessContext.costsOfSales) {
      prompt += `Costs of Sales: ${businessContext.costsOfSales}\n`;
    }

    if (businessContext.workspaceType) {
      prompt += `Workspace Type: ${businessContext.workspaceType}\n`;
    }

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
            content: 'You are an AI assistant specialized in business analytics. Generate concise, insightful summaries (1-2 sentences) about businesses based on contextual information.'
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
