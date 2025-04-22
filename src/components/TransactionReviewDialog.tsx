
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction } from '@/types';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { Store, Plus, Check, X, ChevronRight, ChevronLeft } from 'lucide-react';
import VendorEditor from './VendorEditor';

interface TransactionReviewDialogProps {
  transaction?: Transaction;
  transactions?: Transaction[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (editedTransactions: Transaction[]) => void; 
  warnings?: string[];
}

const TransactionReviewDialog: React.FC<TransactionReviewDialogProps> = ({
  transaction,
  transactions,
  isOpen,
  onClose,
  onConfirm,
  warnings = [],
}) => {
  const { categories, verifyTransaction, updateTransaction, vendors, getVendorsList } = useBookkeeping();
  
  // If we receive an array of transactions, use it; otherwise, create an array from the single transaction
  const allTransactions = transactions || (transaction ? [transaction] : []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTransaction = allTransactions[currentIndex];
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    currentTransaction?.category || null
  );
  const [selectedType, setSelectedType] = useState<Transaction['type']>(
    currentTransaction?.type || 'expense'
  );
  const [selectedStatementType, setSelectedStatementType] = useState<Transaction['statementType']>(
    currentTransaction?.statementType || 'profit_loss'
  );
  const [selectedVendor, setSelectedVendor] = useState<string | null>(
    currentTransaction?.vendor || null
  );
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);
  const [editedTransactions, setEditedTransactions] = useState<Transaction[]>([]);
  
  const vendorsList = getVendorsList();
  
  // Update state when current transaction changes
  React.useEffect(() => {
    if (currentTransaction) {
      setSelectedCategory(currentTransaction.category || null);
      setSelectedType(currentTransaction.type || 'expense');
      setSelectedStatementType(currentTransaction.statementType || 'profit_loss');
      setSelectedVendor(currentTransaction.vendor || null);
    }
  }, [currentTransaction]);
  
  const handleApprove = async () => {
    if (!currentTransaction) return;
    
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    
    if (!selectedVendor) {
      toast.error('Please select a vendor');
      return;
    }
    
    try {
      // Create an updated transaction
      const updatedTransaction: Transaction = {
        ...currentTransaction,
        category: selectedCategory,
        type: selectedType,
        statementType: selectedStatementType,
        vendor: selectedVendor,
        vendorVerified: true,
        isVerified: true
      };
      
      // Store the edited transaction
      const updatedEditedTransactions = [...editedTransactions];
      updatedEditedTransactions[currentIndex] = updatedTransaction;
      setEditedTransactions(updatedEditedTransactions);
      
      // If processing a single transaction
      if (!transactions && transaction) {
        // Update the transaction with the vendor if it's changed
        if (selectedVendor !== transaction.vendor) {
          await updateTransaction({
            ...transaction,
            vendor: selectedVendor,
            vendorVerified: true
          });
        }
        
        // Then verify the transaction with category and types
        await verifyTransaction(
          transaction.id, 
          selectedCategory,
          selectedType,
          selectedStatementType
        );
        
        toast.success('Transaction verified successfully');
        onClose();
      } else {
        // If we have more transactions to review, advance to the next one
        if (currentIndex < allTransactions.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // If we've processed all transactions, call onConfirm with all edited transactions
          if (onConfirm) {
            onConfirm(updatedEditedTransactions);
          }
          toast.success('All transactions processed successfully');
          onClose();
        }
      }
    } catch (error) {
      console.error('Error verifying transaction:', error);
      toast.error('Failed to verify transaction');
    }
  };
  
  const handleVendorCreated = (newVendor) => {
    setSelectedVendor(newVendor.name);
    // If this is a new vendor relevant to the current transaction, associate it
    if (currentTransaction) {
      updateTransaction({
        ...currentTransaction,
        vendor: newVendor.name,
        vendorVerified: true
      });
    }
  };
  
  const handleReject = () => {
    // Implement rejection logic if needed
    onClose();
  };
  
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const handleNext = () => {
    if (currentIndex < allTransactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  // If we don't have any transactions to display, close the dialog
  if (allTransactions.length === 0) {
    return null;
  }
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {transactions ? 
                `Review Transaction (${currentIndex + 1} of ${allTransactions.length})` : 
                'Review Transaction'}
            </DialogTitle>
          </DialogHeader>
          
          {warnings && warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
              <h4 className="text-amber-800 font-medium text-sm mb-1">Warnings:</h4>
              <ul className="text-xs text-amber-700 list-disc list-inside">
                {warnings.slice(0, 3).map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
                {warnings.length > 3 && (
                  <li>...and {warnings.length - 3} more warnings</li>
                )}
              </ul>
            </div>
          )}
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Description</Label>
              <div className="col-span-3 text-sm">{currentTransaction?.description}</div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Amount</Label>
              <div className="col-span-3 text-sm">${Math.abs(currentTransaction?.amount || 0).toFixed(2)}</div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Date</Label>
              <div className="col-span-3 text-sm">{currentTransaction?.date}</div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select 
                value={selectedCategory || undefined} 
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vendor" className="text-right">
                Vendor
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
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select 
                value={selectedType} 
                onValueChange={(value) => setSelectedType(value as Transaction['type'])}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="statementType" className="text-right">
                Statement Type
              </Label>
              <Select 
                value={selectedStatementType} 
                onValueChange={(value) => setSelectedStatementType(value as Transaction['statementType'])}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a statement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit_loss">Profit & Loss</SelectItem>
                  <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            {transactions && (
              <div className="flex items-center gap-2 mr-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNext}
                  disabled={currentIndex === allTransactions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                
                <span className="text-xs text-muted-foreground ml-2">
                  {currentIndex + 1} of {allTransactions.length}
                </span>
              </div>
            )}
            
            <Button variant="outline" onClick={handleReject}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <VendorEditor
        onSave={handleVendorCreated}
        isOpen={isVendorEditorOpen}
        onClose={() => setIsVendorEditorOpen(false)}
        transaction={currentTransaction}
      />
    </>
  );
};

export default TransactionReviewDialog;
