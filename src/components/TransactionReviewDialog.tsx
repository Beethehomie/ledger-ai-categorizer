import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction } from "@/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Edit2, Save, X } from "lucide-react";
import { format } from 'date-fns';

interface TransactionReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onConfirm: (selectedTransactions: Transaction[]) => void;
  warnings?: string[];
  existingTransactions?: Transaction[];
}

const TransactionReviewDialog: React.FC<TransactionReviewDialogProps> = ({
  isOpen,
  onClose,
  transactions,
  onConfirm,
  warnings = [],
  existingTransactions = []
}) => {
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [editableTransactions, setEditableTransactions] = useState<Transaction[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Transaction[]>([]);

  // Initialize when transactions change
  useEffect(() => {
    setEditableTransactions(transactions);
    setSelectedTransactions(transactions);
    
    // Find potential duplicates
    const potentialDuplicates = transactions.filter(newTx => 
      existingTransactions.some(existingTx => 
        existingTx.date === newTx.date && 
        Math.abs(existingTx.amount - newTx.amount) < 0.01 &&
        existingTx.description === newTx.description
      )
    );
    
    setDuplicates(potentialDuplicates);
  }, [transactions, existingTransactions]);

  const handleConfirm = () => {
    onConfirm(selectedTransactions);
  };

  const toggleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransactions(prev => {
      const isSelected = prev.some(t => t.id === transaction.id);
      
      if (isSelected) {
        return prev.filter(t => t.id !== transaction.id);
      } else {
        return [...prev, transaction];
      }
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(editableTransactions);
    } else {
      setSelectedTransactions([]);
    }
  };

  const startEditing = (id: string) => {
    setEditingRow(id);
  };

  const saveEdits = (id: string) => {
    setEditingRow(null);
  };

  const cancelEdits = (id: string) => {
    // Revert changes for this row
    setEditableTransactions(prev => {
      const originalTransaction = transactions.find(t => t.id === id);
      if (!originalTransaction) return prev;
      
      return prev.map(t => t.id === id ? originalTransaction : t);
    });
    
    setEditingRow(null);
  };

  const handleTransactionChange = (id: string, field: 'date' | 'description' | 'amount', value: string | number) => {
    setEditableTransactions(prev => 
      prev.map(t => {
        if (t.id === id) {
          return { ...t, [field]: value };
        }
        return t;
      })
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review Transactions</DialogTitle>
          <DialogDescription>
            Review and edit transactions before finalizing the import
          </DialogDescription>
        </DialogHeader>
        
        {duplicates.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-bold mb-2">{duplicates.length} potential duplicate transactions found!</div>
              <p className="text-sm">
                These transactions have the same date, amount, and description as existing transactions.
                You may want to deselect them to avoid duplicates.
              </p>
            </AlertDescription>
          </Alert>
        )}
        
        {warnings.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-bold mb-2">Warnings:</p>
              <ul className="list-disc pl-5 text-sm">
                {warnings.slice(0, 5).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
                {warnings.length > 5 && <li>...and {warnings.length - 5} more</li>}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={selectedTransactions.length === editableTransactions.length && editableTransactions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editableTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                editableTransactions.map((transaction) => {
                  const isEditing = editingRow === transaction.id;
                  const isDuplicate = duplicates.some(d => d.id === transaction.id);
                  
                  return (
                    <TableRow 
                      key={transaction.id}
                      className={isDuplicate ? "bg-red-50" : undefined}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={selectedTransactions.some(t => t.id === transaction.id)}
                          onCheckedChange={() => toggleSelectTransaction(transaction)}
                        />
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input 
                            type="date" 
                            value={transaction.date} 
                            onChange={(e) => handleTransactionChange(transaction.id, 'date', e.target.value)}
                          />
                        ) : (
                          <span className={isDuplicate ? "text-red-600 font-medium" : ""}>
                            {transaction.date}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input 
                            value={transaction.description} 
                            onChange={(e) => handleTransactionChange(transaction.id, 'description', e.target.value)}
                          />
                        ) : (
                          <span className={`truncate block max-w-[300px] ${isDuplicate ? "text-red-600" : ""}`}>
                            {transaction.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input 
                            type="number" 
                            step="0.01"
                            value={transaction.amount} 
                            onChange={(e) => handleTransactionChange(transaction.id, 'amount', parseFloat(e.target.value))}
                            className="text-right"
                          />
                        ) : (
                          <span className={isDuplicate ? "text-red-600 font-medium" : ""}>
                            {transaction.amount.toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {isEditing ? (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => saveEdits(transaction.id)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => cancelEdits(transaction.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => startEditing(transaction.id)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
          <p>{selectedTransactions.length} of {editableTransactions.length} transactions selected</p>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedTransactions.length === 0}
          >
            Process {selectedTransactions.length} Transactions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionReviewDialog;
