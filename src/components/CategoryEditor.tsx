
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/utils/toast';
import { Category } from '@/types';

interface CategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Category) => void;
  categories: Category[];
  editCategory?: Category;
}

const CategoryEditor: React.FC<CategoryEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  editCategory
}) => {
  const [name, setName] = useState(editCategory?.name || '');
  const [type, setType] = useState<'income' | 'expense' | 'asset' | 'liability' | 'equity'>(
    editCategory?.type || 'expense'
  );
  // Ensure statementType only accepts 'profit_loss' or 'balance_sheet'
  const [statementType, setStatementType] = useState<'profit_loss' | 'balance_sheet'>(
    (editCategory?.statementType === 'profit_loss' || editCategory?.statementType === 'balance_sheet') 
      ? editCategory.statementType 
      : 'profit_loss'
  );
  const [keywords, setKeywords] = useState<string>(editCategory?.keywords?.join(', ') || '');

  const handleSave = () => {
    if (!name) {
      toast.error('Category name is required');
      return;
    }

    // Check for duplicate name
    if (!editCategory && categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('A category with this name already exists');
      return;
    }

    const keywordsList = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k !== '');

    const newCategory: Category = {
      id: editCategory?.id || `cat-${Date.now()}`,
      name,
      type,
      statementType,
      keywords: keywordsList
    };

    onSave(newCategory);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setType('expense');
    setStatementType('profit_loss');
    setKeywords('');
  };

  // Automatically update statement type based on category type
  const handleTypeChange = (value: 'income' | 'expense' | 'asset' | 'liability' | 'equity') => {
    setType(value);
    
    // If income or expense, set to profit_loss; otherwise balance_sheet
    if (value === 'income' || value === 'expense') {
      setStatementType('profit_loss');
    } else {
      setStatementType('balance_sheet');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            Create a new category for transaction classification or edit an existing one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Office Supplies"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Category Type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger id="type">
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

          <div className="space-y-2">
            <Label htmlFor="statementType">Statement Type</Label>
            <Select 
              value={statementType} 
              onValueChange={(value: 'profit_loss' | 'balance_sheet') => setStatementType(value)}
              disabled={type === 'income' || type === 'expense'}
            >
              <SelectTrigger id="statementType">
                <SelectValue placeholder="Select statement type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit_loss">Profit & Loss</SelectItem>
                <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
              </SelectContent>
            </Select>
            {(type === 'income' || type === 'expense') && (
              <p className="text-xs text-muted-foreground mt-1">
                Income and expense categories are automatically assigned to Profit & Loss.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma separated)</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., office, supplies, stationery"
            />
            <p className="text-xs text-muted-foreground">
              Keywords help the AI identify this category from transaction descriptions.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editCategory ? 'Save Changes' : 'Add Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryEditor;
