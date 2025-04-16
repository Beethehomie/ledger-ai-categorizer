
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Vendor, Category, TransactionType, StatementType } from '@/types';
import { toast } from '@/utils/toast';

interface VendorEditorProps {
  categories: Category[];
  onSave: (vendor: Vendor) => void;
  isOpen: boolean;
  onClose: () => void;
}

const VendorEditor: React.FC<VendorEditorProps> = ({
  categories,
  onSave,
  isOpen,
  onClose,
}) => {
  const [newVendor, setNewVendor] = useState<Partial<Vendor>>({
    name: '',
    category: '',
    type: 'expense',
    statementType: 'profit_loss',
    occurrences: 1,
    verified: false
  });

  const handleSave = () => {
    if (!newVendor.name || !newVendor.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if the name is empty or a placeholder
    if (!newVendor.name.trim() || newVendor.name === 'add-new' || newVendor.name === 'select-placeholder') {
      toast.error('Please enter a valid vendor name');
      return;
    }

    // Convert to full vendor
    const vendor: Vendor = {
      name: newVendor.name!,
      category: newVendor.category!,
      type: newVendor.type as TransactionType,
      statementType: newVendor.statementType as StatementType,
      occurrences: 1,
      verified: false
    };

    onSave(vendor);

    // Reset form
    setNewVendor({
      name: '',
      category: '',
      type: 'expense',
      statementType: 'profit_loss',
      occurrences: 1,
      verified: false
    });
  };
  
  // Reset form when dialog closes
  const handleDialogClose = () => {
    setNewVendor({
      name: '',
      category: '',
      type: 'expense',
      statementType: 'profit_loss',
      occurrences: 1,
      verified: false
    });
    onClose();
  };

  // Group categories by type for better organization in the dropdown
  const categoriesByType: Record<string, Category[]> = {
    income: categories.filter(c => c.type === 'income'),
    expense: categories.filter(c => c.type === 'expense'),
    asset: categories.filter(c => c.type === 'asset'),
    liability: categories.filter(c => c.type === 'liability'),
    equity: categories.filter(c => c.type === 'equity'),
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
          <DialogDescription>
            Create a new vendor and assign it to a category.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vendor-name" className="text-right">
              Vendor Name
            </Label>
            <Input
              id="vendor-name"
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              className="col-span-3"
              placeholder="Enter vendor name"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vendor-type" className="text-right">
              Type
            </Label>
            <Select
              value={newVendor.type}
              onValueChange={(value: TransactionType) => 
                setNewVendor({ ...newVendor, type: value })
              }
            >
              <SelectTrigger className="col-span-3" id="vendor-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vendor-statement" className="text-right">
              Statement Type
            </Label>
            <Select
              value={newVendor.statementType}
              onValueChange={(value: StatementType) => 
                setNewVendor({ ...newVendor, statementType: value })
              }
            >
              <SelectTrigger className="col-span-3" id="vendor-statement">
                <SelectValue placeholder="Select statement type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit_loss">Profit & Loss</SelectItem>
                <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vendor-category" className="text-right">
              Category
            </Label>
            <Select
              value={newVendor.category}
              onValueChange={(value) => 
                setNewVendor({ ...newVendor, category: value })
              }
            >
              <SelectTrigger className="col-span-3" id="vendor-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {/* Income categories */}
                <SelectItem value="header-income" disabled className="font-bold text-finance-blue">
                  Income
                </SelectItem>
                {categoriesByType.income.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
                
                {/* Expense categories */}
                <SelectItem value="header-expense" disabled className="font-bold text-finance-blue mt-2">
                  Expenses
                </SelectItem>
                {categoriesByType.expense.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
                
                {/* Asset categories */}
                <SelectItem value="header-asset" disabled className="font-bold text-finance-blue mt-2">
                  Assets
                </SelectItem>
                {categoriesByType.asset.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
                
                {/* Liability categories */}
                <SelectItem value="header-liability" disabled className="font-bold text-finance-blue mt-2">
                  Liabilities
                </SelectItem>
                {categoriesByType.liability.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
                
                {/* Equity categories */}
                <SelectItem value="header-equity" disabled className="font-bold text-finance-blue mt-2">
                  Equity
                </SelectItem>
                {categoriesByType.equity.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Add Vendor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VendorEditor;
