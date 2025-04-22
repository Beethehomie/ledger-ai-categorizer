
import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Transaction } from '@/types';

interface ReviewFormFieldsProps {
  transaction: Transaction;
  selectedCategory: string | null;
  selectedType: Transaction['type'];
  selectedStatementType: Transaction['statementType'];
  selectedVendor: string | null;
  vendorsList: any[];
  onCategoryChange: (value: string) => void;
  onTypeChange: (value: Transaction['type']) => void;
  onStatementTypeChange: (value: Transaction['statementType']) => void;
  onVendorChange: (value: string) => void;
  onAddVendor: () => void;
  categories: any[];
}

const ReviewFormFields: React.FC<ReviewFormFieldsProps> = ({
  transaction,
  selectedCategory,
  selectedType,
  selectedStatementType,
  selectedVendor,
  vendorsList,
  onCategoryChange,
  onTypeChange,
  onStatementTypeChange,
  onVendorChange,
  onAddVendor,
  categories
}) => {
  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right font-medium">Description</Label>
        <div className="col-span-3 text-sm">{transaction?.description}</div>
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right font-medium">Amount</Label>
        <div className="col-span-3 text-sm">${Math.abs(transaction?.amount || 0).toFixed(2)}</div>
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right font-medium">Date</Label>
        <div className="col-span-3 text-sm">{transaction?.date}</div>
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="category" className="text-right">Category</Label>
        <Select 
          value={selectedCategory || undefined} 
          onValueChange={onCategoryChange}
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
        <Label htmlFor="vendor" className="text-right">Vendor</Label>
        <div className="col-span-3 flex gap-2">
          <Select 
            value={selectedVendor || undefined} 
            onValueChange={onVendorChange}
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
            onClick={onAddVendor}
            title="Add new vendor"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="type" className="text-right">Type</Label>
        <Select 
          value={selectedType} 
          onValueChange={onTypeChange}
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
        <Label htmlFor="statementType" className="text-right">Statement Type</Label>
        <Select 
          value={selectedStatementType} 
          onValueChange={onStatementTypeChange}
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
  );
};

export default ReviewFormFields;
