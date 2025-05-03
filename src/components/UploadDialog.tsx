
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { parseCSV } from '@/utils/csvParser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bankConnections: any[];
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose, bankConnections }) => {
  const bookkeeping = useBookkeeping();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [balanceDate, setBalanceDate] = useState<Date | undefined>(undefined);
  const [endingBalance, setEndingBalance] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const csvBankConnections = bankConnections.filter(conn => conn.connection_type === 'csv');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleFormSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setError(null);
    
    try {
      console.log('Form submission data:', {
        fileName: selectedFile?.name,
        bankId: selectedBankId,
        initialBalance: initialBalance,
        balanceDate: balanceDate,
        endingBalance: endingBalance
      });
      
      if (!selectedFile) {
        setError('Please select a file to upload');
        toast.error('Please select a file to upload');
        return;
      }
      
      if (!selectedBankId) {
        setError('Please select a bank account');
        toast.error('Please select a bank account');
        return;
      }
      
      setSubmitting(true);
      
      // Parse the CSV file
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target && typeof event.target.result === 'string') {
          try {
            // Parse CSV
            const parseResult = parseCSV(event.target.result);
            
            if (parseResult.warnings && parseResult.warnings.length > 0) {
              // Show warnings but continue
              parseResult.warnings.forEach(warning => {
                console.warn('CSV parse warning:', warning);
                toast.warning(warning, { duration: 3000 });
              });
            }
            
            if (parseResult.transactions.length === 0) {
              setError('No valid transactions found in the CSV file');
              toast.error('No valid transactions found in the CSV file');
              setSubmitting(false);
              return;
            }
            
            console.log('Parsed transactions:', parseResult.transactions.length);
            console.log('Sample transaction:', parseResult.transactions[0]);
            
            try {
              // Add debug logs for bank connection and account ID
              const bankAccountId = await bookkeeping.getBankAccountIdFromConnection(selectedBankId);
              console.log('For bank connection ID:', selectedBankId);
              console.log('Found bank account ID:', bankAccountId || 'NOT FOUND');
              
              // Set accountId on all transactions
              const transactionsWithAccountId = parseResult.transactions.map(transaction => ({
                ...transaction,
                accountId: bankAccountId || selectedBankId // Fallback to connection ID if no account ID
              }));
              
              console.log('Transaction with accountId:', transactionsWithAccountId[0]);
              
              // Show warning if no account ID was found
              if (!bankAccountId) {
                toast.warning('No bank account found for this connection. Using connection ID as fallback.');
              }
              
              // Upload the transactions with accountId
              await bookkeeping.uploadCSV(
                transactionsWithAccountId,
                selectedBankId,
                initialBalance,
                balanceDate,
                endingBalance
              );
              
              // Close the dialog on successful upload
              onClose();
              
              // Refresh transactions to show the newly uploaded ones
              await bookkeeping.fetchTransactions();
              
              toast.success(`Successfully uploaded ${transactionsWithAccountId.length} transactions. Please check the Transactions tab.`);
              
            } catch (uploadError: any) {
              // Add detailed error handling for the upload process
              console.error('Transaction upload error details:', uploadError);
              
              if (uploadError.message?.includes('violates row level security policy')) {
                setError('Security error: You may not have permission to add transactions to this account.');
                toast.error('Security error: You may not have permission to add transactions to this account.');
              } else if (uploadError.code === '23503') {
                setError('Database constraint error: A related record was not found.');
                toast.error('Database constraint error: A related record was not found.');
              } else if (uploadError.code === '23502') {
                setError('Required field missing: Please make sure all required fields are populated.');
                toast.error('Required field missing: Please make sure all required fields are populated.');
                console.error('Missing field details:', uploadError.detail);
              } else {
                setError(`Upload failed: ${uploadError.message || 'Unknown error'}`);
                toast.error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
              }
            }
          } catch (parseError) {
            console.error('CSV parsing error:', parseError);
            setError('Failed to parse the CSV file. Please check the file format.');
            toast.error('Failed to parse the CSV file. Please check the file format.');
          }
        }
        setSubmitting(false);
      };
      
      reader.onerror = () => {
        setError('Error reading the file');
        toast.error('Error reading the file');
        setSubmitting(false);
      };
      
      reader.readAsText(selectedFile);
      
    } catch (err) {
      console.error('Form submission error:', err);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Advanced Upload Options</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing bank statement data to categorize transactions
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              CSV File
            </Label>
            <Input id="file" type="file" accept=".csv" className="col-span-3" onChange={handleFileChange} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bankId" className="text-right">
              Bank Account
            </Label>
            <Select
              value={selectedBankId}
              onValueChange={setSelectedBankId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a bank account" />
              </SelectTrigger>
              <SelectContent>
                {csvBankConnections.length === 0 ? (
                  <SelectItem value="no-accounts" disabled>
                    No CSV Bank Accounts Available
                  </SelectItem>
                ) : (
                  csvBankConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.display_name || conn.bank_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="initialBalance" className="text-right">
              Initial Balance
            </Label>
            <Input
              type="number"
              id="initialBalance"
              className="col-span-3"
              value={initialBalance}
              onChange={(e) => setInitialBalance(Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balanceDate" className="text-right">
              Balance Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 pl-3 text-left font-normal",
                    !balanceDate && "text-muted-foreground"
                  )}
                >
                  {balanceDate ? format(balanceDate, "yyyy-MM-dd") : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={balanceDate}
                  onSelect={setBalanceDate}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endingBalance" className="text-right">
              Ending Balance
            </Label>
            <Input
              type="number"
              id="endingBalance"
              className="col-span-3"
              value={endingBalance || ''}
              onChange={(e) => setEndingBalance(e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleFormSubmit} disabled={submitting || !selectedFile || !selectedBankId} >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDialog;
