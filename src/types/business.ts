
import { BusinessContextFormValues } from '@/components/business/BusinessContextQuestionnaire';

export interface BusinessInsightData {
  id: string;
  user_id: string;
  industry: string | null;
  business_model: string | null;
  description: string | null;
  ai_summary: string | null;
  ai_processing_status: string;
  version: number;
  updated_at: string;
  created_at: string;
  previous_versions?: Array<{
    version: number;
    industry: string | null;
    business_model: string | null;
    description: string | null;
    ai_summary: string | null;
    updated_at: string;
  }> | null;
  error_log: any;
}

export interface AIUsageStats {
  id: string;
  user_id: string | null;
  function_name: string;
  request_type: string | null;
  model: string | null;
  status: string | null;
  tokens_used: number | null;
  error_message: string | null;
  created_at: string;
}

export interface BusinessInsight {
  summary: string;
  generated_at: string;
  context_snapshot?: BusinessContextFormValues;
}

export interface UserProfileWithBusinessContext {
  id: string;
  business_context?: BusinessContextFormValues;
  business_insight?: BusinessInsight;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}
