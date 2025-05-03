
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { parseCSV } from '@/utils/csvParser';
import BankSelector from './BankSelector';

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
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    
    try {
      console.log('Form submission data:', {
        fileName: selectedFile?.name,
        bankId: selectedBankId,
        initialBalance: initialBalance,
        balanceDate: balanceDate,
        endingBalance: endingBalance
      });
      
      if (!selectedFile) {
        toast.error('Please select a file to upload');
        return;
      }
      
      if (!selectedBankId) {
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
            
            if (parseResult.warnings.length > 0) {
              // Show warnings but continue
              parseResult.warnings.forEach(warning => {
                console.warn('CSV parse warning:', warning);
                toast.warning(warning, { duration: 3000 });
              });
            }
            
            if (parseResult.transactions.length === 0) {
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
              
              // Show warning if no account ID was found
              if (!bankAccountId) {
                toast.warning('No bank account found for this connection. Transactions may not be saved correctly.');
              }
              
              // Upload the transactions
              await bookkeeping.uploadCSV(
                parseResult.transactions,
                selectedBankId,
                initialBalance,
                balanceDate,
                endingBalance
              );
              
              // Close the dialog on successful upload
              onClose();
              toast.success('Transaction upload complete');
              
            } catch (uploadError: any) {
              // Add detailed error handling for the upload process
              console.error('Transaction upload error details:', uploadError);
              
              if (uploadError.message?.includes('violates row level security policy')) {
                toast.error('Security error: You may not have permission to add transactions to this account.');
              } else if (uploadError.code === '23503') {
                toast.error('Database constraint error: A related record was not found.');
              } else if (uploadError.code === '23502') {
                toast.error('Required field missing: Please make sure all required fields are populated.');
                console.error('Missing field details:', uploadError.detail);
              } else {
                toast.error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
              }
            }
          } catch (parseError) {
            console.error('CSV parsing error:', parseError);
            toast.error('Failed to parse the CSV file. Please check the file format.');
          }
        }
        setSubmitting(false);
      };
      
      reader.onerror = () => {
        toast.error('Error reading the file');
        setSubmitting(false);
      };
      
      reader.readAsText(selectedFile);
      
    } catch (err) {
      console.error('Form submission error:', err);
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
            <div className="col-span-3">
              <BankSelector
                selectedBankId={selectedBankId}
                onSelectBank={setSelectedBankId}
                bankConnections={bankConnections}
              />
            </div>
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
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
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
                  onSelect={(date) => {
                    setBalanceDate(date);
                    setDatePickerOpen(false);
                  }}
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
