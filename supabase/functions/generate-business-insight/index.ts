
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!openAiApiKey) {
  throw new Error("Missing OpenAI API key");
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessContext, userId } = await req.json();
    
    if (!businessContext || !userId) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: businessContext or userId",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`Generating business insight for user ${userId}`);

    // Update the business insight record status to processing
    await updateInsightStatus(userId, "processing");
    
    // Start tracking API usage
    const usageId = await logApiUsage(userId, "start");

    // Generate the insight
    const insight = await generateInsight(businessContext);

    // Update tracking with successful completion
    await logApiUsage(userId, "success", usageId, insight.usage?.total_tokens || 0);
    
    // Store the generated insight in the database
    await storeBusinessInsight(userId, businessContext, insight.summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary: insight.summary,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating business insight:", error);
    
    try {
      // Try to log the error
      const { userId } = await req.json();
      if (userId) {
        await logApiUsage(userId, "error", null, 0, error.message);
        await updateInsightStatus(userId, "error", error.message);
      }
    } catch (logError) {
      console.error("Error logging failure:", logError);
    }

    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function generateInsight(businessContext) {
  const {
    industry,
    businessModel,
    description,
    country,
    businessSize,
    entityType,
    hasEmployees,
    mixedUseAccount,
    workspaceType,
    businessDescription,
  } = businessContext;

  // Create a simplified context summary for the prompt
  const contextSummary = [
    entityType ? `Entity type: ${entityType}` : null,
    businessModel ? `Business model: ${businessModel}` : null,
    industry ? `Industry: ${industry}` : null,
    country ? `Country: ${country}` : null,
    businessSize ? `Business size: ${businessSize}` : null,
    hasEmployees ? `Team: ${hasEmployees}` : null,
    workspaceType ? `Workspace: ${workspaceType}` : null,
    mixedUseAccount !== undefined ? `Account usage: ${mixedUseAccount ? "Mixed business/personal" : "Business only"}` : null,
    businessDescription ? `Description: ${businessDescription}` : null,
  ].filter(Boolean).join(". ");

  console.log("Calling OpenAI with context summary:", contextSummary);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional financial advisor specializing in bookkeeping and accounting. Provide concise, practical insights based on business information."
        },
        {
          role: "user",
          content: `Based on the following business context, provide a 1-2 sentence focused financial insight that would be helpful for bookkeeping and accounting purposes: ${contextSummary}`
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const summary = data.choices[0].message.content.trim();
  
  return {
    summary,
    usage: data.usage
  };
}

async function updateInsightStatus(userId, status, errorMessage = null) {
  // Check if there's an existing insight record
  const { data: existingInsight, error: fetchError } = await supabase
    .from("business_insights")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
    console.error("Error fetching business insight:", fetchError);
    return;
  }

  const updateData = {
    ai_processing_status: status,
    error_log: errorMessage ? JSON.stringify({ message: errorMessage, timestamp: new Date() }) : null
  };

  if (existingInsight?.id) {
    // Update existing record
    const { error: updateError } = await supabase
      .from("business_insights")
      .update(updateData)
      .eq("id", existingInsight.id);

    if (updateError) {
      console.error("Error updating business insight status:", updateError);
    }
  } else {
    // Create new record
    const { error: insertError } = await supabase
      .from("business_insights")
      .insert({
        user_id: userId,
        ...updateData
      });

    if (insertError) {
      console.error("Error inserting business insight status:", insertError);
    }
  }
}

async function storeBusinessInsight(userId, businessContext, summary) {
  // Check if there's an existing insight record
  const { data: existingInsight, error: fetchError } = await supabase
    .from("business_insights")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
    console.error("Error fetching business insight:", fetchError);
    throw fetchError;
  }

  const insightData = {
    user_id: userId,
    industry: businessContext.industry || null,
    business_model: businessContext.businessModel || null,
    description: businessContext.businessDescription || null,
    ai_summary: summary,
    ai_processing_status: "completed",
    updated_at: new Date().toISOString()
  };

  if (existingInsight?.id) {
    // Update existing record
    const { error: updateError } = await supabase
      .from("business_insights")
      .update(insightData)
      .eq("id", existingInsight.id);

    if (updateError) {
      console.error("Error updating business insight:", updateError);
      throw updateError;
    }
  } else {
    // Create new record
    const { error: insertError } = await supabase
      .from("business_insights")
      .insert(insightData);

    if (insertError) {
      console.error("Error inserting business insight:", insertError);
      throw insertError;
    }
  }

  // Also store the summary in user_profiles for backward compatibility
  try {
    await supabase
      .from("user_profiles")
      .update({
        business_context: businessContext,
        business_insight: {
          summary,
          generated_at: new Date().toISOString(),
          context_snapshot: businessContext
        }
      })
      .eq("id", userId);
  } catch (profileError) {
    console.error("Error updating user profile with business insight:", profileError);
    // Don't throw here, as the main operation succeeded
  }
}

async function logApiUsage(userId, status, existingId = null, tokensUsed = 0, errorMessage = null) {
  try {
    const usageData = {
      user_id: userId,
      function_name: "generate-business-insight",
      request_type: "business-insight",
      model: "gpt-4o-mini",
      status,
      tokens_used: tokensUsed,
      error_message: errorMessage,
    };

    if (existingId) {
      // Update existing record
      const { error } = await supabase
        .from("ai_usage_stats")
        .update(usageData)
        .eq("id", existingId);

      if (error) {
        console.error("Error updating AI usage stats:", error);
      }
      
      return existingId;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from("ai_usage_stats")
        .insert(usageData)
        .select("id")
        .single();

      if (error) {
        console.error("Error inserting AI usage stats:", error);
        return null;
      }
      
      return data?.id;
    }
  } catch (error) {
    console.error("Error logging API usage:", error);
    return null;
  }
}
