
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { toast } from '@/utils/toast';
import { generateVendorEmbeddings, findSimilarVendorsByDescription } from '@/utils/embeddingUtils';

interface VendorMatch {
  vendor_name: string;
  category: string;
  confidence: number;
  type: string;
  statement_type: string;
  sample_description?: string;
}

const VendorEmbeddings = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{
    success?: boolean;
    processed?: number;
    totalProcessed?: number;
    error?: string;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<VendorMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleGenerateEmbeddings = async () => {
    setIsGenerating(true);
    setResults(null);
    
    try {
      const result = await generateVendorEmbeddings(50);
      setResults(result);
      
      if (result.success) {
        toast.success(`Generated embeddings for ${result.results?.success || 0} vendors`);
      } else {
        toast.error('Failed to generate embeddings');
      }
    } catch (err) {
      console.error('Error generating embeddings:', err);
      setResults({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      });
      toast.error('Failed to generate embeddings');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchSimilarVendors = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a description to search');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const result = await findSimilarVendorsByDescription(searchQuery);
      
      if (result.success && result.results) {
        setSearchResults(result.results);
        if (result.results.length === 0) {
          toast.info('No similar vendors found');
        } else {
          toast.success(`Found ${result.results.length} similar vendors`);
        }
      } else {
        toast.error('Failed to find similar vendors');
      }
    } catch (err) {
      console.error('Error searching similar vendors:', err);
      toast.error('Failed to search for similar vendors');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Embedding Generation</CardTitle>
          <CardDescription>
            Generate embeddings for vendors using OpenAI's text-embedding-3-small model
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will process vendors in the database that don't have embeddings yet and generate embedding vectors for them.
          </p>
          {results && (
            <Alert className={results.success ? "bg-green-50" : "bg-red-50"}>
              {results.success ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>
                {results.success ? "Embeddings generated" : "Failed to generate embeddings"}
              </AlertTitle>
              <AlertDescription>
                {results.success ? (
                  <>
                    Successfully processed {results.totalProcessed} vendors.
                    <br />
                    {results.results?.success} succeeded, {results.results?.failed} failed.
                  </>
                ) : (
                  <>Error: {results.error || "Unknown error"}</>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleGenerateEmbeddings} 
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Embeddings"
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search Similar Vendors</CardTitle>
          <CardDescription>
            Find vendors similar to a transaction description using semantic similarity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input 
                placeholder="Enter a transaction description" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSearchSimilarVendors} 
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Search"
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Results:</h3>
                {searchResults.map((result, index) => (
                  <div key={index} className="border rounded-md p-3 bg-muted/40">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{result.vendor_name}</h4>
                      <Badge 
                        className={
                          result.confidence > 80 ? "bg-green-500" : 
                          result.confidence > 50 ? "bg-amber-500" : 
                          "bg-red-500"
                        }
                      >
                        {result.confidence}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Category: {result.category}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{result.type}</Badge>
                      <Badge variant="outline">{result.statement_type}</Badge>
                    </div>
                    {result.sample_description && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        "{result.sample_description.substring(0, 100)}{result.sample_description.length > 100 ? '...' : ''}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorEmbeddings;
