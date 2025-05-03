
-- Add business_insight field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS business_insight JSONB DEFAULT NULL;

-- The business_insight field will contain:
-- {
--   summary: string,        -- AI-generated summary
--   generated_at: string,   -- Timestamp when summary was generated
--   context_snapshot: {}    -- Snapshot of business_context at generation time
-- }

COMMENT ON COLUMN public.user_profiles.business_insight IS 'Stores AI-generated business insights and metadata';
