
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, RefreshCw, Edit2, CheckCircle, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/utils/toast";
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth";
import { BusinessContextFormValues } from './BusinessContextQuestionnaire';
import OnboardingQuestionnaire from '@/components/OnboardingQuestionnaire';

interface BusinessInsightProps {
  businessContext?: BusinessContextFormValues;
  businessInsight?: {
    summary: string;
    generated_at: string;
    context_snapshot?: BusinessContextFormValues;
  };
  onContextUpdate?: () => void;
}

const BusinessInsight: React.FC<BusinessInsightProps> = ({
  businessContext,
  businessInsight,
  onContextUpdate
}) => {
  const { session } = useAuth();
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false);
  const [includeInAI, setIncludeInAI] = useState(true);

  const handleEditContext = () => {
    setIsQuestionnaireOpen(true);
  };

  const handleGenerateInsight = async () => {
    if (!session?.user?.id || !businessContext) {
      toast.error("Cannot generate insight without business context");
      return;
    }

    setIsGeneratingInsight(true);
    try {
      const response = await supabase.functions.invoke('generate-business-insight', {
        body: {
          businessContext,
          userId: session.user.id
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Business insight generated successfully");
      if (onContextUpdate) {
        onContextUpdate();
      }
    } catch (error) {
      console.error("Error generating insight:", error);
      toast.error("Failed to generate business insight");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const handleQuestionnaireComplete = (data: BusinessContextFormValues) => {
    setIsQuestionnaireOpen(false);
    if (onContextUpdate) {
      onContextUpdate();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return "Invalid date";
    }
  };

  const renderBusinessTypeInfo = () => {
    if (!businessContext) return null;

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Entity Type:</span>
          <Badge variant="outline" className="capitalize">
            {businessContext.entityType || "Not specified"}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Country:</span>
          <span className="text-sm">{businessContext.country || "Not specified"}</span>
        </div>
        
        {businessContext.entityType === 'business' && businessContext.businessModel && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Business Model:</span>
            <span className="text-sm">{businessContext.businessModel}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Industry:</span>
          <span className="text-sm">{businessContext.industry || "Not specified"}</span>
        </div>
      </div>
    );
  };

  const renderOperationalInfo = () => {
    if (!businessContext) return null;

    return (
      <div className="space-y-2 mt-4">
        {businessContext.hasEmployees && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Team:</span>
            <span className="text-sm capitalize">{businessContext.hasEmployees}</span>
          </div>
        )}
        
        {businessContext.mixedUseAccount !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Account Usage:</span>
            <span className="text-sm">
              {businessContext.mixedUseAccount ? "Mixed business/personal" : "Business only"}
            </span>
          </div>
        )}
        
        {businessContext.workspaceType && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Workspace:</span>
            <span className="text-sm capitalize">{businessContext.workspaceType}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Business Context
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEditContext}
              className="rounded-xl hover:scale-105 transition-transform"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardTitle>
          <CardDescription>
            Your business context helps us personalize categorizations and insights
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {businessContext ? (
            <>
              {renderBusinessTypeInfo()}
              {renderOperationalInfo()}
              
              {businessContext.businessDescription && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-1">Description:</h4>
                  <p className="text-sm text-muted-foreground italic">
                    "{businessContext.businessDescription}"
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                <h3 className="font-medium">AI Business Insight</h3>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleGenerateInsight}
                      disabled={isGeneratingInsight || !businessContext}
                    >
                      <RefreshCw className={`h-4 w-4 ${isGeneratingInsight ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Regenerate business insight
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="mt-3 mb-3">
              {businessInsight?.summary ? (
                <div className="bg-muted/50 p-3 rounded-xl italic text-sm">
                  "{businessInsight.summary}"
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No AI insight generated yet. Click the refresh button to generate one.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {businessInsight?.generated_at && (
              <div className="text-xs text-muted-foreground mt-2 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Last generated: {formatDate(businessInsight.generated_at)}
              </div>
            )}

            <div className="flex items-center space-x-2 mt-4">
              <Switch 
                id="include-in-ai" 
                checked={includeInAI}
                onCheckedChange={setIncludeInAI}
              />
              <Label htmlFor="include-in-ai">Include business context in AI processing</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <OnboardingQuestionnaire
        isOpen={isQuestionnaireOpen}
        onClose={() => setIsQuestionnaireOpen(false)}
        onComplete={handleQuestionnaireComplete}
        initialValues={businessContext}
      />
    </>
  );
};

export default BusinessInsight;
