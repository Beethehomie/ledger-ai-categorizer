
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Cpu, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Database
} from "lucide-react";
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent
} from '@/components/ui/hover-card';

interface EmbeddingStats {
  total: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  percentComplete: number;
}

const VendorEmbeddings: React.FC = () => {
  const { session } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    fetchEmbeddingStats();
  }, []);

  const fetchEmbeddingStats = async () => {
    setIsLoading(true);
    try {
      // Count total vendors
      const { count: total, error: totalError } = await supabase
        .from('vendor_categorizations')
        .select('*', { count: 'exact', head: true });

      // Count vendors with embeddings
      const { count: withEmbeddings, error: withError } = await supabase
        .from('vendor_categorizations')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null);

      if (totalError || withError) throw new Error('Error fetching stats');

      const withoutEmbeddings = (total || 0) - (withEmbeddings || 0);
      const percentComplete = total ? Math.round((withEmbeddings || 0) / total * 100) : 0;

      setStats({
        total: total || 0,
        withEmbeddings: withEmbeddings || 0,
        withoutEmbeddings: withoutEmbeddings,
        percentComplete
      });

    } catch (err) {
      console.error('Error fetching embedding stats:', err);
      toast.error('Failed to fetch embedding statistics');
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateEmbeddings = async () => {
    if (!session) {
      toast.error('You must be logged in to generate embeddings');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vendor-embeddings', {
        body: { batchSize: 50 }
      });

      if (error) throw error;

      setResults(data);
      fetchEmbeddingStats();
      
      if (data.results.success > 0) {
        toast.success(`Generated ${data.results.success} embeddings successfully`);
      } else if (data.results.failed > 0) {
        toast.error(`Failed to generate ${data.results.failed} embeddings`);
      } else {
        toast.info(data.message);
      }
    } catch (err) {
      console.error('Error generating embeddings:', err);
      toast.error('Failed to generate embeddings');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))] flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Vendor Embeddings
        </CardTitle>
        <CardDescription>
          Generate and manage AI embeddings for your vendor data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {stats && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span>
                    Embedding completion: <span className="font-medium">{stats.percentComplete}%</span>
                  </span>
                  <span className="text-muted-foreground">
                    {stats.withEmbeddings} / {stats.total} vendors
                  </span>
                </div>
                <Progress value={stats.percentComplete} />

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-muted rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">With embeddings</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.withEmbeddings}</div>
                  </div>
                  <div className="bg-muted rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Without embeddings</span>
                      {stats.withoutEmbeddings > 0 ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.withoutEmbeddings}</div>
                  </div>
                </div>
                
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                      <Database className="h-3 w-3" />
                      <span>What are vendor embeddings?</span>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Vendor Embeddings</h4>
                      <p className="text-sm text-muted-foreground">
                        Embeddings are numerical representations of text that capture semantic meaning. 
                        They enable AI-powered features like semantic search and similar vendor detection.
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            )}
            
            {results && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Last Processing Results</h3>
                <div className="bg-muted rounded-md p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Successfully processed:</span>
                    <span className="font-medium">{results.results.success}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Failed:</span>
                    <span className="font-medium">{results.results.failed}</span>
                  </div>
                  {results.results.errors.length > 0 && (
                    <div className="mt-2">
                      <Separator className="my-2" />
                      <p className="text-xs text-muted-foreground mb-1">Errors:</p>
                      <div className="max-h-24 overflow-y-auto text-xs">
                        {results.results.errors.map((error: string, idx: number) => (
                          <div key={idx} className="text-red-500">{error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={fetchEmbeddingStats}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Stats
              </Button>
              <Button
                onClick={generateEmbeddings}
                disabled={isProcessing || (stats && stats.withoutEmbeddings === 0)}
                className="flex items-center gap-1"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Cpu className="h-4 w-4 mr-1" />
                    Generate Embeddings
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorEmbeddings;
