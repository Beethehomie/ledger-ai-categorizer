
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/utils/toast';
import { EmbeddingResult } from '@/types';

const VendorEmbeddings: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<EmbeddingResult[]>([]);
  const [searching, setSearching] = useState(false);

  const findSimilarVendors = async () => {
    if (!searchText.trim()) {
      toast.error('Please enter a search text');
      return;
    }

    try {
      setSearching(true);
      
      // Get embeddings for the search text
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { input: searchText }
      });
      
      if (error) throw error;
      
      if (!data || !data.embedding) {
        throw new Error('Failed to generate embedding for search');
      }
      
      // Search for similar vendors using the embedding
      const { data: matchData, error: matchError } = await supabase.rpc(
        'match_vendors_by_embedding',
        {
          query_embedding: data.embedding,
          match_threshold: 0.5,
          match_count: 10
        }
      );
      
      if (matchError) throw matchError;
      
      setSearchResults(matchData.map((result: EmbeddingResult) => ({
        ...result,
        vendor: result.vendor_name || 'Unknown'
      })));
    } catch (err) {
      console.error('Error searching vendors:', err);
      toast.error('Failed to search for similar vendors');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-all animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          Vendor Search by Description
        </CardTitle>
        <CardDescription>
          Find similar vendors by searching for keywords or descriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Input
            type="text"
            placeholder="Enter search text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button onClick={findSimilarVendors} disabled={searching}>
            {searching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">
              Search Results:
            </h4>
            <ul className="list-none pl-0 mt-2">
              {searchResults.map((result) => (
                <li key={result.id} className="py-2 border-b border-gray-200 last:border-none">
                  <div className="font-medium">{result.vendor_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Category: {result.category || 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Similarity: {(result.similarity * 100).toFixed(2)}%
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorEmbeddings;
