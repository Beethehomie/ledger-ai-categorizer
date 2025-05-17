
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Transaction } from "@/types";
import { formatCurrency } from '@/utils/currencyUtils';

interface ReconcileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onReconcile: (endBalance: number) => void;
}

const ReconcileDialog: React.FC<ReconcileDialogProps> = ({
  isOpen,
  onClose,
  transactions,
  onReconcile
}) => {
  const [endBalance, setEndBalance] = useState<string>('');

  const currentBalance = transactions.length > 0 
    ? transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].balance || 0
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedBalance = parseFloat(endBalance);
    if (isNaN(parsedBalance)) {
      return;
    }
    
    onReconcile(parsedBalance);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reconcile Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current-balance" className="text-right">
                Current Balance
              </Label>
              <div className="col-span-3 font-medium">
                {formatCurrency(currentBalance, 'USD')}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end-balance" className="text-right">
                Statement End Balance
              </Label>
              <Input
                id="end-balance"
                type="number"
                step="0.01"
                value={endBalance}
                onChange={(e) => setEndBalance(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Reconcile</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReconcileDialog;
