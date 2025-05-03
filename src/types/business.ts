
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
  total_calls?: number;
  successful_calls?: number;
  failed_calls?: number;
  last_call_time?: string | null;
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

// Extended Business Context Model
export interface ExtendedBusinessContextFormValues extends BusinessContextFormValues {
  // 🏢 General Business Information
  businessName?: string;
  operationRegions?: string;
  
  // 🧍‍♂️ Customer Segments
  customerSegments?: string;  
  targetAudience?: 'b2b' | 'b2c' | 'both';
  customerLocation?: 'local' | 'regional' | 'global';
  
  // 🎁 Value Propositions
  valueProposition?: string;
  uniqueValue?: string;
  
  // 📡 Channels
  marketingChannels?: string;
  salesChannels?: string;
  discoveryPlatforms?: string;
  
  // 💬 Customer Relationships
  customerRelationship?: string;
  supportType?: 'personalized' | 'self-service' | 'community';
  salesType?: 'one-time' | 'recurring' | 'both';
  
  // 💵 Revenue Streams (extends existing revenue props)
  revenueSources?: string;
  paymentCollectionMethod?: string;
  salesTaxSubject?: boolean;
  
  // 🧱 Key Resources
  keyResources?: string;
  physicalSpace?: boolean;
  techPlatforms?: string;
  
  // 🔧 Key Activities
  keyActivities?: string;
  offerType?: 'physical' | 'digital' | 'both';
  marketingActivities?: string;
  
  // 🤝 Key Partnerships
  keyPartnerships?: string;
  outsourcedOperations?: string;
  
  // 💰 Cost Structure (extends existing costs props)
  costStructure?: string;
  
  // 📈 AI & Categorization Preferences
  categorizePreference?: 'separate' | 'together';
  flagMixedTransactions?: boolean;
  mealsCategorization?: 'cost_of_sales' | 'expense';
  softwareCategorization?: 'overhead' | 'cost_of_sales' | 'depends';
  customCategorizationRules?: string;
  aiAutoCorrect?: boolean;
}
