
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, AlertCircle, FileUp, FilePlus, Download, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VendorImporter: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("preset");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const errorMsg = error.message ? `Failed to import vendor categories: ${error.message}` : 'Failed to import vendor categories: Unknown error';
      setResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleUploadCSV = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file to upload');
      return;
    }

    setUploadLoading(true);
    setResult(null);

    try {
      // Read the CSV file
      const text = await csvFile.text();
      
      // Parse the CSV content
      const rows = text.split('\n');
      
      if (rows.length === 0) {
        throw new Error('CSV file is empty');
      }
      
      const headers = rows[0].split(',').map(h => h.trim());
      
      // Check if the CSV has the required columns
      const requiredColumns = ['vendor_name', 'category', 'type', 'statement_type'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
      }
      
      // Parse the rows into vendor objects
      const vendors = [];
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue; // Skip empty rows
        
        const values = rows[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) {
          console.warn(`Skipping row ${i+1}: invalid column count`);
          continue; // Skip malformed rows
        }
        
        const vendor: Record<string, string | number | boolean> = {};
        headers.forEach((header, index) => {
          if (header === 'occurrences') {
            vendor[header] = parseInt(values[index]) || 1;
          } else if (header === 'verified') {
            vendor[header] = values[index].toLowerCase() === 'true';
          } else {
            vendor[header] = values[index];
          }
        });
        
        vendors.push(vendor);
      }
      
      // Upload the vendors to Supabase
      if (vendors.length === 0) {
        throw new Error('No valid vendor data found in the CSV file');
      }
      
      // Log for debugging
      console.log(`Attempting to upload ${vendors.length} vendors`);
      
      // Insert vendors in batches of 100 to avoid exceeding request size limits
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < vendors.length; i += batchSize) {
        const batch = vendors.slice(i, i + batchSize);
        console.log(`Processing batch ${i/batchSize + 1} with ${batch.length} vendors`);
        
        const { error, count } = await supabase
          .from('vendor_categorizations')
          .upsert(batch, { 
            onConflict: 'vendor_name',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error('Error inserting batch:', error);
          errorCount += batch.length;
        } else {
          successCount += count || batch.length; // Fallback to batch length if count is undefined
        }
        
        // Add a small delay between batches to avoid overwhelming the server
        if (i + batchSize < vendors.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const resultMsg = `Uploaded ${successCount} vendors successfully${errorCount > 0 ? ` (${errorCount} failed)` : ''}`;
      setResult({ success: true, message: resultMsg });
      toast.success(resultMsg);
      
      // Reset the file input
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      const errorMsg = error.message ? `Failed to upload CSV: ${error.message}` : 'Failed to upload CSV: Unknown error';
      setResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const headers = 'vendor_name,category,type,statement_type,verified,occurrences\n';
    const sampleRows = [
      'Amazon,Office Supplies,expense,profit_loss,true,5',
      'Starbucks,Food & Entertainment,expense,profit_loss,true,3',
      'Adobe,Software,expense,profit_loss,false,1',
      'American Airlines,Travel,expense,profit_loss,true,4'
    ].join('\n');
    
    const csvContent = headers + sampleRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'vendor_categories_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Sample CSV downloaded');
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
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="preset">Import Preset Categories</TabsTrigger>
            <TabsTrigger value="csv">Upload CSV File</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preset">
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
          </TabsContent>
          
          <TabsContent value="csv">
            <div className="flex flex-col gap-4">
              <Alert className="bg-muted">
                <Info className="h-4 w-4" />
                <AlertTitle>CSV Format Requirements</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">Your CSV file <strong>must</strong> include these required columns:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><span className="font-medium">vendor_name</span> - The name of the vendor</li>
                    <li><span className="font-medium">category</span> - The category to assign</li>
                    <li><span className="font-medium">type</span> - Transaction type (income, expense, asset, liability, equity)</li>
                    <li><span className="font-medium">statement_type</span> - Statement type (operating, investing, financing, profit_loss, balance_sheet)</li>
                  </ul>
                  <p className="mt-2">Optional columns include:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><span className="font-medium">verified</span> - Set to "true" or "false"</li>
                    <li><span className="font-medium">occurrences</span> - Number of times observed</li>
                  </ul>
                  <div className="mt-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={downloadSampleCSV}
                      className="flex items-center gap-2 hover:bg-secondary"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Sample CSV
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
              
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {csvFile ? `Selected: ${csvFile.name}` : 'No file selected'}
                </p>
              </div>
              
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        {currentTab === 'csv' && (
          <Button 
            onClick={handleUploadCSV} 
            disabled={uploadLoading || !csvFile}
            variant="outline"
          >
            {uploadLoading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-current rounded-full" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                Upload CSV
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default VendorImporter;
