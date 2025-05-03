
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Create a Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { businessContext, userId } = await req.json();
    
    if (!userId) {
      throw new Error('No user ID provided');
    }
    
    // Get existing business insight or create a new one
    const { data: existingInsight, error: fetchError } = await supabase
      .from('business_insights')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows found"
      throw fetchError;
    }
    
    // Prepare the prompt for OpenAI
    const prompt = `
Based on the following business context, create a 1-2 sentence insight about this business from an accounting or financial perspective. 
Focus on relevant accounting needs, business structure implications, or financial planning considerations.

Business information:
${businessContext.entityType ? `- Entity Type: ${businessContext.entityType}` : ''}
${businessContext.country ? `- Country: ${businessContext.country}` : ''}
${businessContext.industry ? `- Industry: ${businessContext.industry}` : ''}
${businessContext.businessModel ? `- Business Model: ${businessContext.businessModel}` : ''}
${businessContext.businessSize ? `- Business Size: ${businessContext.businessSize}` : ''}
${businessContext.hasEmployees ? `- Team: ${businessContext.hasEmployees}` : ''}
${businessContext.workspaceType ? `- Workspace: ${businessContext.workspaceType}` : ''}
${businessContext.businessDescription ? `- Business Description: ${businessContext.businessDescription}` : ''}

The business operates ${businessContext.mixedUseAccount ? 'with mixed business/personal accounts' : 'with business-only accounts'}.

Provide a brief, insightful summary for the business owner about their accounting needs or financial considerations based on this information.
`;
    
    // Set processing status
    let insightId;
    if (existingInsight) {
      const { error: updateError } = await supabase
        .from('business_insights')
        .update({
          industry: businessContext.industry,
          business_model: businessContext.businessModel,
          description: businessContext.businessDescription,
          ai_processing_status: 'processing',
          version: existingInsight.version + 1,
          previous_versions: existingInsight.previous_versions
            ? [...(existingInsight.previous_versions || []), {
                version: existingInsight.version,
                industry: existingInsight.industry,
                business_model: existingInsight.business_model,
                description: existingInsight.description,
                ai_summary: existingInsight.ai_summary,
                updated_at: existingInsight.updated_at
              }]
            : [{
                version: existingInsight.version,
                industry: existingInsight.industry,
                business_model: existingInsight.business_model,
                description: existingInsight.description,
                ai_summary: existingInsight.ai_summary,
                updated_at: existingInsight.updated_at
              }]
        })
        .eq('id', existingInsight.id);
      
      if (updateError) throw updateError;
      insightId = existingInsight.id;
    } else {
      const { data: newInsight, error: insertError } = await supabase
        .from('business_insights')
        .insert({
          user_id: userId,
          industry: businessContext.industry,
          business_model: businessContext.businessModel,
          description: businessContext.businessDescription,
          ai_processing_status: 'processing'
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      if (!newInsight) throw new Error('Failed to create insight record');
      insightId = newInsight.id;
    }
    
    // Log usage stats
    const usageStart = {
      user_id: userId,
      function_name: 'generate-business-insight',
      request_type: 'insight_generation',
      model: 'gpt-4o-mini',
      status: 'processing',
    };
    
    const { data: usageData, error: usageError } = await supabase
      .from('ai_usage_stats')
      .insert(usageStart)
      .select()
      .single();
      
    if (usageError) {
      console.error('Error logging usage start:', usageError);
    }
    
    try {
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a financial advisor specializing in small business needs.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${responseData.error?.message || 'Unknown error'}`);
      }
      
      const generatedInsight = responseData.choices[0].message.content.trim();
      const tokensUsed = responseData.usage.total_tokens;
      
      // Update the insight record with the AI response
      const { error: updateError } = await supabase
        .from('business_insights')
        .update({
          ai_summary: generatedInsight,
          ai_processing_status: 'completed'
        })
        .eq('id', insightId);
        
      if (updateError) throw updateError;
      
      // Update the usage stats
      if (usageData) {
        await supabase
          .from('ai_usage_stats')
          .update({
            status: 'success',
            tokens_used: tokensUsed
          })
          .eq('id', usageData.id);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Business insight generated successfully',
          insight: generatedInsight
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } catch (openaiError) {
      console.error('OpenAI error:', openaiError);
      
      // Update insight with error status
      await supabase
        .from('business_insights')
        .update({
          ai_processing_status: 'error',
          error_log: { message: openaiError.message }
        })
        .eq('id', insightId);
        
      // Update usage stats with error
      if (usageData) {
        await supabase
          .from('ai_usage_stats')
          .update({
            status: 'error',
            error_message: openaiError.message
          })
          .eq('id', usageData.id);
      }
      
      throw openaiError;
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || 'An error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
