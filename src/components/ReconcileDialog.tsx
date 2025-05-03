
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/currencyUtils";
import { useSettings } from "@/context/SettingsContext";
import { Transaction } from '@/types';
import { isBalanceReconciled } from '@/utils/csvParser';

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
  const { currency } = useSettings();
  const [endBalance, setEndBalance] = useState<string>("");
  const [calculatedEndBalance, setCalculatedEndBalance] = useState<number | null>(null);
  
  useEffect(() => {
    // Find latest transaction by date to get the most recent balance
    if (transactions.length > 0) {
      const sortedTransactions = [...transactions].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Sort descending for latest date first
      });
      
      setCalculatedEndBalance(sortedTransactions[0].balance || 0);
    } else {
      setCalculatedEndBalance(0);
    }
  }, [transactions]);
  
  const handleReconcile = () => {
    const numEndBalance = parseFloat(endBalance);
    if (isNaN(numEndBalance)) {
      return;
    }
    
    onReconcile(numEndBalance);
    onClose();
  };
  
  const isReconciled = calculatedEndBalance !== null && 
    !isNaN(parseFloat(endBalance)) && 
    isBalanceReconciled(calculatedEndBalance, parseFloat(endBalance));
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reconcile Account</DialogTitle>
          <DialogDescription>
            Enter the ending balance from your bank statement to reconcile the account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="calculated-balance" className="text-right">
              Calculated Balance:
            </Label>
            <div className="col-span-3">
              <span className="text-muted-foreground">
                {calculatedEndBalance !== null 
                  ? formatCurrency(calculatedEndBalance, currency) 
                  : "No transactions"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-balance" className="text-right">
              Statement Balance:
            </Label>
            <Input
              id="end-balance"
              type="number"
              step="0.01"
              value={endBalance}
              onChange={(e) => setEndBalance(e.target.value)}
              className="col-span-3"
              placeholder="Enter statement ending balance"
            />
          </div>
          {endBalance && calculatedEndBalance !== null && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Difference:</Label>
              <div className="col-span-3">
                <span className={isReconciled ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(
                    Math.abs(calculatedEndBalance - parseFloat(endBalance || "0")), 
                    currency
                  )}
                  {isReconciled && " (Reconciled)"}
                </span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleReconcile} disabled={!endBalance}>
            Reconcile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReconcileDialog;
