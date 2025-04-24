
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
import { Trash2, Check, Pencil, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Vendor, Transaction } from '@/types';

interface VendorNameEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (vendor: Vendor) => void;
  isProcessing?: boolean;
  transaction?: Transaction;
}

const VendorNameEditor: React.FC<VendorNameEditorProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  isProcessing = false,
  transaction
}) => {
  const { getVendorsList, vendors } = useBookkeeping();
  const [vendorsList, setVendorsList] = useState<{ name: string; id?: string; count: number; isEditing: boolean; newName: string; verified: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const list = getVendorsList().map(vendor => ({
          ...vendor,
          isEditing: false,
          newName: vendor.name
        }));
        setVendorsList(list.sort((a, b) => a.name.localeCompare(b.name)));
        
        // If a transaction is provided, pre-populate the new vendor field
        if (transaction && !transaction.vendor) {
          setNewVendorName('');
        }
        
        setError(null);
      } catch (err) {
        console.error("Error loading vendors:", err);
        setError("Failed to load vendor list");
        toast.error("Failed to load vendor list");
      }
    }
  }, [isOpen, getVendorsList, vendors, transaction]);

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
    setError(null);
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
      
      // If onSave callback is provided, call it with the updated vendor
      if (onSave) {
        const vendorData: Vendor = {
          name: vendor.newName,
          category: '',
          type: 'expense',
          statementType: 'profit_loss',
          occurrences: vendor.count,
          verified: vendor.verified
        };
        onSave(vendorData);
      }
    } catch (err) {
      console.error("Error updating vendor name:", err);
      setError("Failed to update vendor name");
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
    setError(null);
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
      setError("Failed to delete vendor");
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
  
  const handleAddNewVendor = async () => {
    if (!newVendorName.trim()) {
      toast.error("Vendor name cannot be empty");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      // Check if vendor already exists
      const existingVendorIndex = vendorsList.findIndex(v => v.name.toLowerCase() === newVendorName.toLowerCase());
      if (existingVendorIndex >= 0) {
        toast.error("This vendor already exists");
        setIsLoading(false);
        return;
      }
      
      // Create new vendor data
      const newVendor: Vendor = {
        name: newVendorName.trim(),
        category: transaction?.category || '',
        type: transaction?.type || 'expense',
        statementType: transaction?.statementType || 'profit_loss',
        occurrences: 1,
        verified: false
      };
      
      // Add to vendor_categorizations table
      const { error } = await supabase
        .from('vendor_categorizations')
        .insert({
          vendor_name: newVendor.name,
          category: newVendor.category,
          type: newVendor.type,
          statement_type: newVendor.statementType,
          occurrences: 1,
          verified: false
        });
        
      if (error) throw error;
      
      // Call onSave if provided
      if (onSave) {
        onSave(newVendor);
      }
      
      toast.success(`New vendor "${newVendor.name}" added`);
      setNewVendorName('');
      
      // Add to the local vendors list
      const updatedVendors = [
        ...vendorsList,
        {
          name: newVendor.name,
          count: 1,
          isEditing: false,
          newName: newVendor.name,
          verified: false
        }
      ].sort((a, b) => a.name.localeCompare(b.name));
      
      setVendorsList(updatedVendors);
    } catch (err) {
      console.error("Error adding new vendor:", err);
      setError("Failed to add new vendor");
      toast.error("Failed to add new vendor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Manage Vendors</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Add new vendor section */}
        {transaction || onSave ? (
          <div className="mb-4 border-b pb-4">
            <h3 className="text-sm font-medium mb-2">Add New Vendor</h3>
            <div className="flex gap-2">
              <Input
                value={newVendorName}
                onChange={(e) => setNewVendorName(e.target.value)}
                placeholder="Enter new vendor name"
                disabled={isLoading || isProcessing}
              />
              <Button 
                onClick={handleAddNewVendor}
                disabled={isLoading || isProcessing || !newVendorName.trim()}
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        ) : null}
        
        <div className="py-4">
          <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-auto">
            {vendorsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Loading vendors...' : 'No vendors found'}
              </div>
            ) : (
              vendorsList.map((vendor, index) => (
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
              ))
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose} disabled={isLoading || isProcessing}>
            {isLoading || isProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VendorNameEditor;
