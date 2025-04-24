
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { toast } from '@/utils/toast';
import { Trash2, Check, Pencil, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VendorNameEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const VendorNameEditor: React.FC<VendorNameEditorProps> = ({ isOpen, onClose }) => {
  const { getVendorsList, vendors } = useBookkeeping();
  const [vendorsList, setVendorsList] = useState<{ name: string; id?: string; count: number; isEditing: boolean; newName: string; verified: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const list = getVendorsList().map(vendor => ({
        ...vendor,
        isEditing: false,
        newName: vendor.name
      }));
      setVendorsList(list.sort((a, b) => a.name.localeCompare(b.name)));
    }
  }, [isOpen, getVendorsList, vendors]);

  const handleEditClick = (index: number) => {
    const updatedVendors = [...vendorsList];
    updatedVendors[index].isEditing = true;
    setVendorsList(updatedVendors);
  };

  const handleNameChange = (index: number, value: string) => {
    const updatedVendors = [...vendorsList];
    updatedVendors[index].newName = value;
    setVendorsList(updatedVendors);
  };

  const handleSaveVendor = async (index: number) => {
    const vendor = vendorsList[index];
    if (!vendor.newName.trim()) {
      toast.error("Vendor name cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      // First, update the vendor name in the vendor_categorizations table
      const { error: vendorError } = await supabase
        .from('vendor_categorizations')
        .update({ vendor_name: vendor.newName })
        .eq('vendor_name', vendor.name);

      if (vendorError) throw vendorError;

      // Then, update all transactions referencing this vendor
      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .update({ vendor: vendor.newName })
        .eq('vendor', vendor.name);

      if (transactionError) throw transactionError;

      // Update the local state
      const updatedVendors = [...vendorsList];
      updatedVendors[index].name = vendor.newName;
      updatedVendors[index].isEditing = false;
      setVendorsList(updatedVendors);

      toast.success(`Vendor "${vendor.name}" renamed to "${vendor.newName}"`);
    } catch (err) {
      console.error("Error updating vendor name:", err);
      toast.error("Failed to update vendor name");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVendor = async (index: number) => {
    const vendor = vendorsList[index];
    if (!confirm(`Are you sure you want to delete vendor "${vendor.name}"? This will remove it from all associated transactions.`)) {
      return;
    }

    setIsLoading(true);
    try {
      // First, update all transactions referencing this vendor to "Unknown"
      const { error: transactionError } = await supabase
        .from('bank_transactions')
        .update({ vendor: "Unknown" })
        .eq('vendor', vendor.name);

      if (transactionError) throw transactionError;

      // Then delete the vendor from the vendor_categorizations table
      const { error: vendorError } = await supabase
        .from('vendor_categorizations')
        .delete()
        .eq('vendor_name', vendor.name);

      if (vendorError) throw vendorError;

      // Update the local state
      const updatedVendors = vendorsList.filter((_, i) => i !== index);
      setVendorsList(updatedVendors);

      toast.success(`Vendor "${vendor.name}" deleted`);
    } catch (err) {
      console.error("Error deleting vendor:", err);
      toast.error("Failed to delete vendor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = (index: number) => {
    const updatedVendors = [...vendorsList];
    updatedVendors[index].isEditing = false;
    updatedVendors[index].newName = updatedVendors[index].name;
    setVendorsList(updatedVendors);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Manage Vendors</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-auto">
            {vendorsList.map((vendor, index) => (
              <div 
                key={vendor.name} 
                className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {vendor.isEditing ? (
                    <Input
                      value={vendor.newName}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      className="w-[200px]"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{vendor.name}</span>
                      {vendor.verified && (
                        <Check className="h-4 w-4 text-[hsl(var(--finance-soft-green))]" />
                      )}
                      <span className="text-xs text-muted-foreground">({vendor.count} transactions)</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {vendor.isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelEdit(index)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveVendor(index)}
                        disabled={isLoading || vendor.newName === vendor.name || !vendor.newName.trim()}
                        className="text-[hsl(var(--finance-soft-green))]"
                      >
                        {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(index)}
                        disabled={isLoading}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVendor(index)}
                        disabled={isLoading}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {vendorsList.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No vendors found
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VendorNameEditor;
