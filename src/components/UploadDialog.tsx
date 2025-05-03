
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { CSVParseResult, parseCSV, validateCSVStructure } from '@/utils/csvParser';
import { Transaction } from '@/types';
import FileUpload from './FileUpload';
import BankSelector from './BankSelector';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bankConnections: any[];
}

const UploadDialog: React.FC<UploadDialogProps> = ({
  isOpen,
  onClose,
  bankConnections
}) => {
  const { uploadCSV } = useBookkeeping();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [initialBalance, setInitialBalance] = useState<string>("0");
  const [endingBalance, setEndingBalance] = useState<string>("");
  
  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    // Reset parse result when a new file is selected
    setParseResult(null);
  };
  
  const handleParseCSV = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a file first."
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const text = await file.text();
      const result = await parseCSV(text);
      
      // Validate the structure
      const structureWarnings = validateCSVStructure(result.transactions);
      
      if (structureWarnings.length > 0) {
        result.warnings = [...(result.warnings || []), ...structureWarnings];
      }
      
      setParseResult(result);
      
      if (result.warnings && result.warnings.length > 0) {
        toast({
          variant: "warning",
          title: "CSV Warning",
          description: `${result.warnings.length} issues found. Check the import preview.`
        });
      } else {
        toast({
          title: "Success",
          description: `Found ${result.transactions.length} transactions ready for import.`
        });
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to parse CSV file. Please check the format."
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleImport = async () => {
    if (!parseResult || !parseResult.transactions || parseResult.transactions.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No valid transactions to import."
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await uploadCSV(
        parseResult.transactions, 
        selectedBankId || undefined,
        parseFloat(initialBalance) || 0,
        new Date(),
        endingBalance ? parseFloat(endingBalance) : undefined
      );
      
      toast({
        title: "Success",
        description: "Transactions uploaded successfully."
      });
      onClose();
    } catch (error) {
      console.error("Error uploading transactions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload transactions."
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Transactions</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your transactions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <FileUpload 
            onFileSelected={handleFileChange} 
            accept=".csv" 
            currentFile={file}
          />
          
          {file && !parseResult && (
            <Button onClick={handleParseCSV} disabled={loading}>
              {loading ? "Processing..." : "Parse CSV"}
            </Button>
          )}
          
          {parseResult && parseResult.transactions.length > 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">
                  Found {parseResult.transactions.length} transactions
                </p>
                
                {parseResult.warnings && parseResult.warnings.length > 0 && (
                  <div className="bg-amber-50 p-2 rounded text-amber-800 text-sm mb-4">
                    <p className="font-semibold">Warnings:</p>
                    <ul className="list-disc pl-4">
                      {parseResult.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank">Bank Account</Label>
                  <BankSelector
                    connections={bankConnections}
                    value={selectedBankId}
                    onChange={setSelectedBankId}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initial-balance">Initial Balance</Label>
                    <Input
                      id="initial-balance"
                      type="number"
                      step="0.01"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ending-balance">Ending Balance</Label>
                    <Input
                      id="ending-balance"
                      type="number"
                      step="0.01"
                      value={endingBalance}
                      onChange={(e) => setEndingBalance(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {parseResult && parseResult.transactions.length > 0 && (
            <Button onClick={handleImport} disabled={loading}>
              {loading ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDialog;
