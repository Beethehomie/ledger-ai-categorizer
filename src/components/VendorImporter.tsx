
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VendorImporter: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleImportVendors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-vendor-categories');
      
      if (error) {
        throw error;
      }
      
      if (data && data.success) {
        toast.success(data.message || 'Successfully imported vendor categories');
      } else {
        throw new Error('Failed to import vendor categories');
      }
    } catch (error) {
      console.error('Error importing vendor categories:', error);
      toast.error('Failed to import vendor categories: ' + (error.message || 'Unknown error'));
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
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            This will import standard vendor mappings to help auto-categorize your transactions.
          </p>
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
      </CardContent>
    </Card>
  );
};

export default VendorImporter;
