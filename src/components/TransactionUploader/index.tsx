
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, UploadCloud } from "lucide-react";
import { parseCSV } from '@/utils/csvParser';
import { useTransactionUpload } from '@/hooks/useTransactionUpload';
import { toast } from '@/utils/toast';
import { Transaction } from '@/types';
import { UploadZone } from './UploadZone';
import { FilePreview } from './FilePreview';

export const TransactionUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Transaction[]>([]);
  const { uploadTransactions, isUploading } = useTransactionUpload();
  const navigate = useNavigate();

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
            navigate('/');
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

  const resetFileSelection = () => {
    setSelectedFile(null);
    setPreviewData([]);
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
        {!selectedFile ? (
          <UploadZone onFileSelected={handleFileSelection} />
        ) : (
          <FilePreview 
            file={selectedFile}
            previewData={previewData}
            onCancel={resetFileSelection}
            onUpload={handleUpload}
            isUploading={isUploading}
          />
        )}
      </CardContent>
      
      <CardFooter className="flex items-center text-sm space-x-2 text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <p>CSV file should include date, description, and amount columns</p>
      </CardFooter>
    </Card>
  );
};
