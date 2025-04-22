
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
import { Store, Plus, Check, X } from 'lucide-react';
import VendorEditor from './VendorEditor';

interface TransactionReviewDialogProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
}

const TransactionReviewDialog: React.FC<TransactionReviewDialogProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { categories, verifyTransaction, updateTransaction, vendors, getVendorsList } = useBookkeeping();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    transaction.category || null
  );
  const [selectedType, setSelectedType] = useState<Transaction['type']>(
    transaction.type || 'expense'
  );
  const [selectedStatementType, setSelectedStatementType] = useState<Transaction['statementType']>(
    transaction.statementType || 'profit_loss'
  );
  const [selectedVendor, setSelectedVendor] = useState<string | null>(
    transaction.vendor || null
  );
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);
  
  const vendorsList = getVendorsList();
  
  const handleApprove = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }
    
    if (!selectedVendor) {
      toast.error('Please select a vendor');
      return;
    }
    
    try {
      // First update the transaction with the vendor if it's changed
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
    } catch (error) {
      console.error('Error verifying transaction:', error);
      toast.error('Failed to verify transaction');
    }
  };
  
  const handleVendorCreated = (newVendor) => {
    setSelectedVendor(newVendor.name);
  };
  
  const handleReject = () => {
    // Implement rejection logic if needed
    onClose();
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Transaction</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Description</Label>
              <div className="col-span-3 text-sm">{transaction.description}</div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Amount</Label>
              <div className="col-span-3 text-sm">${Math.abs(transaction.amount).toFixed(2)}</div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Date</Label>
              <div className="col-span-3 text-sm">{transaction.date}</div>
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
        transaction={transaction}
      />
    </>
  );
};

export default TransactionReviewDialog;
