
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
import { Loader2 } from 'lucide-react';
import { addVendor } from '@/services/vendorService';

interface VendorEditorProps {
  onSave: (vendor: Vendor) => void;
  isOpen: boolean;
  onClose: () => void;
  isProcessing?: boolean;
}

const VendorEditor: React.FC<VendorEditorProps> = ({
  onSave,
  isOpen,
  onClose,
  isProcessing = false,
}) => {
  const [newVendor, setNewVendor] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!newVendor.trim()) {
      toast.error('Please enter a valid vendor name');
      return;
    }

    setIsSubmitting(true);

    // Create a default vendor with just the name
    const vendor: Vendor = {
      name: newVendor.trim(),
      category: '', // Will be set based on transaction category later
      type: 'expense', // Default type
      statementType: 'profit_loss', // Default statement type
      occurrences: 1,
      verified: false
    };

    try {
      // Save directly to database through service
      const result = await addVendor(vendor);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add vendor');
      }
      
      // Call the onSave callback to update local state
      onSave(vendor);
      toast.success(`Vendor "${vendor.name}" added successfully`);
      handleDialogClose();
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save vendor');
      setIsSubmitting(false);
    }
  };
  
  // Reset form when dialog closes
  const handleDialogClose = () => {
    setNewVendor('');
    setIsSubmitting(false);
    onClose();
  };

  const isLoading = isSubmitting || isProcessing;

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
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Add Vendor'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VendorEditor;
