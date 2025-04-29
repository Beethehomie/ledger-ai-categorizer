
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Upload, UploadCloud, Check, RefreshCw, Download } from 'lucide-react';
import { toast } from '@/utils/toast';
import { importVendorCategorizations } from '@/context/bookkeeping/vendorUtils';
import { useBookkeeping } from '@/context/BookkeepingContext';

const VendorImporter: React.FC = () => {
  const [importActive, setImportActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { fetchTransactions } = useBookkeeping();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const resetImporter = () => {
    setFile(null);
    setImportActive(false);
    setUploading(false);
  };
  
  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a CSV file to upload');
      return;
    }
    
    try {
      setUploading(true);
      
      // Read and parse the CSV file
      const text = await file.text();
      const rows = text.split('\n');
      
      // Extract header row and find relevant column indexes
      const headers = rows[0].split(',').map(h => h.trim());
      const vendorIndex = headers.findIndex(h => h.toLowerCase().includes('vendor'));
      const descIndex = headers.findIndex(h => h.toLowerCase().includes('description'));
      const catIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
      
      if (vendorIndex === -1 || catIndex === -1) {
        toast.error('CSV must include vendor and category columns');
        setUploading(false);
        return;
      }
      
      // Parse vendors from the CSV
      const vendors = rows.slice(1)
        .filter(row => row.trim())
        .map(row => {
          const columns = row.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
          return {
            name: columns[vendorIndex],
            category: columns[catIndex],
            sampleDescription: descIndex !== -1 ? columns[descIndex] : undefined
          };
        })
        .filter(v => v.name && v.category); // Filter out any rows with missing data
      
      if (vendors.length === 0) {
        toast.error('No valid vendor data found in the CSV');
        setUploading(false);
        return;
      }
      
      // Import the vendors
      const result = await importVendorCategorizations(vendors);
      
      if (result.success) {
        toast.success(result.message);
        resetImporter();
        // Refresh data
        fetchTransactions();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('Error importing vendors:', err);
      toast.error('Failed to import vendors');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDownloadTemplate = () => {
    const csv = 'Vendor,Description,Category,Type,StatementType\nAcme Inc.,PAYMENT TO ACME INC,Office Supplies,expense,profit_loss\nGoogle,GOOGLE CLOUD,Software,expense,profit_loss';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  if (!importActive) {
    return (
      <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
        <CardHeader className="pb-4">
          <CardTitle className="text-[hsl(var(--primary))] flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Vendor Importer
          </CardTitle>
          <CardDescription>
            Import your vendor list and transaction categorizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4 mr-1" />
              Template
            </Button>
            <Button 
              onClick={() => setImportActive(true)}
              variant="default"
              size="sm"
              className="flex items-center gap-1"
            >
              <Upload className="h-4 w-4 mr-1" />
              Import Vendors
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-[hsl(var(--border))] hover:shadow-md transition-all">
      <CardHeader className="pb-4">
        <CardTitle className="text-[hsl(var(--primary))] flex items-center gap-2">
          <UploadCloud className="h-5 w-5" />
          Import Vendor Categorizations
        </CardTitle>
        <CardDescription>
          Upload a CSV file with vendor names, descriptions, and categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-md p-6 text-center hover:border-primary/50 transition-all">
            <div className="mb-4">
              <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {file ? file.name : 'Drag & drop your CSV file here or click to browse'}
              </p>
            </div>
            
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
            />
            
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
              className="mt-2"
            >
              Select CSV File
            </Button>
          </div>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>The CSV should include vendor names and categories at minimum</span>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={resetImporter}
                disabled={uploading}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleImport}
                disabled={!file || uploading}
                className="flex items-center gap-1"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Import Vendors
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorImporter;
