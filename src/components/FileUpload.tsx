
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { validateCSVStructure, parseCSV, findDuplicateTransactions } from '@/utils/csvParser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import UploadDialog from './UploadDialog';
import BankSelector from './BankSelector';

const FileUpload: React.FC = () => {
  const { uploadCSV, loading, bankConnections, transactions } = useBookkeeping();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [csvValidation, setCsvValidation] = useState<{
    isValid: boolean;
    headers: string[];
    errorMessage?: string;
  }>({ isValid: false, headers: [] });
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (csvContent) {
      const validation = validateCSVStructure(csvContent);
      setCsvValidation(validation);
    }
  }, [csvContent]);

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
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    setSelectedFile(file);
    setWarningMessages([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        setCsvContent(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  const openUploadDialog = () => {
    setIsDialogOpen(true);
  };

  const closeUploadDialog = () => {
    setIsDialogOpen(false);
  };

  const processFile = async () => {
    if (!selectedFile || !selectedBankId || !csvValidation.isValid) {
      toast.error('Please select a valid CSV file and bank account');
      return;
    }
    
    try {
      // Read the file content
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target && typeof event.target.result === 'string') {
          const parseResult = parseCSV(event.target.result);
          
          if (parseResult.warnings.length > 0) {
            parseResult.warnings.forEach(warning => {
              console.warn('CSV parse warning:', warning);
              toast.warning(warning, { duration: 3000 });
            });
          }
          
          if (parseResult.transactions.length === 0) {
            toast.error('No valid transactions found in the CSV file');
            return;
          }
          
          try {
            await uploadCSV(parseResult.transactions, selectedBankId);
            setSelectedFile(null);
            setCsvContent("");
            setCsvValidation({ isValid: false, headers: [] });
            setSelectedBankId('');
            toast.success('Transactions uploaded successfully');
          } catch (err) {
            console.error('Error uploading transactions:', err);
            toast.error('Failed to upload transactions');
          }
        }
      };
      
      reader.readAsText(selectedFile);
    } catch (err) {
      console.error('Error processing file:', err);
      toast.error('Failed to process file');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setCsvContent("");
    setCsvValidation({ isValid: false, headers: [] });
    setSelectedBankId('');
    setWarningMessages([]);
  };

  return (
    <>
      <Card className="w-full hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="text-primary">Upload Bank Statement</CardTitle>
          <CardDescription>
            Upload a CSV file containing bank statement data to categorize transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-primary bg-secondary/50' : 'border-muted'
            } transition-colors duration-200 ease-in-out`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-full bg-primary/10">
                <UploadCloud className={`h-10 w-10 text-primary ${dragActive ? 'animate-bounce-subtle' : ''}`} />
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
                className="hover-scale"
              >
                Browse Files
              </Button>
              <Button
                variant="default"
                className="bg-finance-green hover:bg-finance-green-light hover-scale"
                onClick={openUploadDialog}
              >
                Advanced Upload Options
              </Button>
            </div>
          </div>

          {selectedFile && (
            <div className="mt-4 p-4 border rounded-md bg-background animate-fade-in">
              <div className="flex items-center space-x-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-finance-green animate-pulse" />
                <div className="flex-1 truncate">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => {
                  setSelectedFile(null);
                  setCsvContent("");
                  setCsvValidation({ isValid: false, headers: [] });
                }} className="hover-scale">
                  Remove
                </Button>
              </div>
              
              {csvValidation.isValid ? (
                <div className="mb-4 flex items-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>CSV validation successful</span>
                </div>
              ) : csvContent ? (
                <div className="mb-4 flex items-center text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{csvValidation.errorMessage || 'Invalid CSV format'}</span>
                </div>
              ) : null}
              
              {csvValidation.isValid && csvValidation.headers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Detected columns:</p>
                  <div className="text-xs flex flex-wrap gap-1">
                    {csvValidation.headers.map((header, index) => (
                      <span key={index} className="bg-muted px-2 py-1 rounded-sm">{header}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Select Bank Account</p>
                <BankSelector 
                  selectedBankId={selectedBankId}
                  onSelectBank={setSelectedBankId}
                  bankConnections={bankConnections}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center text-sm space-x-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>CSV file should include date, description, and amount columns</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={processFile}
            disabled={!selectedFile || !selectedBankId || !csvValidation.isValid || loading}
            className="bg-finance-green hover:bg-finance-green-light hover-scale"
          >
            {loading ? 'Processing...' : 'Process Transactions'}
          </Button>
        </CardFooter>
      </Card>

      <UploadDialog 
        isOpen={isDialogOpen} 
        onClose={closeUploadDialog} 
        bankConnections={bankConnections}
      />
    </>
  );
};

export default FileUpload;
