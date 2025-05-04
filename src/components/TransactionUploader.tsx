
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, AlertCircle } from "lucide-react";
import { parseCSV } from '@/utils/csvParser';
import { useTransactionUpload } from '@/hooks/useTransactionUpload';
import { toast } from '@/utils/toast';

export const TransactionUploader = () => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const { uploadTransactions, isUploading } = useTransactionUpload();
  const navigate = useNavigate();

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = async (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please select a valid CSV file');
      return;
    }

    setSelectedFile(file);
    
    // Read and parse CSV for preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (event.target?.result) {
          const csvContent = event.target.result as string;
          const { transactions, warnings } = parseCSV(csvContent);
          
          if (warnings.length > 0) {
            toast.warning(`CSV parsed with ${warnings.length} warnings`);
          }
          
          setPreviewData(transactions.slice(0, 5)); // Preview first 5 rows
        }
      } catch (error) {
        toast.error('Error parsing CSV file');
        console.error('CSV parsing error:', error);
      }
    };
    
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const csvContent = event.target.result as string;
          const { transactions, warnings } = parseCSV(csvContent);
          
          if (transactions.length === 0) {
            toast.error('No valid transactions found in the CSV file');
            return;
          }
          
          const result = await uploadTransactions(transactions);
          
          if (result.success) {
            toast.success(`Successfully uploaded ${result.count} transactions`);
            setSelectedFile(null);
            setPreviewData([]);
            navigate('/transactions');
          } else {
            toast.error('Failed to upload transactions');
          }
        }
      };
      
      reader.readAsText(selectedFile);
    } catch (error) {
      toast.error('Error uploading transactions');
      console.error('Upload error:', error);
    }
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5" />
          Upload Transactions
        </CardTitle>
        <CardDescription>
          Upload a CSV file with your bank transactions to categorize them
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragActive ? 'border-primary bg-secondary/50' : 'border-muted'
          } transition-colors duration-200`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center space-y-4">
            {!selectedFile ? (
              <>
                <div className="p-3 rounded-full bg-primary/10">
                  <UploadCloud className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">Drag and drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Browse Files
                </Button>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <FileSpreadsheet className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-lg font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                
                {previewData.length > 0 && (
                  <div className="w-full overflow-x-auto">
                    <p className="text-sm font-medium mb-2 text-left">Preview:</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Date</th>
                          <th className="text-left p-2">Description</th>
                          <th className="text-right p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{row.date}</td>
                            <td className="p-2 max-w-[200px] truncate">{row.description}</td>
                            <td className="p-2 text-right">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD'
                              }).format(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewData([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Transactions'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center text-sm space-x-2 text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <p>CSV file should include date, description, and amount columns</p>
      </CardFooter>
    </Card>
  );
};
