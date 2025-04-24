
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2 } from 'lucide-react';
import { toast } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useBookkeeping } from '@/context/BookkeepingContext';
import { Vendor } from '@/types';

interface VendorNameEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditableVendor extends Vendor {
  isEditing?: boolean;
  newName?: string;
}

const VendorNameEditor: React.FC<VendorNameEditorProps> = ({ isOpen, onClose }) => {
  const { vendors } = useBookkeeping();
  const [vendorsList, setVendorsList] = useState<EditableVendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    // Initialize vendorsList with data from vendors
    setVendorsList(vendors.map(vendor => ({ 
      ...vendor, 
      isEditing: false,
      newName: vendor.name 
    })));
  }, [vendors, isOpen]);
  
  const filteredVendors = vendorsList.filter(vendor => 
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleEditClick = (index: number) => {
    setVendorsList(prevList => {
      const newList = [...prevList];
      newList[index] = { ...newList[index], isEditing: true };
      return newList;
    });
  };
  
  const handleNameChange = (index: number, value: string) => {
    setVendorsList(prevList => {
      const newList = [...prevList];
      newList[index] = { ...newList[index], newName: value };
      return newList;
    });
  };
  
  const handleSaveVendorName = async (index: number) => {
    const vendor = vendorsList[index];
    
    if (!vendor.newName || vendor.newName.trim() === '') {
      toast.error('Vendor name cannot be empty');
      return;
    }
    
    if (vendor.newName === vendor.name) {
      // No changes, just cancel edit mode
      setVendorsList(prevList => {
        const newList = [...prevList];
        newList[index] = { ...newList[index], isEditing: false };
        return newList;
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Update the vendor name in the database
      const { error } = await supabase
        .from('vendor_categorizations')
        .update({ vendor_name: vendor.newName })
        .eq('vendor_name', vendor.name);
        
      if (error) {
        throw error;
      }
      
      // Also update any transactions with this vendor
      const { error: txError } = await supabase
        .from('bank_transactions')
        .update({ vendor: vendor.newName })
        .eq('vendor', vendor.name);
        
      if (txError) {
        console.warn('Could not update all transactions:', txError);
        // Continue anyway as the main vendor record was updated
      }
      
      toast.success(`Vendor "${vendor.name}" renamed to "${vendor.newName}"`);
      
      // Update the local state
      setVendorsList(prevList => {
        const newList = [...prevList];
        newList[index] = { 
          ...newList[index], 
          name: vendor.newName || vendor.name,
          isEditing: false 
        };
        return newList;
      });
    } catch (err) {
      console.error('Error updating vendor name:', err);
      toast.error('Failed to update vendor name');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancelEdit = (index: number) => {
    setVendorsList(prevList => {
      const newList = [...prevList];
      newList[index] = { 
        ...newList[index], 
        isEditing: false,
        newName: newList[index].name // Reset to original name
      };
      return newList;
    });
  };
  
  const handleDeleteVendor = async (vendor: EditableVendor) => {
    if (!confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Delete the vendor from the database
      const { error } = await supabase
        .from('vendor_categorizations')
        .delete()
        .eq('vendor_name', vendor.name);
        
      if (error) {
        throw error;
      }
      
      // Remove vendor association from transactions
      const { error: txError } = await supabase
        .from('bank_transactions')
        .update({ vendor: 'Unknown' })
        .eq('vendor', vendor.name);
        
      if (txError) {
        console.warn('Could not update all transactions:', txError);
        // Continue anyway as the main vendor record was deleted
      }
      
      toast.success(`Vendor "${vendor.name}" deleted`);
      
      // Update the local state
      setVendorsList(prevList => prevList.filter(v => v.name !== vendor.name));
    } catch (err) {
      console.error('Error deleting vendor:', err);
      toast.error('Failed to delete vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Vendor Names</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Vendor Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Occurrences</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">
                        {searchQuery ? 'No vendors match your search' : 'No vendors available'}
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((vendor, index) => (
                      <tr key={vendor.name} className="border-t">
                        <td className="px-4 py-3">
                          {vendor.isEditing ? (
                            <Input
                              type="text"
                              value={vendor.newName || ''}
                              onChange={(e) => handleNameChange(index, e.target.value)}
                              autoFocus
                              className="w-full"
                            />
                          ) : (
                            <span>{vendor.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{vendor.occurrences || 0}</td>
                        <td className="px-4 py-3 text-right">
                          {vendor.isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelEdit(index)}
                                disabled={isSubmitting}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSaveVendorName(index)}
                                disabled={isSubmitting}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(index)}
                                disabled={isSubmitting}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteVendor(vendor)}
                                disabled={isSubmitting}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose} disabled={isSubmitting}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VendorNameEditor;
