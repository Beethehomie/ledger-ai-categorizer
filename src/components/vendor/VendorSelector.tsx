
import React from 'react';
import { Vendor, VendorItem } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  BadgeCheck
} from "lucide-react";

interface VendorSelectorProps {
  selectedVendor: string | null;
  setSelectedVendor: (vendor: string | null) => void;
  vendorsList: VendorItem[];
  onAddVendorClick: () => void;
  onFindSimilarClick: () => void;
  onVendorApproval: (vendorName: string, approved: boolean) => void;
  processingAction: boolean;
}

const VendorSelector: React.FC<VendorSelectorProps> = ({
  selectedVendor,
  setSelectedVendor,
  vendorsList,
  onAddVendorClick,
  onFindSimilarClick,
  onVendorApproval,
  processingAction
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start">
      <Select
        value={selectedVendor || undefined}
        onValueChange={setSelectedVendor}
      >
        <SelectTrigger className="w-full md:w-[300px]">
          <SelectValue placeholder="Select a vendor" />
        </SelectTrigger>
        <SelectContent>
          {vendorsList.map((vendor) => (
            <SelectItem key={vendor.name} value={vendor.name}>
              <div className="flex items-center gap-2">
                <span>{vendor.name}</span>
                <span className="text-xs text-muted-foreground">({vendor.count})</span>
                {vendor.verified && (
                  <BadgeCheck className="h-4 w-4 text-[hsl(var(--finance-soft-green))]" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex items-center gap-2 animate-fade-in">
        <Button
          size="sm"
          variant="outline"
          className="hover-scale"
          onClick={onAddVendorClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Vendor
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          disabled={processingAction}
          className="hover-scale"
          onClick={onFindSimilarClick}
        >
          <Search className="h-4 w-4 mr-2" />
          Find Similar Transactions
          {processingAction && <RefreshCw className="ml-2 h-3 w-3 animate-spin" />}
        </Button>
      </div>
      
      {selectedVendor && (
        <div className="flex items-center gap-2 ml-auto animate-fade-in">
          <Button
            size="sm"
            variant="outline"
            className="text-[hsl(var(--finance-soft-green))] border-[hsl(var(--finance-soft-green))] hover-scale"
            onClick={() => onVendorApproval(selectedVendor, true)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve Vendor
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-[hsl(var(--finance-soft-red))] border-[hsl(var(--finance-soft-red))] hover-scale"
            onClick={() => onVendorApproval(selectedVendor, false)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Reject Vendor
          </Button>
        </div>
      )}
    </div>
  );
};

export default VendorSelector;
