import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileSpreadsheet, AlertCircle, ArrowRight, Info, Calendar, CheckCircle, X } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BankConnectionRow } from '@/types/supabase';
import { Transaction } from '@/types';
import { parseCSV, validateCSVStructure, findDuplicateTransactions } from '@/utils/csvParser';
import TransactionReviewDialog from './TransactionReviewDialog';
import { format } from 'date-fns';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bankConnections: BankConnectionRow[];
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose, bankConnections }) => {
  const { uploadCSV, loading, transactions } = useBookkeeping();
  const [step, setStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [csvValidation, setCsvValidation] = useState<{
    isValid: boolean;
    headers: string[];
    errorMessage?: string;
  }>({ isValid: false, headers: [] });
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [endBalance, setEndBalance] = useState<string>('');
  const [balanceDate, setBalanceDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [duplicateTransactions, setDuplicateTransactions] = useState<string[]>([]);
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const [hasUploaded, setHasUploaded] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Get CSV-type bank connections
  const csvBankConnections = bankConnections.filter(conn => conn.connection_type === 'csv');

  useEffect(() => {
    if (csvContent) {
      // Validate CSV structure
      const validation = validateCSVStructure(csvContent);
      setCsvValidation(validation);
      
      if (validation.isValid) {
        // Check for duplicates within the CSV file
        const { hasDuplicates, duplicates } = checkForDuplicatesWithinFile(csvContent);
        if (hasDuplicates) {
          setDuplicateTransactions(duplicates);
          toast.warning(`Found ${duplicates.length} possible duplicate entries in the file. Please review carefully.`);
        } else {
          setDuplicateTransactions([]);
        }
      }
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
    // Validate file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    setSelectedFile(file);
    setDuplicateTransactions([]);
    setWarningMessages([]);
    setHasUploaded(false);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        setCsvContent(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  const checkForDuplicatesWithinFile = (csvContent: string): { hasDuplicates: boolean; duplicates: string[] } => {
    const rows = csvContent.split('\n');
    if (rows.length <= 1) return { hasDuplicates: false, duplicates: [] };
    
    const headers = rows[0].split(',');
    const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date'));
    const descIndex = headers.findIndex(h => h.toLowerCase().includes('desc'));
    const amountIndex = headers.findIndex(h => h.toLowerCase().includes('amount'));
    
    if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
      return { hasDuplicates: false, duplicates: [] };
    }
    
    const seen = new Set<string>();
    const duplicates: string[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      
      const values = rows[i].split(',');
      if (values.length < Math.max(dateIndex, descIndex, amountIndex) + 1) continue;
      
      const date = values[dateIndex].trim();
      const desc = values[descIndex].trim();
      const amount = values[amountIndex].trim();
      
      const key = `${date}-${desc}-${amount}`;
      
      if (seen.has(key)) {
        duplicates.push(`Row ${i+1}: ${date} | ${desc} | ${amount}`);
      } else {
        seen.add(key);
      }
    }
    
    return { 
      hasDuplicates: duplicates.length > 0,
      duplicates
    };
  };

  const processFile = () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    
    if (!selectedBankId) {
      toast.error('Please select a bank account for this upload');
      return;
    }
    
    if (!csvValidation.isValid) {
      toast.error(csvValidation.errorMessage || 'Invalid CSV format');
      return;
    }

    // Parse CSV content into transactions
    const parseResult = parseCSV(csvContent);
    
    if (parseResult.warnings.length > 0) {
      setWarningMessages(parseResult.warnings);
    }
    
    if (parseResult.transactions.length === 0) {
      toast.error('No valid transactions found in the CSV file');
      return;
    }
    
    // Add bankAccountId to transactions
    const transactionsWithBankId = parseResult.transactions.map(t => ({
      ...t,
      bankAccountId: selectedBankId
    }));

    // Check for duplicates with existing transactions in the database
    const potentialDuplicates = findDuplicateTransactions(transactions, transactionsWithBankId);
    if (potentialDuplicates.length > 0) {
      setWarningMessages(prev => [
        ...prev, 
        `Found ${potentialDuplicates.length} potential duplicates with existing transactions.`
      ]);
    }
    
    setParsedTransactions(transactionsWithBankId);
    setIsReviewDialogOpen(true);
  };

  const handleConfirmUpload = (editedTransactions: Transaction[]) => {
    if (editedTransactions.length === 0) {
      toast.error('No transactions selected for upload');
      return;
    }

    const initialBalanceValue = parseFloat(initialBalance) || 0;
    const endBalanceValue = endBalance ? parseFloat(endBalance) : undefined;
    
    // Call the uploadCSV function directly with the processed transactions
    uploadCSV(
      editedTransactions, 
      selectedBankId, 
      initialBalanceValue, 
      new Date(balanceDate), 
      endBalanceValue
    );
    
    setHasUploaded(true);
    setIsReviewDialogOpen(false);
    resetDialog();
    onClose();
  };

  const nextStep = () => {
    if (selectedFile && !csvValidation.isValid) {
      toast.error(csvValidation.errorMessage || 'Invalid CSV format');
      return;
    }
    setStep(2);
  };

  const resetDialog = () => {
    setStep(1);
    setSelectedFile(null);
    setCsvContent("");
    setCsvValidation({ isValid: false, headers: [] });
    setSelectedBankId('');
    setDragActive(false);
    setInitialBalance('0');
    setEndBalance('');
    setBalanceDate(format(new Date(), 'yyyy-MM-dd'));
    setDuplicateTransactions([]);
    setWarningMessages([]);
    setHasUploaded(false);
    setParsedTransactions([]);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Upload Bank Statement</DialogTitle>
            <DialogDescription>
              {step === 1 
                ? "CSV file must include these columns: Date, Description, Amount" 
                : "Configure upload settings for this statement"}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center ${
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
                    id="file-upload-dialog"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload-dialog')?.click()}
                    className="hover-scale"
                  >
                    Browse Files
                  </Button>
                </div>
              </div>

              {selectedFile && (
                <div className="mt-2 p-3 border rounded-md bg-background">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-5 w-5 text-finance-green" />
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
                    }}>
                      Remove
                    </Button>
                  </div>
                  
                  {csvValidation.isValid ? (
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span>CSV validation successful</span>
                    </div>
                  ) : csvContent ? (
                    <div className="mt-2 flex items-center text-sm text-red-600">
                      <X className="h-4 w-4 mr-1" />
                      <span>{csvValidation.errorMessage || 'Invalid CSV format'}</span>
                    </div>
                  ) : null}
                  
                  {csvValidation.isValid && csvValidation.headers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Detected columns:</p>
                      <div className="text-xs flex flex-wrap gap-1">
                        {csvValidation.headers.map((header, index) => (
                          <span key={index} className="bg-muted px-2 py-1 rounded-sm">{header}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {duplicateTransactions.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Found {duplicateTransactions.length} possible duplicate transactions:</div>
                    <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                      {duplicateTransactions.slice(0, 5).map((dupe, i) => (
                        <div key={i} className="py-1 border-b border-amber-200">{dupe}</div>
                      ))}
                      {duplicateTransactions.length > 5 && (
                        <div className="text-sm font-medium pt-1">
                          ... and {duplicateTransactions.length - 5} more
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center space-x-2 text-sm text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <p>Required columns: Date, Description, Amount</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={nextStep} 
                  disabled={!selectedFile || !csvValidation.isValid}
                  className="bg-finance-green hover:bg-finance-green-light"
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="bank-account">Select Bank Account</Label>
                  {csvBankConnections.length > 0 ? (
                    <Select
                      value={selectedBankId}
                      onValueChange={setSelectedBankId}
                    >
                      <SelectTrigger className="w-full" id="bank-account">
                        <SelectValue placeholder="Select a bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvBankConnections.map((conn) => (
                          <SelectItem key={conn.id} value={conn.id}>
                            {conn.display_name || conn.bank_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-muted-foreground">No CSV bank accounts available.</p>
                      <p className="text-sm mt-2">Add a CSV bank connection in the Banking tab first.</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="balance-date">Balance Date</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="balance-date"
                      type="date"
                      value={balanceDate}
                      onChange={(e) => setBalanceDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Info className="inline h-3 w-3 mr-1" />
                    Date associated with the initial balance
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initial-balance">Initial Balance</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="initial-balance"
                      type="number"
                      step="0.01"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Info className="inline h-3 w-3 mr-1" />
                    Starting balance for calculating running balances
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-balance">Ending Balance (Optional)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="end-balance"
                      type="number"
                      step="0.01"
                      value={endBalance}
                      onChange={(e) => setEndBalance(e.target.value)}
                      placeholder="Leave empty if unknown"
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Info className="inline h-3 w-3 mr-1" />
                    Used to verify transactions reconcile with your bank statement
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={processFile}
                  disabled={!selectedBankId || loading}
                  className="bg-finance-green hover:bg-finance-green-light"
                >
                  {loading ? 'Processing...' : 'Review Transactions'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TransactionReviewDialog 
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        transactions={parsedTransactions}
        onConfirm={handleConfirmUpload}
        warnings={warningMessages}
        existingTransactions={transactions}
      />
    </>
  );
};

export default UploadDialog;
