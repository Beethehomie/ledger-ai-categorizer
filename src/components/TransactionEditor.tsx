import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/types';
import { toast } from '@/utils/toast';
import { Loader2, Calendar, Store } from 'lucide-react';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BankConnectionRow } from '@/types/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import VendorEditor from './VendorEditor';
import { v4 as uuidv4 } from 'uuid';

interface TransactionEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransactionEditor: React.FC<TransactionEditorProps> = ({
  isOpen,
  onClose,
}) => {
  const { addTransactions, vendors, bankConnections, getVendorsList } = useBookkeeping();
  const [date, setDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const vendorsList = getVendorsList();

  const resetForm = () => {
    setDate(new Date());
    setAmount('');
    setDescription('');
    setSelectedVendor(null);
    setBankAccountId(null);
    setIsSubmitting(false);
  };

  const handleDialogClose = () => {
    resetForm();
    onClose();
  };

  const handleAddTransaction = async () => {
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) === 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    if (!selectedVendor) {
      toast.error('Please select or add a vendor');
      return;
    }
    
    if (!bankAccountId) {
      toast.error('Please select a bank account');
      return;
    }

    setIsSubmitting(true);

    try {
      const newTransaction: Transaction = {
        id: uuidv4(),
        date: format(date, 'yyyy-MM-dd'),
        description,
        amount: Number(amount),
        vendor: selectedVendor,
        vendorVerified: false,
        isVerified: false,
        bankAccountId,
        bankAccountName: bankConnections.find(b => b.id === bankAccountId)?.display_name,
        type: 'expense',
        statementType: 'profit_loss',
      };

      await addTransactions([newTransaction]);
      
      handleDialogClose();
      toast.success('Transaction added successfully');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddVendor = (newVendor) => {
    setSelectedVendor(newVendor.name);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Create a new transaction manually. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction-date" className="text-right">
                Date *
              </Label>
              <div className="col-span-3">
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={(date) => {
                        setDate(date || new Date());
                        setDatePickerOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction-amount" className="text-right">
                Amount *
              </Label>
              <Input
                id="transaction-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3"
                placeholder="Enter amount (e.g. 100.00)"
                type="number"
                step="0.01"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction-description" className="text-right">
                Description *
              </Label>
              <Input
                id="transaction-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter transaction description"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction-vendor" className="text-right">
                Vendor *
              </Label>
              <div className="col-span-3 flex gap-2">
                <Select
                  value={selectedVendor || undefined}
                  onValueChange={setSelectedVendor}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorsList.map((vendor) => (
                      <SelectItem key={vendor.name} value={vendor.name}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsVendorEditorOpen(true)}
                  title="Add new vendor"
                >
                  <Store className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction-bank" className="text-right">
                Bank Account *
              </Label>
              <Select
                value={bankAccountId || undefined}
                onValueChange={setBankAccountId}
              >
                <SelectTrigger className="w-full col-span-3">
                  <SelectValue placeholder="Select a bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankConnections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id}>
                      {connection.display_name || connection.bank_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddTransaction} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Transaction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VendorEditor
        onSave={handleAddVendor}
        isOpen={isVendorEditorOpen}
        onClose={() => setIsVendorEditorOpen(false)}
      />
    </>
  );
};

export default TransactionEditor;
