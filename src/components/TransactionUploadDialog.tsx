
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from '@/utils/toast';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Transaction } from '@/types';
import { parseCSV, validateCSVStructure, findDuplicateTransactions } from '@/utils/csvParser';
import TransactionReviewDialog from './TransactionReviewDialog';

interface TransactionUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransactionUploadDialog: React.FC<TransactionUploadDialogProps> = ({ isOpen, onClose }) => {
  const { addTransactions, transactions: existingTransactions } = useBookkeeping();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }
    
    setIsUploading(true);
    try {
      const fileContent = await file.text();
      
      // Validate CSV structure first
      const validation = validateCSVStructure(fileContent);
      
      if (!validation.isValid) {
        toast.error(`Invalid CSV format: ${validation.errorMessage}`);
        setIsUploading(false);
        return;
      }
      
      // Parse the CSV file
      const { transactions, warnings } = parseCSV(fileContent);
      
      if (transactions.length === 0) {
        toast.error('No valid transactions found in the file');
        setIsUploading(false);
        return;
      }
      
      // Check for potential duplicate transactions
      const duplicates = findDuplicateTransactions(existingTransactions, transactions);
      
      if (duplicates.length > 0) {
        warnings.push(`Found ${duplicates.length} potential duplicate transactions.`);
      }
      
      // Set the parsed transactions and open review dialog
      setParsedTransactions(transactions);
      setWarnings(warnings);
      setIsReviewDialogOpen(true);
      
    } catch (err) {
      console.error('Error parsing CSV:', err);
      toast.error('Failed to process the CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTransactionConfirm = async (selectedTransactions: Transaction[]) => {
    if (selectedTransactions.length === 0) {
      toast.warning('No transactions selected for import');
      setIsReviewDialogOpen(false);
      return;
    }
    
    setIsUploading(true);
    try {
      // Call the addTransactions function to save to bank_transactions table
      await addTransactions(selectedTransactions);
      toast.success(`Successfully imported ${selectedTransactions.length} transactions`);
      setIsReviewDialogOpen(false);
      onClose();
    } catch (err) {
      console.error('Error saving transactions:', err);
      toast.error('Failed to save transactions');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Transactions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm mb-2">Upload a CSV file with your bank transactions</p>
              <Input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                className="mx-auto max-w-xs" 
              />
            </div>
            
            {file && (
              <div className="text-sm">
                <p>Selected file: <span className="font-medium">{file.name}</span></p>
              </div>
            )}
            
            <div className="flex items-center text-sm space-x-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <p>CSV file should include date, description, and amount columns</p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button 
                onClick={handleFileUpload}
                disabled={!file || isUploading}
                className="bg-finance-green hover:bg-finance-green-light"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Processing...' : 'Process CSV'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <TransactionReviewDialog 
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        transactions={parsedTransactions}
        onConfirm={handleTransactionConfirm}
        warnings={warnings}
        existingTransactions={existingTransactions}
      />
    </>
  );
};

export default TransactionUploadDialog;
