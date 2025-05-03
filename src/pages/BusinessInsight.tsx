
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Info, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  Save,
  Lightbulb,
  BarChart2,
  Settings,
} from "lucide-react";
import { toast } from '@/utils/toast';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth';
import { BusinessContextFormValues } from '@/components/business/BusinessContextQuestionnaire';
import OnboardingQuestionnaire from '@/components/OnboardingQuestionnaire';

// Define the interfaces for the business insight and AI usage stats
interface BusinessInsightData {
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

interface AIUsageStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  tokens_used: number;
  last_call_time: string | null;
}

const BusinessInsightPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [businessInsight, setBusinessInsight] = useState<BusinessInsightData | null>(null);
  const [businessContext, setBusinessContext] = useState<BusinessContextFormValues | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [aiUsageStats, setAiUsageStats] = useState<AIUsageStats | null>(null);
  const [activeTab, setActiveTab] = useState('insight');
  
  useEffect(() => {
    if (user?.id) {
      fetchBusinessData();
      if (isAdmin) {
        fetchAIUsageStats();
      }
    }
  }, [user, isAdmin]);

  const fetchBusinessData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to get data from business_insights table
      const { data: insightData, error: insightError } = await supabase
        .from('business_insights')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (insightError && insightError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching business insight:', insightError);
        setError(`Failed to load business insight: ${insightError.message}`);
      }
      
      // Also fetch from user_profiles for backward compatibility
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_context')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        if (!insightData) {
          setError(`Failed to load business information: ${profileError.message}`);
        }
      }
      
      if (insightData) {
        setBusinessInsight(insightData as BusinessInsightData);
        
        // Create a business context object from the insight data
        setBusinessContext({
          industry: insightData.industry || '',
          businessModel: insightData.business_model || '',
          businessDescription: insightData.description || '',
          // Add other fields with default values
          country: '',
          entityType: 'business',
          businessSize: '',
          hasEmployees: '',
          mixedUseAccount: false,
          workspaceType: '',
          ...((profileData && profileData.business_context) || {})
        });
      } else if (profileData && profileData.business_context) {
        // Fall back to user profile data if no insight record exists
        setBusinessContext(profileData.business_context as BusinessContextFormValues);
      }
    } catch (err: any) {
      console.error('Exception fetching business data:', err);
      setError('An unexpected error occurred when loading business information');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIUsageStats = async () => {
    if (!isAdmin) return;
    
    try {
      const { data: stats, error: statsError } = await supabase
        .from('ai_usage_stats')
        .select('*')
        .eq('function_name', 'generate-business-insight');
      
      if (statsError) {
        console.error('Error fetching AI usage stats:', statsError);
        return;
      }
      
      if (stats && stats.length > 0) {
        const totalCalls = stats.length;
        const successfulCalls = stats.filter(s => s.status === 'success').length;
        const failedCalls = stats.filter(s => s.status === 'error').length;
        const tokensUsed = stats.reduce((acc, curr) => acc + (curr.tokens_used || 0), 0);
        
        // Find the most recent call
        let lastCall = null;
        if (stats.length > 0) {
          const sortedByDate = [...stats].sort((a, b) => 
            new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
          );
          lastCall = sortedByDate[0]?.created_at;
        }
        
        setAiUsageStats({
          total_calls: totalCalls,
          successful_calls: successfulCalls,
          failed_calls: failedCalls,
          tokens_used: tokensUsed,
          last_call_time: lastCall
        });
      }
    } catch (err) {
      console.error('Error processing AI usage stats:', err);
    }
  };

  const handleGenerateInsight = async () => {
    if (!user?.id || !businessContext) {
      toast.error("Cannot generate insight without business context");
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await supabase.functions.invoke('generate-business-insight', {
        body: {
          businessContext,
          userId: user.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate business insight');
      }

      toast.success("Business insight generated successfully");
      fetchBusinessData();
      if (isAdmin) {
        fetchAIUsageStats();
      }
    } catch (err: any) {
      console.error("Error generating insight:", err);
      setError(err.message || "Failed to generate business insight");
      toast.error("Failed to generate business insight");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditContext = () => {
    setIsQuestionnaireOpen(true);
  };

  const handleQuestionnaireComplete = (data: BusinessContextFormValues) => {
    setIsQuestionnaireOpen(false);
    setBusinessContext(data);
    handleGenerateInsight();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      return format(new Date(dateString), 'PPP p');
    } catch (error) {
      return "Invalid date";
    }
  };

  const renderBusinessInfo = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }

    if (!businessContext) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Business Context</AlertTitle>
          <AlertDescription>
            No business information found. Please add your business details to get insights.
            <Button 
              className="mt-4" 
              onClick={handleEditContext}
            >
              Add Business Information
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        {/* Business Profile */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Business Profile
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEditContext}
                className="rounded-xl hover:scale-105 transition-transform"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <CardDescription>
              Your business details help us provide personalized insights
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Entity Type</h3>
                  <p className="font-medium">{businessContext.entityType || "Not specified"}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Country</h3>
                  <p className="font-medium">{businessContext.country || "Not specified"}</p>
                </div>
                
                {businessContext.businessModel && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Business Model</h3>
                    <p className="font-medium">{businessContext.businessModel}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Industry</h3>
                  <p className="font-medium">{businessContext.industry || "Not specified"}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {businessContext.businessSize && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Business Size</h3>
                    <p className="font-medium">{businessContext.businessSize}</p>
                  </div>
                )}
                
                {businessContext.hasEmployees && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Team</h3>
                    <p className="font-medium capitalize">{businessContext.hasEmployees}</p>
                  </div>
                )}
                
                {businessContext.workspaceType && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Workspace</h3>
                    <p className="font-medium capitalize">{businessContext.workspaceType}</p>
                  </div>
                )}
                
                {businessContext.mixedUseAccount !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Account Usage</h3>
                    <p className="font-medium">
                      {businessContext.mixedUseAccount ? "Mixed business/personal" : "Business only"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {businessContext.businessDescription && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Business Description</h3>
                <div className="bg-muted/50 p-4 rounded-xl italic">
                  "{businessContext.businessDescription}"
                </div>
              </div>
            )}
            
            <div className="mt-6 text-xs text-muted-foreground flex items-center justify-end">
              <CheckCircle className="h-3 w-3 mr-1" />
              Last updated: {businessInsight ? formatDate(businessInsight.updated_at) : "Unknown"}
              {businessInsight?.version > 1 && (
                <Badge variant="outline" className="ml-2">Version {businessInsight.version}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insight */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                AI Business Insight
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateInsight}
                disabled={isGenerating}
                className="rounded-xl hover:scale-105 transition-transform"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? "Generating..." : "Refresh Insight"}
              </Button>
            </div>
            <CardDescription>
              AI-generated insights based on your business context
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {businessInsight?.ai_processing_status === 'error' ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Generating Insight</AlertTitle>
                <AlertDescription>
                  {businessInsight?.error_log?.message || 'An error occurred while generating your business insight.'}
                  <Button 
                    className="mt-2" 
                    size="sm" 
                    onClick={handleGenerateInsight}
                  >
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            ) : businessInsight?.ai_processing_status === 'processing' ? (
              <div className="p-6 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-center">Generating your business insight...</p>
              </div>
            ) : businessInsight?.ai_summary ? (
              <div className="bg-muted/50 p-6 rounded-xl">
                <p className="text-lg font-medium italic leading-relaxed">
                  "{businessInsight.ai_summary}"
                </p>
                <div className="mt-4 text-xs text-muted-foreground flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Generated on: {formatDate(businessInsight.updated_at)}
                </div>
              </div>
            ) : (
              <div className="text-center p-6">
                <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="mb-4">No AI insight has been generated yet.</p>
                <Button onClick={handleGenerateInsight} disabled={isGenerating}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Generate Insight
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Version History (if available) */}
        {businessInsight?.version > 1 && businessInsight.previous_versions && businessInsight.previous_versions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-md">Version History</CardTitle>
              <CardDescription>
                Previous versions of your business context and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {businessInsight.previous_versions.map((version, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="outline">Version {version.version}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(version.updated_at)}
                      </span>
                    </div>
                    {version.ai_summary && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-muted-foreground">AI Insight:</h4>
                        <p className="text-sm italic">"{version.ai_summary}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
  
  const renderAdminStats = () => {
    if (!isAdmin) return null;
    
    return (
      <Card>
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <CardTitle className="flex items-center">
            <BarChart2 className="h-5 w-5 mr-2" />
            OpenAI Usage Statistics
          </CardTitle>
          <CardDescription>
            Usage statistics for the Business Insight AI function
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : aiUsageStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{aiUsageStats.total_calls}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600">{aiUsageStats.successful_calls}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{aiUsageStats.failed_calls}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Tokens Used</p>
                <p className="text-2xl font-bold">{aiUsageStats.tokens_used.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No usage data available</p>
          )}
          
          {aiUsageStats?.last_call_time && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Last API call: {formatDate(aiUsageStats.last_call_time)}
            </p>
          )}
          
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAIUsageStats();
                toast.success("Usage statistics refreshed");
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center mb-4 md:mb-0">
          <Lightbulb className="h-7 w-7 mr-3 text-primary" />
          Business Insight
        </h1>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            onClick={handleEditContext}
            className="flex items-center rounded-lg"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Business Context
          </Button>
          
          <Button
            onClick={handleGenerateInsight}
            disabled={isGenerating || !businessContext}
            className="flex items-center rounded-lg"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? "Generating..." : "Generate New Insight"}
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isAdmin && (
        <Tabs
          defaultValue="insight"
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-8"
        >
          <TabsList className="grid grid-cols-2 w-[400px] mb-6">
            <TabsTrigger value="insight" className="rounded-l-lg">
              Business Insight
            </TabsTrigger>
            <TabsTrigger value="admin" className="rounded-r-lg">
              <Settings className="h-4 w-4 mr-2" />
              Admin Stats
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="insight" className="mt-0">
            {renderBusinessInfo()}
          </TabsContent>
          
          <TabsContent value="admin" className="mt-0">
            {renderAdminStats()}
          </TabsContent>
        </Tabs>
      )}
      
      {!isAdmin && renderBusinessInfo()}
      
      <OnboardingQuestionnaire
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        onComplete={handleQuestionnaireComplete}
        initialValues={businessContext}
      />
    </div>
  );
};

export default BusinessInsightPage;
