
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle, Cpu } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [useAI, setUseAI] = useState(true);
  const [generateEmbeddings, setGenerateEmbeddings] = useState(true);
  
  // Processing states
  const [processingAI, setProcessingAI] = useState(false);
  const [processingEmbeddings, setProcessingEmbeddings] = useState(false);

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
    if (e.target.files && e.target.files.length > 0) {
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

  const generateEmbeddingsForTransactions = async () => {
    if (!setProcessingEmbeddings) return;
    
    try {
      setProcessingEmbeddings(true);
      
      const response = await fetch('https://vfzzjnpkqbljhfdbbrqn.supabase.co/functions/v1/generate-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmenpqbnBrcWJsamhmZGJicnFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1ODk0NjksImV4cCI6MjA1OTE2NTQ2OX0.mgQoskAa0iy8t-lijNPqpUGlpm6Dc6WN0l7TM0qNeQk'}`
        },
        body: JSON.stringify({
          table: 'bank_transactions',
          textField: 'description',
          limit: 50
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      const successCount = result?.results?.success || 0;
      if (successCount > 0) {
        toast.success(`Generated embeddings for ${successCount} transactions`);
      } else {
        toast.info('No new transactions needed embeddings');
      }
      
    } catch (err) {
      console.error('Error generating embeddings:', err);
      toast.error('Failed to generate embeddings');
    } finally {
      setProcessingEmbeddings(false);
    }
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
            // Upload transactions
            await uploadCSV(parseResult.transactions, selectedBankId);
            
            // Generate embeddings if requested
            if (generateEmbeddings) {
              await generateEmbeddingsForTransactions();
            }
            
            setSelectedFile(null);
            setCsvContent("");
            setCsvValidation({ isValid: false, headers: [] });
            setSelectedBankId('');
            toast.success('Transactions uploaded and processed successfully');
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
    setProcessingAI(false);
    setProcessingEmbeddings(false);
  };

  return (
    <>
      <Card className="w-full hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <UploadCloud className="h-5 w-5" />
            Upload Bank Statement
          </CardTitle>
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
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select Bank Account</p>
                  <BankSelector 
                    selectedBankId={selectedBankId}
                    onSelectBank={setSelectedBankId}
                    bankConnections={bankConnections}
                  />
                </div>
                
                <div className="space-y-2 border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="use-ai" className="text-sm font-medium">
                        Use AI for vendor extraction
                      </Label>
                    </div>
                    <Switch
                      id="use-ai"
                      checked={useAI}
                      onCheckedChange={setUseAI}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="generate-embeddings" 
                      checked={generateEmbeddings}
                      onCheckedChange={(checked) => setGenerateEmbeddings(!!checked)}
                      disabled={!useAI}
                    />
                    <Label 
                      htmlFor="generate-embeddings" 
                      className={`text-sm ${!useAI ? 'text-muted-foreground' : ''}`}
                    >
                      Generate embeddings for vector search
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center text-sm space-x-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>CSV file should include date, description, and amount columns</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={resetForm}
            disabled={!selectedFile || loading || processingAI || processingEmbeddings}
          >
            Cancel
          </Button>
          
          <Button
            onClick={processFile}
            disabled={!selectedFile || !selectedBankId || !csvValidation.isValid || loading || processingAI || processingEmbeddings}
            className="bg-finance-green hover:bg-finance-green-light hover-scale"
          >
            {loading || processingAI || processingEmbeddings ? 
              'Processing...' : 
              'Process Transactions'}
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
