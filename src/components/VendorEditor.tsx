
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
import { Vendor } from '@/types';
import { toast } from '@/utils/toast';

interface VendorEditorProps {
  onSave: (vendor: Vendor) => void;
  isOpen: boolean;
  onClose: () => void;
}

const VendorEditor: React.FC<VendorEditorProps> = ({
  onSave,
  isOpen,
  onClose,
}) => {
  const [newVendor, setNewVendor] = useState<string>('');

  const handleSave = () => {
    if (!newVendor.trim()) {
      toast.error('Please enter a valid vendor name');
      return;
    }

    // Create a default vendor with just the name
    const vendor: Vendor = {
      name: newVendor.trim(),
      category: '', // Will be set based on transaction category later
      type: 'expense', // Default type
      statementType: 'profit_loss', // Default statement type
      occurrences: 1,
      verified: false
    };

    onSave(vendor);

    // Reset form
    setNewVendor('');
  };
  
  // Reset form when dialog closes
  const handleDialogClose = () => {
    setNewVendor('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
          <DialogDescription>
            Enter the vendor name. The category and type will be determined when categorizing transactions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vendor-name" className="text-right">
              Vendor Name
            </Label>
            <Input
              id="vendor-name"
              value={newVendor}
              onChange={(e) => setNewVendor(e.target.value)}
              className="col-span-3"
              placeholder="Enter vendor name"
              autoFocus
            />
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
