
import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, AlertCircle, Check, Loader } from "lucide-react";
import { Transaction } from '@/types';
import { validateCSVStructure, parseCSV, findDuplicateTransactions } from '@/utils/csvParser';
import { toast } from '@/utils/toast';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { supabase } from '@/integrations/supabase/client';
import { generateTransactionEmbeddings } from '@/utils/embeddingUtils';
import BankSelector from './BankSelector';
import { Switch } from '@/components/ui/switch';

interface TransactionUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransactionUploadDialog: React.FC<TransactionUploadDialogProps> = ({ isOpen, onClose }) => {
  const { uploadCSV, bankConnections, transactions: existingTransactions } = useBookkeeping();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [processingStep, setProcessingStep] = useState<number>(0); // 0: Not started, 1: Parsing, 2: Validating, 3: Uploading, 4: Processing embeddings
  const [useAI, setUseAI] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file || file.type !== 'text/csv') {
      setValidationMessage('Please select a valid CSV file');
      return;
    }

    setSelectedFile(file);
    setProcessingStep(1); // Parsing
    setIsValidating(true);
    setValidationMessage(null);
    setParsedTransactions([]);
    setDuplicateCount(0);

    try {
      // Read file content
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const csvContent = event.target.result as string;
          
          // Validate structure
          const validation = validateCSVStructure(csvContent);
          if (!validation.isValid) {
            setValidationMessage(validation.errorMessage || 'Invalid CSV format');
            setIsValidating(false);
            return;
          }

          setProcessingStep(2); // Validating
          
          // Parse transactions
          const { transactions: parsed, warnings } = parseCSV(csvContent);
          
          if (warnings.length > 0) {
            warnings.forEach(warning => {
              console.warn('CSV Parse Warning:', warning);
              toast.warning(warning, { duration: 3000 });
            });
          }
          
          if (parsed.length === 0) {
            setValidationMessage('No valid transactions found in the CSV');
            setIsValidating(false);
            return;
          }
          
          // Check for duplicates
          const duplicates = findDuplicateTransactions(existingTransactions, parsed);
          setDuplicateCount(duplicates.length);
          
          // Set parsed transactions (excluding duplicates)
          const uniqueTransactions = parsed.filter(
            transaction => !duplicates.some(d => 
              d.date === transaction.date && 
              d.description === transaction.description && 
              Math.abs(d.amount - transaction.amount) < 0.01
            )
          );
          
          if (uniqueTransactions.length === 0) {
            setValidationMessage('All transactions appear to be duplicates');
            setIsValidating(false);
            return;
          }
          
          setParsedTransactions(uniqueTransactions);
          setShowPreview(true);
          setIsValidating(false);
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setValidationMessage('Error processing the file');
      setIsValidating(false);
    }
  }, [existingTransactions]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = useCallback(async () => {
    if (parsedTransactions.length === 0 || !selectedBankId) {
      toast.error('Please select valid transactions and a bank account');
      return;
    }
    
    setIsUploading(true);
    setProcessingStep(3); // Uploading
    
    try {
      // Upload transactions to Supabase
      await uploadCSV(parsedTransactions, selectedBankId);
      
      setProcessingStep(4); // Processing embeddings
      
      // Generate embeddings if AI is enabled
      if (useAI) {
        try {
          const result = await generateTransactionEmbeddings();
          if (result.success) {
            const processedCount = result.results?.success || 0;
            toast.success(`Generated embeddings for ${processedCount} transactions`);
          } else if (result.error) {
            toast.warning(`Embeddings note: ${result.error}`);
          }
        } catch (err) {
          console.error('Error generating embeddings:', err);
          toast.warning('Transactions uploaded but there was an issue generating embeddings');
        }
      }
      
      toast.success(`${parsedTransactions.length} transactions uploaded successfully`);
      
      // Reset states and close dialog
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error uploading transactions:', error);
      toast.error('Failed to upload transactions');
    } finally {
      setIsUploading(false);
      setProcessingStep(0);
    }
  }, [parsedTransactions, selectedBankId, uploadCSV, useAI, onClose]);

  const resetForm = () => {
    setSelectedFile(null);
    setParsedTransactions([]);
    setValidationMessage(null);
    setDuplicateCount(0);
    setIsValidating(false);
    setIsUploading(false);
    setSelectedBankId('');
    setProcessingStep(0);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload Transactions
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file containing transaction data to import into your bookkeeping system
          </DialogDescription>
        </DialogHeader>

        {/* File upload area */}
        {!showPreview && (
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-secondary/20 transition-all cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onDragLeave={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {selectedFile ? selectedFile.name : 'Drag and drop your CSV file here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFile 
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB` 
                    : 'or click to browse files'}
                </p>
              </div>
              
              <Input 
                ref={fileInputRef}
                type="file" 
                accept=".csv" 
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              
              <Button variant="outline" type="button">
                Browse Files
              </Button>
            </div>
          </div>
        )}

        {isValidating && (
          <div className="flex items-center justify-center space-x-2 py-8">
            <Loader className="h-5 w-5 animate-spin text-primary" />
            <p>
              {processingStep === 1 && 'Parsing CSV file...'}
              {processingStep === 2 && 'Validating transactions...'}
            </p>
          </div>
        )}

        {validationMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationMessage}</AlertDescription>
          </Alert>
        )}

        {/* Preview section */}
        {showPreview && parsedTransactions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Transaction Preview</h3>
              <div className="text-sm text-muted-foreground">
                {parsedTransactions.length} valid transaction(s)
                {duplicateCount > 0 && ` • ${duplicateCount} duplicate(s) excluded`}
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedTransactions.slice(0, 50).map((transaction, index) => (
                      <TableRow key={`preview-${index}`}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell className="max-w-md truncate">{transaction.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          {transaction.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedTransactions.length > 50 && (
                <div className="py-2 px-4 bg-muted/30 text-center text-sm text-muted-foreground">
                  Showing 50 of {parsedTransactions.length} transactions
                </div>
              )}
            </div>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Select Bank Account</Label>
                <BankSelector
                  selectedBankId={selectedBankId}
                  onSelectBank={setSelectedBankId}
                  bankConnections={bankConnections}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="useAI" className="cursor-pointer">Use AI for Vendor Detection</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable to automatically detect vendors and categories using AI
                  </p>
                </div>
                <Switch
                  id="useAI"
                  checked={useAI}
                  onCheckedChange={setUseAI}
                />
              </div>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <Loader className="h-5 w-5 animate-spin text-primary" />
            <p>
              {processingStep === 3 && 'Uploading transactions...'}
              {processingStep === 4 && 'Processing embeddings...'}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              if (showPreview) {
                setShowPreview(false);
                setParsedTransactions([]);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              } else {
                resetForm();
                onClose();
              }
            }}
            disabled={isValidating || isUploading}
          >
            {showPreview ? 'Back' : 'Cancel'}
          </Button>
          
          {showPreview && (
            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedBankId || parsedTransactions.length === 0}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Upload {parsedTransactions.length} Transaction(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionUploadDialog;
