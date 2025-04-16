
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Transaction } from "@/types";
import { formatCurrency } from "@/utils/currencyUtils";
import { useSettings } from "@/context/SettingsContext";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface TransactionReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onConfirm: (editedTransactions: Transaction[]) => void;
  warnings?: string[];
}

const TransactionReviewDialog: React.FC<TransactionReviewDialogProps> = ({ 
  isOpen, 
  onClose, 
  transactions,
  onConfirm,
  warnings = []
}) => {
  const { currency } = useSettings();
  const [editedTransactions, setEditedTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(true);
  
  // Initialize state when transactions prop changes
  useEffect(() => {
    if (transactions.length > 0) {
      setEditedTransactions(transactions);
      // Initialize selectedTransactions with all selected
      const initialSelected = transactions.reduce((acc, t) => ({ ...acc, [t.id]: true }), {});
      setSelectedTransactions(initialSelected);
      setSelectAll(true);
    }
  }, [transactions]);

  const handleEditTransaction = (id: string, field: keyof Transaction, value: any) => {
    setEditedTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, [field]: value } : t)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedTransactions(
      editedTransactions.reduce((acc, t) => ({ ...acc, [t.id]: checked }), {})
    );
  };

  const handleSelectTransaction = (id: string, checked: boolean) => {
    setSelectedTransactions(prev => ({ ...prev, [id]: checked }));
    // Check if all are selected after this change
    const newSelectedState = { ...selectedTransactions, [id]: checked };
    const allSelected = editedTransactions.every(t => newSelectedState[t.id]);
    setSelectAll(allSelected);
  };

  const handleConfirm = () => {
    const selectedItems = editedTransactions.filter(t => selectedTransactions[t.id]);
    if (selectedItems.length === 0) {
      // Don't proceed if no transactions are selected
      return;
    }
    onConfirm(selectedItems);
  };

  const isBalanceReconciled = (balance?: number, expectedBalance?: number): boolean => {
    if (balance === undefined || expectedBalance === undefined) return false;
    // Allow a small tolerance for floating point differences (e.g., $0.01)
    return Math.abs(balance - expectedBalance) < 0.02;
  };

  // Calculate some stats
  const totalRecords = editedTransactions.length;
  const selectedCount = Object.values(selectedTransactions).filter(Boolean).length;
  const totalAmount = editedTransactions
    .filter(t => selectedTransactions[t.id])
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">Review Transactions</DialogTitle>
          <DialogDescription>
            Review and edit transactions before uploading. Select the ones you want to include.
          </DialogDescription>
        </DialogHeader>

        {warnings.length > 0 && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Warnings during import:</div>
              <ul className="text-sm list-disc pl-4 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {editedTransactions.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-lg">
            <p className="text-muted-foreground">No transactions found in the CSV file.</p>
            <p className="text-sm mt-2">
              Please check that your file contains valid transaction data and try again.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All Transactions ({selectedCount}/{totalRecords})
                </label>
              </div>
              
              <div className="text-sm font-medium">
                Total amount: {formatCurrency(totalAmount, currency)}
              </div>
            </div>

            <div className="border rounded-md mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-1/3">Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>
                      Balance
                      {editedTransactions.some(t => isBalanceReconciled(t.balance, t.balance)) && (
                        <CheckCircle2 className="inline ml-1 h-4 w-4 text-green-500" />
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedTransactions[transaction.id] || false}
                          onCheckedChange={(checked) => 
                            handleSelectTransaction(transaction.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={transaction.date} 
                          onChange={(e) => handleEditTransaction(transaction.id, 'date', e.target.value)}
                          className="h-8 w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={transaction.description} 
                          onChange={(e) => handleEditTransaction(transaction.id, 'description', e.target.value)}
                          className="h-8 w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={transaction.amount} 
                          onChange={(e) => handleEditTransaction(transaction.id, 'amount', parseFloat(e.target.value))}
                          className="h-8 w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={transaction.category || ''} 
                          onChange={(e) => handleEditTransaction(transaction.id, 'category', e.target.value)}
                          className="h-8 w-full"
                          placeholder="Category"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={transaction.type || ''} 
                          onChange={(e) => handleEditTransaction(transaction.id, 'type', e.target.value)}
                          className="h-8 w-full"
                          placeholder="Type"
                        />
                      </TableCell>
                      <TableCell className="relative">
                        {transaction.balance !== undefined && (
                          <>
                            {formatCurrency(transaction.balance, currency)}
                            {isBalanceReconciled(transaction.balance, transaction.balance) && (
                              <CheckCircle2 className="absolute top-1/2 right-2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="bg-finance-green hover:bg-finance-green-light"
          >
            Upload Selected ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReviewDialog;
