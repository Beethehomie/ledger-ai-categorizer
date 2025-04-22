
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
import { Loader2 } from 'lucide-react';
import { addCategory, updateCategory } from '@/services/categoryService';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!name) {
      toast.error('Category name is required');
      return;
    }

    // Check for duplicate name
    if (!editCategory && categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error('A category with this name already exists');
      return;
    }

    setIsSubmitting(true);

    const keywordsList = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k !== '');

    const categoryData: Category = {
      id: editCategory?.id || `cat-${Date.now()}`,
      name,
      type,
      statementType,
      keywords: keywordsList
    };

    try {
      // Save to database first
      const result = editCategory 
        ? await updateCategory(categoryData)
        : await addCategory(categoryData);
        
      if (!result.success) {
        throw new Error(result.error || `Failed to ${editCategory ? 'update' : 'add'} category`);
      }
      
      // If successful, update local state via callback
      onSave(categoryData);
      resetForm();
      onClose();
      toast.success(`Category ${editCategory ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setType('expense');
    setStatementType('profit_loss');
    setKeywords('');
    setIsSubmitting(false);
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
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Category Type</Label>
            <Select value={type} onValueChange={handleTypeChange} disabled={isSubmitting}>
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
              disabled={(type === 'income' || type === 'expense') || isSubmitting}
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
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Keywords help the AI identify this category from transaction descriptions.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editCategory ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editCategory ? 'Save Changes' : 'Add Category'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryEditor;
