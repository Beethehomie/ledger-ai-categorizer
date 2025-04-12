
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const VendorImporter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleImportVendors = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('import-vendor-categories');
      
      if (error) {
        throw error;
      }
      
      if (data && data.success) {
        const resultMsg = data.message || 'Successfully imported vendor categories';
        setResult({ success: true, message: resultMsg });
        toast.success(resultMsg);
      } else {
        throw new Error('Failed to import vendor categories');
      }
    } catch (error) {
      console.error('Error importing vendor categories:', error);
      const errorMsg = 'Failed to import vendor categories: ' + (error.message || 'Unknown error');
      setResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Upload className="h-4 w-4 mr-2 text-primary" />
          Vendor Categories Import
        </CardTitle>
        <CardDescription>
          Import pre-defined vendor categories for automatic transaction categorization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This will import a large dataset of standard vendor mappings (100+ vendors) to help auto-categorize your transactions. All imported vendors will be marked as verified.
          </p>
          
          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
              </div>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end">
            <Button 
              onClick={handleImportVendors} 
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-current rounded-full" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Import Categories
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorImporter;
