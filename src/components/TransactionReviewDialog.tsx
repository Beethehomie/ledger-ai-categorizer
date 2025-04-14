
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Transaction } from "@/types";
import { formatCurrency } from "@/utils/currencyUtils";
import { useSettings } from "@/context/SettingsContext";

interface TransactionReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onConfirm: (editedTransactions: Transaction[]) => void;
}

const TransactionReviewDialog: React.FC<TransactionReviewDialogProps> = ({ 
  isOpen, 
  onClose, 
  transactions,
  onConfirm 
}) => {
  const { currency } = useSettings();
  const [editedTransactions, setEditedTransactions] = useState<Transaction[]>(transactions);
  const [selectedTransactions, setSelectedTransactions] = useState<Record<string, boolean>>(
    transactions.reduce((acc, t) => ({ ...acc, [t.id]: true }), {})
  );
  const [selectAll, setSelectAll] = useState(true);

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
    onConfirm(selectedItems);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">Review Transactions</DialogTitle>
          <DialogDescription>
            Review and edit transactions before uploading. Select the ones you want to include.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="select-all" 
              checked={selectAll}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select All Transactions
            </label>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-1/3">Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-finance-green hover:bg-finance-green-light"
          >
            Upload Selected ({Object.values(selectedTransactions).filter(Boolean).length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReviewDialog;
