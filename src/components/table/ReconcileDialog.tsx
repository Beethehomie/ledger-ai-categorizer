
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Transaction } from "@/types";
import { formatCurrency } from "@/utils/currencyUtils";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "@/utils/toast";
import { isBalanceReconciled } from "@/utils/csvParser";
import { CheckCircle2, AlertCircle } from "lucide-react";

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
  const [endBalance, setEndBalance] = useState<string>('');
  
  // Calculate the current last balance
  const currentBalance = transactions.length > 0 && transactions[transactions.length - 1].balance !== undefined
    ? transactions[transactions.length - 1].balance
    : 0;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericBalance = parseFloat(endBalance.replace(/[^0-9.-]+/g, ''));
    
    if (isNaN(numericBalance)) {
      toast.error("Please enter a valid balance amount");
      return;
    }
    
    onReconcile(numericBalance);
    onClose();
  };
  
  const isReconciled = isBalanceReconciled(
    transactions,
    endBalance ? parseFloat(endBalance.replace(/[^0-9.-]+/g, '')) : undefined
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reconcile Account Balance</DialogTitle>
          <DialogDescription>
            Enter the ending balance from your account statement to reconcile with the calculated balance.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="calculated-balance">Calculated Balance</Label>
            <div className="flex items-center border rounded-md px-3 py-2 bg-muted/40">
              <span className="text-muted-foreground">{formatCurrency(currentBalance || 0, currency.code)}</span>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Label htmlFor="end-balance">Statement Ending Balance</Label>
            <Input
              id="end-balance"
              placeholder={`Enter balance (e.g., ${formatCurrency(1000, currency.code)})`}
              value={endBalance}
              onChange={(e) => setEndBalance(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          {endBalance && (
            <div className={`flex items-center p-3 rounded-md ${isReconciled ? 'bg-green-50' : 'bg-amber-50'}`}>
              {isReconciled ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-green-700">Balance matches! Your account is reconciled.</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                  <span className="text-sm text-amber-700">
                    Balance difference: {formatCurrency(
                      Math.abs((parseFloat(endBalance.replace(/[^0-9.-]+/g, '')) || 0) - (currentBalance || 0)), 
                      currency.code
                    )}
                  </span>
                </>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save & Reconcile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReconcileDialog;
