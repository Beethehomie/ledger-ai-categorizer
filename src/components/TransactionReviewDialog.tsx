
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { Check, X, ChevronRight, ChevronLeft } from 'lucide-react';
import ReviewFormFields from './review/ReviewFormFields';
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
  const { categories, verifyTransaction, updateTransaction, getVendorsList } = useBookkeeping();
  
  const allTransactions = transactions || (transaction ? [transaction] : []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTransaction = allTransactions[currentIndex];
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<Transaction['type']>('expense');
  const [selectedStatementType, setSelectedStatementType] = useState<Transaction['statementType']>('profit_loss');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [isVendorEditorOpen, setIsVendorEditorOpen] = useState(false);
  const [editedTransactions, setEditedTransactions] = useState<Transaction[]>([]);
  
  const vendorsList = getVendorsList();
  
  // Update state when current transaction changes
  useEffect(() => {
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
      const updatedTransaction: Transaction = {
        ...currentTransaction,
        category: selectedCategory,
        type: selectedType,
        statementType: selectedStatementType,
        vendor: selectedVendor,
        vendorVerified: true,
        isVerified: true
      };
      
      const updatedEditedTransactions = [...editedTransactions];
      updatedEditedTransactions[currentIndex] = updatedTransaction;
      setEditedTransactions(updatedEditedTransactions);
      
      if (!transactions && transaction) {
        await updateTransaction({
          ...transaction,
          vendor: selectedVendor,
          vendorVerified: true
        });
        
        await verifyTransaction(
          transaction.id, 
          selectedCategory,
          selectedType,
          selectedStatementType
        );
        
        toast.success('Transaction verified successfully');
        onClose();
      } else {
        if (currentIndex < allTransactions.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
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
    setIsVendorEditorOpen(false);
  };

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
          
          {warnings.length > 0 && (
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
          
          {currentTransaction && (
            <ReviewFormFields
              transaction={currentTransaction}
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              selectedStatementType={selectedStatementType}
              selectedVendor={selectedVendor}
              vendorsList={vendorsList}
              onCategoryChange={setSelectedCategory}
              onTypeChange={setSelectedType}
              onStatementTypeChange={setSelectedStatementType}
              onVendorChange={setSelectedVendor}
              onAddVendor={() => setIsVendorEditorOpen(true)}
              categories={categories}
            />
          )}
          
          <DialogFooter>
            {transactions && (
              <div className="flex items-center gap-2 mr-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentIndex(Math.min(allTransactions.length - 1, currentIndex + 1))}
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
            
            <Button variant="outline" onClick={onClose}>
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
