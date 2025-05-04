
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateEmbeddings, findSimilarVendors, EmbeddingResult } from '@/utils/embeddingUtils';

export const VendorEmbeddings = () => {
  const [description, setDescription] = useState('');
  const [results, setResults] = useState<EmbeddingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!description) return;
    
    setIsLoading(true);
    try {
      const matches = await findSimilarVendors(description);
      setResults(matches);
    } catch (error) {
      console.error('Error searching vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Similarity Search</CardTitle>
        <CardDescription>
          Search for similar vendors based on transaction descriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter transaction description"
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Results:</h3>
            {results.map((result) => (
              <div key={result.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{result.vendor}</span>
                  <Badge variant={result.similarity > 0.8 ? 'default' : 'outline'}>
                    {Math.round(result.similarity * 100)}% match
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Category: {result.category || 'Unknown'} • Type: {result.type || 'Unknown'}
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !isLoading && description && (
          <div className="text-center py-4 text-muted-foreground">
            No matching vendors found
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Results are based on semantic similarity using embeddings
      </CardFooter>
    </Card>
  );
};

export default VendorEmbeddings;
